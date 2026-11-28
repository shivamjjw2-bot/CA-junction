import assert from 'node:assert/strict';
import {validateExtraction} from '../assets/trend-core.js';
import {choiceCalculator} from '../assets/trend-choices.js';
import {repairTarget} from '../functions/_lib/trend-question-repair.js';
import {restoreRejectedDraft} from '../functions/_lib/trend-rules-audit.js';
const q=(ref,marks)=>({ref,marks,section:'S',group:'Q6',page:3,chapter:'A',evidence:'Source evidence',uncertain:false});
const questions=[q('6(c)',4),q('6(c) (Option 1)',4),q('6(c) (Option 2)',4)];
const draft={document_matches:true,complete:true,questions,choices:[],allocations:[{group:'Q6',marks:12}],rules:[{section:'S',maximum:4,compulsory:[6],choose_from:[],choose_count:0}]};
let failure;try{validateExtraction(draft,['A'])}catch(e){failure=e}
assert.equal(failure.code,'QUESTION_INVENTORY_INVALID');assert.equal(repairTarget(draft,failure.diagnostic).number,6);assert.equal(draft.questions.length,3,'Conflicting parent evidence must not be silently discarded');
const choice={id:'bad',section:'S',choose_count:2,alternatives:[{refs:['6(c) (Option 1)','6(c) (Option 2)']}]};
assert.throws(()=>choiceCalculator(questions,[choice]),e=>repairTarget(draft,e.diagnostic).number===6);
const objective={...draft,questions:[q('1',1)],allocations:[{group:'Q6',marks:1}],rules:[{section:'S',maximum:1,compulsory:[],choose_from:[],choose_count:0}]};
assert.throws(()=>validateExtraction(objective,['A']),e=>e.code==='RULE_COVERAGE_INVALID');
const checkpoint={repair:'REPAIR AUDIT: Section MCQ must cover exactly these numeric question IDs: 1. Previous extraction: '+JSON.stringify(objective)};restoreRejectedDraft(checkpoint);assert.deepEqual(checkpoint.rejectedDraft,objective);
console.log('PASS: contradictory parent evidence, malformed choice cardinality and missing objective selection rules route to source checks without inventing marks.');
