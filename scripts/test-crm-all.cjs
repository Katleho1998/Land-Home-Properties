const {spawnSync}=require('node:child_process');
const suites=['test-crud-editors.cjs','test-crud-workflows.cjs','test-crm.cjs','test-shared-store.cjs','test-record-deletion.cjs','test-property-lifecycle.cjs','test-staff-ui.cjs','test-staff-users.mjs','test-shared-enquiries.mjs','test-enquiry.cjs','test-property-matching.cjs','test-ai.mjs'];
for(const suite of suites){const result=spawnSync(process.execPath,['scripts/'+suite],{stdio:'inherit'});if(result.status!==0){console.error('FAILED:',suite);process.exit(result.status||1);}}
console.log('All '+suites.length+' CRM and website-bridge suites passed. No live production records were changed.');
