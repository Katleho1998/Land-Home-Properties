'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight,Grid2X2,X} from 'lucide-react';
import {photos as samplePhotos} from './data';
type Photo={id:string;url:string;alt:string;room?:string};

export function PropertyGallery({image,title,photos,live=false}:{image:string;title:string;photos?:Photo[];live?:boolean}){
  const supplied=Boolean(photos?.length);
  const images:Photo[]=supplied?photos!.filter(p=>p.url):(live?[image]:[image,...samplePhotos.filter(p=>p!==image)]).filter(Boolean).map((url,i)=>({id:String(i),url,alt:`${title} — illustrative photograph ${i+1}`}));
  const groups=Array.from(new Set(images.map(p=>p.room?.trim()||'Property photos'))).map(name=>({name,photos:images.map((p,i)=>({...p,index:i})).filter(p=>(p.room?.trim()||'Property photos')===name)}));
  const dialog=useRef<HTMLDialogElement>(null),tour=useRef<HTMLDivElement>(null),back=useRef<HTMLButtonElement>(null),opener=useRef<HTMLElement|null>(null);
  const previousOverflow=useRef(''),touchStart=useRef<number|null>(null);
  const [open,setOpen]=useState(false),[active,setActive]=useState<number|null>(null);
  const id=useId(),current=images[active??0];
  function close(){dialog.current?.close();setOpen(false);setActive(null)}
  function showTour(){setActive(null);requestAnimationFrame(()=>tour.current?.querySelector<HTMLButtonElement>(`[data-photo-index="${active}"]`)?.focus({preventScroll:true}))}
  function showPhoto(index:number){setActive(index);requestAnimationFrame(()=>back.current?.focus())}
  function launch(event:React.MouseEvent<HTMLButtonElement>,index?:number){
    opener.current=event.currentTarget;setActive(index??null);setOpen(true);dialog.current?.showModal();
    if(index!==undefined)requestAnimationFrame(()=>back.current?.focus());
  }
  function move(direction:number){setActive(value=>((value??0)+direction+images.length)%images.length)}
  useEffect(()=>{
    if(!open)return;
    previousOverflow.current=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previousOverflow.current;opener.current?.focus({preventScroll:true})};
  },[open]);
  if(!images.length)return <div className="photo-empty">Property photographs will be added soon.</div>;
  return <><div className={'property-mosaic mosaic-count-'+Math.min(images.length,5)}>
    {images.slice(0,5).map((p,i)=><button key={p.id+'-'+i} className={'mosaic-photo mosaic-photo-'+i} onClick={e=>launch(e,i)} aria-label={`View photo ${i+1}: ${p.alt||title}`}><img src={p.url} alt={p.alt||title} loading={i===0?'eager':'lazy'}/></button>)}
    <button className="photo-tour-launch" onClick={e=>launch(e)}><Grid2X2 size={15}/><span>Show all {images.length} photos</span></button>
    <span className="mosaic-caption">{supplied?'Property photographs':'Illustrative photographs'}</span>
  </div>
  <dialog className="property-photo-dialog" ref={dialog} aria-labelledby={id+'-heading'} onClose={()=>{setOpen(false);setActive(null)}} onCancel={e=>{e.preventDefault();if(active!==null)showTour();else close()}} onKeyDown={e=>{if(active===null)return;if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}}} onClick={e=>{if(e.target===dialog.current)close()}}>
    <div className="photo-tour-toolbar"><button ref={back} className="photo-toolbar-back" onClick={active===null?close:showTour} aria-label={active===null?'Close photo tour':'Back to photo tour'}><ArrowLeft size={20}/><span>{active===null?'Back to property':'Photo tour'}</span></button><span className="photo-toolbar-title">{title}</span><button className="photo-close" onClick={close} aria-label="Close gallery"><X size={20}/></button></div>
    <h2 className="sr-only" id={id+'-heading'}>{title} — photo gallery</h2>
    <div className="photo-tour-scroll" ref={tour} hidden={active!==null}>
      <div className="photo-tour-content"><h2>Photo tour</h2><p className="photo-tour-note">{supplied?'Explore the photographs supplied for this property.':'Illustrative gallery: these photos show different homes, not a verified property.'}</p>
      <nav className="photo-tour-index" aria-label="Jump to a photo section">{groups.length>1?groups.map((group,g)=><button key={group.name} onClick={()=>document.getElementById(id+'-group-'+g)?.scrollIntoView({block:'start',behavior:'instant'})}><img src={group.photos[0].url} alt="" loading="lazy"/><span>{group.name}</span><small>{group.photos.length} {group.photos.length===1?'photo':'photos'}</small></button>):images.map((p,i)=><button key={p.id+'-'+i} onClick={()=>showPhoto(i)}><img src={p.url} alt="" loading="lazy"/><span>Photo {i+1}</span></button>)}</nav>
      {groups.map((group,g)=><section className="photo-tour-group" id={id+'-group-'+g} key={group.name}><div className="photo-group-heading"><h3>{group.name}</h3><p>{group.photos.length} {group.photos.length===1?'photograph':'photographs'}</p></div><div className="photo-group-grid">{group.photos.map((p,i)=><button className={i===0?'photo-group-lead':''} key={p.id+'-'+p.index} data-photo-index={p.index} onClick={()=>showPhoto(p.index)} aria-label={`Enlarge photo ${p.index+1}: ${p.alt||title}`}><img src={p.url} alt={p.alt||title} loading="lazy"/></button>)}</div></section>)}
      </div>
    </div>
    {active!==null&&<div className="photo-viewer"><div className="photo-viewer-count" aria-live="polite">{active+1} / {images.length}</div><div className="photo-viewer-stage" onTouchStart={e=>{touchStart.current=e.touches[0].clientX}} onTouchEnd={e=>{if(touchStart.current===null)return;const delta=e.changedTouches[0].clientX-touchStart.current;touchStart.current=null;if(Math.abs(delta)>60)move(delta<0?1:-1)}}>{images.length>1&&<button className="photo-viewer-prev" onClick={()=>move(-1)} aria-label="Previous photograph"><ChevronLeft size={24}/></button>}<img src={current.url} alt={current.alt||title}/>{images.length>1&&<button className="photo-viewer-next" onClick={()=>move(1)} aria-label="Next photograph"><ChevronRight size={24}/></button>}</div><p className="photo-viewer-caption">{current.alt||`Photo ${active+1}`}</p><div className="photo-viewer-thumbs" aria-label="Choose photograph">{images.map((p,i)=><button key={p.id+'-'+i} onClick={()=>setActive(i)} aria-label={'Photo '+(i+1)} aria-pressed={active===i}><img src={p.url} alt="" loading="lazy"/></button>)}</div></div>}
  </dialog></>;
}
