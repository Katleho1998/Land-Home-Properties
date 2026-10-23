import {createClient} from '@supabase/supabase-js';
const projectUrl='https://fgwvrgqwruzdstscgmys.supabase.co';
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createHandler(factory=createClient){return async function handler(request){
 if(request.method!=='POST')return reply(405,{error:'Use POST.'});
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply(403,{error:'Use the CRM to create accounts.'});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return reply(401,{error:'Please sign in again.'});
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return reply(503,{error:'User creation is not configured. Enable the server connection in Netlify.'});
 if(!request.headers.get('content-type')?.includes('application/json'))return reply(415,{error:'Invalid request format.'});
 const client=factory(projectUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:auth,error:authError}=await client.auth.getUser(token);
  if(authError||!auth.user)return reply(401,{error:'Please sign in again.'});
  const {data:membership,error:membershipError}=await client.from('lh_staff').select('role').eq('user_id',auth.user.id).maybeSingle();
  if(membershipError||membership?.role!=='admin')return reply(403,{error:'Only administrators can create users.'});
  const raw=await request.text();if(raw.length>4000)return reply(413,{error:'Request too large.'});
  let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid request.'});}
  const {email,password,display_name,role}=body||{};
  if(typeof email!=='string'||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||typeof password!=='string'||password.length<12||password.length>128||typeof display_name!=='string'||display_name.trim().length<2||display_name.length>80||!['admin','staff'].includes(role))return reply(400,{error:'Enter a name, valid email, Admin or Staff role, and a password of 12–128 characters.'});
  const {data:created,error:createError}=await client.auth.admin.createUser({email:email.trim().toLowerCase(),password,email_confirm:true,user_metadata:{full_name:display_name.trim()}});
  if(createError||!created.user)return reply(409,{error:'Account not created. The email may already exist or the password may not meet the security policy. Existing accounts are not changed.'});
  const {error:enrollError}=await client.rpc('lh_enroll_staff',{actor_id:auth.user.id,target_user:created.user.id,new_role:role,full_name:display_name.trim()});
  if(enrollError){
   const {error:cleanupError}=await client.auth.admin.deleteUser(created.user.id);
   return reply(503,{error:cleanupError?'Staff access was not created. An unused login may remain; ask your project administrator to inspect Authentication users before retrying.':'Staff access was not created. Check the database update and admin access, then retry.'});
  }
  return reply(201,{created:true,user_id:created.user.id});
 }catch{return reply(503,{error:'The account service could not complete the request. Check the team list before retrying.'});}
};}
export default createHandler();
