const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {build}=require('esbuild');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const ts=require('typescript');
async function main(){
 const root=path.resolve(__dirname,'..');
 const built=await build({stdin:{contents:`export {default as Site} from './app/site';export * from './app/i18n';export {translations} from './app/translations';export {ModernEnquiryForm} from './app/modern-forms';export {PropertyGallery} from './app/property-gallery';export {PropertyFinance} from './app/property-finance';export {GuidedPropertySearch} from './app/guided-property-search';`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,packages:'external',plugins:[{name:'local-render-fixtures',setup(b){
  b.onResolve({filter:/^next\/(link|navigation)$/},args=>({path:args.path,namespace:'fixtures'}));
  b.onResolve({filter:/public-properties$/},()=>({path:'public-properties',namespace:'fixtures'}));
  b.onLoad({filter:/\.css$/},()=>({loader:'empty',contents:''}));
  b.onLoad({filter:/.*/,namespace:'fixtures'},args=>({loader:'js',resolveDir:root,contents:args.path==='next/link'?`const React=require('react');module.exports=({children,...props})=>React.createElement('a',props,children);`:args.path==='next/navigation'?`exports.usePathname=()=>globalThis.__route||'/';exports.useRouter=()=>({push(){}});exports.useSearchParams=()=>new URLSearchParams();`:`exports.usePublicProperties=()=>({listings:[],ready:true,error:''});`}));
 }}]});
 const mod=new Module(path.join(root,'language-test-bundle.cjs'),module);mod.filename=path.join(root,'language-test-bundle.cjs');mod.paths=Module._nodeModulePaths(root);mod._compile(built.outputFiles[0].text,mod.filename);
 const {Site,setLocale,t,tNode,translations,ModernEnquiryForm,PropertyGallery,PropertyFinance,GuidedPropertySearch}=mod.exports;
 const storage=new Map();global.localStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null};global.document={documentElement:{lang:'en'}};
 for(const [key,pair] of Object.entries(translations)){assert(key);assert(pair.af?.trim(),key);assert(pair.st?.trim(),key)}
 for(const locale of ['en','af','st']){
  setLocale(locale);assert.equal(document.documentElement.lang,locale);assert.equal(storage.get('lh-language'),locale);
  for(const route of ['/','/buy','/rent','/commercial','/saved','/sell','/landlords','/about','/contact','/privacy']){
   globalThis.__route=route;const html=renderToStaticMarkup(React.createElement(Site));
   assert(html.includes(t('Buy a home')),locale+' '+route);assert(html.includes('071 603 4542'));assert(!html.includes('Full translation is being prepared'));assert(html.includes('hello@landhomeproperties.co.za'));
  }
  const form=renderToStaticMarkup(React.createElement(ModernEnquiryForm,{kind:'seller'}));
  assert(form.includes('value="House"'));assert(form.includes(t('House')));assert(form.includes('value="Owner"'));assert(form.includes(t('Owner')));
  const guided=renderToStaticMarkup(React.createElement(GuidedPropertySearch,{intent:'buy',onExit(){}}));assert(guided.includes(t('Where would you like to live?')));assert(guided.includes('Ficksburg'));
  const gallery=renderToStaticMarkup(React.createElement(PropertyGallery,{title:'Unique property title',image:'/test.jpg',live:true}));assert(gallery.includes(t('Photo tour')));assert(gallery.includes('mosaic-photo-0'));assert(gallery.includes('Unique property title'));
  const finance=renderToStaticMarkup(React.createElement(PropertyFinance,{price:1000000,purpose:'buy'}));assert(finance.includes(t('Repayment term (years)')));assert(finance.includes('value="20"'));
 }
 setLocale('af');assert.equal(t(' Buy a home '),' Koop ’n huis ');assert.equal(t('3 matching properties'),'3 passende eiendomme');assert.equal(t('Up to R6 000'),'Tot R6 000');assert.equal(t('Different type: House'),'Ander soort: Huis');
 assert.equal(t('A unique owner-written listing'), 'A unique owner-written listing');assert.equal(tNode(42),42);
 setLocale('invalid');assert.equal(storage.get('lh-language'),'af');
 global.localStorage={setItem(){throw new Error('Blocked')},getItem(){throw new Error('Blocked')}};setLocale('st');assert.equal(t('Buy'),'Reka');
 // Every explicit copy call must have translations (brand names, units and numbers are invariant).
 const invariant=new Set(['Land & Home','Land & Home Properties','EN','AF','ST','WhatsApp','m²','Ficksburg & Meqheleng','LAND & HOME /']);
 const files=['site','pages','components','front-sections','brand-sections','modern-forms','property-gallery','property-finance','ai-chat','guided-property-search','hero-video'].map(f=>'app/'+f+'.tsx').concat('components/ui/ai-input-with-suggestions.tsx');
 for(const file of files){const sf=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(n){
  if(ts.isCallExpression(n)&&n.expression.getText(sf)==='translate'&&ts.isStringLiteral(n.arguments[0])){const key=n.arguments[0].text.trim().replace(/\s+/g,' ');if(/[A-Za-z]/.test(key)&&!invariant.has(key))assert(translations[key],file+': missing '+key)}
  if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(sf)==='option')assert(n.openingElement.attributes.properties.some(a=>a.name?.getText(sf)==='value'),file+': option needs stable value');
  ts.forEachChild(n,visit)
 }visit(sf)}
 console.log(`PASS: ${Object.keys(translations).length} bilingual entries; 30 public page renders; stable form values; gallery, finance and guided search; language persistence, invalid preferences and blocked storage; static copy coverage.`);
}
main().catch(error=>{console.error(error);process.exitCode=1});
