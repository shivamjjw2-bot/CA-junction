import {SUBJECTS} from './trend-core.js';
export async function verifyAllPapers({request,headers,update=()=>{},stopped=()=>false,pause=ms=>new Promise(r=>setTimeout(r,ms)),subjects=SUBJECTS}){
 const rows=[];let discoveryComplete=true;
 for(const [level,names] of Object.entries(subjects))for(const subject of names){
  if(stopped())return{rows,discoveryComplete:false,stopped:true};
  update(rows,'Listing '+level+' — '+subject);
  try{const plan=await request('/api/trend-analysis?'+new URLSearchParams({level,subject}),{headers:await headers()});
   if(!Array.isArray(plan.papers))throw Error('Invalid paper catalogue');
   for(const paper of plan.papers)rows.push({level,subject,id:paper.id,title:paper.title,revision:paper.revision,status:'pending',error:''});
  }catch(e){discoveryComplete=false;rows.push({level,subject,status:'catalogue_failed',error:e.message});update(rows,e.message);if([401,403,429].includes(e.status))return{rows,discoveryComplete,stopped:true};}
 }
 for(const row of rows){
  if(stopped())return{rows,discoveryComplete,stopped:true};if(row.status!=='pending')continue;
  const start=Date.now();row.status='processing';update(rows,row.title);
  try{let result;
   for(let step=0;step<20;step++){
    if(stopped()){row.status='pending';return{rows,discoveryComplete,stopped:true}}
    result=await request('/api/trend-analysis',{method:'POST',headers:await headers(),body:JSON.stringify({id:row.id,level:row.level,subject:row.subject})},message=>update(rows,row.title+' — '+message));
    if(!result.pending)break;
    if(result.retryAfter)await pause(Math.min(5,result.retryAfter)*1000);
   }
   if(result?.pending)throw Error('Processing is still pending; saved progress can be resumed.');
   if(result?.complete!==true||result.audited!==true||!Array.isArray(result.questions)||!result.questions.length||result.paper?.id!==row.id||result.paper?.revision!==row.revision)throw Error('The API did not return a complete audited result for this paper revision.');
   row.status='processed';row.questions=result.questions.length;row.hash=result.hash;row.generatedAt=result.generatedAt;row.uncertainMarks=result.questions.filter(q=>q.uncertain).reduce((s,q)=>s+q.marks,0);
  }catch(e){row.status='failed';row.error=e.message;row.code=e.code||'';row.httpStatus=e.status||null;if([401,403,429].includes(e.status)){update(rows,e.message);return{rows,discoveryComplete,stopped:true}}}
  finally{row.elapsedSeconds=Math.round((Date.now()-start)/1000)}
  update(rows,row.title);
 }
 return{rows,discoveryComplete,stopped:false};
}
