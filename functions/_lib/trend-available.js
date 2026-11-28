// A failed paper may still help a student locate questions in the original.
// Never expose disputed marks or present this material as a validated result.
export function availableQuestions(draft){
 if(draft?.document_matches!==true||!Array.isArray(draft.questions))return null;
 const seen=new Set(),questions=[];
 for(const q of draft.questions.slice(0,600)){
  const ref=String(q.ref||'').trim().slice(0,80),section=String(q.section||'').trim().slice(0,60),page=Number(q.page);
  const topic=String(q.chapter||'').trim().slice(0,200),summary=String(q.evidence||'').trim().slice(0,220);
  const key=section+'|'+ref;
  if(!ref||!section||!Number.isInteger(page)||page<1||page>1000||!summary||seen.has(key))continue;
  seen.add(key);questions.push({ref,section,page,topic,summary});
 }
 return questions.length?{status:'unverified',excludedFromTotals:true,questions}:null;
}
