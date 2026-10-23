'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {supabase} from '@/lib/supabase';
import type {StaffProfile} from './access';
const StaffContext=createContext<{profile:StaffProfile;refresh:()=>Promise<void>}|null>(null);
export function useStaff(){const value=useContext(StaffContext);if(!value)throw new Error('Staff session required');return value;}
export function StaffAuth({children}:{children:ReactNode}){
 const [status,setStatus]=useState('loading'),[profile,setProfile]=useState<StaffProfile|null>(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const refresh=async()=>{window.dispatchEvent(new Event('lh-staff-refresh'));};
 useEffect(()=>{
  let alive=true,sequence=0;
  const check=async()=>{
   const current=++sequence;
   try{
    const {data:{session}}=await supabase().auth.getSession();
    if(!alive||current!==sequence)return;
    if(!session){setProfile(null);setStatus('signed-out');return;}
    const {data,error}=await supabase().rpc('lh_my_profile');
    if(!alive||current!==sequence)return;
    if(error){setProfile(null);setStatus('setup');setError('Unable to verify your profile. Check your connection and ask your administrator to apply the staff profiles database update.');return;}
    setError('');setProfile(data);setStatus(data?'allowed':'denied');
   }catch{if(alive&&current===sequence){setProfile(null);setStatus('setup');setError('Unable to check staff access. Please try again.');}}
  };
  void check();
  const {data}=supabase().auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'||event==='SIGNED_IN'){++sequence;setProfile(null);setStatus(event==='SIGNED_OUT'?'signed-out':'loading');}setTimeout(()=>void check(),0);});
  const reload=()=>{void check();};const interval=setInterval(()=>{if(!document.hidden)void check();},15000);
  window.addEventListener('focus',reload);window.addEventListener('lh-staff-refresh',reload);
  return()=>{alive=false;clearInterval(interval);data.subscription.unsubscribe();window.removeEventListener('focus',reload);window.removeEventListener('lh-staff-refresh',reload);};
 },[]);
 if(status==='allowed'&&profile)return <StaffContext.Provider value={{profile,refresh}}><div key={profile.user_id+profile.role}>{children}</div></StaffContext.Provider>;
 return <main className="crm-app c-loading"><div className="staff-login"><span className="c-kicker">LAND & HOME · STAFF ACCESS</span><h1>{status==='loading'?'Checking your access…':'Your shared workspace.'}</h1>{status==='denied'||status==='setup'?<><p>{status==='denied'?'Your account is signed in but has no CRM access. Ask an administrator to add you to the team.':error}</p><button className="c-btn" onClick={()=>void refresh()}>Check again</button> <button className="c-link" onClick={()=>void supabase().auth.signOut()}>Sign out</button></>:status==='signed-out'?<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase().auth.signInWithPassword({email:email.trim(),password});if(error)setError('Sign-in failed. Check your email and password.');}catch{setError('Could not reach the sign-in service. Please try again.');}finally{setBusy(false);}}}><p>Sign in with your staff account.</p><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="c-btn" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><p className="c-muted">Need an account or password reset? Contact your administrator.</p>{error&&<p role="alert">{error}</p>}</form>:null}<a href="/">Back to the property website</a></div></main>;
}
