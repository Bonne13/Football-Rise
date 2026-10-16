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
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }); page.setDefaultTimeout(120000);
    const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.clock.install();
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('[data-action="new"]').first().click();
    await page.locator('#create').waitFor();
    async function fixture(form, homeIsPlayer = true, training = false) {
      return await page.evaluate(async ({form,homeIsPlayer,training})=>{
        window.disposeControls?.();
        const url=document.querySelector('script[type=module]').src,load=p=>import(url.replace('ui/browser.js',p));
        const [{mountField},{createSession},{createCareer},{stadiumFor},{matchCrowd}]=await Promise.all(['ui/field.js','application/drills.js','application/career.js','data/stadiums.js','domain/match/crowd.js'].map(load));
        const pack=await(await fetch('./data/community-2026-27.json')).json(),club=pack.clubs.find(c=>c.club.name==='Flamengo'),ground=stadiumFor(club.club);
        const fixtures=Array.from({length:6},(_,i)=>({id:'f'+i,competitionId:'league',date:'2026-09-'+(10+i),home:'a',away:'b',homeGoals:form==='good'?2:0,awayGoals:form==='good'?0:2}));
        const crowd=matchCrowd({tournaments:[{id:'league',level:'senior'}],fixtures},'a',ground.capacity,club.club.reputation,'2026-09-20','senior',homeIsPlayer);
        const attributes=createCareer({name:'Torcida',nationality:'Brasil',position:'ST',preferredFoot:'right',seed:42}).player.attributes;
        const host=document.querySelector('#app');host.innerHTML='';localStorage.setItem('football-rise.sound-muted','true');
        const session = createSession(training?'practice':'match',42,'shoot'); if (!training) session.sequence=['shoot']; // Isolate a finishing opportunity.
        window.disposeControls=mountField(host,{attributes,fixtureLabel:`Prévia simulada · público ${crowd.attendance} · ${Math.round(crowd.occupancy*100)}% · torcida ${crowd.mood}`,appearance:{number:10,training,kit:club.kits[0],stadium:ground,crowd},session,onProgress(){},onComplete(){},onExit(){}});
        return crowd;
      },{form,homeIsPlayer,training});
    }
    const good=await fixture('good');await page.clock.runFor(50);
    const goodCount=Number(await page.locator('#football-field').getAttribute('data-supporters'));assert.ok(goodCount>0);
    assert.match(await page.locator('#crowd-status').innerText(),/empolgada/);
    await page.locator('#field-pause').click();await page.locator('#field-stadium').click();await page.clock.runFor(50);
    await page.screenshot({path:join(screenshots,'35-crowd-winning.png')});
    const bad=await fixture('bad');await page.clock.runFor(50);
    const badCount=Number(await page.locator('#football-field').getAttribute('data-supporters'));assert.ok(goodCount>badCount);assert.ok(good.attendance>bad.attendance);
    assert.match(await page.locator('#crowd-status').innerText(),/cobrando/);
    await page.locator('#field-pause').click();await page.locator('#field-stadium').click();await page.clock.runFor(50);
    await page.screenshot({path:join(screenshots,'36-crowd-losing.png')});
    for (const home of [true,false]) {
      await fixture('good',home);await page.clock.runFor(50);
      const b=await page.locator('#football-field').boundingBox(),x=b.x+b.width*.5,y=b.y+b.height*.5;
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+16,y+120);await page.mouse.up();await page.clock.runFor(50);
      const ball=await page.locator('#contact-ball').boundingBox();await page.mouse.click(ball.x+ball.width/2,ball.y+ball.height/2);await page.clock.runFor(1400);
      assert.equal(await page.locator('#var-overlay').isVisible(),true);
      await page.locator('#var-close').click();
      assert.match(await page.locator('#crowd-status').innerText(),home?/comemora/:/lamenta/);
      await page.screenshot({path:join(screenshots,home?'37-crowd-goal.png':'38-crowd-away-goal.png')});
    }
    await fixture('good',true,true);await page.clock.runFor(50);
    assert.equal(await page.locator('#football-field').getAttribute('data-supporters'),'0');assert.equal(await page.locator('#crowd-status').isVisible(),false);
    await page.setViewportSize({width:390,height:844});await fixture('good');await page.clock.runFor(50);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(screenshots,'39-crowd-mobile.png')});
    assert.deepEqual(errors,[]);console.log('Crowd passed: club form changes actual spectator count, home/away goal reactions, practice empty, VAR retention and mobile layout.');
  } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
