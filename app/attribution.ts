'use client';
import {useEffect} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

const key='lh-demo-attribution';
const campaignKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'] as const;
type Touch={source_url:string;referrer:string;lead_source:string;at:string;utm_source:string;utm_medium:string;utm_campaign:string;utm_content:string;utm_term:string};
type Attribution={first:Touch;latest:Touch};
let fallback:Attribution|null=null;
function sourceLabel(query:URLSearchParams){return (query.get('source')||query.get('utm_source')||'website').trim().slice(0,160)}
/** Session-only campaign context: no visitor identifier, network request or cross-site tracking. */
export function captureAttribution():Attribution{
  const query=new URLSearchParams(window.location.search);
  const current:Touch={source_url:window.location.href,referrer:document.referrer,lead_source:sourceLabel(query),at:new Date().toISOString(),utm_source:'',utm_medium:'',utm_campaign:'',utm_content:'',utm_term:''};
  for(const name of campaignKeys)current[name]=(query.get(name)||'').slice(0,500);
  let saved=fallback;
  try{const raw=sessionStorage.getItem(key);if(raw){const parsed=JSON.parse(raw);if(parsed?.first?.source_url&&parsed?.latest?.source_url)saved=parsed}}catch{}
  const hasCampaign=Boolean(query.get('source')||campaignKeys.some(name=>query.get(name)));
  const updated:Attribution=saved?{first:saved.first,latest:hasCampaign&&saved.latest.source_url!==current.source_url?current:saved.latest}:{first:current,latest:current};
  fallback=updated;
  try{sessionStorage.setItem(key,JSON.stringify(updated))}catch{}
  return updated;
}
export function enquiryAttribution(formId:string):Record<string,string>{
  const {first,latest}=captureAttribution();
  const values:Record<string,string>={...latest,source_url:window.location.href,referrer:document.referrer,form_id:formId};
  for(const [name,value] of Object.entries(first))values['first_'+name]=value;
  for(const [name,value] of Object.entries(latest))values['latest_'+name]=value;
  return values;
}
export function useSessionAttribution(){const path=usePathname(),params=useSearchParams();useEffect(()=>{captureAttribution()},[path,params])}
