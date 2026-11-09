const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const SUPABASE_URL="https://acfwnunfglnjnxoxhxfd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_kQX9-4ob68XddAoymggAaA_Tlx-r7yg";
const LEVELS=new Set(["Foundation","Intermediate","Final"]);
const AI_MODEL="@cf/meta/llama-3.3-70b-instruct-fp8-fast";
async function reserveAiNeurons(token,neurons){
  try{
    const response=await fetch(SUPABASE_URL+"/rest/v1/rpc/reserve_ca_ai_neurons",{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify({p_neurons:neurons})});
    if(!response.ok)return{ok:false,allowed:false};
    return{ok:true,allowed:(await response.json())===true};
  }catch{return{ok:false,allowed:false}}
}

export async function onRequestPost({request,env}) {
  if(!env.AI)return json({error:"Free AI practice is being connected. Please try again later."},503);
  if(!(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return json({error:"Send a valid practice request."},415);
  if(Number(request.headers.get("content-length")||0)>12000)return json({error:"That request is too large. Shorten the chapter list and try again."},413);
  const token=(request.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token||token.length>5000)return json({error:"Please sign in to start AI practice."},401);
  try {
    const auth=await fetch(SUPABASE_URL+"/auth/v1/user",{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:"Bearer "+token}});
    if(!auth.ok)return json({error:"Your sign-in has expired. Please sign in again."},401);
  } catch { return json({error:"Could not verify your sign-in. Please try again."},502); }
  let body;
  try { const raw=await request.text();if(raw.length>12000)return json({error:"That request is too large. Shorten the chapter list and try again."},413);body=JSON.parse(raw); }
  catch { return json({error:"The practice request could not be read."},400); }
  const level=String(body.level||""),subject=String(body.subject||"").trim();
  const chapters=Array.isArray(body.chapters)?body.chapters.map(v=>String(v).trim()).filter(Boolean):[];
  const mix=body.mix==="combined"?"combined":"separate";
  const format=body.format==="case-study"?"case-study":"standard";
  const questionCount=10;
  if(!LEVELS.has(level))return json({error:"Choose Foundation, Intermediate or Final."},400);
  if(!subject||subject.length>100)return json({error:"Enter a subject name (up to 100 characters)."},400);
  if(!chapters.length||chapters.length>8||chapters.some(c=>c.length>100))return json({error:"Enter between 1 and 8 chapter names, each up to 100 characters."},400);
  const style=mix==="combined"?"Connect concepts from multiple supplied chapters where suitable.":"Keep questions focused on the supplied chapter or chapters.";
  const formatInstruction=format==="case-study"?"Write one concise case study of about 100–180 words, containing every fact needed, followed by exactly ten related MCQs tied to that scenario.":"Write exactly ten standalone MCQs. Set case_study to an empty string.";
  const userPrompt=["Create challenging but fair original CA practice questions.","CA level: "+level,"Subject: "+subject,"Chapters: "+chapters.join("; "),formatInstruction,style,"Test application, calculations, or multi-step reasoning where appropriate. Use plausible distractors based on common student errors; avoid obscure trivia and ambiguous wording.","Follow the CA syllabus and common ICAI exam patterns. These are original practice questions, not verified past questions. Never claim an item appeared in an ICAI exam; do not copy or closely paraphrase known exam questions.","Create exactly two questions at each difficulty level from 1 to 5, ordered from easier to harder. Each question must include its integer difficulty (1=easier, 5=hardest), exactly four clear options, exactly one correct answer, and a concise explanation."].join("\n");
  const schema={type:"object",additionalProperties:false,properties:{case_study:{type:"string"},questions:{type:"array",items:{type:"object",additionalProperties:false,properties:{
    question:{type:"string"},options:{type:"array",items:{type:"string"}},correct_index:{type:"integer"},explanation:{type:"string"},difficulty:{type:"integer"}
  },required:["question","options","correct_index","explanation","difficulty"]}}},required:["case_study","questions"]};
  const quota=await reserveAiNeurons(token,2000);
  if(!quota.ok)return json({error:"The free AI limit could not be checked, so no AI request was sent. Please try again later."},503);
  if(!quota.allowed)return json({error:"Today's shared free AI budget is used up. Please try again after the daily reset."},429);
  try {
    const result=await env.AI.run(AI_MODEL,{
      messages:[{role:"system",content:"You are a careful CA exam practice tutor. Return only valid JSON matching the required schema."},{role:"user",content:userPrompt}],
      response_format:{type:"json_schema",json_schema:schema},
      max_completion_tokens:6000,
      temperature:0.35
    });
    const raw=result?.choices?.[0]?.message?.content??result?.response;
    if(!raw)return json({error:"No questions were returned. Please try again."},502);
    const parsed=typeof raw==="string"?JSON.parse(raw):raw;
    const questions=parsed?.questions;
    const difficultyCounts=[0,0,0,0,0,0];
    if(Array.isArray(questions))questions.forEach(q=>{if(Number.isInteger(q?.difficulty)&&q.difficulty>=1&&q.difficulty<=5)difficultyCounts[q.difficulty]++});
    const valid=typeof parsed.case_study==="string"&&(format==="case-study"?parsed.case_study.length>=100&&parsed.case_study.length<=2300:parsed.case_study==="")&&Array.isArray(questions)&&questions.length===questionCount&&difficultyCounts.slice(1).every(count=>count===2)&&questions.every(q=>
      typeof q.question==="string"&&q.question.length<=1200&&Array.isArray(q.options)&&q.options.length===4&&q.options.every(o=>typeof o==="string"&&o.length<=500)&&
      Number.isInteger(q.correct_index)&&q.correct_index>=0&&q.correct_index<=3&&typeof q.explanation==="string"&&q.explanation.length<=1500&&Number.isInteger(q.difficulty)&&q.difficulty>=1&&q.difficulty<=5);
    if(!valid)return json({error:"The question set did not pass checks. Please generate a new set."},502);
    return json({questions,case_study:parsed.case_study,marks_per_question:format==="case-study"?2:1,max_marks:questionCount*(format==="case-study"?2:1),question_count:questionCount});
  } catch(error) {
    const detail=String(error?.message||"").toLowerCase();
    if(/daily.*(limit|allowance)|neuron.*(limit|allowance)|quota.*(exceed|limit)|limit.*(exceed|reached)|429/.test(detail))
      return json({error:"Today's free AI allowance has been used. Please try again after it resets."},429);
    if(/capacity|5035|out of service/.test(detail))return json({error:"AI is busy right now. Please try again shortly."},503);
    return json({error:"Could not create a question set. Please try again shortly."},502);
  }
}
export function onRequest(context) {
  if(context.request.method==="OPTIONS")return new Response(null,{status:204,headers:{allow:"POST, OPTIONS"}});
  return json({error:"Use POST to create an AI practice set."},405);
}
