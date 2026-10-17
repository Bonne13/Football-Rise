const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const {resolve,sep}=require('node:path');
const root=resolve(__dirname,'../dist-web');
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
(async()=>{let browser;await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-17T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-17T00:00:01Z'));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('.main-menu').waitFor();
 for(const mode of ['practice','assessment','match']){
  await page.evaluate(async(mode)=>{
   window.disposeStaff?.();localStorage.setItem('football-rise.graphics.v1','low');
   const u=document.querySelector('script[type=module]').src,load=p=>import(u.replace('ui/browser.js',p));
   const [{mountField},{createSession},{createCareer},{clubKits,trainingKit},{stadiumFor},{coachFor}]=await Promise.all(['ui/field.js','application/drills.js','application/career.js','data/kits.js','data/stadiums.js','data/coaches.js'].map(load));
   const s=createCareer({name:'Comissão',nationality:'Brasil',position:'CM',preferredFoot:'right',seed:42}),club=s.clubs[1],coach=coachFor(club,clubKits.kitsFor(club.id)[0]);
   const session=createSession(mode,42,'vision');session.sequence=['vision'];
   window.disposeStaff=mountField(document.querySelector('#app'),{session,fixtureLabel:'Treino e partida',attributes:s.player.attributes,appearance:{coach,training:mode!=='match',kit:mode==='match'?clubKits.kitsFor(club.id)[0]:trainingKit,number:10,stadium:stadiumFor(club,mode!=='match')},onProgress(){},onComplete(){},onExit(){}});
  },mode);await page.clock.runFor(50);
  const field=page.locator('#football-field');assert.equal(await field.getAttribute('data-renderer'),'webgl');
  assert.deepEqual(JSON.parse(await field.getAttribute('data-officials')),mode==='match'?{referees:1,assistants:2,monitor:true}:{referees:0,assistants:0,monitor:false});
  const coach=JSON.parse(await field.getAttribute('data-coach'));assert.equal(coach.id,'aurora:youth:coach');assert.equal(coach.visible,true);assert.equal(coach.simulated,true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // Aim at the advanced teammate: an actual offside must not summon a training referee or VAR.
  await field.evaluate(c=>{for(let i=0;i<5;i++)c.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));for(let i=0;i<16;i++)c.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));});
  await field.press(' ');const ball=await page.locator('#contact-ball').boundingBox();await page.mouse.click(ball.x+ball.width/2,ball.y+ball.height/2);await page.clock.runFor(1200);
  assert.equal(await page.locator('#field-feedback').getAttribute('data-outcome'),'offside');
  assert.equal(await page.locator('#var-overlay').isVisible(),mode==='match');
  if(mode==='match')await page.locator('#var-close').click();
  await page.locator('#field-pause').click();assert.equal(await page.locator('#officials-kit').isVisible(),mode==='match');assert.equal(await page.locator('#field-var').isVisible(),mode==='match');
  if(mode!=='match'){
   assert.equal(await page.locator('#referee-decision').isVisible(),false);
   assert.equal(await page.locator('#player-animation option').evaluateAll(options=>options.some(o=>/Árbitro|Bandeirinha/.test(o.textContent))),false);
   await page.locator('#field-var').evaluate(b=>b.click());assert.equal(await page.locator('#var-overlay').isVisible(),false);
  }
  console.log('Staff context passed:',mode);
  if(mode==='practice'){await page.locator('#field-bench').click();assert.equal(JSON.parse(await field.getAttribute('data-bench')).frame,62);await mkdir('/tmp/rise-staff',{recursive:true});await page.screenshot({path:'/tmp/rise-staff/training-coach.png'});}
 }
 assert.deepEqual(errors,[]);console.log('PASS staff: coach per team, no officials/monitor/VAR in practice or assessment, match officials and review preserved, mobile layout.');
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
