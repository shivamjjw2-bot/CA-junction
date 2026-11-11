const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const SUPABASE_URL="https://acfwnunfglnjnxoxhxfd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_kQX9-4ob68XddAoymggAaA_Tlx-r7yg";
const GEMINI_MODELS=["gemini-3.8-flash","gemini-3.5-flash","gemini-2.5-flash-lite"];
const SUBJECTS={
  Foundation:["Accounting","Business Laws","Quantitative Aptitude","Business Economics"],
  Intermediate:["Advanced Accounting","Corporate and Other Laws","Taxation — Income-tax Law","Taxation — Goods and Services Tax","Cost and Management Accounting","Auditing and Ethics","Financial Management","Strategic Management"],
  Final:["Financial Reporting","Advanced Financial Management","Advanced Auditing, Assurance and Professional Ethics","Direct Tax Laws & International Taxation","Indirect Tax Laws","Integrated Business Solutions"]
};
const MATERIAL_URL={
  Foundation:"https://boslive.icai.org/study_material_new_paper_details.php?c=foundation&language=English",
  Intermediate:"https://boslive.icai.org/study_material_new_paper_details.php?c=intermediate&language=English",
  Final:"https://boslive.icai.org/study_material_new_paper_details.php?c=final&language=English"
};
async function reserveAiNeurons(token,neurons){
  try{
    const response=await fetch(SUPABASE_URL+"/rest/v1/rpc/reserve_ca_ai_neurons",{
      method:"POST",
      headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:"Bearer "+token,"content-type":"application/json"},
      body:JSON.stringify({p_neurons:neurons,p_feature:"ai_planner"})
    });
    if(!response.ok)return{ok:false,allowed:false};
    return{ok:true,allowed:(await response.json())===true};
  }catch{return{ok:false,allowed:false}}
}
function cleanText(value,max){return typeof value==="string"?value.trim().slice(0,max):""}
function parseOutput(raw){
  let text=String(raw||"").trim().replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,"");
  const start=text.indexOf("{"),end=text.lastIndexOf("}");
  if(start>=0&&end>start)text=text.slice(start,end+1);
  return JSON.parse(text);
}
function normalizeOutput(output){
  const summary=cleanText(output?.summary,12000);
  const topic=cleanText(output?.mind_map?.topic,240);
  const branches=Array.isArray(output?.mind_map?.branches)?output.mind_map.branches.slice(0,7).map(branch=>({
    title:cleanText(branch?.title,180),
    points:Array.isArray(branch?.points)?branch.points.slice(0,4).map(point=>cleanText(point,240)).filter(Boolean):[]
  })).filter(branch=>branch.title&&branch.points.length):[];
  if(summary.length<120||!topic||branches.length<3)throw new Error("quality");
  return{summary,mind_map:{topic,branches}};
}
export async function onRequestPost({request,env}){
  if(!env.GEMINI_API_KEY)return json({error:"Chapter study aids are temporarily unavailable. Please try again later."},503);
  if(!(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return json({error:"Send a valid chapter request."},415);
  if(Number(request.headers.get("content-length")||0)>6000)return json({error:"That chapter request is too large."},413);
  const token=(request.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token||token.length>5000)return json({error:"Please sign in to generate chapter PDFs."},401);
  try{
    const auth=await fetch(SUPABASE_URL+"/auth/v1/user",{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:"Bearer "+token}});
    if(!auth.ok)return json({error:"Your sign-in has expired. Please sign in again."},401);
    const user=await auth.json();
    if(!user?.id)return json({error:"Please sign in to generate chapter PDFs."},401);
  }catch{return json({error:"Could not verify your sign-in. Please try again."},502)}
  let body;
  try{body=await request.json()}catch{return json({error:"The chapter request could not be read."},400)}
  const level=cleanText(body.level,24),subject=cleanText(body.subject,120),chapter=cleanText(body.chapter,180);
  const sourceUrl=cleanText(body.source_url,500);
  if(!Object.hasOwn(SUBJECTS,level))return json({error:"Choose Foundation, Intermediate or Final."},400);
  if(!SUBJECTS[level].includes(subject))return json({error:"Choose a subject from this ICAI level."},400);
  if(!chapter)return json({error:"Choose an ICAI chapter."},400);
  let officialUrl=MATERIAL_URL[level];
  if(sourceUrl){try{const parsed=new URL(sourceUrl);if(parsed.protocol==="https:"&&["www.icai.org","icai.org","boslive.icai.org"].includes(parsed.hostname))officialUrl=parsed.href}catch{}}
  const quota=await reserveAiNeurons(token,1500);
  if(!quota.ok)return json({error:"The shared AI allowance could not be checked, so no chapter draft was generated. Please try again later."},503);
  if(!quota.allowed)return json({error:"Today's shared AI allowance is used. It resets at midnight India time."},429);
  const schema={
    type:"OBJECT",
    properties:{
      summary:{type:"STRING"},
      mind_map:{type:"OBJECT",properties:{
        topic:{type:"STRING"},
        branches:{type:"ARRAY",items:{type:"OBJECT",properties:{
          title:{type:"STRING"},points:{type:"ARRAY",items:{type:"STRING"}}
        },required:["title","points"]}}
      },required:["topic","branches"]}
    },
    required:["summary","mind_map"]
  };
  const prompt=[
    "Create two concise, original CA study aids for one chapter.",
    "Level: "+level,
    "Subject: "+subject,
    "Exact ICAI chapter title: "+chapter,
    "Official reference page for student verification: "+officialUrl,
    "Return a useful summary with 8 to 12 short bullet points and a mind map with one central topic and 4 to 7 branches, each with 2 to 4 short points.",
    "Use clear exam revision language. Do not invent section numbers, amendments, case citations, or say you read the linked page. Tell the student to verify law, standards, limits, dates, and syllabus-edition details against official ICAI material.",
    "Return only JSON with this shape: {summary:string, mind_map:{topic:string, branches:[{title:string, points:string[]}]}}."
  ].join("\n");
  let lastStatus=0,lastProviderStatus="";
  for(const model of GEMINI_MODELS){
    let response,result;
    const generationConfig={responseMimeType:"application/json",responseSchema:schema,maxOutputTokens:3600,temperature:0.2};
    if(model.startsWith("gemini-3."))generationConfig.thinkingConfig={thinkingLevel:"low"};
    try{
      response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
        method:"POST",headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},
        body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig}),
        signal:AbortSignal.timeout(45000)
      });
    }catch(error){
      lastStatus=503;
      console.warn("AI revision model unavailable",JSON.stringify({model,errorName:error?.name||"Error"}));
      continue;
    }
    result=await response.json().catch(()=>({}));
    if(!response.ok){
      lastStatus=response.status;lastProviderStatus=result?.error?.status||"";
      console.warn("AI revision model request failed; trying fallback",JSON.stringify({model,httpStatus:response.status,providerStatus:lastProviderStatus}));
      if(response.status===401||response.status===403)return json({error:"CA Junction could not reach its study aid service. Please try again later."},503);
      continue;
    }
    const raw=result?.candidates?.[0]?.content?.parts?.map(part=>typeof part?.text==="string"?part.text:"").join("")||"";
    if(!raw){lastStatus=502;continue}
    try{
      const output=normalizeOutput(parseOutput(raw));
      return json({level,subject,chapter,source_url:officialUrl,...output});
    }catch{
      lastStatus=502;
      console.warn("AI revision response did not match expected chapter pack",JSON.stringify({model,finishReason:result?.candidates?.[0]?.finishReason||"unknown"}));
    }
  }
  if(lastStatus===429||lastProviderStatus==="RESOURCE_EXHAUSTED")return json({error:"CA Junction is busy right now. Please try again shortly."},429);
  if(lastStatus===401||lastStatus===403)return json({error:"CA Junction could not reach its study aid service. Please try again later."},503);
  return json({error:"CA Junction could not create this chapter summary and mind map. Please try again shortly."},502);
}
