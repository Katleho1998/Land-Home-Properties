'use client';
import {useCallback,useEffect,useRef} from 'react';
export function useAutoResizeTextarea({minHeight,maxHeight=160}:{minHeight:number;maxHeight?:number}){
  const textareaRef=useRef<HTMLTextAreaElement>(null);
  const adjustHeight=useCallback(()=>{
    const el=textareaRef.current;if(!el)return;
    el.style.height=`${minHeight}px`;
    el.style.height=`${Math.min(maxHeight,Math.max(minHeight,el.scrollHeight))}px`;
  },[minHeight,maxHeight]);
  useEffect(()=>{adjustHeight();window.addEventListener('resize',adjustHeight);return()=>window.removeEventListener('resize',adjustHeight)},[adjustHeight]);
  return {textareaRef,adjustHeight};
}
