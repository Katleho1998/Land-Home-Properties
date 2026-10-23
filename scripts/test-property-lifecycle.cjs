const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
let role='admin',failure=null,calls=[],events=[];
const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/crm/archive-audit.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
 exports:output,require:n=>n==='@/lib/supabase'?{supabase:()=>({rpc:async(name,args)=>{calls.push({name,args});return {error:failure}}})}:n==='./staff-auth'?{useStaff:()=>({profile:{role}})}:require(n),window:{dispatchEvent:e=>events.push(e.type)},Event,console,Date,Error
});
const property={id:'PROP-TEST',title:'Test home',town:'Ficksburg',status:'Published',__revision:4};
(async()=>{
 for(role of ['admin','staff','viewer']){
  const html=renderToStaticMarkup(React.createElement(output.PropertyActions,{property,onSaved:()=>{}}));
  assert.equal(html.includes('Archive'),role!=='viewer');
  assert.equal(html.includes('Delete'),role==='admin');
  const archived=renderToStaticMarkup(React.createElement(output.PropertyActions,{property:{...property,status:'Archived'},onSaved:()=>{}}));
  assert.equal(archived.includes('Restore'),role==='admin');
 }
 for(const operation of ['archive','restore','delete'])await output.applyPropertyAction(property,operation);
 assert.deepEqual(calls.map(c=>c.args.operation),['archive','restore','delete']);
 assert.equal(calls[0].name,'lh_property_action');assert.equal(calls[0].args.expected_revision,4);assert.equal(events.length,3);
 await assert.rejects(()=>output.applyPropertyAction({...property,__revision:undefined},'archive'),/Refresh/);
 assert.equal(calls.length,3);
 for(const [message,expected] of [['CONFLICT: changed',/Someone changed/],['LINKED_RECORDS: exists',/Archive it instead/],['ACCESS: forbidden',/cannot perform/]]){
  failure={message};await assert.rejects(()=>output.applyPropertyAction(property,'delete'),expected);
 }
 assert.equal(events.length,3,'Failed operations must not broadcast success');
 const sql=fs.readFileSync('supabase/migrations/202610230002_property_archive_audit.sql','utf8');
 assert.match(sql,/after insert or update or delete on public.lh_crm_records/);
 assert.match(sql,/expected_revision is null or p.revision<>expected_revision/);
 assert.match(sql,/operation in \('restore','delete'\) and role_name<>'admin'/);
 assert.match(sql,/LINKED_RECORDS/);assert.match(sql,/Restore as a draft before publishing/);
 console.log('PASS: role-specific controls, revision-bearing archive/restore/delete requests, conflict and linked-record errors, no false success events; migration guard contracts. Live SQL acceptance still required.');
})().catch(e=>{console.error(e);process.exitCode=1});
