import assert from 'node:assert/strict';
import handler from '../netlify/functions/enquiries.mjs';

const originalFetch=globalThis.fetch;
const originalSecret=process.env.SUPABASE_SECRET_KEY;
const originalLegacy=process.env.SUPABASE_SERVICE_ROLE_KEY;
const fields={enquiry_type:'Buying',name:'Integration Test',phone:'0710000000',message:'Test only',popia_consent:'on'};
const requestId='12345678-1234-4234-8234-123456789abc';
const request=(value={},origin='https://example.com')=>new Request('https://example.com/.netlify/functions/enquiries',{
  method:'POST',headers:{origin,'Content-Type':'application/json'},
  body:JSON.stringify({requestId,fields,...value})
});
let calls=0;
try {
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal((await handler(new Request('https://example.com/.netlify/functions/enquiries'))).status,200);
  assert.equal((await handler(request())).status,503);
  process.env.SUPABASE_SECRET_KEY='sb_secret_test';
  globalThis.fetch=async(url,options)=>{
    calls++;
    assert.match(url,/\/rpc\/lh_submit_enquiry$/);
    assert.equal(options.headers.apikey,'sb_secret_test');
    assert.equal(options.headers.Authorization,undefined);
    const body=JSON.parse(options.body);
    assert.equal(body.request_id,requestId);
    assert.equal(body.payload.popia_consent,'on');
    assert.equal(body.payload.privateInjection,undefined);
    return Response.json({accepted:true,reference:'LEAD-test'});
  };
  assert.equal((await handler(request({},'https://untrusted.example'))).status,403);
  assert.equal((await handler(request({fields:{...fields,popia_consent:''}}))).status,400);
  assert.equal((await handler(request({requestId:'bad'}))).status,400);
  assert.equal((await handler(request({fields:{...fields,enquiry_type:'buyer'}}))).status,400);
  assert.equal(calls,0);
  const success=await handler(request({fields:{...fields,privateInjection:'must be removed'}}));
  assert.equal(success.status,200);
  assert.deepEqual(await success.json(),{accepted:true,reference:'LEAD-test'});
  await handler(request());
  assert.equal(calls,2,'Retries preserve the same database request reference');
  globalThis.fetch=async()=>Response.json({message:'REQUEST_CONFLICT'},{status:400});
  assert.equal((await handler(request())).status,409);
  globalThis.fetch=async()=>Response.json({message:'private database diagnostic'},{status:500});
  const failure=await handler(request());
  assert.equal(failure.status,503);
  assert(!JSON.stringify(await failure.json()).includes('private database diagnostic'));
  globalThis.fetch=async()=>{throw new Error('connection lost')};
  assert.equal((await handler(request())).status,503);
  console.log('PASS: server-key gating, origin validation, consent, form validation, field allowlist, stable retry ID, secret-key headers, conflict handling and no false success.');
} finally {
  globalThis.fetch=originalFetch;
  if(originalSecret===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=originalSecret;
  if(originalLegacy===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=originalLegacy;
}
