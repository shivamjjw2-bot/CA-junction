import fs from 'node:fs';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/trend-analysis.js';
import {validateExtraction} from '../assets/trend-core.js';
import {restoreRejectedDraft} from '../functions/_lib/trend-rules-audit.js';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/trend-accounting-observed.json',import.meta.url)));
for(const fixture of fixtures)for(const incorrectAudit of [false,true]){
 const bad=structuredClone(fixture.draft),withHeader=structuredClone(bad);withHeader.rules[0].maximum=100;
 assert.throws(()=>validateExtraction(bad,fixture.chapters),e=>e.code==='SECTION_MARKS_MISMATCH');
 const legacy={repair:'REPAIR AUDIT: answerable marks mismatch. Previous draft: '+JSON.stringify(bad)};restoreRejectedDraft(legacy);assert.deepEqual(legacy.rejectedDraft,bad);
 const missing=fixture.title.includes('September');
 if(missing)assert.throws(()=>validateExtraction(withHeader,fixture.chapters),/95 to 100.*Q5: 15/);
 else assert.equal(validateExtraction(withHeader,fixture.chapters).examMarks,100);
 // Simulated re-reading output for control-flow testing only. No test correction
 // is written to production, and the missing question is not claimed as verified.
 const corrected=structuredClone(withHeader);
 if(missing){corrected.questions.push({...corrected.questions.find(q=>q.ref==='5(c)'),ref:'5(b)',marks:5,evidence:'Synthetic missing-part test fixture'});}
 let saved,fullCalls=0,auditCalls=0,focusedCalls=0;
 globalThis.fetch=async(url,o={})=>{const u=String(url);
  if(u.includes('/auth/v1/user'))return Response.json({id:'student'});
  if(u.includes('/rest/v1/materials'))return Response.json([{id:fixture.id,title:fixture.title,level:'Foundation',subject:'Accounting',category:'icai_link',chapter:'previous_year_question',file_bucket:'ca-materials',file_path:'admin/fixture.pdf',is_published:true,is_premium:false}]);
  if(u.includes('/rest/v1/trend_document_checkpoints')){if(o.method==='POST'){saved=JSON.parse(o.body);return new Response(null,{status:201})}return Response.json(saved?[saved]:[])}
  if(u.includes('/api/ai-planner'))return Response.json({outlines:[{chapters:fixture.chapters}]});
  if(u.includes('/storage/v1/object/'))return new Response('%PDF-1.7 fixture %%EOF');
  if(u.endsWith('/upload/v1beta/files'))return new Response('',{headers:{'x-goog-upload-url':'https://generativelanguage.googleapis.com/upload-test'}});
  if(u.endsWith('/upload-test'))return Response.json({file:{name:'files/test',uri:'https://generativelanguage.googleapis.com/v1beta/files/test',state:'ACTIVE'}});
  if(u.includes(':generateContent')){const body=JSON.parse(o.body);let output;
   if(!body.generationConfig.responseSchema.properties.questions){auditCalls++;assert(!body.contents[0].parts[1].text.includes('Prior inventory'));output={document_matches:true,exam_marks:100,rules:withHeader.rules.map(r=>({...r,maximum:incorrectAudit?99:r.maximum})),choices:withHeader.choices,choice_instructions:'Source fixture choices'}}
   else if(!body.generationConfig.responseSchema.properties.rules){focusedCalls++;const n=body.contents[0].parts[1].text.match(/ONLY main question (\d+)/)[1];output={complete:true,questions:corrected.questions.filter(q=>q.ref.match(/\d+/)[0]===n).map(q=>({...q,group:'Descriptive|'+n+':verified'})),choices:corrected.choices.filter(c=>c.alternatives.some(b=>b.refs.some(r=>r.match(/\d+/)[0]===n)))}}
   else{fullCalls++;output=fullCalls===1?bad:corrected}
   return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]});
  }
  if(o.method==='DELETE')return new Response('');
  throw Error('Unexpected fetch '+u);
 };
 let response,data;for(let i=0;i<10;i++){
  response=await onRequest({request:new Request('https://test.local/api/trend-analysis',{method:'POST',headers:{authorization:'Bearer test','x-ca-trend-version':'7'},body:JSON.stringify({id:fixture.id,level:'Foundation',subject:'Accounting'})}),env:{GEMINI_API_KEY:'test-only'}});
  data=await response.json();if(!data.pending)break;
  assert.equal(data.questions,undefined,'Never show a partial inventory as completed');
 }
 assert.equal(response.status,200,JSON.stringify(data));assert.equal(data.examMarks,100);assert.equal(auditCalls,1);assert.equal(fullCalls,incorrectAudit?3:2);assert.equal(focusedCalls,Number(missing)+Number(incorrectAudit));
 console.log('PASS: '+fixture.title+' - '+(incorrectAudit?'incorrect independent audit does not poison later reads':'independent instructions and strict missing-part rejection')+' (mock provider).');
}
