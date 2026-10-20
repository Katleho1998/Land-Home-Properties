const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
function load(file,requireFn){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:requireFn,Intl});return exports}
const data=load('app/data.ts');
const {matchProperties}=load('app/property-matching.ts',()=>data);
let result=matchProperties(data.listings,{purpose:'rent',town:'Ficksburg',type:'House',beds:3,budget:8000});
assert.equal(result.exact.length,1);
assert.equal(result.exact[0].price,7500);
assert.equal(result.exact[0].purpose,'rent');
result=matchProperties(data.listings,{purpose:'rent',town:'Ficksburg',type:'House',beds:5,budget:4000});
assert.equal(result.exact.length,0);
assert(result.alternatives.length>0);
for(const {property,reasons} of result.alternatives){
  assert(reasons.length>0);
  assert.equal(property.purpose,'rent');
  assert(!['Clocolan','Fouriesburg','Bethlehem'].includes(property.town));
  if(property.price>4000)assert(reasons.some(r=>r.includes('above your budget')));
  if(property.beds<5)assert(reasons.some(r=>r.includes('below your 5+')));
}
assert.equal(matchProperties([],{purpose:'buy',town:'',type:'',beds:0,budget:0}).alternatives.length,0);
result=matchProperties(data.listings,{purpose:'buy',town:'',type:'',beds:0,budget:0});
assert(result.exact.length>0);
assert(result.exact.every(p=>p.purpose==='buy'&&!p.commercial&&data.towns.includes(p.town)));
console.log('PASS: exact matching, strict budget and bedrooms, flexible criteria, explained alternatives, empty results and coming-soon town exclusion.');
