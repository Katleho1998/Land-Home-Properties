'use client';
import {useRef,useState} from 'react';
import {ArrowUpRight,Send,Sparkles} from 'lucide-react';
import {whatsapp} from './business';
type Message={role:'user'|'assistant';content:string};
export function AIChat(){
  const [messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false);
  const full=messages.length>=12;
  async function send(){
    if(lock.current||!draft.trim()||full)return;
    lock.current=true;setBusy(true);setError('');
    const text=draft.trim(),next:Message[]=[...messages,{role:'user',content:text}];
    try{
      const response=await fetch('/.netlify/functions/property-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next}),signal:AbortSignal.timeout(25000)});
      const data=await response.json().catch(()=>null) as {answer?:string;error?:string}|null;
      if(!response.ok||typeof data?.answer!=='string'||!data.answer)throw new Error(data?.error||(response.status===429?'Please wait a minute before sending another message.':'AI chat is unavailable here. Please use the guided finder below or contact the team.'));
      setMessages([...next,{role:'assistant',content:data.answer}]);setDraft('');
    }catch(e){setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:'The assistant took too long. Please try again.')}
    finally{lock.current=false;setBusy(false)}
  }
  const brief='Hello Land & Home, here is what I’m looking for:\n\n'+messages.filter(m=>m.role==='user').map(m=>m.content).join('\n\n');
  return <section className="ai-chat" aria-label="AI property assistant"><div className="ai-chat-title"><Sparkles size={18}/><strong>Let’s talk about your next move</strong></div><p className="ai-chat-notice">AI guidance, not confirmed property availability. Messages are sent to OpenAI when you press Send. Avoid sensitive information. This chat does not save a CRM lead.</p><div className="ai-messages" role="log" aria-live="polite" aria-relevant="additions">{messages.length===0&&<p className="ai-message assistant">Tell me what you have in mind — for example, “I’m looking for a three-bedroom rental in Ficksburg under R7,000.”</p>}{messages.map((m,i)=><div className={'ai-message '+m.role} key={i}><small>{m.role==='user'?'YOU':'LAND & HOME · AI'}</small><p>{m.content}</p></div>)}</div>{busy&&<p role="status">Thinking about your next move…</p>}{error&&<p className="form-error" role="alert">{error}</p>}<form onSubmit={e=>{e.preventDefault();void send()}}><label className="modern-field">Your message<textarea rows={3} maxLength={1200} required value={draft} onChange={e=>setDraft(e.target.value)} disabled={busy||full} placeholder="Your area, budget and what matters most…"/></label><button className="btn" disabled={busy||full||!draft.trim()}><Send size={16}/>{busy?'Thinking…':'Send to AI'}</button></form>{full&&<p className="ai-chat-notice">You’ve reached the end of this chat. Share your brief with the team or start a new conversation.</p>}{messages.length>0&&<div className="ai-chat-actions"><a className="text-link" href={whatsapp(brief)} target="_blank" rel="noreferrer">Review my brief in WhatsApp<ArrowUpRight size={16}/></a><button className="text-link" disabled={busy} onClick={()=>{setMessages([]);setError('');setDraft('')}}>Start a new chat</button></div>}<p className="ai-chat-notice">AI can make mistakes. Confirm details with our team. WhatsApp opens with your messages only; review and press Send there.</p></section>
}
