import {readPdf} from './trend-pdf.js';
const ORIGINAL='9b3451cc40dfaa5a7f458b6c3e8d94572942b50f96fd9269e8c6f1da4743b7ec';
const NORMALIZED='602d33ffc306d52c11b6549a2e87de35067b85fc3895e01f639150c6be6797ac';
const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
// This public examination paper opens with an empty password. All 48 page
// renders were compared before publishing its unencrypted processing copy.
// Never use title matching or accept a different source/replacement checksum.
export function normalizedPdfResolver(env,request,signal){
 return async original=>{
  if(await sha(original)!==ORIGINAL)return null;
  if(!env.ASSETS?.fetch)throw Error('The verified PDF processing copy is unavailable. Please retry later.');
  const response=await env.ASSETS.fetch(new Request(new URL('/materials/normalized/final-audit-may-2025.pdf',request.url),{signal}));
  const bytes=await readPdf(response);
  if(await sha(bytes)!==NORMALIZED)throw Error('The PDF processing copy failed its integrity check. No analysis was added.');
  return bytes;
 };
}
