const encode=new TextEncoder();
export function streamTrendResponse(context,process,heartbeatMs=15000){
 const cancel=new AbortController();
 let timer,closed=false,stage='Starting document processing';
 const body=new ReadableStream({
  start(controller){
   const send=frame=>{if(!closed)controller.enqueue(encode.encode(JSON.stringify(frame)+'\n'))};
   const reportProgress=value=>{stage=value;send({type:'progress',stage})};
   reportProgress(stage);
   timer=setInterval(()=>send({type:'heartbeat',stage}),heartbeatMs);
   // The open response stream owns this work; it is not an untracked background
   // job or a waitUntil task that would expire 30 seconds after a response.
   const work=(async()=>{
    try{
     const response=await process({...context,reportProgress,streamSignal:cancel.signal});
     const data=await response.json();
     send({type:'result',status:response.status,data});
    }catch{
     send({type:'result',status:502,data:{error:'The document processing connection stopped during '+stage+'. Retry to resume saved progress.',code:'STREAM_INTERRUPTED',stage}});
    }finally{clearInterval(timer);if(!closed){closed=true;controller.close()}}
   })();
   return work;
  },
  cancel(){closed=true;clearInterval(timer);cancel.abort()}
 });
 return new Response(body,{headers:{'content-type':'application/x-ndjson; charset=utf-8','cache-control':'no-store, no-transform','x-content-type-options':'nosniff'}});
}
