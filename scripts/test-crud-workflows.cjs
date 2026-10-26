// Offline integration tests: real shared-store and deletion code, transactional in-memory API.
// Does not connect to Supabase or prove deployed RLS/trigger behaviour.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
let database=new Map(),rejectNext=false;
const copy=x=>structuredClone(x);
const api={from:()=>({select(){return this},order(){return this},async range(a,b){return {data:copy([...database.values()].slice(a,b+1)),error:null}}}),async rpc(name,payload){
 if(name==='lh_assignment_labels')return {data:['QA'],error:null};
 if(rejectNext){rejectNext=false;return {error:{message:'Simulated service failure'}};}
 const changes=name==='lh_apply_changes'?payload.changes:[{collection:payload.target_collection,id:payload.target_id,expected_revision:payload.expected_revision,data:null}];
 const staged=copy(database);
 for(const c of changes){const key=c.collection+'/'+c.id,old=staged.get(key);if((old?.revision??null)!==c.expected_revision)return {error:{message:'CONFLICT: record changed'}};
 if(c.data===null)staged.delete(key);else staged.set(key,{collection:c.collection,id:c.id,data:copy(c.data),revision:(old?.revision||0)+1});}
 database=staged;return {error:null};
}};
function load(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),structuredClone,Map,JSON,Error,Event,window:{dispatchEvent(){}}});return exports;}
const mocks={'@/lib/supabase':{supabase:()=>api},'./audit':{},'./staff-auth':{}};
const store=load('app/crm/shared-store.ts',mocks),deletion=load('app/crm/delete-record.tsx',mocks);
(async()=>{
 const collections=['properties',...deletion.deletableCollections];
 for(const collection of collections){
  const id='QA-'+collection,record={id,name:'QA record',title:'QA record',createdAt:'2026-10-26T08:00:00Z'};
  await store.mutateSharedState(s=>s[collection].push(record));
  let state=await store.readSharedState();assert.equal(state[collection][0].id,id);assert.equal(state[collection][0].__revision,1);
  const stale=copy(state[collection][0]);
  await store.mutateSharedState(s=>{s[collection][0]={...stale,name:'Updated'};});
  state=await store.readSharedState();assert.equal(state[collection][0].name,'Updated');assert.equal(state[collection][0].__revision,2);
  await assert.rejects(()=>store.mutateSharedState(s=>{s[collection][0]={...stale,name:'Stale overwrite'};}),/Someone updated/);
  if(collection!=='properties')await assert.rejects(()=>deletion.deleteCRMRecord(collection,stale),/changed/);
  rejectNext=true;await assert.rejects(()=>store.mutateSharedState(s=>{s[collection][0].name='Failed save';}));
  assert.equal((await store.readSharedState())[collection][0].name,'Updated');
  if(collection==='properties')await store.mutateSharedState(s=>{s.properties=[];});else await deletion.deleteCRMRecord(collection,state[collection][0]);
  assert.equal((await store.readSharedState())[collection].length,0);
  await assert.rejects(()=>store.mutateSharedState(s=>{s[collection].push({...stale,name:'Resurrect deleted'});}),/Someone updated/);
 }
 await store.mutateSharedState(s=>{s.settings.agency='QA agency';});let settings=(await store.readSharedState()).settings;
 await store.mutateSharedState(s=>{s.settings={...settings,agency:'Updated agency'};});
 await assert.rejects(()=>store.mutateSharedState(s=>{s.settings={...settings,agency:'Stale agency'};}),/Someone updated/);
 // A failure halfway through the multi-record request must not persist the contact.
 await assert.rejects(()=>store.mutateSharedState(s=>{s.contacts.push({id:'QA-atomic',name:'Atomic'});s.leads.push({id:'QA-failing-lead',createdAt:'2026-10-26',__revision:99});}),/Someone updated/);
 assert.equal((await store.readSharedState()).contacts.length,0);
 console.log('PASS: CRUD round trips across 12 collections; settings create/read/update; stale edits/deletes, deleted-record resurrection, save failures and atomic contact/enquiry rollback. Offline API simulation only.');
})().catch(e=>{console.error(e);process.exitCode=1});
