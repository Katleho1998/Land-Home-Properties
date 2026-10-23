'use client';

import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';

import {supabase} from '@/lib/supabase';

import {reportClientEvent,signOutWithAudit} from './audit';
import type {StaffProfile} from './access';
import {ArrowLeft,ArrowRight,LogIn,Mail,LockKeyhole,Eye,EyeOff,ShieldCheck,LoaderCircle} from 'lucide-react';

const StaffContext=createContext<{profile:StaffProfile;refresh:()=>Promise<void>}|null>(null);

export function useStaff(){const value=useContext(StaffContext);if(!value)throw new Error('Staff session required');return value;}

export function StaffAuth({children}:{children:ReactNode}){

 const [status,setStatus]=useState('loading'),[profile,setProfile]=useState<StaffProfile|null>(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);

 const [showPassword,setShowPassword]=useState(false),[help,setHelp]=useState(false);
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

 return <main className="crm-app c-auth-page">
  <div className="c-auth-shell">
  <aside className="c-auth-story">
   <a href="/" className="c-brand" aria-label="Land and Home Properties website"><span><img src="/brand-approved.png" alt="Land & Home Properties"/></span></a>
   <div className="c-auth-sculpture" aria-hidden="true"><div className="c-auth-orbit"/><span className="c-auth-stone stone-one"/><span className="c-auth-stone stone-two"/><span className="c-auth-stone stone-three"/><div className="c-auth-art-shadow"/></div>
   <div className="c-auth-story-copy"><span className="c-auth-eyebrow">SMALL ACTIONS. MEANINGFUL DIFFERENCE.</span><h2>Your work<br/>opens <em>doors.</em></h2><p>Every call you return. Every detail you notice. Every promise you keep. Your care helps someone move closer to a place they can call home.</p><div className="c-auth-team-note"><span aria-hidden="true">LH</span><div><b>One team. A shared purpose.</b><small>Let’s make the next move matter.</small></div></div></div>
  </aside>
  <div className="c-auth-form-panel"><a className="c-auth-back" href="/"><ArrowLeft size={15}/>Back to the property website</a><section className="c-auth-card" aria-labelledby="staff-login-title" aria-busy={busy||status==='loading'}>
   <div className="c-auth-symbol">{status==='loading'?<LoaderCircle className="c-auth-spinner" size={25}/>:status==='denied'||status==='setup'?<ShieldCheck size={25}/>:<LogIn size={25}/>}</div>
   <span className="c-auth-eyebrow">YOUR LAND & HOME WORKSPACE</span>
   <h1 id="staff-login-title">{status==='loading'?'A moment, please.':status==='denied'?'A place on the team.':status==='setup'?'Let’s get you connected.':'Welcome back.'}</h1>
   <p className="c-auth-intro">{status==='loading'?'We’re checking your staff access.':status==='signed-out'?'A fresh start. A clear next step. Sign in and make today count.':status==='denied'?'You’re signed in. An administrator needs to grant your CRM access.':'We couldn’t verify your workspace access.'}</p>
   {status==='signed-out'&&<form className="c-auth-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase().auth.signInWithPassword({email:email.trim(),password});if(error)setError('Sign-in failed. Check your email and password.');else reportClientEvent('Signed in');}catch{setError('Could not reach the sign-in service. Please try again.');}finally{setBusy(false);}}}>
    <label className="c-auth-label" htmlFor="staff-email">Email address</label><div className="c-auth-input"><Mail size={17} aria-hidden="true"/><input id="staff-email" type="email" autoComplete="username" placeholder="you@landhomeproperties.co.za" required disabled={busy} value={email} onChange={e=>setEmail(e.target.value)}/></div>
    <label className="c-auth-label" htmlFor="staff-password">Password</label><div className="c-auth-input"><LockKeyhole size={17} aria-hidden="true"/><input id="staff-password" type={showPassword?'text':'password'} autoComplete="current-password" placeholder="Enter your password" required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="c-auth-reveal" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
    <div className="c-auth-help-row"><button type="button" aria-expanded={help} aria-controls="staff-access-help" onClick={()=>setHelp(!help)}>Forgot your password?</button></div>
    {help&&<p id="staff-access-help" className="c-auth-help" role="status">Your administrator can help restore your access. <a href="mailto:hello@landhomeproperties.co.za?subject=CRM%20password%20help">Contact the team</a>. Please don’t send your password.</p>}
    {error&&<p className="c-auth-error" role="alert">{error}</p>}
    <button className="c-auth-submit" disabled={busy} type="submit">{busy?<><LoaderCircle className="c-auth-spinner" size={17}/>Signing in…</>:<>Sign in to your workspace<ArrowRight size={17}/></>}</button>
    <div className="c-auth-divider"><span>NEW TO THE TEAM?</span></div>
    <p className="c-auth-access">Your administrator creates your account.<br/><a href="mailto:hello@landhomeproperties.co.za?subject=CRM%20staff%20access%20request">Request staff access <ArrowRight size={13}/></a></p>
   </form>}
   {(status==='denied'||status==='setup')&&<div className="c-auth-form">{status==='setup'&&<p role="alert" className="c-auth-error">{error}</p>}<button className="c-auth-submit" onClick={()=>void refresh()}>Check access again<ArrowRight size={17}/></button><button className="c-auth-signout" onClick={()=>void signOutWithAudit()}>Sign out and use another account</button><p className="c-auth-access"><a href="mailto:hello@landhomeproperties.co.za?subject=CRM%20access%20help">Contact your administrator</a></p></div>}
   <div className="c-auth-security"><ShieldCheck size={13}/>Private workspace. Authorised staff only.</div>
  </section><p className="c-auth-caption">Local heart. <em>Considered service.</em></p></div></div>
 </main>;
}
