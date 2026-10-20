'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import type {Listing} from './data';
export function usePublicProperties(){
  const [listings,setListings]=useState<Listing[]>([]),[error,setError]=useState(''),[ready,setReady]=useState(false);
  useEffect(()=>{
    let alive=true,running=false;
    const refresh=async()=>{
      if(running)return;running=true;
      try{
        const items:Listing[]=[];
        for(let offset=0;;offset+=500){
          const {data,error}=await supabase().from('lh_public_listings').select('data').order('id').range(offset,offset+499);
          if(error)throw error;
          items.push(...(data||[]).map(row=>({...row.data,live:true,published:true} as Listing)));
          if(!data||data.length<500)break;
        }
        if(alive){setListings(items);setError('');setReady(true)}
      }catch{if(alive){setListings([]);setError('Property listings are temporarily unavailable. Please contact our team.');setReady(true)}}
      finally{running=false}
    };
    void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},30000);
    const channel=supabase().channel('public-properties-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'lh_public_listings'},()=>void refresh()).subscribe();
    const focus=()=>void refresh();window.addEventListener('focus',focus);window.addEventListener('lh-crm-change',focus);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('lh-crm-change',focus);void supabase().removeChannel(channel)};
  },[]);
  return {listings,error,ready};
}
