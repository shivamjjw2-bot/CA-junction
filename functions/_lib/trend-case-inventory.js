// Case-study numbers are main-question numbers. Separate model-created case
// sections hide the printed choice between cases from the common validator.
// Normalize identity only; never change marks, pages, chapters or evidence.
export function canonicalCaseInventory(draft){
 if(!Array.isArray(draft?.questions)||!draft.questions.length)return draft;
 const caseNumber=s=>Number(String(s).match(/^case\s*study\s*(\d+)$/i)?.[1]);
 const numbers=new Set();
 if(!draft.questions.every(q=>{const n=caseNumber(q.section);if(!n||Number(String(q.ref).match(/\d+/)?.[0])!==n)return false;numbers.add(n);return true})||numbers.size<2)return draft;
 const matchesRule=r=>Array.isArray(r.compulsory)&&Array.isArray(r.choose_from)&&new Set([...r.compulsory,...r.choose_from]).size===numbers.size&&[...numbers].every(n=>[...r.compulsory,...r.choose_from].includes(n));
 const rules=(draft.rules||[]).filter(matchesRule);
 const validRule=rules.length===1?rules[0]:null;
 const choices=(draft.choices||[]).filter(c=>{
  const refs=c.alternatives?.map(b=>b.refs?.length===1?caseNumber(b.refs[0]):NaN)||[];
  const wholeCase=refs.length===numbers.size&&new Set(refs).size===numbers.size&&refs.every(n=>numbers.has(n));
  return !(wholeCase&&validRule&&validRule.compulsory.length===0&&c.choose_count===validRule.choose_count);
 }).map(c=>caseNumber(c.section)?{...c,section:'Case studies'}:c);
 return {...draft,questions:draft.questions.map(q=>({...q,section:'Case studies'})),choices,
  // Ambiguous/per-case rules must be independently re-read, not inferred.
  rules:validRule?[{...validRule,section:'Case studies'}]:[]};
}
