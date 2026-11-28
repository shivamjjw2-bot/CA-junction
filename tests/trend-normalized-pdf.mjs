import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readPdf} from '../functions/_lib/trend-pdf.js';
import {normalizedPdfResolver} from '../functions/_lib/trend-normalized-pdf.js';
const copy=fs.readFileSync(new URL('../materials/normalized/final-audit-may-2025.pdf',import.meta.url));
assert.equal((await readPdf(new Response(copy))).length,copy.length);
let fetches=0;
const env={ASSETS:{fetch:async request=>{fetches++;assert.equal(new URL(request.url).pathname,'/materials/normalized/final-audit-may-2025.pdf');return new Response(copy)}}};
const request=new Request('https://cajunction.in/api/trend-analysis');
const resolve=normalizedPdfResolver(env,request);
await assert.rejects(()=>readPdf(new Response('%PDF-1.7 /Encrypt 1 0 R %%EOF'),resolve),e=>e.code==='PDF_ENCRYPTED');
assert.equal(fetches,0,'Unregistered encrypted files must not fetch a replacement');
if(process.argv[2]){
 const original=fs.readFileSync(process.argv[2]);
 const resolved=await readPdf(new Response(original),resolve);
 assert.deepEqual(Buffer.from(resolved),copy);
 env.ASSETS.fetch=async()=>new Response('%PDF-1.7 incorrect %%EOF');
 await assert.rejects(()=>readPdf(new Response(original),resolve),/integrity check/);
 await assert.rejects(()=>readPdf(new Response(original),normalizedPdfResolver({},request)),/unavailable/);
 console.log('PASS: actual encrypted 48-page source resolves to verified copy; tampered replacement and missing asset binding fail closed.');
}
console.log('PASS: normalized PDF integrity, unknown encrypted source rejection and no arbitrary asset access.');
