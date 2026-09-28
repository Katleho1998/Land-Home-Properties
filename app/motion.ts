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
    const reveal=(element:HTMLElement)=>{
      element.classList.add('scroll-visible');
      observer.unobserve(element);
    };
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting)reveal(entry.target as HTMLElement)});
    },{threshold:0,rootMargin:'0px 0px -32px 0px'});
    const selector='main .hero-copy, main .search-panel, main .path, main .section-head, main .property-card, main .promise>div, main .promises>div, main .area, main .cta, main .page-intro, main .filter-panel, main .panel, main .step, main .gallery, main .detail-heading, main .map-panel, main .quote-placeholder, main .privacy-copy>*, footer .footer-grid>div';
    const register=()=>{
      document.querySelectorAll<HTMLElement>(selector).forEach(element=>{
        if(staged.has(element)||element.closest('dialog'))return;
        staged.add(element);
        const rect=element.getBoundingClientRect();
        if(rect.top<window.innerHeight-32){return;}
        // Animate the outer block or its children, never both together.
        if(element.parentElement?.closest('.scroll-reveal'))return;
        const siblings=element.parentElement?Array.from(element.parentElement.children):[];
        const grouped=element.parentElement?.matches('.grid3,.path-grid,.areas,.promises,.footer-grid');
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
    const disable=()=>{if(preference.matches)staged.forEach(element=>reveal(element))};
    preference.addEventListener('change',disable);
    return ()=>{
      cancelAnimationFrame(frame);observer.disconnect();mutations.disconnect();
      document.removeEventListener('focusin',showFocused);
      preference.removeEventListener('change',disable);
      staged.forEach(element=>{element.classList.remove('scroll-reveal','scroll-visible');element.style.removeProperty('--reveal-delay')});
    };
  },[path]);
}
