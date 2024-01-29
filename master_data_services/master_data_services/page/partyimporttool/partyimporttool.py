import frappe
import json


#fetching email/phone from contact doctype database
@frappe.whitelist()
def getDatabaseData():
    
    contacts = frappe.db.get_list("Contact",fields = ['email_ids.email_id'],pluck="email_id")
    mobileno = frappe.db.get_list("Contact",fields = ['phone_nos.phone'],pluck="phone")
    mobileno = [mobile for mobile in mobileno if mobile is not None];
    contacts.extend(mobileno)

    return contacts


#insert the contacts into dataabase 
@frappe.whitelist()
def insertNewContacts(contactList, companyName):

    contact_list = json.loads(contactList)
    if(len(contact_list) == 0): return;
    
    databaseList = getDatabaseData();

    #checking that contact is already present or not
    addToDb = []
    for contact in contact_list:
        email = contact['email_id'];
        phone_no = contact['phone_no'];
        print(phone_no);
        if email not in databaseList and phone_no not in databaseList:
            addToDb.append(contact)

    if(len(addToDb) == 0): 
     frappe.msgprint("Contacts are already in database");
     return;
    
    #add contact to database
    for contact_data in addToDb:
        name = contact_data['name'].split(" ")
        first_name = name[0]
        last_name = name[1]

        print(contact_data)

        contact_doc = frappe.get_doc({
            'doctype': 'Contact',
            'first_name': first_name,
            'last_name': last_name,
            'designation': 'Director',
            'company_name': companyName,
        })

        email = contact_data.get('email_id','')
        if email:
            contact_doc.append("email_ids", {
                'doctype': 'Email ID',
                'email_id': contact_data['email_id']
            })
        
        phone_no  = contact_data.get('phone_no','')
        if phone_no:
            contact_doc.append("phone_nos", {
                'doctype': 'Phone',
                'phone': contact_data['phone_no'],
            })

        try:
            contact_doc.insert()
        except Exception as e:
            return f"Error inserting data: {e}"

    return "Data inserted successfully"


#create documents for customer/supplier doctype
@frappe.whitelist()
def createCustomeSupplierDoctype(party_type,name,type):

    #in supplier no need to check exists or not bcz it checks automatically
    if(party_type == 'Supplier'):
        data = {
           'doctype' : party_type,
           'supplier_name' : name,
           'supplier_type' : type,
        }

    #in customer if it exists then it creates new as cname -1/-2/-3...
    #so no need to check that it exists or not.
    elif(party_type == 'Customer'):
       data = {
           'doctype' : party_type,
           'customer_name' : name,
           'customer_type' : type,
        } 

    try:
        doc = frappe.get_doc(data)
        doc.insert()
    except Exception as e:
        return f"Error insertinig data: {e}"
    

#create documents for lead doctype
@frappe.whitelist()
def creatLeadDoctype(first_name,organization_name,status):

    try:
        existsOrnot = frappe.db.exists({"doctype": "Lead", "first_name":first_name, "company_name":organization_name, "status": status})
        if(existsOrnot != None):
            return;
    
        doc = frappe.get_doc({
            'doctype' : 'Lead',
            'first_name' : first_name,
            'company_name' : organization_name,
            'status' : status,
        })
        doc.insert()

    except Exception as e:
        return f"Error insertinig data: {e}"


#create document for addresses
@frappe.whitelist()
def createAddressDoctype(addresses,companyName):

    addresses = json.loads(addresses);
    print("Inside py code , addresses : ",addresses)

    try:

        getDbAddress = frappe.db.get_list("Address",filters = [{'address_title':companyName}],fields=['pincode'],pluck='pincode')
        print(getDbAddress)

        for key in addresses:
            if key not in getDbAddress:
                doc = frappe.get_doc({
                    'doctype' : 'Address',
                    'address_type' : 'Billing',
                    'address_title' : companyName,
                    'address_line1': addresses[key]['streetAddress'],
                    'city' : addresses[key]['city'],
                    'country' : addresses[key]['country'],
                    'pincode' : key,
                })
                doc.insert()

    except Exception as e:
        return f"Error inserting addresses : {e}"