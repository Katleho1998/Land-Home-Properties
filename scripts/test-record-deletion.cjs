const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
let role='admin',failure=null,calls=[],events=[];const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/crm/delete-record.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
 exports:output,require:n=>n==='@/lib/supabase'?{supabase:()=>({rpc:async(name,args)=>{calls.push({name,args});return {error:failure}}})}:n==='./staff-auth'?{useStaff:()=>({profile:{role}})}:require(n),window:{dispatchEvent:e=>events.push(e.type)},Event,console,Date,Error
});
(async()=>{
 const record={id:'CONTACT-TEST',__revision:4};
 for(role of ['admin','staff','viewer']){
  const html=renderToStaticMarkup(React.createElement(output.DeleteRecordButton,{collection:'contacts',record,label:'Test contact',onDeleted:()=>{}}));
  assert.equal(html.includes('Delete'),role==='admin');
 }
 const html=renderToStaticMarkup(React.createElement(output.DeleteConfirmation,{collection:'contacts',record,label:'Test contact',close:()=>{},onDeleted:()=>{}}));
 assert.match(html,/Are you sure/);assert.match(html,/Type CONTACT-TEST to confirm/);assert.match(html,/disabled="">Delete permanently/);
 for(const collection of output.deletableCollections)await output.deleteCRMRecord(collection,record);
 assert.equal(calls.length,11);assert.equal(events.length,11);assert.equal(calls[0].args.expected_revision,4);
 await assert.rejects(()=>output.deleteCRMRecord('settings',record),/cannot be deleted/);
 await assert.rejects(()=>output.deleteCRMRecord('contacts',{id:'X'}),/reopen/);
 for(const [message,pattern] of [['LINKED_RECORDS',/linked/],['CONFLICT',/changed/],['ACCESS',/Admin/]]){failure={message};await assert.rejects(()=>output.deleteCRMRecord('contacts',record),pattern);}
 assert.equal(events.length,11,'No success notification for failed requests');
 const sql=fs.readFileSync('supabase/migrations/202610260001_record_deletion.sql','utf8');
 assert.match(sql,/before delete on public.lh_crm_records/);assert.match(sql,/expected_revision is null/);assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/is distinct from 'admin'/);
 console.log('PASS: 11 record types, role controls, confirmation disabled initially, revision checks, linked/conflict/access errors and no false success events. SQL execution remains a deployment check.');
})().catch(e=>{console.error(e);process.exitCode=1});
