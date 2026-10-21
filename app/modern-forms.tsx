'use client';
import {t as translate,tNode,tAttr,useLocale} from './i18n';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CheckCircle, MessageCircle, Send } from 'lucide-react';
import { business, whatsapp, enquiryMessage } from './business';
import { onlineEnquiryAvailability, submitOnlineEnquiry } from './enquiry-delivery';
type FormField = {
    key: string;
    label: string;
    type?: string;
    options?: string[];
    required?: boolean;
    hint?: string;
};
const areas = ['Ficksburg', 'Meqheleng'];
const contactFields: FormField[] = [{ key: 'name', label: 'Your full name', required: true }, { key: 'phone', label: 'Phone / WhatsApp', type: 'tel', required: true, hint: 'The number we can reach you on.' }, { key: 'email', label: 'Email address', type: 'email' }, { key: 'language', label: 'Preferred language', options: ['English', 'Afrikaans', 'Sesotho'] }];
function fieldsFor(kind: string): FormField[] {
    if (kind === 'seller')
        return [{ key: 'town', label: 'Where is your property?', options: areas, required: true }, { key: 'type', label: 'Property type', options: ['House', 'Flat', 'Townhouse', 'Land', 'Commercial'], required: true }, { key: 'address', label: 'Street or neighbourhood', required: true }, { key: 'timing', label: 'When would you like to sell?', options: ['As soon as possible', 'Within 3 months', '3–6 months', 'Just exploring'], required: true }, { key: 'ownership', label: 'Your relationship to the property', options: ['Owner', 'Co-owner', 'Authorised representative'], required: true }, { key: 'notes', label: 'Anything else we should know?', type: 'textarea' }];
    if (kind === 'landlord')
        return [{ key: 'town', label: 'Property area', options: areas, required: true }, { key: 'units', label: 'Number of rental properties', type: 'number', required: true }, { key: 'managed', label: 'How is it managed now?', options: ['Self-managed', 'Managed by an agent', 'Vacant / not yet let'], required: true }, { key: 'message', label: 'What would you like help with?', type: 'textarea', required: true }];
    if (kind === 'commercial')
        return [{ key: 'town', label: 'Preferred area', options: areas }, { key: 'transaction', label: 'Your next move', options: ['Buy', 'Lease'], required: true }, { key: 'space', label: 'Space needed (m²)', type: 'number' }, { key: 'budget', label: 'Budget (R)', type: 'number' }, { key: 'message', label: 'Tell us about your business space', type: 'textarea', required: true }];
    if (['buyer', 'tenant', 'viewing'].includes(kind))
        return [{ key: 'town', label: 'Where would you like to live?', options: areas }, { key: 'budget', label: kind === 'tenant' ? 'Monthly rental budget (R)' : 'Your budget (R)', type: 'number', required: true }, { key: 'timeline', label: 'When are you hoping to move?', options: ['As soon as possible', 'Within 3 months', '3–6 months', 'Just exploring'] }, ...(kind === 'viewing' ? [{ key: 'date', label: 'Preferred viewing day', type: 'date' }] : []), { key: 'message', label: 'What would make it feel like home?', type: 'textarea', hint: 'For example: three bedrooms, a garden, close to work.' }];
    return [{ key: 'enquiry_type', label: 'What can we help you with?', options: ['Buying', 'Renting', 'Selling', 'Property management', 'Commercial', 'Something else'], required: true }, { key: 'message', label: 'Tell us a little about your plans', type: 'textarea', required: true }];
}
export function ModernEnquiryForm({ kind = 'contact', property }: {
    kind?: string;
    property?: string;
}) {
    const [locale] = useLocale();
    const languageChosen = useRef(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [step, setStep] = useState(0), [values, setValues] = useState<Record<string, string>>({ enquiry_type: kind === 'contact' ? '' : kind, property_reference: property || '', language: {en:'English',af:'Afrikaans',st:'Sesotho'}[locale] }), [error, setError] = useState(''), [prepared, setPrepared] = useState(''), [busy, setBusy] = useState(false), [consent, setConsent] = useState(false);
    const [delivery, setDelivery] = useState<'whatsapp' | 'online'>('whatsapp'), [receipt, setReceipt] = useState('');
    const submitting = useRef(false), requestId = useRef("");
    const [onlineEnquiriesEnabled, setOnlineEnabled] = useState(false);
    useEffect(() => { let active = true; void onlineEnquiryAvailability().then(v => { if (active)
        setOnlineEnabled(v); }); return () => { active = false; }; }, []);
    useEffect(()=>{if(!languageChosen.current)setValues(v=>({...v,language:{en:'English',af:'Afrikaans',st:'Sesotho'}[locale]}));formRef.current?.querySelectorAll<HTMLInputElement>('input,select,textarea').forEach(el=>el.setCustomValidity(''));},[locale]);
    const heading = useRef<HTMLHeadingElement>(null);
    const details = fieldsFor(kind), steps = [kind === 'seller' ? 'Your property' : 'Your plans', 'About you', 'Review & send'];
    const changeStep = (next: number) => { setError(''); setStep(next); requestAnimationFrame(() => heading.current?.focus()); };
    const field = (f: FormField) => <label className={'modern-field ' + (f.type === 'textarea' ? 'wide' : '')} key={f.key}><span>{tNode(f.label)}{tNode(f.required && <b aria-label={translate("required")}>{translate(" *")}</b>)}</span>{tNode(f.options ? <select name={f.key} value={values[f.key] || ''} required={f.required} onChange={e => {if(f.key==='language')languageChosen.current=true;setValues(v => ({ ...v, [f.key]: e.target.value }));}}><option value="">{translate("Select an option")}</option>{tNode(f.options.map(o => <option key={o} value={o}>{tNode(o)}</option>))}</select> : f.type === 'textarea' ? <textarea name={f.key} rows={3} maxLength={1200} required={f.required} value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}/> : <input name={f.key} type={f.type || 'text'} required={f.required} value={values[f.key] || ''} min={f.type === 'number' ? 1 : undefined} maxLength={f.type === 'tel' ? 24 : 120} autoComplete={['name', 'email'].includes(f.key) ? f.key : f.key === 'phone' ? 'tel' : 'off'} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}/>)}{tNode(f.hint && <small>{tNode(f.hint)}</small>)}</label>;
    if (receipt)
        return <section className="modern-success" role="status"><span className="form-success-icon"><CheckCircle /></span><h3>{translate("Your enquiry has been received.")}</h3><p>{translate("Reference: ")}<strong>{tNode(receipt)}</strong>{translate(". Our team will review your enquiry and contact you.")}</p><p>{translate("This is an enquiry acknowledgement, not a confirmed viewing or booking.")}</p></section>;
    if (prepared)
        return <section className="modern-success" role="status"><span className="form-success-icon"><CheckCircle /></span><span className="eyebrow">{translate("YOUR NEXT CHAPTER")}</span><h3>{translate("Your message is ready.")}</h3><p>{translate("Open WhatsApp, review your message and press Send. Nothing has been sent yet.")}</p><a href={whatsapp(prepared)} target="_blank" rel="noreferrer" className="btn"><MessageCircle size={18}/>{translate("Open WhatsApp to send")}</a><a className="text-link" href={'mailto:' + business.email + '?subject=Property%20enquiry&body=' + encodeURIComponent(prepared)}>{translate("Send by email instead")}</a><button type="button" className="text-link" onClick={() => setPrepared('')}>{translate("Edit my details")}</button></section>;
    return <form ref={formRef} className="modern-enquiry" onInvalidCapture={e=>{const input=e.target as HTMLInputElement;input.setCustomValidity('');input.setCustomValidity(translate(input.validity.valueMissing?'Please complete this field.':input.validity.typeMismatch?'Please enter a valid email address.':'Please check this value.'));}} onInputCapture={e=>{(e.target as HTMLInputElement).setCustomValidity('');}} onSubmit={async (e) => { e.preventDefault(); if (step < 2) {
        changeStep(step + 1);
        return;
    } if (submitting.current)
        return; if (delivery === 'online' && !onlineEnquiriesEnabled) {
        setError('Online submissions are coming soon. Please choose WhatsApp for now.');
        return;
    } if (!consent) {
        setError('Please confirm we may respond to your enquiry.');
        return;
    } submitting.current = true; setBusy(true); setError(''); try {
        const fields = { ...values, popia_consent: 'on' };
        if (delivery === 'online') {
            if (!requestId.current)
                requestId.current = crypto.randomUUID();
            setReceipt(await submitOnlineEnquiry(fields, requestId.current));
            return;
        }
        setPrepared(enquiryMessage(fields));
    }
    catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to prepare your enquiry. Please try again.');
    }
    finally {
        submitting.current = false;
        setBusy(false);
    } }}>
    <ol className="form-stepper" aria-label={translate("Enquiry progress")}>{tNode(steps.map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined} className={step >= i ? 'reached' : ''}><span>{tNode(step > i ? <Check size={14}/> : i + 1)}</span><small>{tNode(label)}</small></li>))}</ol>
    <div className="form-step-title"><span className="eyebrow">{translate("STEP ")}{tNode(step + 1)}{translate(" OF 3")}</span><h3 ref={heading} tabIndex={-1}>{tNode(step === 0 ? 'Let’s start with you.' : step === 1 ? 'How can we reach you?' : 'Does everything look right?')}</h3><p>{tNode(step === 0 ? 'A few details help us understand your next move.' : step === 1 ? 'Just your name and number are essential.' : 'Review your details and choose how you would like to send them.')}</p></div>
    {tNode(step < 2 ? <div className="modern-fields">{tNode((step === 0 ? details : contactFields).map(field))}</div> : <><dl className="form-review">{tNode([...details, ...contactFields].filter(f => values[f.key]).map(f => <div key={f.key}><dt>{tNode(f.label)}</dt><dd>{f.options?.includes(values[f.key])?translate(values[f.key]):values[f.key]}</dd></div>))}{tNode(property && <div><dt>{translate("Property reference")}</dt><dd>{tNode(property)}</dd></div>)}</dl><fieldset className="enquiry-delivery"><legend>{translate("How would you like to send your enquiry?")}</legend><div className="delivery-options"><label className={delivery === 'whatsapp' ? 'selected' : ''}><input type="radio" name="delivery" value="whatsapp" checked={delivery === 'whatsapp'} onChange={() => { setDelivery('whatsapp'); setError(''); }}/><MessageCircle size={20}/><span><strong>{translate("WhatsApp")}</strong><small>{translate("Review and send to our team.")}</small></span></label><label className={delivery === 'online' ? 'selected' : ''}><input type="radio" name="delivery" value="online" checked={delivery === 'online'} onChange={() => { setDelivery('online'); setError(''); }}/><Send size={20}/><span><strong>{translate("Submit online")}</strong><small>{tNode(onlineEnquiriesEnabled ? 'Send directly from this website.' : 'Coming soon')}</small></span></label></div>{tNode(delivery === 'online' && !onlineEnquiriesEnabled && <div className="delivery-pending" role="status"><strong>{translate("Online enquiries are coming soon.")}</strong><p>{translate("You\u2019ll be able to submit directly here once this service opens. Your details haven\u2019t been sent. Choose WhatsApp to continue now.")}</p><button type="button" className="text-link" onClick={() => setDelivery('whatsapp')}>{translate("Continue with WhatsApp")}<ArrowRight size={15}/></button></div>)}</fieldset><label className="consent"><input type="checkbox" checked={consent} required onChange={e => setConsent(e.target.checked)}/><span>{translate("I agree that Land & Home may use these details to respond to my enquiry. No marketing subscription. ")}<Link href="/privacy">{translate("Privacy notice")}</Link>{translate(".")}</span></label></>)}
    {tNode(error && <p className="form-error" role="alert">{tNode(error)}</p>)}
    <div className="modern-form-actions">{tNode(step > 0 && <button type="button" className="btn secondary" disabled={busy} onClick={() => changeStep(step - 1)}><ArrowLeft size={16}/>{translate("Back")}</button>)}<button type="submit" className="btn" disabled={busy || (step === 2 && delivery === 'online' && !onlineEnquiriesEnabled)}>{tNode(busy ? (delivery === 'online' ? 'Submitting…' : 'Preparing…') : step < 2 ? 'Continue' : delivery === 'online' ? (onlineEnquiriesEnabled ? 'Submit online' : 'Online submission coming soon') : 'Prepare WhatsApp message')}<ArrowRight size={17}/></button></div><p className="form-reassurance">{translate("Your enquiry. Your choice. Nothing is sent automatically.")}</p>
  </form>;
}
