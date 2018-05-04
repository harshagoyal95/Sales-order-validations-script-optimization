/* This script is conversion from SuiteScript1.0 to SuiteScript2.0 for 'Splunk Order to Cash flow' from the following scripts

1.Script Name:"Splunk_Sales Order_Default_ Credit_ Card":
 Script Description:This script is used to set the all credit card fields values and check the get authorization checkbox  under payment subtab when payment type is credit card on SO.
	 This script file is part of Splunk pledge to create a $0 invoice when opprtunity is Non profit academic 
	 Script is used to set Terms(based on Bill to Customer's default Terms) if Payment Type != Credit Card.
	 Script is used to check payment method if it is stripe payment then do not override customer default cc details on SO.

2.Script Name:"Fetching customer field_invoice":
 Script Description:This script loads the custom fields when the customer name is selected on invoice form. 
	 The script fetches value of few fields from the customer record and sets the same on invoice page
	 This Script is used to validate copy of the same line items on invoice
	 This script updated to load the custom fields when the customer name is selected on sales order form. 
	 The script fetches value of few fields from the customer record and sets the same on sales order page.
*/
/* @AUTHOR : Harsha Goyal
*  @Project: NS Get Well
*  @Release Date :  
*  @Release Number :
*  @Project Number : 
*  @version 1.0
*/
/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */

