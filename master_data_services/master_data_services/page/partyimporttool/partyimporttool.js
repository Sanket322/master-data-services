frappe.pages['partyimporttool'].on_page_load = function (wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Party Import Tool',
        single_column: true
    });

    let input = page.add_field({
        label: 'Enter Company/LLP name, CIN/FCRN/LLPIN/FLLPIN',
        fieldtype: 'Data',
        fieldname: 'input',
        change() {
            console.log(input.get_value());
        }
    });

    let selectOption = page.add_field({
        label: 'Select Company or Director',
        fieldtype: 'Select',
        fieldname: 'options',
        options: [
            'company', 'director'
        ],
        change() {
            console.log(selectOption.get_value())
        }
    });

    let resultContainer = $('<div>').appendTo(page.main);

    page.set_primary_action("Search", async () => {
        try {

            dict = page.get_form_values();
            let companyName = dict['input'];
            let option = dict['options'];

            if (!companyName || !option) {
                frappe.msgprint("Please fill in all the details properly");
                return;
            }

            var result = await getData(companyName, option);

            if (option === "company") {
                displayCompanyDetails(result, resultContainer);
            } else {
                displayDirectorDetails(result, resultContainer);
            }
        } catch (error) {
            console.error(error);
            frappe.msgprint("Error fetching data. Please try again later.");
            return;
        }
    });
};


//list out director based on search - After clicking on Search button
function displayDirectorDetails(result, container) {

    if (result == undefined) result = [];

    const datatableOptions = {
        columns: [
            { name: 'Name', format: (value) => value.bold() },
            { name: 'DIN/DPIN', format: (value) => value.bold() },
            {
                name: 'Action',
                editable: false,
                focusable: false,
                format: (value) => {
                    return `<button value="${value}" onclick="dialogbox(event,'director')">Import Data</button>`;
                }
            }],
        data: result.map(data => [
            data['drNm'],
            data['dnNmbr'],
            data['dnNmbr'],
        ]),
        layout: 'fluid'
    };
    const datatable = new frappe.DataTable(container.get(0), datatableOptions);
}


// list out company based on your search - After clicking on Search button
function displayCompanyDetails(result, container) {

    if (result == undefined) result = [];

    const datatableOptions = {
        columns: [
            { name: 'Company/LLP Name', format: (value) => value.bold() },
            { name: 'CIN/FCRN/LLPIN/FLLPIN', format: (value) => value.bold() },
            { name: 'State', format: (value) => value.bold() },
            {
                name: 'Import Data For',
                editable: false,
                fieldtype: 'Select',
                fieldname: 'options',
                format: (value) => {
                    return `
                        <select class="importDataDropdown" id="${value}">
                            <option value="${value}">Select</option>
                            <option value="${value}">Supplier</option>
                            <option value="${value}">Customer</option>
                            <option value="${value}">Lead</option>
                        </select>`;
                }
            }
        ],
        data: result.map(data => [
            data['cmpnyNm'],
            data['cnNmbr'],
            data['state'],
            data['cnNmbr'],
        ]),
        layout: 'fluid'
    };

    const datatable = new frappe.DataTable(container.get(0), datatableOptions);
    datatable.style.setStyle(`.importDataDropdown`, { backgroundColor: 'aliceblue', border: '1px solid grey' });

    container.on('change', '.importDataDropdown', function (event) {
        const selectedIndex = event.target.selectedIndex;
        let typeOfCompany = "";

        switch (selectedIndex) {
            case 1:
                typeOfCompany = "Supplier";
                break;
            case 2:
                typeOfCompany = "Customer";
                break;
            case 3:
                typeOfCompany = "Lead";
                break;
            default:
                frappe.msgprint("Select Proper type");
                return;
        }

        dialogbox(event, 'company', typeOfCompany);
    });
}


