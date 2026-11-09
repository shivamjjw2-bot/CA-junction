const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const SUPABASE_URL="https://acfwnunfglnjnxoxhxfd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_kQX9-4ob68XddAoymggAaA_Tlx-r7yg";
const LEVELS=new Set(["Foundation","Intermediate","Final"]);
const AI_MODEL="@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export async function onRequestPost({request,env}) {
  if(!env.AI)return json({error:"The free AI planner is being connected. Please try again later."},503);
  if(!(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return json({error:"Send a valid planner request."},415);
  if(Number(request.headers.get("content-length")||0)>16000)return json({error:"That planner request is too large."},413);
  const token=(request.headers.get("authorization")||"").match(/^Bearer\\s+(.+)$/i)?.[1];
  if(!token||token.length>5000)return json({error:"Please sign in to create an AI study plan."},401);
  try {
    const auth=await fetch(SUPABASE_URL+"/auth/v1/user",{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:"Bearer "+token}});
    if(!auth.ok)return json({error:"Your sign-in has expired. Please sign in again."},401);
  } catch { return json({error:"Could not verify your sign-in. Please try again."},502); }
  let body;
  try { const raw=await request.text();if(raw.length>16000)return json({error:"That planner request is too large."},413);body=JSON.parse(raw); }
  catch { return json({error:"The planner request could not be read."},400); }
  const level=String(body.level||"");
  const subjects=Array.isArray(body.subjects)?body.subjects.map(v=>String(v).trim()).filter(Boolean):[];
  const days=Number(body.days);
  if(!LEVELS.has(level))return json({error:"Choose Foundation, Intermediate or Final."},400);
  if(!subjects.length||subjects.length>12||subjects.some(s=>s.length>100))return json({error:"Enter between 1 and 12 subjects, each no longer than 100 characters."},400);
  if(!Number.isInteger(days)||days<1||days>180)return json({error:"Choose a duration from 1 to 180 days."},400);
  const subjectList=subjects.map((subject,index)=>index+" = "+subject).join("\\n");
  const prompt=["Create a practical CA study plan with exactly "+days+" daily entries.","CA level: "+level,"Subjects and their required zero-based indexes:\\n"+subjectList,"Choose one main subject for each day; rotate subjects fairly and include concept study, question practice, recap, and periodic self-testing. Gradually shift the final days toward revision and timed mixed practice.","Use only the supplied subject names. Do not invent chapter titles, syllabus details, or claims about exact ICAI papers. Describe the day's work in one concise, actionable activity under 140 characters.","Suggest a balanced total study target of 90 to 240 minutes per day. Output exactly one entry for every numbered day from 1 through "+days+" with day, subject_index, activity, and study_minutes. subject_index must match the supplied index list; minutes must be between 90 and 240.","Return only JSON matching the schema."].join("\\n");
  const schema={type:"object",additionalProperties:false,properties:{schedule:{type:"array",items:{type:"object",additionalProperties:false,properties:{
    day:{type:"integer"},subject_index:{type:"integer"},activity:{type:"string"},study_minutes:{type:"integer"}
  },required:["day","subject_index","activity","study_minutes"]}}},required:["schedule"]};
  try {
    const result=await env.AI.run(AI_MODEL,{
      messages:[{role:"system",content:"You are a careful CA student study-planning assistant. Return only valid JSON matching the required schema."},{role:"user",content:prompt}],
      response_format:{type:"json_schema",json_schema:schema},
      max_completion_tokens:5800,
      temperature:0.3
    });
    const raw=result?.choices?.[0]?.message?.content??result?.response;
    if(!raw)return json({error:"No study plan was returned. Please try again."},502);
    const parsed=typeof raw==="string"?JSON.parse(raw):raw;
    const schedule=parsed?.schedule;
    const valid=Array.isArray(schedule)&&schedule.length===days&&schedule.every((item,index)=>
      item.day===index+1&&Number.isInteger(item.subject_index)&&item.subject_index>=0&&item.subject_index<subjects.length&&
      typeof item.activity==="string"&&item.activity.trim().length>=8&&item.activity.length<=180&&
      Number.isInteger(item.study_minutes)&&item.study_minutes>=90&&item.study_minutes<=240);
    if(!valid)return json({error:"The generated plan did not pass checks. Please try again."},502);
    return json({schedule:schedule.map(item=>({day:item.day,subject:subjects[item.subject_index],activity:item.activity,study_minutes:item.study_minutes}))});
  } catch(error) {
    const detail=String(error?.message||"").toLowerCase();
    if(/daily.*(limit|allowance)|neuron.*(limit|allowance)|quota.*(exceed|limit)|limit.*(exceed|reached)|429/.test(detail))
      return json({error:"Today's free AI allowance has been used. Please try again after it resets."},429);
    if(/capacity|5035|out of service/.test(detail))return json({error:"AI is busy right now. Please try again shortly."},503);
    return json({error:"Could not create a study plan. Please try again shortly."},502);
  }
}
export function onRequest(context) {
  if(context.request.method==="OPTIONS")return new Response(null,{status:204,headers:{allow:"POST, OPTIONS"}});
  return json({error:"Use POST to create an AI study plan."},405);
}
