'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

// Content stays visible without JavaScript. Only off-screen content is staged.
export function useScrollMotion(){
  const path=usePathname();
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(preference.matches)return;
    const staged=new Set<HTMLElement>();
    const scenes=new Set<HTMLElement>();
    let scrollFrame=0;
    const updateScroll=()=>{
      scrollFrame=0;
      if(preference.matches)return;
      const height=window.innerHeight;
      const total=document.documentElement.scrollHeight-height;
      document.documentElement.style.setProperty('--reading-progress',`${total>0?Math.min(1,window.scrollY/total):0}`);
      scenes.forEach(element=>{
        const rect=element.getBoundingClientRect();
        if(rect.bottom<0||rect.top>height)return;
        const progress=Math.min(1,Math.max(0,(height-rect.top)/(height+rect.height)));
        element.style.setProperty('--scene-progress',String(progress));
        element.style.setProperty('--scene-drift',`${(progress-.5)*80}px`);
        element.style.setProperty('--scene-scale',String(1.12-progress*.09));
        element.style.setProperty('--journey-progress',String(Math.max(0,Math.min(1,(height*.5-rect.top)/Math.max(1,rect.height-height*.5)))));
      });
    };
    const scheduleScroll=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll)};
    window.addEventListener('scroll',scheduleScroll,{passive:true});
    window.addEventListener('resize',scheduleScroll);
    document.documentElement.classList.add('motion-active');
    const reveal=(element:HTMLElement)=>{
      element.classList.add('scroll-visible');
      observer.unobserve(element);
    };
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting)reveal(entry.target as HTMLElement)});
    },{threshold:0,rootMargin:'0px 0px -32px 0px'});
    const selector='main .path, main .section-head, main .property-card, main .promise>div, main .promises>div, main .area, main .cta, main .page-intro, main .filter-panel, main .panel, main .step, main .gallery, main .detail-heading, main .map-panel, main .quote-placeholder, main .privacy-copy>*, footer .footer-grid>div, main .intent-section .section-head, main .difference-card, main .seller-feature-copy, main .local-intro, main .local-towns>a, main .faq-section, main .contact-destination, main .conversion-copy, main .seller-stage, main .landlord-heading, main .landlord-benefits>article, main .landlord-action';
    const register=()=>{
      document.querySelectorAll<HTMLElement>('[data-scroll-scene],.gallery,.promise').forEach(el=>scenes.add(el));
      scheduleScroll();
      document.querySelectorAll<HTMLElement>(selector).forEach(element=>{
        if(staged.has(element)||element.closest('dialog'))return;
        staged.add(element);
        const rect=element.getBoundingClientRect();
        if(rect.top<window.innerHeight-32){return;}
        // Animate the outer block or its children, never both together.
        if(element.parentElement?.closest('.scroll-reveal'))return;
        const siblings=element.parentElement?Array.from(element.parentElement.children):[];
        const grouped=element.parentElement?.matches('.grid3,.path-grid,.areas,.promises,.footer-grid,.landlord-benefits');
        element.style.setProperty('--reveal-delay',grouped?`${Math.min(siblings.indexOf(element)%4,3)*65}ms`:'0ms');
        element.classList.add('scroll-reveal');
        observer.observe(element);
      });
    };
    // Let route navigation restore the scroll position before measuring.
    const frame=requestAnimationFrame(register);
    const mutations=new MutationObserver(register);
    const main=document.querySelector('main');
    if(main)mutations.observe(main,{childList:true,subtree:true});
    const showFocused=(event:FocusEvent)=>{
      const target=event.target as HTMLElement;
      const parent=target.closest<HTMLElement>('.scroll-reveal');
      if(parent)reveal(parent);
    };
    document.addEventListener('focusin',showFocused);
    const disable=()=>{if(preference.matches){staged.forEach(element=>reveal(element));document.documentElement.classList.remove('motion-active')}else{document.documentElement.classList.add('motion-active');scheduleScroll()}};
    preference.addEventListener('change',disable);
    return ()=>{
      cancelAnimationFrame(frame);cancelAnimationFrame(scrollFrame);observer.disconnect();mutations.disconnect();
      window.removeEventListener('scroll',scheduleScroll);window.removeEventListener('resize',scheduleScroll);document.documentElement.classList.remove('motion-active');document.documentElement.style.removeProperty('--reading-progress');
      scenes.forEach(el=>['--scene-progress','--scene-drift','--scene-scale','--journey-progress'].forEach(key=>el.style.removeProperty(key)));
      document.removeEventListener('focusin',showFocused);
      preference.removeEventListener('change',disable);
      staged.forEach(element=>{element.classList.remove('scroll-reveal','scroll-visible');element.style.removeProperty('--reveal-delay')});
    };
  },[path]);
}