//get all info of company/director and provide it to dialogbox
async function dialogbox(button, option, typeOfCompany) {
    try {
        const formData = {
            ID: button.target.value,
            requestID: option === "director" ? "din" : "cin"
        };

        const details = await getAllDetails(formData);
        console.log(details);

        // Check if details are available 
        if (details != "Try Later") {

            if (option === 'director') {
                let data = showDirectorDialog(details);
            } else {
                const data = await showCompanyDialog(details, typeOfCompany);
                //to set droupdown to select again
                var button = document.getElementById(button.target.value);
                button.selectedIndex = 0;
            }
        }
        else {
            frappe.msgprint("Details not available. Try again later.");
            if (option == 'company') {
                //to set droupdown to select again
                var button = document.getElementById(button.target.value);
                button.selectedIndex = 0;
            }
        }
    } catch (error) {
        console.error("Error in dialogbox:", error);
        return;
    }
}


//import contact on dialogbox
function showDirectorDialog(details) {

    console.log(details.directorData)

    if (!details.directorData || details.directorData.length == 0 ||
        details.directorData[0].companySignatory.length == 0
        || !details.directorData[0].companySignatory[0].companyName
        || (!details.directorData[0].emailAddress && !details.directorData[0].mobileNumber)) {

        frappe.msgprint("Not enough data to import");
        return;
    }

    let directorData = details.directorData[0];

    let d = new frappe.ui.Dialog({
        title: `Import Contact of ${directorData.firstName}`,
        fields: [
            {
                label: 'Full Name',
                fieldname: 'full_name',
                fieldtype: 'Data',
                default: directorData.firstName + " " + directorData.lastName,
                read_only: 1,
            },
            {
                label: 'Email Address',
                fieldname: 'email_address',
                fieldtype: 'Data',
                default: directorData.emailAddress,
                read_only: 1,
                hidden: !directorData.emailAddress,
            },
            {
                label: 'Mobile No.',
                fieldname: 'mobileNo',
                fieldtype: 'Data',
                default: directorData.mobileNumber,
                read_only: 1,
                hidden: !directorData.mobileNumber,
            },
            {
                label: 'Company Name',
                fieldname: 'companyName',
                fieldtype: 'Data',
                default: (directorData.companySignatory && directorData.companySignatory.length != 0) ? directorData.companySignatory[0].companyName : "",
                read_only: 1,
                hidden: !directorData.companySignatory || directorData.companySignatory.length == 0 || directorData.companySignatory[0].companyName == "",
            },
            {
                label: 'Designation',
                fieldname: 'designation',
                fieldtype: 'Data',
                default: directorData.companySignatory.length != 0 ? directorData.companySignatory[0].designation : "",
                read_only: 1,
                hidden: !directorData.companySignatory || directorData.companySignatory.length == 0 || directorData.companySignatory[0].designation == "",
            }
        ],
        size: 'small',
        primary_action_label: 'Confirm',
        async primary_action(values) {
            console.log(values)
            contact = [
                {
                    name: values['full_name'],
                    email_id: values['email_address'],
                    phone_no: values['mobileNo'],
                }
            ]

            try {
                let data = await createContactDoctype(contact, values['companyName'])
                d.hide();
                if (data == "Data inserted successfully") {
                    frappe.msgprint("Data inserted successfully");
                }
            } catch (error) {
                console.error("Error inserting contact data:", error);
                frappe.msgprint("Error in inserting contacts");
            }

            return;
        },
    });
    d.show();
}


