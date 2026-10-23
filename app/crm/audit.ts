import {supabase} from '@/lib/supabase';
export async function recordClientEvent(event:string,reference=''){
 const {error}=await supabase().rpc('lh_log_client_event',{event_name:event,record_reference:reference});
 if(error)throw new Error('The activity record could not be saved. Check the archive/audit database update.');
}
// Non-mutating navigation must remain usable when the activity service is unavailable.
export function reportClientEvent(event:string,reference=''){void recordClientEvent(event,reference).catch(()=>window.dispatchEvent(new Event('lh-audit-unavailable')));}
export async function signOutWithAudit(){
 try{await recordClientEvent('Signed out');}catch{window.dispatchEvent(new Event('lh-audit-unavailable'));}
 // Never prevent sign-out merely because logging failed.
 await supabase().auth.signOut();
}
