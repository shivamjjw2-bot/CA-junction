import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateExtraction} from '../assets/trend-core.js';
const {draft}=JSON.parse(fs.readFileSync(new URL('./fixtures/trend-dt-may24-observed.json',import.meta.url)));
const chapters=[...new Set(draft.questions.map(q=>q.chapter))];
// Regression for the observed failed inventory. The choice rule is a controlled
// test input, not a manual correction to production data or a source attestation.
draft.choices=[{id:'choice_5a',section:'Descriptive',choose_count:2,alternatives:[{refs:['5(a)(i)']},{refs:['5(a)(ii)']},{refs:['5(a)(iii)']}]}];
const result=validateExtraction(draft,chapters);
assert(result.totalOffered>70);
const wrong=structuredClone(draft);wrong.choices[0].choose_count=1;
assert.throws(()=>validateExtraction(wrong,chapters),/66 to 70/);
console.log('PASS: observed May 2024 DT inventory reconciles with choose-two; choose-one reproduces the reported 66–70 error. Production evidence was not altered.');
