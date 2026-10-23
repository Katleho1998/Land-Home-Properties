const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ts=require('typescript');
const output={};
let rows=[],rpcCalls=[],failure=null;
const api={
  from(table){
    assert.equal(table,'lh_crm_records');
    const query={select(){return this},order(){return this},async range(start,end){return {data:rows.slice(start,end+1),error:null}}};
    return query;
  },
  async rpc(name,payload){if(name==='lh_assignment_labels')return {data:['Principal','QA Agent'],error:null};rpcCalls.push({name,payload});return {error:failure}}
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/crm/shared-store.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,{
  exports:output,require:name=>{if(name==='./audit')return {recordClientEvent:async()=>{}};assert.equal(name,'@/lib/supabase');return {supabase:()=>api}},
  structuredClone,Map,JSON,Error
});
(async()=>{
  const empty=await output.readSharedState();
  assert.equal(empty.properties.length,0);
  assert.equal(empty.leads.length,0);
  assert.equal(empty.settings.agents[1],'QA Agent');
  assert.equal(empty.settings.email,'hello@landhomeproperties.co.za');
  rows=Array.from({length:501},(_,i)=>({collection:'contacts',id:`C-${i}`,revision:3,data:{id:`C-${i}`,name:'Test'}}));
  assert.equal((await output.readSharedState()).contacts.length,501,'Read all pages, not just first 500');
  await output.mutateSharedState(state=>{state.contacts[0].name='Updated'});
  assert.equal(rpcCalls.length,1);
  assert.equal(rpcCalls[0].name,'lh_apply_changes');
  assert.equal(rpcCalls[0].payload.changes.length,1,'Only changed record sent');
  assert.equal(rpcCalls[0].payload.changes[0].expected_revision,3);
  assert.equal(rpcCalls[0].payload.changes[0].data.__revision,undefined);
  rpcCalls=[];
  await output.mutateSharedState(state=>{state.contacts[0]={...state.contacts[0],name:'Stale editor',__revision:1}});
  assert.equal(rpcCalls[0].payload.changes[0].expected_revision,1,'Stale editor version preserved for server rejection');
  failure={message:'CONFLICT: record changed'};
  await assert.rejects(()=>output.mutateSharedState(state=>{state.contacts[0].name='Conflict'}),/Someone updated/);
  failure=null;rpcCalls=[];
  await output.mutateSharedState(()=>{});
  assert.equal(rpcCalls.length,0,'No writes for unchanged data');
  await output.mutateSharedState(state=>{state.contacts.splice(0,1)});
  assert.equal(rpcCalls[0].payload.changes[0].data,null);
  assert.equal(rpcCalls[0].payload.changes[0].expected_revision,3);
  console.log('PASS: empty real workspace, pagination, incremental atomic change set, stale revision preservation, conflict message, no-op and deletion revision.');
})().catch(e=>{console.error(e);process.exitCode=1});
