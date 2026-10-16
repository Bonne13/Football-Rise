const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { existsSync, mkdirSync } = require('node:fs');
const { resolve, sep, join } = require('node:path');
const { tmpdir } = require('node:os');
const root = resolve(__dirname, '../dist-web');
const screenshots = process.env.REVIEW_OUTPUT || join(tmpdir(), 'football-rise-controls'); mkdirSync(screenshots, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) throw Error('not found');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html' }).end(body);
  } catch { res.writeHead(404).end(); }
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#create').waitFor();
  async function field(mode='practice',seed=42){
   await page.evaluate(async({mode,seed})=>{
    window.disposeDribble?.();localStorage.setItem('football-rise.graphics.v1','low');const u=document.querySelector('script[type=module]').src,load=p=>import(u.replace('ui/browser.js',p));const [{mountField},{createSession},{createCareer},{clubKits,trainingKit},{stadiumFor}]=await Promise.all(['ui/field.js','application/drills.js','application/career.js','data/kits.js','data/stadiums.js'].map(load));
    const attributes=createCareer({name:'Condução',nationality:'Brasil',position:'ST',preferredFoot:'right',seed}).player.attributes;attributes.technique=85;attributes.pace=80;const session=createSession(mode,seed,'technique');if(mode==='match')session.sequence=['technique','shoot'];const host=document.querySelector('#app');host.innerHTML='';document.body.classList.add('field-screen');window.dribbleProgress=[];
    window.disposeDribble=mountField(host,{fixtureLabel:mode==='match'?'Situação de partida · conduza para romper a marcação':'Treino de condução · circuito com bola',appearance:{number:10,training:mode!=='match',kit:mode==='match'?clubKits.kitsFor('vale')[0]:trainingKit,stadium:stadiumFor()},attributes,session,onProgress(s){window.dribbleProgress=s.results;},onComplete(){},onExit(){}});
   },{mode,seed});await page.clock.runFor(50);assert.equal(await page.locator('#football-field').getAttribute('data-renderer'),'webgl');await page.locator('#football-field').focus();
  }
  const state=()=>page.locator('#football-field').evaluate(c=>JSON.parse(c.dataset.dribble));
  async function course(){
   const canvas=page.locator('#football-field');await canvas.focus();await page.keyboard.down('Shift');let keys=new Set();
   for(let i=0;i<250;i++){
    const t=await state();if(t.resolved)break;const dx=t.next.x-t.player.x,dy=t.next.y-t.player.y,wanted=new Set();
    if(Math.abs(dx)>10)wanted.add(dx>0?'d':'a');if(Math.abs(dy)>10)wanted.add(dy>0?'s':'w');
    for(const k of keys)if(!wanted.has(k))await page.keyboard.up(k);for(const k of wanted)if(!keys.has(k))await page.keyboard.down(k);keys=wanted;await page.clock.runFor(50);
   }
   for(const k of keys)await page.keyboard.up(k);await page.keyboard.up('Shift');assert.equal(await page.locator('#field-feedback').getAttribute('data-outcome'),'complete');
  }
  if(!process.env.DRIBBLE_SHOT_ONLY){
  await field();await page.screenshot({path:join(screenshots,'59-dribble-circuit.png')});
  await page.keyboard.down('w');await page.clock.runFor(250);const slow=await state();await page.keyboard.down('Shift');await page.clock.runFor(250);const fast=await state();assert.equal(fast.sprint,true);const hud=await page.locator('.field-live').boundingBox(),feedback=await page.locator('#field-feedback').boundingBox();assert.ok(hud.y+hud.height<=feedback.y);assert.ok(Math.hypot(fast.velocity.x,fast.velocity.y)>Math.hypot(slow.velocity.x,slow.velocity.y));await page.keyboard.up('Shift');await page.keyboard.up('w');await page.clock.runFor(350);assert.equal((await state()).sprint,false);await page.screenshot({path:join(screenshots,'60-dribble-close-control.png')});
  console.log('Checking pause');await page.locator('#field-pause').click({force:true});const stopped=await state();await page.clock.runFor(500);assert.deepEqual(await state(),stopped);assert.equal(await page.locator('#dribble-sprint').getAttribute('aria-pressed'),'false');await page.locator('#field-resume').click({force:true});
  // The three practice attempts exercise different routes through the live keyboard adapter.
  if(!process.env.DRIBBLE_VISUAL_ONLY){
  await field();for(let i=0;i<3;i++){console.log('Keyboard course',i+1);await page.screenshot({path:join(screenshots,`${64+i}-dribble-layout.png`)});await course();console.log('Completed course',i+1);await page.locator('#field-next').click({force:true});await page.clock.runFor(50);}assert.equal(await page.locator('#drill-name').innerText(),'Sessão concluída');assert.equal((await page.evaluate(()=>window.dribbleProgress)).length,3);
  }else{for(let i=0;i<3;i++){await field('practice',42+i);await page.screenshot({path:join(screenshots,`${64+i}-dribble-layout.png`)});}}
  }
  await field('match');const initial=await state();assert.equal(initial.context,'match');assert.equal(initial.total,3);assert.equal(initial.defenders.length,2);assert.match(await page.locator('#field-zone').innerText(),/Transição ofensiva/);await page.screenshot({path:join(screenshots,'61-match-carry.png')});await course();const exit=await state();await page.locator('#field-next').click({force:true});await page.clock.runFor(50);const origin=JSON.parse(await page.locator('#football-field').getAttribute('data-origin'));assert.ok(Math.abs(origin.x-exit.ball.x)<1e-8);assert.ok(Math.abs(origin.y-exit.ball.y-400)<1e-8);assert.equal(await page.locator('#dribble-sprint').isVisible(),false);assert.match(await page.locator('#field-zone').innerText(),/Finalização após condução/);assert.equal(await page.locator('#contact-dock').isVisible(),false);
  const box=await page.locator('#football-field').boundingBox();const x=box.x+box.width*.5,y=box.y+box.height*.5;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+15,y+100);await page.mouse.up();await page.clock.runFor(50);assert.equal(await page.locator('#contact-dock').isVisible(),true);assert.equal(await page.locator('#aim-reticle').count(),0);const powerHUD=await page.locator('#ball-control').boundingBox(),messageHUD=await page.locator('#field-feedback').boundingBox();assert.ok(powerHUD.y+powerHUD.height<=messageHUD.y);await page.screenshot({path:join(screenshots,'62-carry-to-shot.png')});
  if(!process.env.DRIBBLE_SHOT_ONLY){
  await page.setViewportSize({width:390,height:844});await field();const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});const start={x:100,y:570};const before=await state();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:510,id:1}]});await page.clock.runFor(250);assert.ok((await state()).player.y<before.player.y);
  const boost=await page.locator('#dribble-sprint').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:510,id:1},{x:boost.x+boost.width/2,y:boost.y+boost.height/2,id:2}]});await page.clock.runFor(200);assert.equal((await state()).sprint,true);assert.equal(await page.locator('#dribble-sprint').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(183, 238, 130)');await page.screenshot({path:join(screenshots,'63-dribble-mobile.png')});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.clock.runFor(150);assert.equal((await state()).sprint,false);assert.equal(await page.locator('#pull-origin').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  assert.deepEqual(errors,[]);console.log(process.env.DRIBBLE_SHOT_ONLY?'Carry-to-shot visual passed: position continuity, single aim/curve, unobstructed power and feedback.':process.env.DRIBBLE_VISUAL_ONLY?'Dribble visual review passed: updated HUD, contrast, three layouts, live match carry-to-shot and multitouch.':'Dribble passed: three playable courses, analog/keyboard movement, pace tradeoff, pause/cancel, match defenders, carry-to-shot continuity, single aim/curve and two-finger mobile acceleration.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
