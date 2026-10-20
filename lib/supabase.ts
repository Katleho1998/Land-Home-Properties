import {createClient,type SupabaseClient} from '@supabase/supabase-js';
// Public connection settings only. Database policies enforce access.
export const supabaseUrl='https://fgwvrgqwruzdstscgmys.supabase.co';
export const supabasePublicKey='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd3ZyZ3F3cnV6ZHN0c2NnbXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NzU1OTUsImV4cCI6MjEwODA1MTU5NX0.JM9knYdlTSkC_KbzowNwsriWJKaRDPgTqxUZIidfAWg';
export const sharedCRMEnabled=true;
let client:SupabaseClient|undefined;
export function supabase(){return client??=createClient(supabaseUrl,supabasePublicKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}
