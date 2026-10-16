const {chromium}=require('playwright');const assert=require('node:assert/strict');
const {createServer}=require('node:http');const {readFile}=require('node:fs/promises');const {existsSync,mkdirSync}=require('node:fs');const {resolve,sep,join}=require('node:path');const {tmpdir}=require('node:os');
const root=resolve(__dirname,'../dist-web');
const screenshots=join(tmpdir(),'football-rise-browser');mkdirSync(screenshots,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error('not found');const body=await readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'}).end(body);}catch{res.writeHead(404).end();}});

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let b;try{b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const p=await c.newPage();const cdp=await c.newCDPSession(p);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();
await p.goto(origin);await p.screenshot({path:join(screenshots,'home.png'),fullPage:true});await p.getByLabel('Nome do jogador').fill('Alex');await p.getByRole('button',{name:'Começar minha história'}).click();await p.clock.runFor(50);assert.equal(await p.locator('#football-field').getAttribute('data-renderer'),'webgl');assert.equal(await p.locator('#contact-dock').isVisible(),false);assert.equal(await p.locator('.field-stage').getAttribute('data-phase'),'aiming');await p.screenshot({path:join(screenshots,'aim.png'),fullPage:true});
async function touch(x,y){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
// Sky/outside-goal taps must not reveal controls or fire.
let r=await p.locator('#football-field').boundingBox();await touch(r.x+10,r.y+r.height*.2);await p.clock.runFor(1000);assert.equal(await p.locator('#contact-dock').isVisible(),false);assert.equal(await p.locator('#field-next').isVisible(),false);
// Reverse pull begins aim in the same gesture; cancel never kicks.
r=await p.locator('#football-field').boundingBox();const x=r.x+r.width*.5,y=r.y+r.height*.55;
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+18,y:y+90}]});await p.clock.runFor(100);
assert.equal(await p.locator('.field-stage').getAttribute('data-phase'),'preparing');assert.equal(await p.locator('#aim-reticle').isVisible(),true);
await p.screenshot({path:join(screenshots,'prepare.png'),fullPage:true});
await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.clock.runFor(1000);assert.equal(await p.locator('#field-next').isVisible(),false);
// Pause freezes presentation and exposes real sound preferences.
await p.locator('#field-pause').click();assert.equal(await p.locator('#pause-menu').isVisible(),true);
await p.locator('#field-sound').click();assert.equal(await p.locator('#field-sound').innerText(),'Som: desligado');
assert.equal(await p.evaluate(()=>localStorage.getItem('football-rise.sound-muted')),'true');
await p.locator('#field-resume').click();await p.locator('#aim-reset').click();
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+18,y:y+90}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.equal(await p.locator('.field-stage').getAttribute('data-phase'),'flight');await p.locator('#football-field').press('Escape');const frozen=await p.locator('#field-clock').innerText();await p.clock.runFor(2000);assert.equal(await p.locator('#field-clock').innerText(),frozen);assert.equal(await p.locator('#field-next').isVisible(),false);await p.locator('#field-resume').click();await p.clock.runFor(1200);assert.equal(await p.locator('#field-next').isVisible(),true);
// Exit from pause confirms the last action without needing the next button.
await p.locator('#field-pause').click();await p.locator('#field-exit').click();assert.equal(await p.evaluate(()=>document.body.classList.contains('field-screen')),false);
await p.reload();await p.getByRole('button',{name:'Começar avaliação no campo'}).click();assert.equal(await p.locator('#drill-counter').innerText(),'2 / 18');
await p.locator('#field-pause').click();assert.equal(await p.locator('#field-sound').innerText(),'Som: desligado');await p.locator('#field-resume').click();
assert.equal(await p.locator('body > header').isVisible(),false);
await p.setViewportSize({width:320,height:740});await p.clock.runFor(100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
console.log('Mobile passed: reverse drag, cancellation, immersive screen, pause/resume, persisted sound, save-on-exit, reload and 320px layout.');
}finally{await b.close();}}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});
