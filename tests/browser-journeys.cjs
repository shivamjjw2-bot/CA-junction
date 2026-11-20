const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true});
try {
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const rows=['Final','Foundation'].flatMap(level=>['previous_year_question','mtp_question','rtp_question','mock_test_question'].map(chapter=>({id:level+chapter,subject:level+' accountancy',title:'May 2025',level,chapter,is_published:true,is_premium:false,description:'CAJ_PAPER_V1|'+JSON.stringify({version:1,attempt:'May',year:2025,scheme:'Current'})})));
await page.addInitScript(rows=>{
 const mode=sessionStorage.getItem('mode'),user=mode?{id:'fixture',email:'admin@example.test'}:null;
 const query=new Proxy({}, {get:(o,k)=>k==='then'?(resolve)=>resolve({data:rows,error:null}):k==='maybeSingle'?async()=>({data:mode==='student'?null:{role:'admin'}}):()=>query});
 window.supabase={createClient:()=>({from:()=>query,auth:{getUser:async()=>({data:{user}}),signInWithPassword:async()=>({error:true}),getSession:async()=>({data:{session:null}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal2'}}),listFactors:async()=>({data:{totp:[{id:'fixture'}]}})}}})};
},rows);
await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='fixture.test')return r.fulfill({body:''});let file=path.join(__dirname,'..',u.pathname);return fs.existsSync(file)?r.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html'}):r.fulfill({status:404,body:''})});
const go=p=>page.goto('https://fixture.test/'+p,{waitUntil:'domcontentloaded'});
for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:844});await go('account.html');assert(await page.locator('#googleSignIn').isVisible());assert.equal(await page.locator('input[type=password]').count(),0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await go('admin.html');await page.locator('#loginEmail').waitFor();await page.fill('#loginEmail','admin@example.test');await page.fill('#loginPassword','dummy');await page.locator('#signInForm button').click();await page.getByText(/Sign-in failed/).waitFor();
await page.evaluate(()=>sessionStorage.setItem('mode','student'));await page.reload();await page.getByText(/Admin access could not be verified/).waitFor();assert(await page.locator('#adminPanel').isHidden());
await page.evaluate(()=>sessionStorage.setItem('mode','admin'));await page.reload();await page.locator('#adminCode').waitFor();assert(await page.locator('#adminPanel').isHidden());
await go('upload.html');await page.locator('#noteUploadForm').waitFor();assert(new URL(page.url()).pathname==='/upload.html');
for(const pageName of ['previous-papers','mtp','rtp','test-series-papers']){
 await go(pageName+'.html');await page.getByRole('link',{name:'CA Final',exact:true}).click();await page.getByRole('link',{name:/2025.*1 PDFs/}).click();await page.getByRole('link',{name:/May.*1 PDFs/}).click();
 await page.getByRole('rowheader',{name:'Final accountancy'}).waitFor();assert.equal(await page.getByRole('rowheader',{name:'Foundation accountancy'}).count(),0);
}
assert.deepEqual(errors,[]);console.log('PASS: student login at 4 widths, invalid password, student rejection, enrolled-admin challenge, filtering through four collections, no page exceptions.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});