import {Listing,towns} from './data';
export type SearchBrief={purpose:'buy'|'rent';town:string;type:string;beds:number;budget:number};
export function matchProperties(listings:Listing[],brief:SearchBrief){
  const pool=listings.filter(p=>towns.includes(p.town)&&p.purpose===brief.purpose&&!p.commercial);
  const differences=(p:Listing)=>[
    ...(brief.town&&p.town!==brief.town?[`Different area: ${p.town}`]:[]),
    ...(brief.type&&p.type!==brief.type?[`Different type: ${p.type}`]:[]),
    ...(brief.beds&&p.beds<brief.beds?[`${p.beds} bedrooms, below your ${brief.beds}+ preference`]:[]),
    ...(brief.budget&&p.price>brief.budget?[`R${(p.price-brief.budget).toLocaleString('en-ZA')} above your budget`]:[])
  ];
  const exact=pool.filter(p=>!differences(p).length);
  const alternatives=pool.filter(p=>differences(p).length).sort((a,b)=>
    differences(a).length-differences(b).length||
    Math.abs(a.price-brief.budget)-Math.abs(b.price-brief.budget)
  ).slice(0,3).map(property=>({property,reasons:differences(property)}));
  return {exact,alternatives};
}