//show the dialogbox for companyDetails
async function showCompanyDialog(companyDetails, typeOfCompany) {

    console.log(companyDetails)

    if (companyDetails.companyData == undefined) {
        frappe.msgprint("This company has no any details to import")
        return;
    }

    let addressDetails = []
    if (companyDetails.companyData && companyDetails.companyData.MCAMDSCompanyAddress) {
        addressDetails = companyDetails.companyData.MCAMDSCompanyAddress;
    }
    let address = {};
    let postalCodeOptions = []

    let directorData = []
    if (companyDetails.directorData) {
        directorData = companyDetails.directorData;
    }

    //if any addressDetails found
    if (addressDetails) {

        for (let i = 0; i < addressDetails.length; i++) {
            let temp = {};
            temp['streetAddress'] = addressDetails[i]['streetAddress'];
            temp['city'] = addressDetails[i]['city'];
            temp['state'] = addressDetails[i]['state'];
            temp['country'] = addressDetails[i]['country'];

            //to check that coming postacode is present in dict or not
            if (addressDetails[i]['postalCode'] in address) {
                continue;
            }
            else {
                address[addressDetails[i]['postalCode']] = temp;
                postalCodeOptions.push(addressDetails[i]['postalCode'])
            }
        }
    }

    let showAddress = postalCodeOptions.length != 0;
    let showContacts = directorData.length != 0;

    let additionalFields = [];
    if (typeOfCompany === 'Customer') {
        additionalFields = [
            {
                label: 'customer Name',
                fieldname: 'name',
                fieldtype: 'Data',
                default: companyDetails.companyData.company,
                reqd: 1,
            },
            {
                label: 'customer Type',
                fieldname: 'type',
                fieldtype: 'Select',
                options: [
                    'Company', 'Individual', 'Proprietorship', 'Partnership'
                ],
                reqd: 1,
            },
        ];
    }
    else if (typeOfCompany === 'Supplier') {
        additionalFields = [
            {
                label: 'supplier Name',
                fieldname: 'name',
                fieldtype: 'Data',
                default: companyDetails.companyData.company,
                reqd: 1,
            },
            {
                label: 'supplier Type',
                fieldname: 'type',
                fieldtype: 'Select',
                options: [
                    'Company', 'Individual', 'Proprietorship', 'Partnership'
                ],
                reqd: 1,
            },
        ];
    }
    else if (typeOfCompany === 'Lead') {
        additionalFields = [
            {
                label: 'First Name',
                fieldname: 'first_name',
                fieldtype: 'Data',
                reqd: 1,
            },
            {
                label: 'Organization Name',
                fieldname: 'organization_name',
                fieldtype: 'Data',
                reqd: 1,
            },
            {
                label: 'status',
                fieldname: 'status',
                fieldtype: 'Select',
                options: [
                    'Lead', 'Open', 'Replied', 'Opportunity', 'Quotation',
                    'Lost Quotation', 'Interested', 'Converted',
                    'Do Not Contact',
                ],
                reqd: 1,
            }
        ]
    }

    let d = new frappe.ui.Dialog({
        title: `Import Data of ${companyDetails.companyData.company}`,
        fields: [
            {
                label: 'Party Type',
                fieldname: 'party_type',
                fieldtype: 'Data',
                default: typeOfCompany,
                read_only: 1,
            },
            {
                label: 'Company Name',
                fieldname: 'companyName',
                fieldtype: 'Data',
                default: companyDetails.companyData.company,
                read_only: 1,
            },
            ...additionalFields,
            {
                label: "Address",
                fieldtype: 'Section Break'
            },
            {
                label: "PostalCode",
                fieldname: "postalCode",
                fieldtype: "Select",
                options: postalCodeOptions,
                default: showAddress ? postalCodeOptions[0] : '',
                onchange: function () {
                    let postalCode = d.get_value("postalCode");
                    d.set_value("street_address_1", address[postalCode]['streetAddress']);
                    d.set_value("city", address[postalCode]['city']);
                    d.set_value("state", address[postalCode]['state']);
                    d.set_value("country", address[postalCode]['country']);
                },
                hidden: !showAddress
            },
            {
                label: "",
                fieldname: 'alladdresses',
                fieldtype: 'Data',
                hidden: true,
                default: address
            },
            {
                label: 'Street Address 1',
                fieldname: 'street_address_1',
                fieldtype: 'Data',
                default: showAddress ? address[postalCodeOptions[0]]['streetAddress'] : '',
                read_only: 1,
                hidden: !showAddress,
            },
            {
                label: "",
                fieldtype: "Column Break"
            },
            {
                label: "City",
                fieldname: "city",
                fieldtype: "Data",
                default: showAddress ? address[postalCodeOptions[0]]['city'] : '',
                read_only: 1,
                hidden: !showAddress,
            },
            {
                label: 'State',
                fieldname: 'state',
                fieldtype: 'Data',
                default: showAddress ? address[postalCodeOptions[0]]['state'] : '',
                read_only: 1,
                hidden: !showAddress,
            },
            {
                label: 'Country',
                fieldname: 'country',
                fieldtype: 'Data',
                default: showAddress ? address[postalCodeOptions[0]]['country'] : '',
                read_only: 1,
                hidden: !showAddress,
            },
            {
                label: "",
                fieldtype: "Section Break"
            },
            {
                label: 'Contacts',
                fieldname: 'contacts',
                fieldtype: 'Table',
                read_only: 1,
                in_place_edit: 1,
                allow_item_selection: 1,
                // in_place_delete: false,
                cannot_add_rows: true,
                fields: [
                    { fieldname: 'name', label: 'Name', fieldtype: 'Data', in_list_view: 1, read_only: 1 },
                    { fieldname: 'email_id', label: 'Email ID', fieldtype: 'Data', in_list_view: 1, read_only: 1 },
                    { fieldname: 'phone_no', label: 'Phone No', fieldtype: 'Data', in_list_view: 1, read_only: 1 },
                ],
                hidden: !showContacts
            },
        ],
        size: 'small',
        primary_action_label: 'Confirm',
        primary_action(values) {

            createAllDoctype(values);
            d.hide();
            return;
        },
    });

    let contactsField = d.fields_dict.contacts;
    contactsField.df.data = [];

    let rowSet = new Set();

    for (let i = 0; i < directorData.length; i++) {

        let director_name = capitalize(directorData[i].FirstName, directorData[i].LastName);

        let nameExpression = /^(.*[a-zA-Z]){2}/;
        let emailExpression = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        let director_email = "", director_phone = "";
        if (directorData[i].MCAUserRole) {
            director_email = directorData[i].MCAUserRole[0]['emailAddress'].toLowerCase();
            director_phone = directorData[i].MCAUserRole[0]['mobileNumber'];
        }

        if ((nameExpression.test(director_name) == true) &&
            (emailExpression.test(director_email) == true || director_phone.length > 9)) {

            let newRow = {
                name: director_name,
                email_id: director_email,
                phone_no: director_phone
            };

            //used set to check that given code exists or not
            let newRowStringify = JSON.stringify(newRow);
            if (!rowSet.has(newRowStringify)) {
                rowSet.add(newRowStringify);
                contactsField.df.data.push(newRow);
            }
        }
    }
    contactsField.refresh();
    d.show()
}


