'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {supabase} from '@/lib/supabase';
export function StaffAuth({children}:{children:ReactNode}){
  const [status,setStatus]=useState('loading'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{
    let alive=true,sequence=0;
    const check=async()=>{
      const current=++sequence;
      const {data:{session}}=await supabase().auth.getSession();
      if(!alive||current!==sequence)return;
      if(!session){setStatus('signed-out');return}
      const {data,error}=await supabase().from('lh_staff').select('role').eq('user_id',session.user.id).maybeSingle();
      if(alive&&current===sequence){setStatus(data?'allowed':'denied');if(error)setError('The database setup or staff access needs attention.')}
    };
    void check().catch(()=>{if(alive){setStatus("signed-out");setError("Unable to check access. Please try signing in.")}});
    const {data}=supabase().auth.onAuthStateChange(()=>{setStatus('loading');setTimeout(()=>void check(),0)});
    return()=>{alive=false;data.subscription.unsubscribe()};
  },[]);
  if(status==='allowed')return <>{children}</>;
  return <main className="crm-app c-loading"><div className="staff-login"><span className="c-kicker">LAND & HOME · STAFF ACCESS</span><h1>{status==='loading'?'Checking your access…':'Your shared workspace.'}</h1>{status==='denied'?<><p>Your account is signed in but has no CRM access. Ask the project administrator to add you to the staff list.</p><button className="c-btn" onClick={()=>void supabase().auth.signOut()}>Sign out</button></>:status==='signed-out'?<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase().auth.signInWithPassword({email:email.trim(),password});if(error)setError('Sign-in failed. Check your email and password.')}catch{setError('Could not reach the sign-in service. Please try again.')}finally{setBusy(false)}}}><p>Sign in with your administrator-created staff account.</p><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="c-btn" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><p className="c-muted">Need an account or password reset? Contact your project administrator.</p></form>:null}{error&&<p role="alert">{error}</p>}<a href="/">Back to the property website</a></div></main>;
}
