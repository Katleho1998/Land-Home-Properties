'use client';
import {t as translate,tNode,tAttr,useLocale} from '@/app/i18n';
import { useEffect } from 'react';
import { ArrowUp, Home, KeyRound, Building2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAutoResizeTextarea } from '@/components/hooks/use-auto-resize-textarea';
import { cn } from '@/lib/utils';
const actions = [
    { text: 'Buy a home', prompt: 'I’d like help buying a home.', icon: Home },
    { text: 'Find a rental', prompt: 'I’m looking for a rental.', icon: KeyRound },
    { text: 'Sell my property', prompt: 'I’d like help selling my property.', icon: Building2 },
];
// Adapted from the supplied component; controlled text preserves failed messages.
export function AIInputWithSuggestions({ value, onChange, onSubmit, disabled = false, showSuggestions = false, className, onAction }: {
    value: string;
    onChange: (text: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
    showSuggestions?: boolean;
    className?: string;
    onAction?: (intent: 'buy' | 'rent' | 'sell') => void;
}) {
    useLocale();
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 48, maxHeight: 120 });
    useEffect(() => adjustHeight(), [value, adjustHeight]);
    return <form className={cn('support-composer', className)} onSubmit={e => { e.preventDefault(); if (!disabled && value.trim())
        onSubmit(); }}>
    {tNode(showSuggestions && <div className="support-suggestions">{tNode(actions.map(({ text, prompt, icon: Icon }) => <button type="button" key={text} disabled={disabled} onClick={() => { if (onAction) {
        onAction(text === 'Buy a home' ? 'buy' : text === 'Find a rental' ? 'rent' : 'sell');
    }
    else {
        onChange(prompt);
        textareaRef.current?.focus();
    } }}><Icon size={13}/>{tNode(text)}</button>))}</div>)}
    <div className="support-input"><label className="sr-only" htmlFor="property-ai-message">{translate("Message the AI assistant")}</label><Textarea ref={textareaRef} id="property-ai-message" rows={1} value={value} maxLength={1200} disabled={disabled} placeholder={translate("Ask about your next move\u2026")} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (!disabled && value.trim())
            onSubmit();
    } }}/><button type="submit" aria-label={translate("Send message to AI")} disabled={disabled || !value.trim()}><ArrowUp size={19}/></button></div>
  </form>;
}
