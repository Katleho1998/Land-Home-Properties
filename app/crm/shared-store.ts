import {supabase} from '@/lib/supabase';
import type {CRMState} from './store';

const collections=['properties','contacts','leads','deals','tasks','viewings','leases','maintenance','documents','campaigns','finance','compliance','activities'] as const;
export function emptyWorkspace():CRMState{return {version:1,properties:[],contacts:[],leads:[],deals:[],tasks:[],viewings:[],leases:[],maintenance:[],documents:[],campaigns:[],finance:[],compliance:[],activities:[],settings:{agency:'Land & Home Properties',email:'hello@landhomeproperties.co.za',phone:'071 603 4542',hours:'Mon–Fri 08:00–17:00; Sat 08:00–13:00; Sundays/public holidays closed',agents:['Principal'],responseMinutes:15}}}
type Row={collection:string;id:string;data:Record<string,unknown>;revision:number};
export async function readSharedState():Promise<CRMState>{
  const state=emptyWorkspace();
  // Paginate so growing portfolios are not silently truncated by PostgREST.
  for(let offset=0;;offset+=500){
    const {data,error}=await supabase().from('lh_crm_records').select('collection,id,data,revision').order('collection').order('id').range(offset,offset+499);
    if(error)throw new Error('Could not load shared records. Check your staff access and Supabase setup.');
    for(const row of (data||[]) as Row[]){
      const value={...row.data,__revision:row.revision};
      if(row.collection==='settings')state.settings=value as unknown as CRMState['settings'];
      else if(collections.includes(row.collection as typeof collections[number]))(state[row.collection as typeof collections[number]] as unknown[]).push(value);
    }
    if(!data||data.length<500)break;
  }
  state.leads.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  state.activities.sort((a,b)=>b.at.localeCompare(a.at));
  return state;
}
function records(state:CRMState){
  const result=new Map<string,{collection:string;id:string;data:Record<string,unknown>;revision:number|null}>();
  for(const collection of [...collections,'settings'] as const){
    const entries=collection==='settings'?[{...state.settings,id:'agency'}]:(state[collection]||[]);
    for(const entry of entries){
      const {__revision,...data}=entry as unknown as Record<string,unknown>;
      const id=String(data.id);
      result.set(collection+'/'+id,{collection,id,data,revision:typeof __revision==='number'?__revision:null});
    }
  }
  return result;
}
export async function mutateSharedState(fn:(state:CRMState)=>void){
  const before=await readSharedState(),after=structuredClone(before);fn(after);
  const old=records(before),next=records(after),changes=[];
  for(const [key,value] of next){
    const previous=old.get(key);
    if(JSON.stringify(previous?.data)!==JSON.stringify(value.data))changes.push({...value,expected_revision:value.revision??previous?.revision??null,revision:undefined});
  }
  for(const [key,value] of old)if(!next.has(key))changes.push({collection:value.collection,id:value.id,data:null,expected_revision:value.revision});
  if(!changes.length)return;
  const {error}=await supabase().rpc('lh_apply_changes',{changes});
  if(error)throw new Error(error.message.includes('CONFLICT')?'Someone updated this record. Close and reopen it, then apply your change again.':error.message.includes('ACCESS')?'Your account cannot make this change. Ask your administrator.':'The shared save failed. Your changes were not saved. '+error.message);
}
export async function uploadSharedFile(file:File,kind:'photo'|'document'){
  if(file.size>8*1024*1024)throw new Error('Each file must be smaller than 8 MB.');
  const allowed=kind==='photo'?['image/jpeg','image/png','image/webp']:['application/pdf','image/jpeg','image/png','image/webp','text/plain'];
  if(!allowed.includes(file.type))throw new Error('Unsupported file type.');
  const {data}=await supabase().auth.getUser();if(!data.user)throw new Error('Please sign in to upload files.');
  const suffix:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf','text/plain':'txt'};
  const path=`${data.user.id}/${crypto.randomUUID()}.${suffix[file.type]}`,bucket=kind==='photo'?'property-photos':'crm-documents';
  const {error}=await supabase().storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
  if(error)throw new Error('File upload failed. Check your storage permissions.');
  return kind==='photo'?supabase().storage.from(bucket).getPublicUrl(path).data.publicUrl:`supabase-document:${path}`;
}
export async function downloadSharedDocument(url:string,name:string){
  if(!url.startsWith('supabase-document:'))throw new Error('This document is not in shared secure storage.');
  const {data,error}=await supabase().storage.from('crm-documents').download(url.slice('supabase-document:'.length));
  if(error||!data)throw new Error('Document access failed. Sign in with an authorised staff account.');
  const blob=URL.createObjectURL(data),a=document.createElement('a');a.href=blob;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(blob),1000);
}
