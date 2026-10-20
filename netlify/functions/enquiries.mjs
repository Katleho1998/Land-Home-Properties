// Future CRM integration point. Replace only when durable storage, validation,
// consent recording, spam protection and duplicate handling are implemented.
// A success response must follow a confirmed database write:
// { accepted: true, reference: "<stored enquiry reference>" }.
export default async function handler(request){
  return Response.json(
    {accepted:false,error:'Online enquiries are coming soon. Please use WhatsApp or email; nothing has been submitted online.'},
    {status:request.method==='POST'?503:405,headers:{'Cache-Control':'no-store'}}
  );
}
export const config={rateLimit:{windowLimit:5,windowSize:60,aggregateBy:['ip','domain']}};
