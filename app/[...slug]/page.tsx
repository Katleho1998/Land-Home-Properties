import Site from '../site';
import {listings} from '../data';
import {notFound} from 'next/navigation';
const pages=['buy','rent','sell','landlords','commercial','about','contact','privacy','saved'];
export async function generateMetadata({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;const item=slug[0]==='property'?listings.find(x=>x.id===slug[1]):null;return {title:item?`${item.title} — Sample | Land & Home Properties`:`${slug[0][0].toUpperCase()+slug[0].slice(1)} | Land & Home Properties`,description:item?`Illustrative ${item.type.toLowerCase()} in ${item.town}. Sample listing for the Land & Home website preview.`:'Explore property services in Ficksburg, Meqheleng and the Eastern Free State with Land & Home Properties.'}}
export default async function Page({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;if(!(slug.length===1&&pages.includes(slug[0]))&&!(slug.length===2&&slug[0]==='property'&&listings.some(p=>p.id===slug[1])))notFound();return <Site/>}
