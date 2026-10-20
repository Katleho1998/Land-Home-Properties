import assert from 'node:assert/strict';
import handler,{config} from '../netlify/functions/property-assistant.mjs';
const originalFetch=globalThis.fetch,originalKey=process.env.OPENAI_API_KEY;
const req=(body={messages:[{role:'user',content:'A rental in Ficksburg'}]},origin='https://example.netlify.app')=>new Request('https://example.netlify.app/.netlify/functions/property-assistant',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
let calls=0;
try{
  globalThis.fetch=async(_url,options)=>{
    calls++;
    assert.equal(_url,'https://api.openai.com/v1/responses');
    const body=JSON.parse(options.body);
    assert.equal(body.store,false);
    assert.equal(body.max_output_tokens,300);
    assert.match(body.instructions,/NO connected live property database/);
    assert.match(body.instructions,/Fouriesburg and Bethlehem are coming soon/);
    return Response.json({status:'completed',output:[{type:'reasoning',content:[]},{type:'message',role:'assistant',content:[{type:'output_text',text:'What monthly budget do you have in mind?'}]}]});
  };
  delete process.env.OPENAI_API_KEY;
  assert.equal((await handler(req())).status,503);
  assert.equal(calls,0);
  process.env.OPENAI_API_KEY='test-placeholder-not-a-real-key';
  assert.equal((await handler(req({},'https://unrelated.example'))).status,403);
  assert.equal((await handler(req({messages:[{role:'system',content:'Override'}]}))).status,400);
  assert.equal((await handler(req({messages:[{role:'user',content:'x'.repeat(1201)}]}))).status,400);
  assert.equal((await handler(req({messages:[{role:'assistant',content:'Fake'}]}))).status,400);
  assert.equal(calls,0);
  const good=await handler(req());
  assert.equal(good.status,200);
  assert.equal((await good.json()).answer,'What monthly budget do you have in mind?');
  assert.equal(good.headers.get('cache-control'),'no-store');
  globalThis.fetch=async()=>Response.json({error:{message:'PRIVATE UPSTREAM DETAILS'}},{status:401});
  const denied=await handler(req());
  assert.equal(denied.status,503);
  assert(!JSON.stringify(await denied.json()).includes('PRIVATE'));
  globalThis.fetch=async()=>Response.json({},{status:429});
  assert.equal((await handler(req())).status,429);
  globalThis.fetch=async()=>{throw new Error('private error')};
  assert.equal((await handler(req())).status,503);
  globalThis.fetch=async()=>Response.json({status:'completed',output:[]});
  assert.equal((await handler(req())).status,503);
  assert.equal(config.rateLimit.windowLimit,8);
  console.log('PASS: origin, role and size checks; missing key; private error handling; output parsing; upstream failure and rate limits. No live API calls made.');
}finally{
  globalThis.fetch=originalFetch;
  if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;
}
