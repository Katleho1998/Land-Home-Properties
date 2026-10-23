const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
let role='admin';
const profile=()=>({user_id:'test',role,display_name:'Katleho Example',email:'test@example.com',phone:'',job_title:''});
function moduleAt(path,mocks={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),console,Intl,Date,Map,Set});return exports;}
const access=moduleAt('app/crm/access.ts');
for(const r of ['staff','editor','viewer'])for(const section of access.adminSections)assert.equal(access.canOpenSection(r,section),false);
for(const section of access.adminSections)assert.equal(access.canOpenSection('admin',section),true);
for(const r of ['admin','staff','viewer'])assert.equal(access.canOpenSection(r,'My profile'),true);
const auth={useStaff:()=>({profile:profile(),refresh:async()=>{}})};
const panels=moduleAt('app/crm/account-panels.tsx',{'./staff-auth':auth,'./access':access,'@/lib/supabase':{supabase:()=>{throw new Error('No network in render tests');}}});
const state={properties:[],contacts:[],leads:[],deals:[],tasks:[{id:'task',title:'Follow up',status:'Open',priority:'Normal',agent:'Test',due:'2026-10-23',time:''}],viewings:[],leases:[],maintenance:[],documents:[],campaigns:[],finance:[],compliance:[],activities:[],settings:{agents:['Test'],responseMinutes:15}};
const workspace=moduleAt('app/crm/workspace.tsx',{'./staff-auth':auth,'./access':access,'./account-panels':panels,'@/lib/supabase':{},'./shared-store':{},'./business-panels':{},'./store':{useCRM:()=>({state,error:''})}}).default;
for(role of ['admin','staff','viewer']){
 const html=renderToStaticMarkup(React.createElement(workspace));
 assert.match(html,/Hello Katleho/);assert.match(html,/Online/);assert.doesNotMatch(html,/Supabase connected/);
 assert.match(html,/Open pending tasks: 1/);assert.match(html,/<i><\/i>/);
 for(const section of access.adminSections){const present=html.includes(`/>${section}</button>`)||html.includes(`>${section}</button>`);assert.equal(present,role==='admin',`${role}: ${section}`);}
 assert.match(html,/My profile/);
 const profileHTML=renderToStaticMarkup(React.createElement(panels.ProfilePanel));assert.match(profileHTML,/Save profile/);assert.match(profileHTML,/Current password/);assert.doesNotMatch(profileHTML,/Create account/);
}
const sql=fs.readFileSync('supabase/migrations/202610230001_staff_profiles_roles.sql','utf8');
assert.match(sql,/grant execute on function public.lh_enroll_staff\(uuid,uuid,text,text\) to service_role/);
assert.match(sql,/collection not in \('finance','compliance','campaigns','settings'\)/);
assert.match(sql,/target_collection in \('settings','finance','compliance','campaigns'\)/);
assert.match(sql,/where user_id=auth.uid\(\)/);
const css=fs.readFileSync('app/crm/crm.css','utf8');assert.match(css,/\.c-top-actions \.c-icon i\{background:#dc3545/);assert.match(css,/prefers-reduced-motion:reduce/);
console.log('PASS: personalized overview, Admin/Staff menus, profile form, Online label, notification marker and migration guard contracts. Database execution must also be checked after SQL deployment.');
