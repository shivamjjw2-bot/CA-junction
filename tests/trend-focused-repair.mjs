import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateExtraction} from '../assets/trend-core.js';
import {normalizeSectionChoices} from '../assets/trend-choices.js';
import {repairTarget,mergeQuestion,rereadQuestion} from '../functions/_lib/trend-question-repair.js';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/trend-choice-failures.json',import.meta.url)));
for(const f of fixtures){
 const d=f.draft,chapters=[...new Set(d.questions.map(q=>q.chapter))];
 if(f.title.includes('May 2026')){
  const normalized=normalizeSectionChoices(d.questions,d.choices,d.rules);
  assert.equal(normalized.length,2);assert(normalized.every(c=>c.alternatives.every(b=>b.refs.every(ref=>/^(4|8)\(/.test(ref)))));
  assert.deepEqual(normalizeSectionChoices(d.questions,d.choices,[]),d.choices,'Cannot discard a cross-question choice without a matching section rule');
  const incomplete=structuredClone(d);incomplete.choices[0].alternatives[0].refs=['2(a)'];
  assert(normalizeSectionChoices(incomplete.questions,incomplete.choices,incomplete.rules).some(c=>c.id==='Descriptive-A-Q2-Q4'),'Partial branches must not be silently discarded');
  assert.throws(()=>validateExtraction(d,chapters),/numeric question IDs/,'Removing a duplicate choice must not hide other missing data');
  continue;
 }
 let error;try{validateExtraction(d,chapters)}catch(e){error=e}assert.equal(error.code,'SECTION_MARKS_MISMATCH');
 const target=repairTarget(d,error.diagnostic);assert(target);assert.equal(repairTarget(d,error.diagnostic,[target.key]),null);
 const tax=f.title.includes('Taxation'),number=tax?4:6;assert.equal(target.number,number);
 const old=d.questions.filter(q=>q.section===target.section&&Number(q.ref.match(/\d+/)[0])===number);
 let items,choices;
 if(tax){
  // Visually checked original PDF page 8: two unmarked subparts SHARE four
  // marks, and the OR is another pair sharing four marks. No 2+2 split inferred.
  const base=old.find(q=>q.ref==='4(b)(i)');
  items=[old.find(q=>q.ref==='4(a)'),{...base,ref:'4(b)',marks:4,evidence:'PDF p8: shared 4 marks for mandatory loss-return filing and consequences of non-filing.'},{...base,ref:'4(b) OR',marks:4,evidence:'PDF p8: OR branch shares 4 marks for belated returns and updated-return restrictions.'}];
  choices=[{id:'Q4b',section:target.section,choose_count:1,alternatives:[{refs:['4(b)']},{refs:['4(b) OR']}]}];
 }else{
  // Original pp12-14: OR applies only to (a); (b)=4 and (c)=6 are common.
  // First (a) margin is clipped: 4 is uniquely implied by the 14-mark question
  // and the two common allocations, and agrees with the printed OR(a)=4.
  items=old.map(q=>q.ref==='6(a)'?{...q,marks:4,evidence:'PDF pp12-14: clipped mark inferred as 14 minus common (b)4 and (c)6; OR(a) prints4.'}:q);
  choices=[{id:'Q6a',section:target.section,choose_count:1,alternatives:[{refs:['6(a)']},{refs:['6(a) OR']}]}];
 }
 const replacement={complete:true,questions:items.map(q=>({...q,group:target.key+':verified'})),choices};
 const repaired=mergeQuestion(d,target,replacement);
 assert.equal(validateExtraction(repaired,chapters).examMarks,70);
 const untouched=q=>!(q.section===target.section&&Number(q.ref.match(/\d+/)[0])===number);
 assert.deepEqual(repaired.questions.filter(untouched),d.questions.filter(untouched));
 assert.throws(()=>mergeQuestion(d,target,{...replacement,complete:false}),/could not/);
 assert.throws(()=>mergeQuestion(d,target,{...replacement,questions:[{...replacement.questions[0],ref:'99'}]}),/different question/);
 globalThis.fetch=async(url,o)=>{const request=JSON.parse(o.body),prompt=request.contents[0].parts[1].text;assert(!prompt.includes('35 to 39'));assert(!prompt.includes('63 to 70'));return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(replacement)}]}}]})};
 const actual=await rereadQuestion({uri:'fixture'},d,target,chapters,'test-only');assert.deepEqual(actual,repaired);
 console.log('PASS: '+f.title+' - exact failure reproduced; source-checked question boundaries reconcile without changing other questions (mock model transport).');
}
console.log('PASS: duplicate section choices normalized only with matching full coverage; incomplete/contradictory choices stay rejected.');
