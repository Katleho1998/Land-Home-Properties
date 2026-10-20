export async function onlineEnquiryAvailability(){
  try{
    const response=await fetch('/.netlify/functions/enquiries',{signal:AbortSignal.timeout(5000)});
    const data=await response.json() as {enabled?:boolean};
    return response.ok&&data.enabled===true;
  }catch{return false}
}
export async function submitOnlineEnquiry(fields:Record<string,string>,requestId:string){
  const response=await fetch('/.netlify/functions/enquiries',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fields,requestId}),signal:AbortSignal.timeout(20000)
  });
  const result=await response.json().catch(()=>null) as {accepted?:boolean;reference?:string;error?:string}|null;
  if(!response.ok||result?.accepted!==true||!result.reference)throw new Error(result?.error||'Your enquiry has not been confirmed. Please try WhatsApp or email instead.');
  return result.reference;
}
