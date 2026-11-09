const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const SUPABASE_URL="https://acfwnunfglnjnxoxhxfd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_kQX9-4ob68XddAoymggAaA_Tlx-r7yg";
const LEVELS=new Set(["Foundation","Intermediate","Final"]);

export async function onRequestPost({request,env}) {
  if(!env.OPENAI_API_KEY)return json({error:"AI practice is not connected yet. Ask the CA Junction admin to finish setup."},503);
  if(!(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return json({error:"Send a valid practice request."},415);
  if(Number(request.headers.get("content-length")||0)>12000)return json({error:"That request is too large. Shorten the chapter list and try again."},413);
  const token=(request.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token||token.length>5000)return json({error:"Please sign in to start AI practice."},401);
  try {
    const auth=await fetch(SUPABASE_URL+"/auth/v1/user",{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:"Bearer "+token}});
    if(!auth.ok)return json({error:"Your sign-in has expired. Please sign in again."},401);
  } catch { return json({error:"Could not verify your sign-in. Please try again."},502); }
  let body;
  try { const raw=await request.text(); if(raw.length>12000)return json({error:"That request is too large. Shorten the chapter list and try again."},413); body=JSON.parse(raw); }
  catch { return json({error:"The practice request could not be read."},400); }
  const level=String(body.level||""),subject=String(body.subject||"").trim();
  const chapters=Array.isArray(body.chapters)?body.chapters.map(v=>String(v).trim()).filter(Boolean):[];
  const mix=body.mix==="combined"?"combined":"separate";
  if(!LEVELS.has(level))return json({error:"Choose Foundation, Intermediate or Final."},400);
  if(!subject||subject.length>100)return json({error:"Enter a subject name (up to 100 characters)."},400);
  if(!chapters.length||chapters.length>8||chapters.some(c=>c.length>100))return json({error:"Enter between 1 and 8 chapter names, each up to 100 characters."},400);
  const style=mix==="combined"?"Make questions that combine concepts from at least two supplied chapters wherever suitable.":"Keep each question focused on one supplied chapter and distribute questions across chapters.";
  const prompt=["Create five original, educational multiple-choice practice questions for a CA student.","CA level: "+level,"Subject: "+subject,"Chapters: "+chapters.join("; "),style,"Match the expected conceptual difficulty. Do not claim the questions are official ICAI questions or copy known exam questions.","Each question must have exactly four clear options, one correct answer, a concise explanation, and no ambiguous wording."].join("\n");
  try {
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:"Bearer "+env.OPENAI_API_KEY,"content-type":"application/json"},body:JSON.stringify({
      model:"gpt-4o-mini",store:false,input:[{role:"user",content:[{type:"input_text",text:prompt}]}],
      text:{format:{type:"json_schema",name:"ca_junction_mcq_set",strict:true,schema:{
        type:"object",additionalProperties:false,properties:{questions:{type:"array",items:{
          type:"object",additionalProperties:false,properties:{
            question:{type:"string"},options:{type:"array",items:{type:"string"}},
            correct_index:{type:"integer"},explanation:{type:"string"}
          },required:["question","options","correct_index","explanation"]
        }}},required:["questions"]
      }}},max_output_tokens:3000
    })});
    const data=await response.json();
    if(!response.ok)return json({error:"The AI question service is temporarily unavailable. Please try again shortly."},502);
    const text=(data.output||[]).flatMap(i=>i.content||[]).find(i=>i.type==="output_text")?.text;
    if(!text)return json({error:"No questions were returned. Please try again."},502);
    const result=JSON.parse(text);
    const valid=Array.isArray(result.questions)&&result.questions.length===5&&result.questions.every(q=>
      typeof q.question==="string"&&q.question.length<=1200&&Array.isArray(q.options)&&q.options.length===4&&q.options.every(o=>typeof o==="string"&&o.length<=500)&&
      Number.isInteger(q.correct_index)&&q.correct_index>=0&&q.correct_index<=3&&typeof q.explanation==="string"&&q.explanation.length<=1500);
    if(!valid)return json({error:"The question set did not pass checks. Please generate a new set."},502);
    return json({questions:result.questions});
  } catch { return json({error:"Could not create a question set. Please try again shortly."},502); }
}
export function onRequest(context) {
  if(context.request.method==="OPTIONS")return new Response(null,{status:204,headers:{allow:"POST, OPTIONS"}});
  return json({error:"Use POST to create an AI practice set."},405);
}
