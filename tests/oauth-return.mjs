import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../assets/backend.js',import.meta.url),'utf8');
function page(url, saved, referrer=""){
  const location=new URL(url), state={saved};
  location.assign=location.replace=next=>{state.next=next};
  const auth={signInWithOAuth:async options=>{state.oauth=options},getSession:async()=>({data:{session:{}}})};
  const window={CA_CONFIG:{SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-publishable-key-for-local-test'},supabase:{createClient:(_url,_key,options)=>{state.flow=options.auth.flowType;return {auth}}}};
  const sessionStorage={getItem:()=>state.saved,setItem:(_k,v)=>{state.saved=v},removeItem:()=>{state.saved=null}};
  vm.runInNewContext(source,{window,location,sessionStorage,document:{referrer},history:{replaceState(){}},URL,URLSearchParams});
  return {window,state};
}
test('canonical login uses a code and remembers the selected paper',async()=>{
 const {window,state}=page('https://cajunction.in/account');
 await window.caStartGoogleLogin(new URL('https://cajunction.in/account?next=/mtp'));
 assert.equal(state.flow,'pkce');assert.equal(state.oauth.options.redirectTo,'https://cajunction.in/');assert.equal(state.saved,'/account?next=/mtp');
});
test('preview moves to the correct production route before starting OAuth',async()=>{
 const {window,state}=page('https://fixture.ca-junction.pages.dev/admin');
 await window.caStartGoogleLogin(new URL('https://fixture.ca-junction.pages.dev/admin'));
 assert.equal(state.next,'https://cajunction.in/admin#continue-google');assert.equal(state.oauth,undefined);
});
test('canonical callback restores admin destination and clears the return record',async()=>{
 const {state}=page('https://cajunction.in/?code=fixture','/admin');
 await new Promise(resolve=>setImmediate(resolve));assert.equal(state.next,'/admin');assert.equal(state.saved,null);
});

test('a click on the owned preview continues on the canonical account page',()=>{
 const {state}=page('https://cajunction.in/account?next=/mtp#continue-google',null,'https://fixture.ca-junction.pages.dev/');
 assert.equal(state.oauth.provider,'google');assert.equal(state.saved,'/account?next=/mtp');
});
test('external referrals cannot initiate sign-in automatically',()=>{
 const {state}=page('https://cajunction.in/account#continue-google',null,'https://example.org/');
 assert.equal(state.oauth,undefined);
});