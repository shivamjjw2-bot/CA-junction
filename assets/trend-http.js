// Never parse an HTML gateway/error page as a successful analysis response.
export async function trendResponse(response,onProgress=()=>{}) {
  if(response.headers.get('content-type')?.includes('application/x-ndjson'))return readTrendStream(response,onProgress);
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch {
    const ray = response.headers.get('cf-ray');
    const resourceLimit = /1102|exceeded.*(?:cpu|resource)|resource.*limit/i.test(raw);
    const timedOut = [504, 524].includes(response.status);
    const gateway = [502,503,520,521,522,523].includes(response.status);
    const error = new Error((resourceLimit
      ? 'The document processor reached its hosting resource limit.'
      : timedOut ? 'The document processor timed out.'
      : gateway ? 'The document gateway temporarily lost its connection.' : 'The document service returned an invalid response.')
      + ' No analysis was added for this paper. Retry the remaining papers.'
      + ' (HTTP ' + response.status + (ray ? '; reference ' + ray : '') + ')');
    error.code = resourceLimit ? 'HOST_RESOURCE_LIMIT' : timedOut ? 'HOST_TIMEOUT' : gateway ? 'HOST_GATEWAY' : 'INVALID_RESPONSE';
    error.status = response.status;
    throw error;
  }
  if (!response.ok || !data || typeof data !== 'object' || Array.isArray(data)) {
    const error = new Error(data?.error || 'The document service could not complete this paper.');
    error.available = data?.available?.status === 'unverified' ? data.available : null;
    error.code = data?.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

async function readTrendStream(response,onProgress){
 const ray=response.headers.get('cf-ray');
 const reader=response.body?.getReader();
 if(!reader)throw interrupted('starting');
 const decoder=new TextDecoder();let buffer='',stage='starting',bytes=0;
 const frame=line=>{
  let data;try{data=JSON.parse(line)}catch{throw interrupted(stage)}
  if(data.type==='progress'||data.type==='heartbeat'){
   if(typeof data.stage==='string'){stage=data.stage;onProgress(stage)}return null;
  }
  if(data.type!=='result'||!Number.isInteger(data.status)||data.status<200||data.status>599||!data.data||typeof data.data!=='object')throw interrupted(stage);
  return data;
 };
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done){buffer+=decoder.decode();if(buffer.trim()){const result=frame(buffer);if(result)return await trendResponse(Response.json(result.data,{status:result.status}))}throw interrupted(stage)}
   bytes+=value.byteLength;if(bytes>2000000)throw interrupted(stage);
   buffer+=decoder.decode(value,{stream:true});
   let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.trim())continue;const result=frame(line);if(result)return await trendResponse(Response.json(result.data,{status:result.status}))}
  }
 }catch(e){if(e.code==='STREAM_INTERRUPTED'&&ray&&!e.message.includes('reference '))e.message+=' (reference '+ray+')';if(e.code||e.status)throw e;const failure=interrupted(stage);if(ray)failure.message+=' (reference '+ray+')';throw failure}
 finally{await reader.cancel().catch(()=>{})}
}
function interrupted(stage){const e=Error('The document connection stopped during '+stage+'. Retry to resume saved progress.');e.code='STREAM_INTERRUPTED';e.status=502;return e}