define(['N/record', 'N/search','N/runtime'],
function(record, search,runtime) {
    function pageInit(sContext){  
    	var rec= sContext.currentRecord;
    	try{
			if(sContext.mode=='copy'){
				if(rec.type== record.Type.SALES_ORDER){
				//Set Credit Card payment details on copy sales order.
				  setCreditCardPaymentDetails(rec,sContext);
				}
			}
			if(sContext.mode== 'edit' || sContext.mode=='create'){
				var recType= rec.type;
				if(recType== record.Type.SALES_ORDER || recType== record.Type.INVOICE){
					//Set Special invoice Customer and comment values on sales order from Customer record.
					setSpecialInvoiceCustomerValues(rec);
				}
			}
    	}
    	catch(error) {
    		alert(error.message);
    	}
    }
    function fieldChanged(sContext) {
		var rec= sContext.currentRecord;
		var recType= rec.type;
		try{
			if(recType== record.Type.SALES_ORDER)
			{
				if(sContext.fieldId=='custbodymab_payment_type'){
					//Set Credit Card payment details if payment type field changed
					setCreditCardPaymentDetails(rec,sContext);
				}
				else{
					if(sContext.fieldId=='creditcard'){
						var pay= rec.getValue('paymentmethod');
						rec.setValue('pnrefnum',null);
						rec.setText('ccavsstreetmatch',"");
						rec.setText('ccavszipmatch',"");
						rec.setValue('authcode',null);
						if(pay){
							rec.setValue('getauth',true);
						}
					}
				}
				if(sContext.fieldId=='custbody_opportunity_type'){
				//On Pledge sales Orders clear payment and Credit card details for Opportunity Type "Nonprofit-Academic" (internalid = 21)
					setPaymentDetailsForPledgeOrders(rec);
				}	
			}
			if(recType== record.Type.SALES_ORDER || recType== record.Type.INVOICE){
				if(sContext.fieldId=='entity'){
					//Set special invoice customer values on sales order and invoice
					setSpecialInvoiceCustomerValues(rec);
				}
			}
			}
		catch(error){
			alert(error.message);
		}
	}
    function validateLine(sContext) {
    	try{
    		var rec=sContext.currentRecord;
    		var recType=rec.type;
    		if(recType==record.Type.INVOICE){
    			validateCopyofSameLineItems(rec,sContext);
    		}
    		return true;
    	}
    	catch(e){
    		log.error(e.name || e.getCode(), e.message || e.getDetails());
    	}
    }
    
    function setCreditCardPaymentDetails(rec,sContext){
    	//log.debug('Credit card function called');
		var pValue= rec.getValue('paymentmethod');			
		var paymentType= rec.getValue('custbodymab_payment_type');
		var customer=rec.getValue('entity');
		var custRec= record.load({type:'customer',id: customer});      
		if(paymentType =='7' || paymentType =='8'|| paymentType =='9'|| paymentType =='10'){
			rec.setValue('creditcard',"");
			rec.setValue('getauth',false);
			rec.setValue('paymentmethod',"");
			rec.setValue('ccstreet',null);
			rec.setValue('pnrefnum',null);
			rec.setText('ccavsstreetmatch',"");
			rec.setText('ccavszipmatch',"");
			rec.setValue('authcode',null);
			rec.setValue('cczipcode',null);
			var customerTerms= custRec.getValue('terms');
			if(customerTerms){
				rec.setValue('terms',customerTerms);
			}
		}
		else{
			if(customer){
				var paymentMethod= rec.getValue('paymentmethod');
				var cards=custRec.getLineCount('creditcards');
				for(var i=0;i<cards;i++){
					var values= custRec.getSublistValue('creditcards','ccdefault', i);
					if(values=='T' && paymenttype =='6' && paymentmethod != 9){
						var id= custRec.getSublistValue('creditcards','internalid',i);
						rec.setValue('creditcard',id);
						if(id){
							rec.setValue('getauth',true);
						}
						else{
								rec.setValue('getauth',false);
						}
					}
				}
			}
		}		
		
    }
//Clear Payment Method and credit card details for Splunk Pledge Orders having Opportunity Type "Nonprofit-Academic" (internalid = 21)
    function  setPaymentDetailsForPledgeOrders(soRec) {
    	soRec.setValue('getauth',false);
    	var opptytype = soRec.getValue('custbody_opportunity_type'); // Splunk Pledge
    	log.debug('opportunity type',opptytype);
    	if(opptytype=='21'){
    		soRec.setValue('creditcard',"");
    		soRec.setValue('getauth',false);
    		soRec.setValue('ccstreet',null);
    		soRec.setText('paymentmethod',"");
    		soRec.setText('ccavsstreetmatch',"");
    		soRec.setText('ccavszipmatch',"");
    		soRec.setValue('cczipcode',null);
    		soRec.setValue('authcode',null);
    		soRec.setValue('pnrefnum',null);
    	}	
    }
  //Set Special invoice Customer flag and customer comments values on sales order from Customer record.
    function setSpecialInvoiceCustomerValues(rec) {
    	var custid= rec.getValue('entity');
    	if(custid){
    		var custData = search.lookupFields({type: search.Type.CUSTOMER,id: custid, columns:['custentity_specialinvoice_customer','custentity_comments_customer']});
    		var spclInvFlag= custData.custentity_specialinvoice_customer;
    		var invComments=custData.custentity_comments_customer;
    		rec.setValue('custbody_special_invoice', spclInvFlag);
    		rec.setValue('custbody_comments', invComments);
    	}
    }
    function validateCopyofSameLineItems(rec,sContext){
		var context=runtime.executionContext;
		var currentRole=runtime.getCurrentUser().role;
		var requiredRole=0;
		var scriptObj=runtime.getCurrentScript();
		var role=scriptObj.getParameter('custscript_spk_invoice_lineitem_restrict');
		var conrole= role.split(",");
		var conlen=conrole.length;		
		for(var j=0;j<conlen;j++){
			if(conrole[j]==currentRole){
				requiredRole=1;
			}
		}
		if(requiredRole==1){
			if(sContext.sublistId=='item'){
				var createFromId= rec.getValue('createdfrom');
				if(createFromId){
					var inItemCount=rec.getLineCount('item');
					var currentInItemId=rec.getCurrentSublistValue('item','item');
					var line= rec.getCurrentSublistValue('item','line');
					var currentInvItemType=rec.getCurrentSublistValue('item','itemtype');
					for(var itemIndex=0;itemIndex<inItemCount;itemIndex++){
						var inItemId=rec.getSublistValue('item', 'item', itemIndex);
						if((inItemId == currentInItemId) && !line && (currentInvItemType !=null && currentInvItemType !='' && currentInvItemType !='Description')){
							log.debug('Same item found');
							rec.setCurrentSublistValue('item', 'custcol_spk_itemcopy', true);
						}
					}
				}
			}			
			return true;
		}
		return true;			
	} 
	return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        validateLine: validateLine
    };	
});