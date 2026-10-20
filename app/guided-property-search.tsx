'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowUpRight,BedDouble,Bath,RotateCcw} from 'lucide-react';
import {usePublicProperties} from './public-properties';
import {Listing,towns,zar} from './data';
import {matchProperties} from './property-matching';
import {whatsapp} from './business';

export function GuidedPropertySearch({intent,onExit,onNavigate}:{intent:'buy'|'rent'|'sell';onExit:()=>void;onNavigate?:()=>void}){
  const [answers,setAnswers]=useState<string[]>([]);
  const {listings}=usePublicProperties(),bottom=useRef<HTMLDivElement>(null);
  useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest'})},[answers.length]);
  const budgets=intent==='rent'?[4000,6000,8000,10000,15000]:[600000,900000,1200000,1500000,2000000];
  const questions=[
    {title:intent==='sell'?'Where is your property?':'Where would you like to live?',options:[...towns,...(intent==='sell'?[]:['Either area'])]},
    {title:intent==='sell'?'What type of property are you selling?':'What kind of place feels right?',options:['House','Townhouse','Flat',...(intent==='sell'?['Land','Commercial']:['Any type'])]},
    ...(intent==='sell'?[{title:'When are you thinking of selling?',options:['As soon as possible','Within 3 months','3–6 months','Just exploring']}]:[
      {title:'How many bedrooms would you like?',options:['1+','2+','3+','4+','5+','Any']},
      {title:intent==='rent'?'What is your monthly budget?':'What is your purchase budget?',options:[...budgets.map(n=>'Up to '+zar(n)),'Flexible']},
      {title:'When would you like to move?',options:['As soon as possible','Within 3 months','3–6 months','Just exploring']}
    ])
  ];
  const step=answers.length,done=step===questions.length;
  const brief={purpose:intent==='rent'?'rent' as const:'buy' as const,town:towns.includes(answers[0])?answers[0]:'',type:answers[1]==='Any type'?'':answers[1]||'',beds:parseInt(answers[2])||0,budget:budgets[questions[3]?.options.indexOf(answers[3])??-1]||0};
  const {exact,alternatives}=matchProperties(listings,brief);
  const message=`Hello Land & Home, I would like to ${intent==='sell'?'sell my property':intent==='rent'?'find a rental':'buy a home'}.\n`+answers.map((a,i)=>`${questions[i].title} ${a}`).join('\n');
  const card=(p:Listing,reasons:string[]=[])=><article className="chat-property" key={p.id}><Link href={'/property/'+p.id} onClick={onNavigate}><img src={p.image} alt={'Property preview: '+p.title}/><div><small>{p.live?'PROPERTY':'PREVIEW'} · {p.town}</small><strong>{zar(p.price)}{p.purpose==='rent'?' / month':''}</strong><h4>{p.title}</h4><span className="chat-property-facts"><BedDouble size={13}/>{p.beds}<Bath size={13}/>{p.baths}<span>{p.type}</span></span><span className="chat-property-open">View property<ArrowUpRight size={13}/></span></div></Link>{reasons.length>0&&<p className="chat-alternative-reason">{reasons.join(' · ')}</p>}</article>;
  return <section className="guided-chat" aria-label="Guided property search"><div className="guided-tools"><button type="button" onClick={onExit}><ArrowLeft size={13}/>Back to chat</button>{step>0&&<button type="button" onClick={()=>setAnswers([])}><RotateCcw size={13}/>Start again</button>}</div><div className="guided-thread">
    <div className="support-bubble assistant"><small>LAND & HOME · AI ASSISTANT</small><p>{intent==='sell'?'Let’s get your selling plans started.':'Let’s find a place that fits. Tap an answer below.'}</p></div>
    {answers.map((a,i)=><div key={i} className="guided-answer"><span>{questions[i].title}</span><button type="button" onClick={()=>setAnswers(answers.slice(0,i))} aria-label={'Change answer: '+a}>{a}<small>Change</small></button></div>)}
    {!done?<div className="guided-question" key={step}><p>{questions[step].title}</p><div className="guided-options">{questions[step].options.map(option=><button type="button" key={option} onClick={()=>setAnswers([...answers,option])}>{option}</button>)}</div><small>Question {step+1} of {questions.length}</small></div>:<div className="guided-results" aria-live="polite">
      {intent==='sell'?<><h3>Your next step, made simple.</h3><p>Request an appraisal or share these details with our team.</p><Link className="text-link" href="/sell#valuation" onClick={onNavigate}>Request an appraisal<ArrowUpRight size={15}/></Link></>:<><h3>{exact.length?`${exact.length} matching ${exact.length===1?'property':'properties'}`:'No exact matches just yet.'}</h3><p className="support-note">These are published website listings. Our team will confirm availability and your move-in timing.</p>{exact.slice(0,3).map(p=>card(p))}{exact.length>3&&<Link className="text-link" href={`/${brief.purpose}?town=${encodeURIComponent(brief.town)}&max=${brief.budget||''}&beds=${brief.beds||''}&type=${encodeURIComponent(brief.type)}`} onClick={onNavigate}>View all matches<ArrowUpRight size={14}/></Link>}{!exact.length&&alternatives.length>0&&<><h4>A few alternatives to consider</h4><p>These don’t meet every preference. Here’s what differs:</p>{alternatives.map(({property,reasons})=>card(property,reasons))}</>}{!exact.length&&!alternatives.length&&<p>No published properties match this search. Share your brief so we can discuss your options.</p>}</>}
      <a className="btn" href={whatsapp(message)} target="_blank" rel="noreferrer">Share my brief with the team<ArrowUpRight size={15}/></a>
    </div>}<div ref={bottom}/></div></section>;
}
