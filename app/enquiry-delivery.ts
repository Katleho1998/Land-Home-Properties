// Keep disabled until the server persists enquiries to the shared CRM/database.
// Enabling the UI alone must never cause a false delivery confirmation.
export const onlineEnquiriesEnabled=false;
export async function submitOnlineEnquiry(fields:Record<string,string>){
  const response=await fetch('/.netlify/functions/enquiries',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fields}),signal:AbortSignal.timeout(20000)
  });
  const result=await response.json().catch(()=>null) as {accepted?:boolean;reference?:string;error?:string}|null;
  if(!response.ok||result?.accepted!==true||!result.reference)throw new Error(result?.error||'Your enquiry has not been confirmed. Please try WhatsApp or email instead.');
  return result.reference;
}
