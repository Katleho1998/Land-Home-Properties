import assert from 'node:assert/strict';
import {createHandler} from '../netlify/functions/staff-users.mjs';
process.env.SUPABASE_SECRET_KEY='test-only-key';
let role='admin',authenticated=true,created=0,deleted=0,enrollFailure=false,createFailure=false,cleanupFailure=false,calls=[];
const factory=()=>({
 auth:{getUser:async()=>({data:{user:authenticated?{id:'admin-id'}:null},error:null}),admin:{
  createUser:async input=>{created++;assert.equal(input.email,'person@example.com');assert.equal(input.user_metadata.full_name,'Test Person');assert.equal(input.email_confirm,true);return {data:{user:createFailure?null:{id:'new-id'}},error:createFailure?{}:null};},
  deleteUser:async id=>{assert.equal(id,'new-id');deleted++;return {error:cleanupFailure?{}:null};}
 }},
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role},error:null})})})}),
 rpc:async(name,payload)=>{calls.push({name,payload});return {error:enrollFailure?{}:null};}
});
const handler=createHandler(factory);
const body={email:'Person@example.com',display_name:'Test Person',password:'safe-test-password',role:'staff'};
function req(payload=body,headers={}){return new Request('https://test.example/.netlify/functions/staff-users',{method:'POST',headers:{origin:'https://test.example','content-type':'application/json',authorization:'Bearer test-token',...headers},body:JSON.stringify(payload)});}
assert.equal((await handler(req(body,{authorization:''}))).status,401);
assert.equal((await handler(req(body,{origin:'https://evil.example'}))).status,403);
authenticated=false;assert.equal((await handler(req())).status,401);authenticated=true;
for(role of ['staff','editor','viewer',null])assert.equal((await handler(req())).status,403);
assert.equal(created,0,'Unauthorized requests never reach Auth admin creation');
role='admin';
for(const invalid of [{role:'owner'},{password:'short'},{display_name:'A'},{email:'bad'}])assert.equal((await handler(req({...body,...invalid}))).status,400);
assert.equal(created,0);
assert.equal((await handler(req())).status,201);
assert.deepEqual(calls[0],{name:'lh_enroll_staff',payload:{actor_id:'admin-id',target_user:'new-id',new_role:'staff',full_name:'Test Person'}});
assert.equal(deleted,0);
createFailure=true;assert.equal((await handler(req())).status,409);createFailure=false;
assert.equal(calls.length,1,'Existing account is never enrolled or elevated');
enrollFailure=true;assert.equal((await handler(req())).status,503);assert.equal(deleted,1,'Failed enrollment cleans up newly created login');
cleanupFailure=true;const failed=await handler(req());assert.match((await failed.json()).error,/unused login may remain/);
delete process.env.SUPABASE_SECRET_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.equal((await handler(req())).status,503);
console.log('PASS: user creation authentication, role enforcement, input validation, enrollment, duplicate safety and compensation. No real accounts created.');
