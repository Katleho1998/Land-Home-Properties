'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,RotateCcw} from 'lucide-react';
import {AIInputWithSuggestions} from '@/components/ui/ai-input-with-suggestions';
import {whatsapp} from './business';
import {GuidedPropertySearch} from './guided-property-search';
type Message={role:'user'|'assistant';content:string};
export function AIChat({onNavigate}:{onNavigate?:()=>void}){
  const [guided,setGuided]=useState<'buy'|'rent'|'sell'|null>(null);
  const [messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(''),[pending,setPending]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),log=useRef<HTMLDivElement>(null);
  const full=messages.length>=12;
  useEffect(()=>{const el=log.current;if(el)el.scrollTop=el.scrollHeight},[messages,pending,error]);
  async function send(){
    if(lock.current||!draft.trim()||full)return;
    const text=draft.trim(),next:Message[]=[...messages,{role:'user',content:text}];
    lock.current=true;setBusy(true);setError('');setPending(text);
    try{
      const response=await fetch('/.netlify/functions/property-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next}),signal:AbortSignal.timeout(25000)});
      const data=await response.json().catch(()=>null) as {answer?:string;error?:string}|null;
      if(!response.ok||typeof data?.answer!=='string'||!data.answer)throw new Error(data?.error||(response.status===429?'Please wait a minute before trying again.':'AI chat is unavailable right now. You can still browse properties or contact our team.'));
      setMessages([...next,{role:'assistant',content:data.answer}]);setDraft('');
    }catch(e){setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:'That took a little too long. Please try again.')}
    finally{lock.current=false;setBusy(false);setPending('')}
  }
  const brief='Hello Land & Home, here is what I’m looking for:\n\n'+messages.filter(m=>m.role==='user').map(m=>m.content).join('\n\n');
  if(guided)return <GuidedPropertySearch key={guided} intent={guided} onExit={()=>setGuided(null)} onNavigate={onNavigate}/>;
  return <section className="support-chat" aria-label="Conversation with AI"><div className="support-messages" ref={log} role="log" aria-live="polite" aria-relevant="additions"><div className="support-bubble assistant"><small>LAND & HOME · AI</small><p>Hello! What does your next chapter look like? I can help you get started.</p></div>{messages.map((m,i)=><div className={'support-bubble '+m.role} key={i}><small>{m.role==='user'?'YOU':'AI ASSISTANT'}</small><p>{m.content}</p></div>)}{pending&&<div className="support-bubble user"><small>YOU</small><p>{pending}</p></div>}{busy&&<div className="support-typing" role="status"><span className="sr-only">AI is preparing a reply</span><i/><i/><i/><small aria-hidden="true">AI is typing</small></div>}{error&&<p className="support-error" role="alert">{error} Your message is still below.</p>}{full&&<p className="support-note">Share your brief with our team or start a new chat.</p>}</div><div className="support-chat-bottom">{messages.length>0&&<div className="support-tools"><a href={whatsapp(brief)} target="_blank" rel="noreferrer">Review brief in WhatsApp<ArrowUpRight size={13}/></a><button type="button" aria-label="Start a new chat" title="Start a new chat" disabled={busy} onClick={()=>{setMessages([]);setError('');setDraft('')}}><RotateCcw size={15}/></button></div>}<AIInputWithSuggestions value={draft} onChange={setDraft} onSubmit={()=>void send()} disabled={busy||full} showSuggestions={!busy} onAction={intent=>{setDraft('');setError('');setGuided(intent)}}/><p className="support-note">AI can make mistakes. Confirm availability with our team.</p></div></section>;
}
