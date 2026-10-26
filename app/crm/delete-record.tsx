'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Trash2} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {useStaff} from './staff-auth';
export const deletableCollections=['contacts','leads','deals','tasks','viewings','leases','maintenance','documents','campaigns','finance','compliance'];
type RecordRef={id:string;__revision?:number};
export async function deleteCRMRecord(collection:string,record:RecordRef){
 if(!deletableCollections.includes(collection))throw new Error('This record cannot be deleted here.');
 if(!record.__revision)throw new Error('Close and reopen the record before deleting it.');
 const {error}=await supabase().rpc('lh_delete_record',{target_collection:collection,target_id:record.id,expected_revision:record.__revision});
 if(error)throw new Error(error.message.includes('LINKED_RECORDS')?'This record is linked to other records. Remove or reassign those links before deleting it.':error.message.includes('CONFLICT')?'This record changed. Close and reopen it before trying again.':error.message.includes('ACCESS')?'Only an Admin can delete records.':error.message.includes('lh_delete_record')?'Apply the record deletion database update first.':error.message);
 window.dispatchEvent(new Event('lh-crm-change'));
}
export function DeleteRecordButton({collection,record,label,onDeleted,disabled=false}:{collection:string;record:RecordRef;label:string;onDeleted:()=>void;disabled?:boolean}){
 const {profile}=useStaff();const [target,setTarget]=useState<(RecordRef&{label:string})|null>(null);
 if(profile.role!=='admin'||!deletableCollections.includes(collection))return null;
 return <><button type="button" className="c-link c-danger-link" disabled={disabled} onClick={()=>setTarget({...record,label})}><Trash2 size={15}/>Delete</button>{target&&createPortal(<DeleteConfirmation collection={collection} record={target} label={target.label} close={()=>setTarget(null)} onDeleted={onDeleted}/>,document.body)}</>;
}
export function DeleteConfirmation({collection,record,label,close,onDeleted}:{collection:string;record:RecordRef;label:string;close:()=>void;onDeleted:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null),titleId=useId();const [typed,setTyped]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const d=ref.current;d?.showModal();cancel.current?.focus();return()=>d?.close();},[]);
 return <dialog ref={ref} className="c-modal c-lifecycle-dialog" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();e.stopPropagation();if(!busy)close();}}><div className="c-modal-head"><h2 id={titleId}>Are you sure you want to delete?</h2></div><form className="c-record-form" onSubmit={async e=>{e.preventDefault();e.stopPropagation();if(busy||typed!==record.id)return;setBusy(true);setError('');try{await deleteCRMRecord(collection,record);close();onDeleted();}catch(e){setError(e instanceof Error?e.message:'Deletion failed.');setBusy(false);}}}><p><b>{label}</b><br/>{record.id}</p><p>This permanently deletes this record and cannot be undone here. Linked records are protected. Activity history is retained.{collection==='documents'?' Only the register entry is deleted; the stored file is retained.':''}</p><label className="c-field"><span>Type {record.id} to confirm</span><input required autoComplete="off" disabled={busy} value={typed} onChange={e=>setTyped(e.target.value)}/></label>{error&&<p role="alert" className="c-error">{error}</p>}<div className="c-modal-footer"><button ref={cancel} type="button" className="c-btn secondary" disabled={busy} onClick={close}>Cancel</button><button type="submit" className="c-btn c-danger-btn" disabled={busy||typed!==record.id}>{busy?'Deleting…':'Delete permanently'}</button></div></form></dialog>;
}
