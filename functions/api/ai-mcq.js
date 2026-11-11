const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const SUPABASE_URL="https://acfwnunfglnjnxoxhxfd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_kQX9-4ob68XddAoymggAaA_Tlx-r7yg";
const LEVELS=new Set(["Foundation","Intermediate","Final"]);
const GEMINI_MODELS=["gemini-3.8-flash","gemini-3.5-flash-lite","gemini-2.5-flash-lite"];
async function logAiMcqRequest(token){
  try{
    const response=await fetch(SUPABASE_URL+"/rest/v1/rpc/log_ca_ai_mcq_request",{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:"Bearer "+token,"content-type":"application/json"},body:"{}"});
    if(!response.ok)return false;
    return (await response.json())===true;
  }catch{return false}
}

export async function onRequestPost({request,env}) {
  if(!env.GEMINI_API_KEY)return json({error:"Free AI practice is temporarily unavailable. Please try again later."},503);
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
  const questionCount=10;
  if(!LEVELS.has(level))return json({error:"Choose Foundation, Intermediate or Final."},400);
  if(!subject||subject.length>100)return json({error:"Enter a subject name (up to 100 characters)."},400);
  if(!chapters.length||chapters.length>8||chapters.some(c=>c.length>100))return json({error:"Enter between 1 and 8 chapter names, each up to 100 characters."},400);
  const formatInstruction="Write exactly 5 standalone individual MCQs first, then one concise case study of 100–180 words, then exactly 5 MCQs linked to that single case. The first five questions must have kind individual and be answerable without the case. The final five must have kind case-linked and use only facts in the case. Keep the case study hidden until question 6 is shown.";
  const userPrompt=["Create challenging but fair original CA practice questions.","CA level: "+level,"Subject: "+subject,"Chapters: "+chapters.join("; "),formatInstruction,"Test application, calculations, or multi-step reasoning where appropriate. Use plausible distractors based on common student errors; avoid obscure trivia and ambiguous wording.","Follow the CA syllabus and common ICAI exam patterns. These are original practice questions, not verified past questions. Never claim an item appeared in an ICAI exam; do not copy or closely paraphrase known exam questions.","Create exactly two questions at each difficulty level from 1 to 5 across the full set, progressively ordered from easier to harder. Individual questions are worth 1 mark each; case-linked questions are worth 2 marks each. Every item must have exactly four clear options, exactly one correct answer, and a concise explanation."].join("\n");
  const schema={type:"object",properties:{case_study:{type:"string"},questions:{type:"array",items:{type:"object",properties:{
    question:{type:"string"},kind:{type:"string",enum:["individual","case-linked"]},marks:{type:"integer"},options:{type:"array",items:{type:"string"}},correct_index:{type:"integer"},explanation:{type:"string"},difficulty:{type:"integer"}
  },required:["question","kind","marks","options","correct_index","explanation","difficulty"]}}},required:["case_study","questions"]};
  const logged=await logAiMcqRequest(token);
  if(!logged)return json({error:"Your practice request could not be recorded. Please try again later."},503);
  try {
    let aiResponse,result={},lastFailureStatus=0;
    for(const model of GEMINI_MODELS){
      const generationConfig={responseMimeType:"application/json",responseSchema:schema,maxOutputTokens:6000};
      if(model.startsWith("gemini-3."))generationConfig.thinkingConfig={thinkingLevel:"low"};
      const requestBody=JSON.stringify({
        contents:[{role:"user",parts:[{text:"You are a careful CA exam practice tutor. Return only valid JSON matching the required schema.\n\n"+userPrompt}]}],
        generationConfig
      });
      try{
        aiResponse=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
          method:"POST",headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},body:requestBody,signal:AbortSignal.timeout(18000)
        });
      }catch(error){
        lastFailureStatus=503;
        console.warn("AI MCQ Gemini model timed out or could not be reached",JSON.stringify({model,errorName:error?.name||"Error"}));
        continue;
      }
      result=await aiResponse.json().catch(()=>({}));
      if(aiResponse.ok)break;
      lastFailureStatus=aiResponse.status;
      if(aiResponse.status===429||aiResponse.status===500||aiResponse.status===503){
        console.warn("AI MCQ model unavailable; trying next free model",JSON.stringify({model,httpStatus:aiResponse.status,providerStatus:result?.error?.status||null}));
        continue;
      }
      console.error("AI MCQ Gemini request failed",JSON.stringify({model,httpStatus:aiResponse.status,providerStatus:result?.error?.status||null,providerCode:result?.error?.code||null,providerMessage:String(result?.error?.message||"").slice(0,320)}));
      if(aiResponse.status===403)return json({error:"Gemini free access is unavailable for this project. Please try again later."},503);
      return json({error:"Gemini could not create a question set right now. Please try again shortly."},502);
    }
    if(!aiResponse?.ok){
      if(lastFailureStatus===429)return json({error:"Gemini’s free shared limit is busy or used for now. Please try again later."},429);
      return json({error:"Gemini is temporarily busy. Please try again in a moment."},503);
    }
    const raw=result?.candidates?.[0]?.content?.parts?.map(part=>typeof part?.text==="string"?part.text:"").join("")||"";
    if(!raw)return json({error:"No questions were returned. Please try again."},502);
    const parsed=JSON.parse(raw);
    const rawQuestions=parsed?.questions;
    const caseStudy=typeof parsed?.case_study==="string"?parsed.case_study.trim():"";
    if(!Array.isArray(rawQuestions)||rawQuestions.length!==questionCount)return json({error:"The AI returned an incomplete question set. Please generate a new set."},502);
    const questions=rawQuestions.map((q,index)=>({
      question:typeof q?.question==="string"?q.question.trim():"",
      kind:index<5?"individual":"case-linked",
      marks:index<5?1:2,
      options:Array.isArray(q?.options)?q.options.map(option=>typeof option==="string"?option.trim():"") : [],
      correct_index:Number(q?.correct_index),
      explanation:typeof q?.explanation==="string"?q.explanation.trim():"",
      difficulty:Math.min(5,Math.floor(index/2)+1)
    }));
    const valid=caseStudy.length>=80&&caseStudy.length<=3000&&questions.every(q=>
      q.question.length>0&&q.question.length<=1200&&q.options.length===4&&q.options.every(option=>option.length>0&&option.length<=500)&&
      Number.isInteger(q.correct_index)&&q.correct_index>=0&&q.correct_index<=3&&q.explanation.length>0&&q.explanation.length<=1500);
    if(!valid)return json({error:"The question set did not pass checks. Please generate a new set."},502);
    return json({questions,case_study:caseStudy,max_marks:15,question_count:questionCount});
  } catch(error) {
    const detail=String(error?.message||"").toLowerCase();
    if(/429|quota|resource_exhausted/.test(detail))return json({error:"Gemini’s free shared limit is busy or used for now. Please try again later."},429);
    return json({error:"Could not create a question set. Please try again shortly."},502);
  }
}
export function onRequest(context) {
  if(context.request.method==="OPTIONS")return new Response(null,{status:204,headers:{allow:"POST, OPTIONS"}});
  return json({error:"Use POST to create an AI practice set."},405);
}
