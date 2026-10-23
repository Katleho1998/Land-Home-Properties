'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {MorphingInfinity} from '@/components/loading-ui/morphing-infinity';
import {t,useLocale} from './i18n';

let introduced=false;
export function OpeningScreen({leaving=false}:{leaving?:boolean}){
  useLocale();
  return <div className={'site-opening'+(leaving?' site-opening-leaving':'')} role="status" aria-live="polite">
    <div className="site-opening-content"><img src="/brand-approved.png" width={1774} height={887} alt="Land & Home Properties"/><MorphingInfinity aria-hidden="true" role="presentation" aria-label={undefined}/><p>{t('Your next chapter starts here.')}</p><span className="sr-only">{t('Loading your website…')}</span></div>
  </div>;
}
export function WebsiteEntrance({children}:{children:ReactNode}){
  const [phase,setPhase]=useState<'opening'|'leaving'|'ready'>(()=>introduced?'ready':'opening');
  const [blocking,setBlocking]=useState(false);
  useEffect(()=>{
    if(introduced){setPhase('ready');return}
    setBlocking(true);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const started=performance.now();let stopped=false,exitTimer:number|undefined,finishTimer:number|undefined;
    const removers:Array<()=>void>=[];
    const finish=()=>{
      if(stopped||exitTimer!==undefined)return;
      exitTimer=window.setTimeout(()=>{if(stopped)return;introduced=true;setPhase('leaving');setBlocking(false);document.body.style.overflow=overflow;finishTimer=window.setTimeout(()=>setPhase('ready'),reduced?0:400)},Math.max(0,(reduced?0:1300)-(performance.now()-started)));
    };
    const images=Array.from(document.querySelectorAll<HTMLImageElement>('.hero-poster,.hero-copy img,.brand-art img')).slice(0,3);
    const assets=images.map(img=>img.complete?Promise.resolve():new Promise<void>(resolve=>{const done=()=>resolve();img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});removers.push(()=>{img.removeEventListener('load',done);img.removeEventListener('error',done)})}));
    if(document.fonts)assets.push(document.fonts.ready.then(()=>{}));
    void Promise.allSettled(assets).then(finish);
    const deadline=window.setTimeout(finish,3000);
    return()=>{stopped=true;window.clearTimeout(deadline);window.clearTimeout(exitTimer);window.clearTimeout(finishTimer);removers.forEach(remove=>remove());document.body.style.overflow=overflow};
  },[]);
  return <><div className="website-entrance-content" inert={blocking} aria-busy={phase!=='ready'}>{children}</div>{phase!=='ready'&&<OpeningScreen leaving={phase==='leaving'}/>}<noscript><style>{'.site-opening{display:none!important}'}</style></noscript></>;
}
