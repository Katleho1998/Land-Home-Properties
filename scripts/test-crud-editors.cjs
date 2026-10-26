const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react');
let slots=[],cursor=0,db,fields,saved,mutations=0,sequence=0;
const hooks={...React,useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}];}};
class FormDataMock{get(k){return fields[k]??''}has(k){return Boolean(fields[k])}}
const store={mutate:async fn=>{mutations++;fn(db)},saveRecord:async(k,r)=>{saved={k,r}},log:()=>{},uid:()=>`QA-${++sequence}`,today:()=> '2026-10-26'};
function load(file,expose=false){let source=fs.readFileSync(file,'utf8');if(expose)source=source.replace('function RecordEditor(', 'export function RecordEditor(');const exports={};const mocks={react:hooks,'./store':store,'./delete-record':{},'./staff-auth':{},'./access':{},'./archive-audit':{},'./audit':{},'./account-panels':{},'./shared-store':{},'./business-panels':{},'@/lib/supabase':{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),structuredClone,FormData:FormDataMock,Intl,Date,Map,Set});return exports;}
function form(node){if(!node)return null;if(Array.isArray(node)){for(const child of node){const found=form(child);if(found)return found;}return null;}if(node.type==='form')return node;return form(node.props?.children);}
const event={preventDefault(){},currentTarget:{}};
(async()=>{
 const business=load('app/crm/business-panels.tsx');
 for(const [collection,Component,record] of [['finance',business.FinancePanel,{id:'F',kind:'Commission',description:'Old',status:'Expected',amount:10,__revision:3}],['compliance',business.CompliancePanel,{id:'C',title:'Old',category:'Other',status:'Open',__revision:3}]]){
  db={finance:[],compliance:[],deals:[],settings:{agents:[]}};db[collection]=[{...record,__revision:8}];slots=[record];cursor=0;fields={description:'Edited',title:'Edited',kind:'Commission',amount:'20',status:record.status,category:'Other',owner:'QA',date:'2026-10-26'};
  await form(Component({s:db,onSaved(){}})).props.onSubmit(event);
  assert.equal(db[collection][0].__revision,3,collection+' must retain opened revision for conflict checking');
 }
 const {RecordEditor}=load('app/crm/workspace.tsx',true);
 db={properties:[],contacts:[{id:'CONTACT',name:'Before',email:'qa@example.com',__revision:1}],settings:{agents:[]},leads:[],viewings:[]};slots=[];cursor=0;
 RecordEditor({kind:'contacts',id:'CONTACT',s:db,onClose(){},onSaved(){}});
 db.contacts[0]={...db.contacts[0],name:'Other user',__revision:2};cursor=0;fields={name:'My edit',email:'qa@example.com'};
 await form(RecordEditor({kind:'contacts',id:'CONTACT',s:db,onClose(){},onSaved(){}})).props.onSubmit(event);
 assert.equal(saved.r.__revision,1,'Background refresh must not replace the opened revision');assert.equal(saved.r.name,'My edit');
 db={properties:[],contacts:[],leads:[],viewings:[],settings:{agents:[]}};slots=[];cursor=0;mutations=0;fields={name:'QA person',email:'new@example.com',kind:'buyer',source:'manual',message:'QA enquiry'};
 await form(RecordEditor({kind:'leads',s:db,onClose(){},onSaved(){}})).props.onSubmit(event);
 assert.equal(mutations,1);assert.equal(db.contacts.length,1);assert.equal(db.leads.length,1);assert.equal(db.leads[0].contactId,db.contacts[0].id);
 console.log('PASS: actual editor submissions retain finance/compliance/contact revisions and submit new contact plus enquiry in one mutation.');
})().catch(e=>{console.error(e);process.exitCode=1});
