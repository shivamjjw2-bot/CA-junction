import {trendResponse} from './trend-http.js?v=available-1';

export async function trendRequest(path,options,onProgress=()=>{},dependencies={}){
 const fetcher=dependencies.fetch||fetch;
 const pause=dependencies.pause||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
 for(let attempt=0;attempt<3;attempt++){
  try{
   return await trendResponse(await fetcher(path,{...options,signal:AbortSignal.timeout(210000)}),onProgress);
  }catch(error){
   const network=error instanceof TypeError||error.name==='TimeoutError';
   const transient=network||['HOST_GATEWAY','HOST_TIMEOUT','STREAM_INTERRUPTED','UPSTREAM_UNAVAILABLE'].includes(error.code);
   if(!transient||attempt===2)throw error;
   onProgress('Connection interrupted; reconnecting to saved progress ('+(attempt+1)+'/2)');
   await pause(attempt===0?1000:3000);
  }
 }
}