//to create the doctype
async function createAllDoctype(values) {

    console.log(values);
    try {
        let contact = await createContactDoctype(values.contacts, values.companyName);
        let address = await createAddressDoctype(values);

        if (values['party_type'] != 'Lead') {
            let customerORsupplier = await createCustomeSupplierDoctype(values);
        }
        else {
            let lead = await creatLeadDoctype(values);
        }
        frappe.msgprint("Data imported Successfully");
        return;
    }
    catch (error) {
        frappe.msgprint("Internal error occured during importing data")
        console.log(error)
        return;
    }
}


//to create address  doctype
async function createAddressDoctype(values) {
    try {
        const response = await frappe.call({
            method: 'master_data_services.master_data_services.page.partyimporttool.partyimporttool.createAddressDoctype',
            args: {
                addresses: values['alladdresses'],
                companyName: values['companyName'],
            },
        });
        return response;
    } catch (error) {
        console.log("Error in createAddressDoctype:", error);
        frappe.msgprint("Error in creating Address");
        return;
    }
}


//to create Lead doctype
async function creatLeadDoctype(values) {
    try {
        const response = await frappe.call({
            method: 'master_data_services.master_data_services.page.partyimporttool.partyimporttool.creatLeadDoctype',
            args: {
                first_name: values['first_name'],
                organization_name: values['organization_name'],
                status: values['status']
            },
        });
        return response;
    } catch (error) {
        console.log("Error in creatLeadDoctype:", error);
        frappe.msgprint("Error in creating Lead doctype");
        return;
    }
}


