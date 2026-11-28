import assert from 'node:assert/strict';
import {auditPrintedRules,restoreRejectedDraft,RULES_AUDIT_VERSION} from '../functions/_lib/trend-rules-audit.js';
const questions=[{section:'A',ref:'4(b)(i)',page:8,marks:4},{section:'A',ref:'4(b)(ii)',page:8,marks:4}];
const choices=[{id:'Q4b',section:'A',choose_count:1,alternatives:[{refs:['4(b)(i)']},{refs:['4(b)(ii)']}]}];
let status=200,omitChoices=false;
globalThis.fetch=async(url,options)=>{
 const body=JSON.parse(options.body),prompt=body.contents[0].parts[1].text;
 assert(prompt.includes('4(b)(i)'));assert(prompt.includes('later pages'));
 assert(!prompt.includes('"marks":4'),'Do not anchor the independent check to previously extracted marks');
 const data={document_matches:true,exam_marks:35,rules:[{section:'A',maximum:35,compulsory:[1],choose_from:[2,3,4],choose_count:2}],choice_instructions:'Synthetic provider response; not source verification',...(omitChoices?{}:{choices})};
 return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(data)}]}}]},{status});
};
const call=()=>auditPrintedRules({uri:'test-pdf'},['A'],'test-key',undefined,questions);
const result=await call();assert.deepEqual(result.choices,choices);assert.equal(result.auditVersion,RULES_AUDIT_VERSION);
omitChoices=true;await assert.rejects(call,/internal-choice inventory/);omitChoices=false;
for(const code of [500,502,503,504]){status=code;await assert.rejects(call,e=>e.status===503&&e.code==='UPSTREAM_UNAVAILABLE')}
status=429;await assert.rejects(call,e=>e.status===429&&e.code==='QUOTA');
const old={rulesAudit:{rules:[]},repair:'Section totals do not reconcile. Previous extraction: '+JSON.stringify({questions,rules:[]})};
restoreRejectedDraft(old);assert.deepEqual(old.rejectedDraft.questions,questions,'Old incorrect audits can enter the new source repair stage');
const current={rulesAudit:{auditVersion:RULES_AUDIT_VERSION},repair:old.repair};restoreRejectedDraft(current);assert.equal(current.rejectedDraft,undefined,'Do not loop independent audits indefinitely');
console.log('PASS: source choice inventory, no marks anchoring, missing-choice rejection, transient/quota classification and bounded legacy checkpoint recovery (mock provider).');
