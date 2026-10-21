'use client';
import {t as translate,tNode,tAttr,useLocale} from './i18n';
import { useId, useState } from 'react';
import { ArrowUpRight, Calculator, RotateCcw } from 'lucide-react';
import { bond, zar } from './data';
import { whatsapp } from './business';
export function PropertyFinance({ price, purpose }: {
    price: number;
    purpose: 'buy' | 'rent';
}) {
    useLocale();
    const rental = purpose === 'rent', id = useId();
    const [deposit, setDeposit] = useState(String(rental ? price : Math.round(price * .1))), [rate, setRate] = useState('10.5'), [years, setYears] = useState('20'), [expenses, setExpenses] = useState('0'), [moving, setMoving] = useState('0');
    const num = (value: string) => value.trim() === '' ? NaN : Number(value);
    const d = num(deposit), r = num(rate), y = num(years), e = num(expenses), m = num(moving);
    const valid = Number.isFinite(d) && d >= 0 && (rental ? (Number.isFinite(e) && e >= 0 && Number.isFinite(m) && m >= 0) : (d <= price && Number.isFinite(r) && r >= 0 && r <= 30 && Number.isInteger(y) && y >= 1 && y <= 30));
    const principal = price - d, monthly = valid ? (rental ? price + e : bond(principal, r, y)) : 0;
    const reset = () => { setDeposit(String(rental ? price : Math.round(price * .1))); setRate('10.5'); setYears('20'); setExpenses('0'); setMoving('0'); };
    return <section className="property-finance" aria-labelledby={id + '-title'}>
    <div className="finance-heading"><span className="finance-icon"><Calculator size={22}/></span><div><span className="eyebrow">{translate("A LITTLE PLANNING. A CLEARER NEXT STEP.")}</span><h2 id={id + '-title'}>{tNode(rental ? 'Plan your rental budget.' : 'Make room for your next move.')}</h2></div></div>
    <p className="finance-intro">{tNode(rental ? 'See how the rent, deposit and your own cost estimates fit together.' : 'Adjust your deposit, interest rate and term to explore a possible bond repayment.')}</p>
    <div className="finance-layout"><div className="finance-inputs"><div className="finance-price"><span>{tNode(rental ? 'Advertised monthly rent' : 'Listed purchase price')}</span><strong>{tNode(zar(price))}</strong></div>
      <label className="finance-field"> {tNode(rental ? 'Rental deposit (R)' : 'Your deposit (R)')}<input type="number" min={0} max={rental ? undefined : price} step="any" inputMode="decimal" value={deposit} onChange={ev => setDeposit(ev.target.value)}/><small>{tNode(rental ? 'Starts at one month’s rent as an assumption. Confirm the actual deposit.' : valid ? `${(d / price * 100).toFixed(1)}% of the listed price` : 'Enter a deposit from zero to the purchase price.')}</small></label>
      {tNode(rental ? <><label className="finance-field">{translate("Monthly utilities & other costs (R)")}<input type="number" min={0} step="any" inputMode="decimal" value={expenses} onChange={ev => setExpenses(ev.target.value)}/><small>{translate("Add your own estimate for costs beyond rent.")}</small></label><label className="finance-field">{translate("Moving & setup costs (R)")}<input type="number" min={0} step="any" inputMode="decimal" value={moving} onChange={ev => setMoving(ev.target.value)}/></label></> : <><label className="finance-field">{translate("Annual interest rate (%)")}<input type="number" min={0} max={30} step="0.05" inputMode="decimal" value={rate} onChange={ev => setRate(ev.target.value)}/><small>{translate("10.5% is an editable illustration, not a current lender quote.")}</small></label><label className="finance-field">{translate("Repayment term (years)")}<select value={years} onChange={ev => setYears(ev.target.value)}>{tNode([5, 10, 15, 20, 25, 30].map(n => <option value={n} key={n}>{tNode(n)}{translate(" years")}</option>))}</select></label></>)}
      <button className="finance-reset" type="button" onClick={reset}><RotateCcw size={13}/>{translate("Reset estimates")}</button>
    </div><div className="finance-result" aria-live="polite"><span>{tNode(rental ? 'ESTIMATED MONTHLY BUDGET' : 'ESTIMATED MONTHLY REPAYMENT')}</span><strong>{tNode(valid ? zar(monthly) : '—')}<small>{translate("per month")}</small></strong>{tNode(valid ? <dl>{tNode(rental ? <><div><dt>{translate("Monthly rent")}</dt><dd>{tNode(zar(price))}</dd></div><div><dt>{translate("Other monthly costs")}</dt><dd>{tNode(zar(e))}</dd></div><div><dt>{translate("Deposit + first rent + setup")}</dt><dd>{tNode(zar(d + price + m))}</dd></div></> : <><div><dt>{translate("Deposit")}</dt><dd>{tNode(zar(d))}</dd></div><div><dt>{translate("Bond amount")}</dt><dd>{tNode(zar(principal))}</dd></div><div><dt>{translate("Interest over ")}{tNode(y)}{translate(" years")}</dt><dd>{tNode(zar(Math.max(0, monthly * y * 12 - principal)))}</dd></div></>)}</dl> : <p>{translate("Please enter valid, non-negative amounts")}{tNode(rental ? '.' : ', a deposit no higher than the price, and a rate from 0% to 30%.')}</p>)}
      <a href={whatsapp(`Hello Land & Home, I would like to discuss ${rental ? 'the costs of renting' : 'the next steps for buying'} a property listed at ${zar(price)}${rental ? ' per month' : ''}.`)} target="_blank" rel="noreferrer">{translate("Talk through the next step")}<ArrowUpRight size={16}/></a>
    </div></div>
    <p className="finance-footnote">{tNode(rental ? 'Planning estimate only. Actual rent, deposit, utility charges and fees must be confirmed. The upfront estimate excludes your entered monthly utilities and any unentered fees.' : 'Illustrative principal-and-interest estimate at a constant rate, not a finance offer or affordability assessment. Excludes transfer and bond costs, rates, levies, insurance and other charges. Actual lender terms and eligibility may differ.')}</p>
  </section>;
}