//to create doctype of customer/supplier
async function createCustomeSupplierDoctype(values) {

    let party_type = values['party_type'];
    let name = values['name'];
    let type = values['type'];

    try {
        const response = await frappe.call({
            method: 'master_data_services.master_data_services.page.partyimporttool.partyimporttool.createCustomeSupplierDoctype',
            args: {
                party_type: party_type,
                name: name,
                type: type,
            },
        });
        return response;
    } catch (error) {
        console.log("Error in createCustomeSupplierDoctype:", error);
        frappe.msgprint("Error in creating doctype");
        return;
    }
}


//to create contact doctype
async function createContactDoctype(contacts, companyName) {

    console.log(contacts)

    try {
        const response = await frappe.call({
            method: 'master_data_services.master_data_services.page.partyimporttool.partyimporttool.insertNewContacts',
            args: {
                contactList: contacts || [],
                companyName: companyName,
            },
        });
        return response.message;
    } catch (error) {
        console.log("Error in createContactDoctype:", error);
        frappe.msgprint("Error in creating contact doctype");
        return;
    }
}


//fetch all the info of company/director - Second API CALL , while clicking on Import Button
async function getAllDetails(formData) {
    try {
        const response = await fetch("https://www.mca.gov.in/bin/MDSMasterDataServlet", {
            method: 'POST',
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        //to handle unexpected end of json error
        const result = await response.json();

        if (result && result.data) {
            return result.data;
        } else {
            console.log(result);
            frappe.msgprint("Unexpected response format. Please try again later.");
            return "Try Later";
        }
    }
    catch (error) {
        console.error("Error in getAllDetails:", error);
        frappe.msgprint("Plese try after some time")
        return "Try Later";
    }
}


//fetch basic info of company/director - First API CALL , After clicking on Search button
async function getData(name, searchOption) {

    try {
        console.log(`https://www.mca.gov.in/bin/mca/mds/commonSearch?module=MDS&searchKeyWord=${name}&searchType=autosuggest&mdsSearchType=${searchOption}`)
        let result = await fetch(`https://www.mca.gov.in/bin/mca/mds/commonSearch?module=MDS&searchKeyWord=${name}&searchType=autosuggest&mdsSearchType=${searchOption}`);
        // let result = await fetch(`https://www.mca.gov.in/bin/mca/mds/commonSearch?module=MDS&searchKeyWord=tata&searchType=autosuggest&mdsSearchType=company`);

        if (!result.ok) {
            frappe.throw(`HTTP error! Status: ${result.status}`);
        }
        const companyDetails = await result.json();

        if (companyDetails && companyDetails.data && companyDetails.data.result) {
            return companyDetails.data.result;
        } else {
            frappe.msgprint("Internal error occured,try after some time")
            return null;
        }
    } catch (error) {
        console.log("During getData execution : ", error);
        frappe.msgprint('An error occurred while fetching data.');
        return null;
    }
}


//capitalize the first letter of firstname and lastname and return full name
function capitalize(firstname, lastname) {
    const capitalizeWord = (word) => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();

    const capitalizedFirstName = capitalizeWord(firstname);
    const capitalizedLastName = capitalizeWord(lastname);

    return `${capitalizedFirstName} ${capitalizedLastName}`;
}
