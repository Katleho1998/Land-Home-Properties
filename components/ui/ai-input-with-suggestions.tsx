'use client';
import {useEffect} from 'react';
import {ArrowUp,Home,KeyRound,Building2} from 'lucide-react';
import {Textarea} from '@/components/ui/textarea';
import {useAutoResizeTextarea} from '@/components/hooks/use-auto-resize-textarea';
import {cn} from '@/lib/utils';
const actions=[
  {text:'Buy a home',prompt:'I’d like help buying a home.',icon:Home},
  {text:'Find a rental',prompt:'I’m looking for a rental.',icon:KeyRound},
  {text:'Sell my property',prompt:'I’d like help selling my property.',icon:Building2},
];
// Adapted from the supplied component; controlled text preserves failed messages.
export function AIInputWithSuggestions({value,onChange,onSubmit,disabled=false,showSuggestions=false,className}:{value:string;onChange:(text:string)=>void;onSubmit:()=>void;disabled?:boolean;showSuggestions?:boolean;className?:string}){
  const {textareaRef,adjustHeight}=useAutoResizeTextarea({minHeight:48,maxHeight:120});
  useEffect(()=>adjustHeight(),[value,adjustHeight]);
  return <form className={cn('support-composer',className)} onSubmit={e=>{e.preventDefault();if(!disabled&&value.trim())onSubmit()}}>
    {showSuggestions&&<div className="support-suggestions">{actions.map(({text,prompt,icon:Icon})=><button type="button" key={text} disabled={disabled} onClick={()=>{onChange(prompt);textareaRef.current?.focus()}}><Icon size={13}/>{text}</button>)}</div>}
    <div className="support-input"><label className="sr-only" htmlFor="property-ai-message">Message the AI assistant</label><Textarea ref={textareaRef} id="property-ai-message" rows={1} value={value} maxLength={1200} disabled={disabled} placeholder="Ask about your next move…" onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!disabled&&value.trim())onSubmit()}}}/><button type="submit" aria-label="Send message to AI" disabled={disabled||!value.trim()}><ArrowUp size={19}/></button></div>
  </form>;
}

