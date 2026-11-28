import assert from 'node:assert/strict';
import {choiceCalculator} from '../assets/trend-choices.js';
import {validateExtraction,SUBJECTS} from '../assets/trend-core.js';
const q=(ref,marks)=>({ref,marks,section:'Descriptive',group:'Q5',page:1,chapter:'Chapter A',evidence:'Printed mark allocation',optionalGroup:'choice_5a',uncertain:false});
const questions=[q('5(a)(i)',4),q('5(a)(ii)',4),q('5(a)(iii)',4),q('5(b)',6)];
const choice={id:'5a',section:'Descriptive',choose_count:2,alternatives:[{refs:['5(a)(i)']},{refs:['5(a)(ii)']},{refs:['5(a)(iii)']}]};
assert.deepEqual(choiceCalculator(questions,[choice])(questions),{min:14,max:14});
const output={document_matches:true,complete:true,choices:[choice],questions,allocations:[{group:'Q5',marks:18}],rules:[{section:'Descriptive',maximum:14,compulsory:[5],choose_from:[],choose_count:0}],exam_marks:14,total_offered_marks:18};
for(const [level,subjects] of Object.entries(SUBJECTS))for(const subject of subjects){
 assert.equal(validateExtraction(output,['Chapter A']).totalOffered,18,level+' '+subject);
}
assert.throws(()=>validateExtraction({...output,choices:[{...choice,choose_count:1}]},['Chapter A']),/10 to 10/);
const composite=[q('5(a) Option 1(i)',2),q('5(a) Option 1(ii)',3),q('5(a) Option 2',5),q('5(b)',9)];
const compositeChoice={...choice,choose_count:1,alternatives:[{refs:['5(a) Option 1(i)','5(a) Option 1(ii)']},{refs:['5(a) Option 2']}]};
assert.deepEqual(choiceCalculator(composite,[compositeChoice])(composite),{min:14,max:14});
assert.deepEqual(choiceCalculator(questions,[])(questions),{min:18,max:18},'Display labels must not change marks');
assert.throws(()=>choiceCalculator(questions,[{...choice,choose_count:0}]),/printed number/);
assert.throws(()=>choiceCalculator(questions,[{...choice,alternatives:[{refs:['5(a)(i)']},{refs:['5(a)(i)']}],choose_count:1}]),/overlapping/);
assert.throws(()=>choiceCalculator(questions,[{...choice,alternatives:[{refs:['5(a)(i)']},{refs:['missing']}],choose_count:1}]),/missing/);
assert.throws(()=>choiceCalculator([...questions,q('6(a)',4)],[{...choice,alternatives:[{refs:['5(a)(i)']},{refs:['6(a)']}],choose_count:1}]),/crosses main/);
assert.throws(()=>validateExtraction({...output,questions:questions.slice(1)},['Chapter A']),/missing/);
console.log('PASS: any-two-of-three, composite OR branches, display-only optional labels, all 16 subjects, invalid/overlapping/cross-question choices, and missing marked items.');
