'use client';
import {t as translate,tNode,tAttr,useLocale} from './i18n';
import Link from 'next/link';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowUpRight, Check, Home, KeyRound, MapPin, MessageCircle, Phone, Mail, ShieldCheck, Sparkles, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import SpotlightCard from '@/components/react-bits/SpotlightCard';
import { business, whatsapp } from './business';
import { OfficeHours } from './brand-sections';
const journeys = [
    { id: 'buy', label: 'Buy a home', icon: Home, title: 'Find a home that fits your life.', copy: 'Tell us what matters: your neighbourhood, your budget, and the things that make a house feel like home.', points: ['First home or next chapter', 'A shortlist around your priorities', 'Viewings arranged with the team'], cta: 'Tell us your buying brief', href: '/contact?intent=buyer', image: '/family-suburban-poster.webp', caption: 'A little more room for what matters.' },
    { id: 'sell', label: 'Sell my property', icon: ArrowUpRight, title: 'A considered plan for your next move.', copy: 'Start with a conversation about your property and your timing. Then explore pricing, presentation and a marketing approach that makes sense.', points: ['Property and pricing discussion', 'A clear presentation plan', 'Guidance through enquiries and offers'], cta: 'Request a property appraisal', href: '/sell#valuation', image: '/hero-higgsfield.webp', caption: 'Your home has a story. Let’s tell it well.' },
    { id: 'rent', label: 'Find a rental', icon: KeyRound, title: 'Your next place. Your kind of living.', copy: 'Moving for work, family or a fresh start? Share your move-in date, monthly budget and preferred area so we can discuss your options.', points: ['Your budget and move-in date', 'Space, location and everyday needs', 'Availability confirmed before viewing'], cta: 'Share my rental requirements', href: '/contact?intent=tenant', image: '/family-suburban-poster.webp', caption: 'A fresh start can feel like coming home.' },
    { id: 'manage', label: 'Let & manage', icon: ShieldCheck, title: 'More support for your rental property.', copy: 'From a first rental to a growing portfolio, discuss the level of letting and management support that suits your property.', points: ['Letting and tenant enquiries', 'Agreed maintenance responsibilities', 'Clear scope, fees and communication'], cta: 'Discuss my rental property', href: '/landlords', image: '/hero-higgsfield.webp', caption: 'Your investment deserves attention.' },
];
export function IntentSection() {
    useLocale();
    const section=useRef<HTMLElement>(null);
    const remaining=useRef(7000),timedSlide=useRef(0);
    const [active,setActive]=useState(0),[paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[dragging,setDragging]=useState(false),[visible,setVisible]=useState(false),[pageVisible,setPageVisible]=useState(true),[reduced,setReduced]=useState(true);
    const [viewport,carousel]=useEmblaCarousel({loop:true,align:'start',duration:reduced?0:32,watchDrag:(_api,event)=>!(event.target instanceof Element&&event.target.closest('a,button,input,select,textarea'))});
    useEffect(()=>{
        const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
        const motion=()=>setReduced(preference.matches),visibility=()=>setPageVisible(!document.hidden);
        motion();visibility();preference.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
        const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting&&entry.intersectionRatio>=0.15),{threshold:0.15});
        if(section.current)observer.observe(section.current);
        return()=>{preference.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);observer.disconnect()};
    },[]);
    useEffect(()=>{
        if(!carousel)return;
        const select=()=>setActive(carousel.selectedScrollSnap()),down=()=>setDragging(true),up=()=>setDragging(false);
        carousel.on('select',select).on('reInit',select).on('pointerDown',down).on('pointerUp',up);select();
        return()=>{carousel.off('select',select).off('reInit',select).off('pointerDown',down).off('pointerUp',up)};
    },[carousel]);
    const running=visible&&pageVisible&&!reduced&&!paused&&!hovered&&!focused&&!dragging;
    useEffect(()=>{
        if(timedSlide.current!==active){remaining.current=7000;timedSlide.current=active}
        if(!carousel||!running)return;
        const started=performance.now();
        const timer=window.setTimeout(()=>carousel.scrollNext(),remaining.current);
        return()=>{window.clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(performance.now()-started))};
    },[carousel,running,active]);
    const choose=(index:number)=>carousel?.scrollTo(index,reduced);
    const style={'--journey-index':active,'--journey-column':active%2,'--journey-row':Math.floor(active/2)} as CSSProperties;
    return <section ref={section} className="intent-section section" id="your-next-move" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false)}}>
      <div className="section-head"><div><span className="eyebrow">{translate('A PLACE FOR EVERY NEXT CHAPTER')}</span><h2>{translate('Where would you')}<br/>{translate('like to ')}<em>{translate('begin?')}</em></h2></div><p>{translate('One local team.')}<br/>{translate('A conversation built around you.')}</p></div>
      <Tabs value={journeys[active].id} onValueChange={value=>choose(journeys.findIndex(j=>j.id===value))} className="journey-tabs journey-carousel" style={style}>
        <TabsList aria-label={translate('Your property goal')}><span className="journey-tab-highlight" aria-hidden="true"/>{journeys.map(j=><TabsTrigger key={j.id} value={j.id}><j.icon size={17}/>{translate(j.label)}</TabsTrigger>)}</TabsList>
        <div ref={viewport} className="journey-viewport"><div className="journey-track">
          {journeys.map((j,index)=><TabsContent forceMount hidden={false} inert={index!==active} aria-hidden={index!==active} tabIndex={index===active?0:-1} value={j.id} key={j.id} className="journey-slide">
            <div className="intent-panel"><div className="intent-copy"><span className="eyebrow">{translate('LAND & HOME / ')}{translate(j.label)}</span><h3>{translate(j.title)}</h3><p>{translate(j.copy)}</p><ul>{j.points.map(point=><li key={point}><Check size={17}/>{translate(point)}</li>)}</ul><Link href={j.href} className="btn">{translate(j.cta)}<ArrowUpRight size={18}/></Link><a className="text-link" href={business.tel}>{translate('Prefer a call? ')}{business.phone}</a></div><div className="intent-photo"><img src={j.image} alt={translate('Illustrative modern home')} loading="lazy" draggable={false}/><span>{translate(j.caption)}</span><small>{translate('Illustrative lifestyle imagery')}</small></div></div>
          </TabsContent>)}
        </div></div>
        <div className="journey-controls"><span className="journey-count" aria-live={running?'off':'polite'}><b>{String(active+1).padStart(2,'0')}</b><span aria-hidden="true"> / </span><span className="sr-only">{translate('of ' )}</span>04</span><div className="journey-progress" aria-hidden="true"><span key={active} style={{animationPlayState:running?'running':'paused'}}/></div><div className="journey-buttons"><button type="button" onClick={()=>choose((active+journeys.length-1)%journeys.length)} aria-label={translate('Previous card')}><ChevronLeft size={18}/></button>{!reduced&&<button type="button" onClick={()=>setPaused(v=>!v)} aria-label={translate(paused?'Resume automatic slides':'Pause automatic slides')} aria-pressed={paused}>{paused?<Play size={15}/>:<Pause size={15}/>}</button>}<button type="button" onClick={()=>choose((active+1)%journeys.length)} aria-label={translate('Next card')}><ChevronRight size={18}/></button></div></div>
      </Tabs>
    </section>;
}
export function ServiceDifference() {
    useLocale();
    return <section className="difference-section section"><div className="section-head"><div><span className="eyebrow">{translate("LOCAL HEART. CONSIDERED SERVICE.")}</span><h2>{translate("Property is personal.")}<br /><em>{translate("We keep it that way.")}</em></h2></div><Link href="/about" className="text-link">{translate("Get to know Land & Home")}<ArrowUpRight size={18}/></Link></div><div className="difference-grid">{tNode([
            [MapPin, 'Rooted right here', 'A Ficksburg base, with a focus on Ficksburg and Meqheleng. Clocolan, Fouriesburg and Bethlehem coming soon.'],
            [MessageCircle, 'A real conversation', 'Speak directly with the team about your goals, questions and next steps. Choose a call, email or WhatsApp.'],
            [ShieldCheck, 'Clarity before commitment', 'Discuss the property details, service scope and fees before deciding how to move forward.']
        ].map(([Icon, title, copy], i) => { const I = Icon as typeof Home; return <SpotlightCard key={String(title)} className="difference-card" spotlightColor="#d4b78e" intensity={.3} borderGlow={.45} proximity={0} flare={false}><div className="difference-card-content"><span className="difference-index" aria-hidden="true">{tNode(i + 1)}</span><I size={27}/><h3>{tNode(String(title))}</h3><p>{tNode(String(copy))}</p></div></SpotlightCard>; }))}</div></section>;
}
export function LocalAreas() { useLocale(); return <section className="local-section section"><div className="local-intro"><span className="eyebrow">{translate("OUR CORNER OF THE FREE STATE")}</span><h2>{translate("Local roots.")}<br /><em>{translate("Open doors.")}</em></h2><p>{translate("Start close to home. Tell us where you want to be, and we\u2019ll discuss your property plans with you.")}</p><a href={business.maps} target="_blank" rel="noreferrer" className="text-link">{translate("Find our Ficksburg office")}<ArrowUpRight size={18}/></a></div><div className="local-towns">{tNode([['Ficksburg', 'Our home base', '01'], ['Meqheleng', 'Our core service area', '02'], ['Clocolan', 'Coming soon', '03'], ['Fouriesburg', 'Coming soon', '04'], ['Bethlehem', 'Coming soon', '05']].map(([town, label, n]) => label === 'Coming soon' ? <div className="town-coming-soon" key={town}><span className="local-number">{tNode(n)}</span><div><h3>{tNode(town)}</h3><p>{tNode(label)}</p></div><span className="coming-badge">{translate("Coming soon")}</span></div> : <Link key={town} href={'/contact?town=' + encodeURIComponent(town)}><span className="local-number">{tNode(n)}</span><div><h3>{tNode(town)}</h3><p>{tNode(label)}</p></div><ArrowUpRight size={23}/></Link>))}</div></section>; }
export function FAQSection() {
    useLocale();
    const items = [
        ['Where do I start if I want to sell?', 'Start with an appraisal request. Tell us your property type, location and timing. We can then discuss the next step and what information is needed. An appraisal is an informed estimate, not a guaranteed selling price.'],
        ['Can you help if I am still exploring?', 'Yes. Share your budget, preferred area and timing. You do not need to have every detail worked out before starting a conversation.'],
        ['How do I arrange a viewing?', 'Contact the team with the property reference and your preferred day. We will need to confirm availability and agree the appointment with you. A request alone is not a confirmed booking.'],
        ['Do you help landlords with property management?', 'Contact us to discuss letting and management requirements. The services, fees, reporting and maintenance responsibilities are agreed for your property before an instruction is accepted.'],
        ['Are the properties displayed on this website available?', 'The current catalogue includes clearly labelled illustrative examples and local CRM previews. These are not confirmed live offers. Contact us directly to ask about current instructions and availability.'],
        ['How will my enquiry reach the team?', 'You can call, email or use WhatsApp. The enquiry form prepares a message for you to review and send in WhatsApp. Online submission is also shown as a coming-soon option until the service is connected. Neither option creates a marketing subscription.']
    ];
    return <section className="faq-section section"><div><span className="eyebrow">{translate("A LITTLE CLARITY GOES A LONG WAY")}</span><h2>{translate("Good questions.")}<br /><em>{translate("Clear next steps.")}</em></h2><p>{translate("Something else on your mind?")}</p><a href={whatsapp()} target="_blank" rel="noreferrer" className="text-link">{translate("Ask the team")}<MessageCircle size={18}/></a></div><Accordion type="single" collapsible className="home-faq">{tNode(items.map(([q, a], i) => <AccordionItem key={q} value={'faq-' + i}><AccordionTrigger>{tNode(q)}</AccordionTrigger><AccordionContent>{tNode(a)}</AccordionContent></AccordionItem>))}</Accordion></section>;
}
export function ContactDestination() { useLocale(); return <section className="contact-destination section" id="contact-team"><div><span className="eyebrow">{translate("YOUR NEXT MOVE STARTS WITH HELLO")}</span><h2>{translate("Let\u2019s open")}<br /><em>{translate("the next door.")}</em></h2><p>{translate("A home to find. A property to sell.")}<br />{translate("A new beginning to talk about.")}</p><a href={whatsapp()} className="btn" target="_blank" rel="noreferrer"><MessageCircle size={19}/>{translate("Chat on WhatsApp")}<ArrowUpRight size={18}/></a></div><div className="contact-destination-details"><a href={business.tel}><Phone /><span><small>{translate("CALL US")}</small><strong>{tNode(business.phone)}</strong></span><ArrowUpRight /></a><a href={'mailto:' + business.email}><Mail /><span><small>{translate("WRITE TO US")}</small><strong>{tNode(business.email)}</strong></span><ArrowUpRight /></a><a href={business.maps} target="_blank" rel="noreferrer"><MapPin /><span><small>{translate("FIND US IN FICKSBURG")}</small><strong>{tNode(business.address)}</strong><small>{translate("Visit during office hours or call to arrange a meeting.")}</small></span><ArrowUpRight /></a><OfficeHours /></div></section>; }
export function StickyContact() { useLocale(); return <div className="mobile-contact-bar" aria-label={translate("Contact Land and Home")}><a href={business.tel}><Phone size={18}/>{translate("Call us")}</a><a href={whatsapp()} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{translate("WhatsApp")}</a><button type="button" className="mobile-ai-launch" aria-haspopup="dialog" aria-controls="property-ai-dialog" onClick={() => window.dispatchEvent(new Event("lh-open-ai"))}><Sparkles size={18}/>{translate("Ask AI")}</button></div>; }
