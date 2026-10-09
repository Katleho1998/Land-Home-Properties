'use client';
import {useEffect,useRef,useState} from 'react';
import {Play,Pause} from 'lucide-react';

export default function HeroVideo(){
  const video=useRef<HTMLVideoElement>(null);
  const art=useRef<HTMLDivElement>(null);
  const pausedByUser=useRef(false);
  const visible=useRef(true);
  const reduced=useRef(false);
  const [enabled,setEnabled]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current=preference.matches;
    const saveData=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;
    if(!preference.matches&&!saveData)setEnabled(true);
    const hero=art.current?.closest('.hero');
    if(!hero)return;
    let frame=0;
    const move=()=>{frame=0;if(reduced.current||!visible.current)return;const progress=Math.max(0,Math.min(1,-hero.getBoundingClientRect().top/hero.clientHeight));art.current?.style.setProperty('--video-drift',`${progress*26}px`)};
    const scroll=()=>{if(!frame)frame=requestAnimationFrame(move)};
    const resume=()=>{if(visible.current&&!document.hidden&&!pausedByUser.current&&!reduced.current)video.current?.play().catch(()=>{})};
    const observer=new IntersectionObserver(([entry])=>{visible.current=entry.isIntersecting;if(entry.isIntersecting){resume();scroll()}else video.current?.pause()},{threshold:0});
    observer.observe(hero);
    const visibility=()=>{if(document.hidden)video.current?.pause();else resume()};
    const change=()=>{reduced.current=preference.matches;if(preference.matches){video.current?.pause();art.current?.style.setProperty('--video-drift','0px')}};
    window.addEventListener('scroll',scroll,{passive:true});document.addEventListener('visibilitychange',visibility);preference.addEventListener('change',change);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',scroll);document.removeEventListener('visibilitychange',visibility);preference.removeEventListener('change',change)};
  },[]);
  useEffect(()=>{if(enabled&&!pausedByUser.current)video.current?.play().catch(()=>{})},[enabled]);
  function toggle(){if(playing){pausedByUser.current=true;video.current?.pause()}else{pausedByUser.current=false;setEnabled(true);video.current?.play().catch(()=>{})}}
  return <><div className="hero-art hero-video-art" ref={art} aria-hidden="true"><img className="hero-poster" src="/hero-higgsfield.webp" alt="" fetchPriority="high"/><video ref={video} src={enabled?'/family-moving-hero.mp4':undefined} poster="/hero-higgsfield.webp" muted loop playsInline preload="none" tabIndex={-1} onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false)}}/></div><div className="hero-video-controls">{!failed&&<button type="button" className="video-toggle" onClick={toggle} aria-label={playing?'Pause background video':'Play background video'}>{playing?<Pause size={15}/>:<Play size={15}/>}<span>{playing?'Pause film':'Play film'}</span></button>}<span className="video-caption">A new chapter begins · Illustrative film</span>{failed&&<span className="sr-only" role="status">The background film is unavailable. You can still search for a property.</span>}</div></>;
}

