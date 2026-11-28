import assert from 'node:assert/strict';
import {availableQuestions} from '../functions/_lib/trend-available.js';
import {trendResponse} from '../assets/trend-http.js';
import {appendAvailablePaper} from '../assets/trend-available.js';
const q={section:'Part II',ref:'6(a)',page:12,chapter:'Leases',marks:7,evidence:'Lease accounting',group:'q6'};
const available=availableQuestions({document_matches:true,complete:false,questions:[q,q,{...q,ref:'bad',page:0}]});
assert.equal(available.questions.length,1);
assert.equal(available.excludedFromTotals,true);
assert.equal(available.questions[0].marks,undefined);
assert.equal(availableQuestions({document_matches:false,questions:[q]}),null);
for(const stream of [false,true]){
 const data={error:'Marks do not reconcile',code:'EXTRACTION_INCOMPLETE',available};
 const response=stream?new Response(JSON.stringify({type:'result',status:422,data})+'\n',{headers:{'content-type':'application/x-ndjson'}}):Response.json(data,{status:422});
 await assert.rejects(()=>trendResponse(response),e=>e.status===422&&e.available.questions.length===1);
}
// DOM-shaped nodes confirm user-visible structure uses text, not HTML injection.
const el=(tag,text,cls)=>({tag,text,cls,children:[],append(...nodes){this.children.push(...nodes)}});
const host=el('li');appendAvailablePaper(host,{available},{sourceUrl:'https://example.com/paper.pdf'},{el,button:()=>{},sb:{}});
assert.equal(host.children[0].href,'https://example.com/paper.pdf');
assert.equal(host.children[0].rel,'noopener noreferrer');
assert(JSON.stringify(host).includes('unverified extraction'));
assert(!JSON.stringify(host).includes('7 marks'));
const unsafe=el('li');appendAvailablePaper(unsafe,{}, {sourceUrl:'javascript:alert(1)'},{el,button:()=>{},sb:{}});
assert(!unsafe.children.some(n=>n.tag==='a'));
console.log('PASS: available references survive JSON/stream failures, wrong-source data and disputed marks excluded, original-paper link and unverified warning rendered safely.');
