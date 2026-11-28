import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/trend-analysis.js';
const id='11111111-1111-5111-8111-111111111111';
let stored,modelCalls=0,uploads=0,downloads=0,deleted=0,modelStatus=200,finishReason='STOP',storageStatus=200;
let authId='student-a';
const row={id,title:'Final AFM May 2026',level:'Final',subject:'Advanced Financial Management',category:'icai_link',chapter:'previous_year_question',file_bucket:'ca-materials',file_path:'admin/paper.pdf',is_published:true,is_premium:false};
const draft={choices:[],document_matches:true,complete:true,exam_marks:10,total_offered_marks:10,notes:'',rules:[{section:'Descriptive',maximum:10,compulsory:[1],choose_from:[],choose_count:0}],allocations:[{group:'Q1',marks:10}],questions:[{group:'Q1',ref:'1',section:'Descriptive',page:1,chapter:'Chapter 1: A',marks:10,evidence:'Valuation technique',optionalGroup:'',uncertain:false}]};
globalThis.fetch=async(url,o={})=>{
 const u=String(url);
 if(u.includes('/auth/v1/user'))return Response.json({id:authId});
 if(u.includes('/rest/v1/materials'))return Response.json([row]);
 if(u.includes('/rest/v1/trend_document_checkpoints')){if(o.method==='POST'){stored=JSON.parse(o.body);return new Response(null,{status:201})}return Response.json(stored?[stored]:[])}
 if(u.startsWith('https://www.icai.org/'))return new Response('<p>Chapter 1: A</p><p>Chapter 2: B</p>');
 if(u.includes('/storage/v1/object/')){downloads++;return new Response('%PDF-1.7 fixture %%EOF',{status:storageStatus})}
 if(u.endsWith('/upload/v1beta/files')){uploads++;return new Response('',{headers:{'x-goog-upload-url':'https://generativelanguage.googleapis.com/upload-test'}})}
 if(u.endsWith('/upload-test'))return Response.json({file:{name:'files/test',uri:'https://generativelanguage.googleapis.com/v1beta/files/test',state:'ACTIVE'}});
 if(u.includes(':generateContent')){modelCalls++;return Response.json({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(draft)}]}}]},{status:modelStatus})}
 if(o.method==='DELETE'){deleted++;return new Response('')}
 throw Error('Unexpected request '+u);
};
const context=()=>({request:new Request('https://test.local/api/trend-analysis',{method:'POST',headers:{authorization:'Bearer test','x-ca-trend-version':'7'},body:JSON.stringify({id,level:'Final',subject:'Advanced Financial Management'})}),env:{GEMINI_API_KEY:'test-only'}});
const call=async()=>{const r=await onRequest(context());return {status:r.status,data:await r.json()}};
const old=context();old.request=new Request(old.request,{headers:{authorization:'Bearer test'}});assert.equal((await onRequest(old)).status,409);
let r=await call();assert.equal(r.status,202,JSON.stringify(r));assert.equal(modelCalls,0);assert.equal(uploads,1);
r=await call();assert.equal(r.status,202,JSON.stringify(r));assert.equal(modelCalls,1);assert.equal(deleted,0);
r=await call();assert.equal(r.status,200,JSON.stringify(r));assert.equal(modelCalls,2);assert.equal(r.data.totalOffered,10);assert.equal(deleted,1);
r=await call();assert.equal(r.data.cached,true);assert.equal(modelCalls,2);assert.equal(downloads,1);
stored.payload=stored.payload.replace('Valuation technique','Fabricated evidence');
r=await call();assert.equal(r.status,202);assert.equal(uploads,2);assert.equal(modelCalls,2);
modelStatus=429;r=await call();assert.equal(r.status,429);assert.equal(r.data.questions,undefined);assert.equal(deleted,1);
modelStatus=200;finishReason='MAX_TOKENS';r=await call();assert.equal(r.status,202);r=await call();assert.equal(r.status,202);r=await call();assert.equal(r.status,422);assert.equal(r.data.questions,undefined);
finishReason='STOP';r=await call();assert.equal(r.status,202,JSON.stringify(r));r=await call();assert.equal(r.status,200,JSON.stringify(r));
stored=undefined;storageStatus=403;r=await call();assert.equal(r.status,502);assert.equal(r.data.stage,'PDF retrieval');assert.equal(r.data.questions,undefined);
console.log('PASS: separate download/extraction/audit requests, persistent reuse, one model call per request, tamper rejection, quota/token failure exclusion, retry recovery, denied PDF access and cleanup.');
