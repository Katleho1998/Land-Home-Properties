'use client';
import {useId,useState} from 'react';
import {ArrowUpRight,Calculator,RotateCcw} from 'lucide-react';
import {bond,zar} from './data';
import {whatsapp} from './business';

export function PropertyFinance({price,purpose}:{price:number;purpose:'buy'|'rent'}){
  const rental=purpose==='rent',id=useId();
  const [deposit,setDeposit]=useState(String(rental?price:Math.round(price*.1))),[rate,setRate]=useState('10.5'),[years,setYears]=useState('20'),[expenses,setExpenses]=useState('0'),[moving,setMoving]=useState('0');
  const num=(value:string)=>value.trim()===''?NaN:Number(value);
  const d=num(deposit),r=num(rate),y=num(years),e=num(expenses),m=num(moving);
  const valid=Number.isFinite(d)&&d>=0&&(rental?(Number.isFinite(e)&&e>=0&&Number.isFinite(m)&&m>=0):(d<=price&&Number.isFinite(r)&&r>=0&&r<=30&&Number.isInteger(y)&&y>=1&&y<=30));
  const principal=price-d,monthly=valid?(rental?price+e:bond(principal,r,y)):0;
  const reset=()=>{setDeposit(String(rental?price:Math.round(price*.1)));setRate('10.5');setYears('20');setExpenses('0');setMoving('0')};
  return <section className="property-finance" aria-labelledby={id+'-title'}>
    <div className="finance-heading"><span className="finance-icon"><Calculator size={22}/></span><div><span className="eyebrow">A LITTLE PLANNING. A CLEARER NEXT STEP.</span><h2 id={id+'-title'}>{rental?'Plan your rental budget.':'Make room for your next move.'}</h2></div></div>
    <p className="finance-intro">{rental?'See how the rent, deposit and your own cost estimates fit together.':'Adjust your deposit, interest rate and term to explore a possible bond repayment.'}</p>
    <div className="finance-layout"><div className="finance-inputs"><div className="finance-price"><span>{rental?'Advertised monthly rent':'Listed purchase price'}</span><strong>{zar(price)}</strong></div>
      <label className="finance-field"> {rental?'Rental deposit (R)':'Your deposit (R)'}<input type="number" min={0} max={rental?undefined:price} step="any" inputMode="decimal" value={deposit} onChange={ev=>setDeposit(ev.target.value)}/><small>{rental?'Starts at one month’s rent as an assumption. Confirm the actual deposit.':valid?`${(d/price*100).toFixed(1)}% of the listed price`:'Enter a deposit from zero to the purchase price.'}</small></label>
      {rental?<><label className="finance-field">Monthly utilities & other costs (R)<input type="number" min={0} step="any" inputMode="decimal" value={expenses} onChange={ev=>setExpenses(ev.target.value)}/><small>Add your own estimate for costs beyond rent.</small></label><label className="finance-field">Moving & setup costs (R)<input type="number" min={0} step="any" inputMode="decimal" value={moving} onChange={ev=>setMoving(ev.target.value)}/></label></>:<><label className="finance-field">Annual interest rate (%)<input type="number" min={0} max={30} step="0.05" inputMode="decimal" value={rate} onChange={ev=>setRate(ev.target.value)}/><small>10.5% is an editable illustration, not a current lender quote.</small></label><label className="finance-field">Repayment term (years)<select value={years} onChange={ev=>setYears(ev.target.value)}>{[5,10,15,20,25,30].map(n=><option value={n} key={n}>{n} years</option>)}</select></label></>}
      <button className="finance-reset" type="button" onClick={reset}><RotateCcw size={13}/>Reset estimates</button>
    </div><div className="finance-result" aria-live="polite"><span>{rental?'ESTIMATED MONTHLY BUDGET':'ESTIMATED MONTHLY REPAYMENT'}</span><strong>{valid?zar(monthly):'—'}<small>per month</small></strong>{valid?<dl>{rental?<><div><dt>Monthly rent</dt><dd>{zar(price)}</dd></div><div><dt>Other monthly costs</dt><dd>{zar(e)}</dd></div><div><dt>Deposit + first rent + setup</dt><dd>{zar(d+price+m)}</dd></div></>:<><div><dt>Deposit</dt><dd>{zar(d)}</dd></div><div><dt>Bond amount</dt><dd>{zar(principal)}</dd></div><div><dt>Interest over {y} years</dt><dd>{zar(Math.max(0,monthly*y*12-principal))}</dd></div></>}</dl>:<p>Please enter valid, non-negative amounts{rental?'.':', a deposit no higher than the price, and a rate from 0% to 30%.'}</p>}
      <a href={whatsapp(`Hello Land & Home, I would like to discuss ${rental?'the costs of renting':'the next steps for buying'} a property listed at ${zar(price)}${rental?' per month':''}.`)} target="_blank" rel="noreferrer">Talk through the next step<ArrowUpRight size={16}/></a>
    </div></div>
    <p className="finance-footnote">{rental?'Planning estimate only. Actual rent, deposit, utility charges and fees must be confirmed. The upfront estimate excludes your entered monthly utilities and any unentered fees.':'Illustrative principal-and-interest estimate at a constant rate, not a finance offer or affordability assessment. Excludes transfer and bond costs, rates, levies, insurance and other charges. Actual lender terms and eligibility may differ.'}</p>
  </section>;
}
