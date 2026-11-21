const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE});
  const rows = new Map();
  async function open(account) {
    const ctx = await browser.newContext({timezoneId:'Asia/Kolkata'});
    await ctx.route('**/*', route => {
      const url = new URL(route.request().url());
      if(url.hostname !== 'fixture.test') return route.fulfill({body:''});
      const file = path.join(__dirname,'..',url.pathname);
      return fs.existsSync(file) ? route.fulfill({path:file}) : route.fulfill({status:404,body:''});
    });
    await ctx.exposeFunction('fixtureQuery', ({table,op,filters,batch}) => {
      if(table !== 'study_sessions') return {data:[]};
      if(op === 'upsert') for(const row of batch) {assert.equal(row.user_id,account); rows.set(row.id,row);}
      const found = [...rows.values()].filter(row=>filters.every(([method,key,v])=>
        method==='eq'?row[key]===v:method==='gte'?row[key]>=v:method==='lt'?row[key]<v:method==='in'?v.includes(row[key]):true));
      if(op === 'delete') for(const row of found){assert.equal(row.user_id,account);rows.delete(row.id);}
      return {data:found,error:null};
    });
    if(account) await ctx.addInitScript(account => {
      const user={id:account};
      window.supabase={createClient:()=>({
        auth:{onAuthStateChange(cb){queueMicrotask(()=>cb('INITIAL_SESSION',{user}));return {};},
          getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user}}})},
        from(table) {
          let op='select',batch=[],filters=[];
          const query=new Proxy({}, {get(_,name) {
            if(name==='then') return (resolve,reject)=>window.fixtureQuery({table,op,batch,filters}).then(resolve,reject);
            return (...args)=>{if(['select','upsert','delete'].includes(name)){op=name;if(name==='upsert')batch=args[0];}
              else if(['eq','gte','lt','in','gt'].includes(name))filters.push([name,...args]);return query;};
          }});return query;
        }
      })};
    },account);
    return ctx.newPage();
  }
  try {
    const page=await open(null);
    for(const width of [320,390,768,1024,1280]){
      await page.setViewportSize({width,height:844});
      for(const file of ['index.html','admin.html']){
        await page.goto('https://fixture.test/'+file);
        const toggle=page.locator('header #themeToggle');
        assert.equal(await page.locator('#themeToggle').count(),1);
        assert(await toggle.isVisible());
        for(let n=0;n<2;n++){
          const current=await page.locator('html').getAttribute('data-theme');
          assert.equal(await toggle.innerText(),current==='dark'?'Switch to Light Mode':'Switch to Dark Mode');
          const box=await toggle.boundingBox();
          assert(box.x>=0 && box.x+box.width<=width+1 && box.y<120,JSON.stringify({width,file,box}));
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),file+' overflows at '+width);
          if(file==='index.html'){
            const menu=page.locator('.service-group').first();
            assert((await menu.evaluate(e=>getComputedStyle(e).backdropFilter)).includes('blur'));
            assert(await page.locator('.service-group svg').count()>=20);
            await menu.locator('summary').click();assert(await menu.evaluate(e=>e.open));await menu.locator('summary').click();
          }
          assert((await toggle.evaluate(e=>getComputedStyle(e).backgroundImage)).includes('gradient'));
          await toggle.click();await page.reload();
          assert.notEqual(await page.locator('html').getAttribute('data-theme'),current);
        }
      }
    }
    console.log('PASS home/admin glass, navigation, top toggle, persistence and layout in both themes at five widths');
    const time='2026-11-20T23:58:30+05:30';
    function seed(id,user_id,started_at,duration_seconds){rows.set(id,{id,user_id,started_at:new Date(started_at).toISOString(),duration_seconds});}
    seed('expired','A','2026-10-20T12:00:00+05:30',600);
    seed('edge','A','2026-10-22T23:59:00+05:30',120);
    seed('private','B','2026-10-20T12:00:00+05:30',600);
    const tracker=await open('A');await tracker.clock.install({time:new Date(time)});
    await tracker.clock.pauseAt(new Date('2026-11-20T23:58:31+05:30'));
    const go=async p=>{await p.goto('https://fixture.test/tracker.html');await p.locator('#showStudyTimer').dispatchEvent('click');};
    await go(tracker);await tracker.locator('#timerStart').dispatchEvent('click');
    await tracker.clock.runFor(180000);
    assert.equal(await tracker.locator('#focusTimer').innerText(),'00:03:00');
    assert(await tracker.locator('#timerStart').isDisabled());
    await tracker.locator('#timerPause').dispatchEvent('click');
    const history=p=>p.locator('#studyHistoryRows tr').allTextContents();
    const expected=['21 Nov 2026Saturday00h 01m','20 Nov 2026Friday00h 01m','23 Oct 2026Friday00h 01m'];
    assert.deepEqual(await history(tracker),expected);
    assert(!rows.has('expired'));assert(rows.has('private'));
    await go(tracker);await tracker.clock.runFor(1000);assert.deepEqual(await history(tracker),expected);
    const fresh=await open('A');await fresh.clock.install({time:new Date('2026-11-21T06:00:00+05:30')});await go(fresh);
    await fresh.waitForFunction(()=>document.querySelectorAll('#studyHistoryRows tr').length===3);
    assert.deepEqual(await history(fresh),expected);
    const next=await open('B');await next.clock.install({time:new Date('2026-11-21T06:00:00+05:30')});await go(next);
    assert.deepEqual(await history(next),[]);
    await tracker.locator('#timerStart').dispatchEvent('click');
    await tracker.clock.fastForward(16*86400000);
    await tracker.clock.fastForward(15*86400000);
    assert(await tracker.locator('#timerStart').isDisabled());
    assert.equal((await history(tracker)).length,30);
    assert(!/retention|deletion|30.day/i.test(await tracker.locator('#timerPanel').innerText()));
    console.log('PASS midnight split, elapsed time, pause/resume, independent sign-in, account isolation, rolling expiry and continuous 31-day session');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
