'use client';
import {t as translate,tNode,tAttr,useLocale} from './i18n';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ModernEnquiryForm } from './modern-forms';
import { ArrowLeft, ArrowRight, Check, CheckCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { bond, photos as samplePhotos, towns, zar } from './data';
import { captureEnquiry } from './crm/store';
import { enquiryAttribution } from './attribution';
import { business, whatsapp, enquiryMessage } from './business';
function EnquiryAttribution({ formId }: {
    formId: string;
}) { useLocale(); const [values, setValues] = useState<Record<string, string>>({}); useEffect(() => setValues(enquiryAttribution(formId)), [formId]); return <>{tNode(Object.entries(values).map(([name, value]) => <input key={name} type="hidden" name={name} value={value}/>))}</>; }
export function Intro({ tag, title, children }: {
    tag: string;
    title: string;
    children?: React.ReactNode;
}) { useLocale(); return <section className="page-intro reveal"><span className="eyebrow">{tNode(tag)}</span><h1>{tNode(title)}</h1>{tNode(children && <p>{tNode(children)}</p>)}</section>; }
export function Field({ label, name, type = 'text', options, required = false, defaultValue, min, max, step }: {
    label: string;
    name: string;
    type?: string;
    options?: string[];
    required?: boolean;
    defaultValue?: string | number;
    min?: number;
    max?: number;
    step?: string;
}) { useLocale(); return <label className="field">{tNode(label)}{tNode(required ? ' *' : '')}{tNode(options ? <select name={name} required={required} defaultValue={defaultValue || ''}><option value="">{translate("Please select")}</option>{tNode(options.map(o => <option key={o} value={o}>{tNode(o)}</option>))}</select> : type === 'textarea' ? <textarea name={name} required={required} maxLength={2000}/> : <input name={name} type={type} required={required} defaultValue={defaultValue} min={min} max={max} step={step} maxLength={type === 'text' ? 120 : undefined} autoComplete={name === 'name' ? 'name' : name === 'email' ? 'email' : name === 'phone' ? 'tel' : undefined}/>)}</label>; }
export function LeadForm({ kind = 'contact', property }: {
    kind?: string;
    property?: string;
}) { useLocale(); return <ModernEnquiryForm key={kind + property} kind={kind} property={property}/>; }
export function ValuationForm() { useLocale(); return <ModernEnquiryForm kind="seller"/>; }
export function BondCalculator({ price }: {
    price: number;
}) { useLocale(); const [deposit, setDeposit] = useState(10); const [years, setYears] = useState(20); const [rate, setRate] = useState(10.5); const monthly = bond(price * (1 - deposit / 100), rate, years); return <section className="panel calculator"><span className="eyebrow">{translate("PLAN YOUR NEXT MOVE")}</span><h2>{translate("What might it cost?")}</h2><p>{translate("Explore a monthly bond repayment on ")}{tNode(zar(price))}{translate(".")}</p><div className="form-grid"><label className="field">{translate("Deposit (%)")}<input type="number" min="0" max="100" value={deposit} onChange={e => setDeposit(Math.max(0, Math.min(100, Number(e.target.value))))}/></label><label className="field">{translate("Term (years)")}<input type="number" min="1" max="30" value={years} onChange={e => setYears(Math.max(1, Math.min(30, Number(e.target.value))))}/></label><label className="field">{translate("Interest rate (%)")}<input type="number" min="0" max="30" step="0.1" value={rate} onChange={e => setRate(Math.max(0, Math.min(30, Number(e.target.value))))}/></label><div className="field">{translate("Deposit amount")}<p>{tNode(zar(price * deposit / 100))}</p></div></div><div className="calc-result" aria-live="polite">{translate("Estimated monthly repayment")}<strong>{tNode(zar(monthly))}</strong><p>{translate("Indicative gross monthly income: ")}<b>{tNode(zar(monthly / .3))}</b><br /><span className="small">{translate("Using a 30% repayment-to-income guide.")}</span></p></div><p className="small space-top">{translate("Illustrative estimate, not financial advice or bank approval. The 10.5% starting rate is an adjustable assumption, not a current lender quote. Excludes transfer costs, bond costs, insurance, rates, levies and other debts. Actual affordability and rates depend on your lender.")}</p></section>; }
export { PropertyGallery as Gallery } from './property-gallery';
export function TownMap({ town = 'Ficksburg', autoLoad = false }: {
    town?: string;
    autoLoad?: boolean;
}) { useLocale(); const [load, setLoad] = useState(autoLoad); return <div className="map-panel">{tNode(load ? <iframe loading="lazy" title={tAttr(town + ' area map')} src={'https://maps.google.com/maps?q=' + encodeURIComponent(town + ', Free State, South Africa') + '&output=embed'}/> : <div className="map-placeholder"><span className="eyebrow">{translate("EXPLORE THE AREA")}</span><h3>{tNode(town)}{translate(", Eastern Free State")}</h3><button className="btn secondary" onClick={() => setLoad(true)}>{translate("Load area map")}</button></div>)}<p>{translate("Town-level location only; no property address is implied. Loading the map connects to Google Maps.")}</p></div>; }
export function Testimonials() { useLocale(); return null; }
