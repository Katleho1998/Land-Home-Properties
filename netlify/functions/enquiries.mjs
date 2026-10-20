const projectUrl='https://fgwvrgqwruzdstscgmys.supabase.co';
const json=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fieldsAllowed=['enquiry_type','property_reference','name','email','phone','language','town','type','address','beds','baths','budget','timeline','timing','finance','date','units','rent','managed','space','transaction','term','ownership','message','notes','popia_consent'];
const requiredByKind={
  seller:['town','type','address','timing','ownership'],
  landlord:['town','units','managed','message'],
  buyer:['budget'],tenant:['budget'],viewing:['budget'],
  commercial:['transaction','message'],contact:['message']
};
export default async function handler(request){
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(request.method==='GET')return json(200,{enabled:Boolean(key)});
  if(request.method!=='POST')return json(405,{accepted:false,error:'Use POST to submit an enquiry.'});
  if(request.headers.get('origin')!==new URL(request.url).origin)return json(403,{accepted:false,error:'Submit your enquiry through our website.'});
  if(!key)return json(503,{accepted:false,error:'Online submission is not available yet. Please use WhatsApp or email.'});
  if(!request.headers.get('content-type')?.includes('application/json'))return json(415,{accepted:false,error:'Invalid request format.'});
  if(Number(request.headers.get('content-length'))>16000)return json(413,{accepted:false,error:'Please shorten your enquiry.'});
  let fields={},requestId;
  try{
    const text=await request.text();if(new TextEncoder().encode(text).length>16000)return json(413,{accepted:false,error:'Please shorten your enquiry.'});
    const payload=JSON.parse(text);requestId=payload.requestId;
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId||''))throw new Error('Invalid request reference.');
    if(!payload.fields||typeof payload.fields!=='object'||Array.isArray(payload.fields))throw new Error('Invalid enquiry.');
    for(const name of fieldsAllowed){
      if(payload.fields[name]===undefined)continue;
      if(typeof payload.fields[name]!=='string'||payload.fields[name].length>1200)throw new Error('Please shorten your enquiry.');
      fields[name]=payload.fields[name].trim();
    }
    if(fields.popia_consent!=='on')throw new Error('Please confirm consent before submitting.');
    if((fields.name||'').length<2||(fields.phone||'').replace(/\D/g,'').length<7)throw new Error('Enter your full name and a valid phone number.');
    if(fields.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))throw new Error('Enter a valid email address.');
    const kindMap={Buying:'contact',Renting:'contact',Selling:'contact','Property management':'contact',Commercial:'contact','Something else':'contact'};
    const kind=kindMap[fields.enquiry_type]||fields.enquiry_type;
    if(!Object.hasOwn(requiredByKind,kind))throw new Error('Choose an enquiry type.');
    for(const field of requiredByKind[kind])if(!fields[field])throw new Error('Please complete all required details.');
    for(const field of ['budget','units','space','beds','baths','rent'])if(fields[field]&&(!Number.isFinite(Number(fields[field]))||Number(fields[field])<0||Number(fields[field])>1e12))throw new Error('Check your numeric amounts.');
    if(fields.town&&!['Ficksburg','Meqheleng'].includes(fields.town))throw new Error('That area is coming soon. Please contact the team.');
  }catch(e){return json(400,{accepted:false,error:e instanceof SyntaxError?'Invalid enquiry.':e.message})}
  try{
    const response=await fetch(projectUrl+'/rest/v1/rpc/lh_submit_enquiry',{
      method:'POST',headers:{apikey:key,...(key.startsWith("sb_secret_")?{}:{Authorization:`Bearer ${key}`}),'Content-Type':'application/json'},
      body:JSON.stringify({request_id:requestId,payload:fields}),signal:AbortSignal.timeout(15000)
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok){
      if(data?.message?.includes('REQUEST_CONFLICT'))return json(409,{accepted:false,error:'This submission was already received with different details. Please contact the team before sending a new enquiry.'});
      return json(503,{accepted:false,error:'We could not confirm delivery. Your details remain in this form; retry the same submission or use WhatsApp.'});
    }
    if(data?.accepted!==true||typeof data.reference!=='string')return json(503,{accepted:false,error:'Delivery was not confirmed. Please retry or contact the team.'});
    return json(200,{accepted:true,reference:data.reference});
  }catch{return json(503,{accepted:false,error:'Delivery was not confirmed. Retrying the same enquiry is safe; your reference prevents duplicates.'})}
}
export const config={rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip','domain']}};
