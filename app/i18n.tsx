'use client';
import {useEffect,useSyncExternalStore,type ReactNode} from 'react';
import {translations} from './translations';

export type Locale='en'|'af'|'st';
let locale:Locale='en';
const listeners=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}};
export function setLocale(value:string){
  if(value!=='en'&&value!=='af'&&value!=='st')return;
  locale=value;
  if(typeof document!=='undefined')document.documentElement.lang=value;
  try{localStorage.setItem('lh-language',value)}catch{/* Language still works without browser storage. */}
  listeners.forEach(listener=>listener());
}
export function useLocale(){
  const current=useSyncExternalStore(subscribe,()=>locale,()=> 'en' as Locale);
  useEffect(()=>{try{const saved=localStorage.getItem('lh-language');if(saved&&saved!==locale)setLocale(saved)}catch{}},[]);
  return [current,setLocale] as const;
}
export function t(text:string):string{
  if(locale==='en')return text;
  const key=text.trim().replace(/\s+/g,' ');
  const translated=translations[key]?.[locale] || dynamicCopy(key);
  if(!translated)return text;
  return text.replace(/\S[\s\S]*\S|\S/,()=>translated);
}
function dynamicCopy(key:string):string|undefined{
  const af=locale==='af';
  // Only known interface templates; never rewrite arbitrary listing or visitor text.
  let match=key.match(/^(\d+) matching propert(?:y|ies)$/);
  if(match)return af?`${match[1]} passende ${match[1]==='1'?'eiendom':'eiendomme'}`:`Thepa e ${match[1]} e lumellanang`;
  match=key.match(/^Up to (R[\d\s,.]+)$/);
  if(match)return `${t('Up to')} ${match[1]}`;
  match=key.match(/^([\d.]+)% of the listed price$/);
  if(match)return af?`${match[1]}% van die geadverteerde prys`:`${match[1]}% ea theko e phatlalalitsoeng`;
  match=key.match(/^(View|Enlarge) photo (\d+): (.*)$/);
  if(match)return `${af?(match[1]==='View'?'Bekyk foto':'Vergroot foto'):(match[1]==='View'?'Sheba senepe':'Holisa senepe')} ${match[2]}: ${match[3]}`;
  match=key.match(/^(Bedroom|Bathroom|Full bathroom|Half bathroom) (\d+)$/);
  if(match)return `${t(match[1])} ${match[2]}`;
  match=key.match(/^(grid|list|map) view$/);
  if(match)return `${t(match[1])} ${t('view')}`;
  match=key.match(/^(Different area|Different type): (.+)$/);
  if(match)return `${match[1]==='Different area'?(af?'Ander gebied':'Sebaka se fapaneng'):(af?'Ander soort':'Mofuta o fapaneng')}: ${t(match[2])}`;
  match=key.match(/^(\d+) bedrooms, below your (\d+)\+ preference$/);
  if(match)return af?`${match[1]} slaapkamers, minder as jou ${match[2]}+ voorkeur`:`Likamore tse ${match[1]}, ka tlase ho tse ${match[2]}+ tseo u li batlang`;
  match=key.match(/^(R[\d\s,.]+) above your budget$/);
  if(match)return af?`${match[1]} bo jou begroting`:`${match[1]} ka holimo ho tekanyetso ea hao`;
  if(key.includes(' · '))return key.split(' · ').map(t).join(' · ');
  for(const prefix of ['Remove saved property','Save property','Property photograph:','Property preview:','Change answer:','Photo','View']){
    if(key.startsWith(prefix+' '))return t(prefix)+' '+key.slice(prefix.length+1);
  }
  if(key.endsWith(' area map'))return key.slice(0,-9)+' '+t('area map');
}
// Translate interface strings only. Elements retain their identity, state and handlers.
export function tNode(value:ReactNode):ReactNode{
  return typeof value==='string'?t(value):Array.isArray(value)?value.map(tNode):value;
}
export function tAttr(value:string):string;
export function tAttr(value:string|undefined):string|undefined;
export function tAttr(value:string|undefined):string|undefined{return value===undefined?value:t(value)}
