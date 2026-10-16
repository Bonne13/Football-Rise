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
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('[data-action="new"]').first().click();await page.locator('[data-action="world-pack"]').click();await page.getByText(/526 clubes ·/).first().waitFor();await page.locator('#create input[name=name]').fill('Temporada');await page.locator('#create button[type=submit],#create button.primary').click();await page.locator('#football-field').waitFor();await page.locator('#field-pause').click();await page.locator('#field-exit').click();await page.locator('#world-panel').waitFor();
  async function transform(next){return page.evaluate(async next=>{const u=document.querySelector('script[type=module]').src,load=p=>import(u.replace('ui/browser.js',p));const [storage,save,world]=await Promise.all(['persistence/browser-storage.js','persistence/save.js','domain/competitions/world.js'].map(load));const s=save.deserializeSave(await storage.loadCareerText());const before=s.world;const oldTop=before.tournaments.find(t=>t.key==='league:Inglaterra')?.participants??[];world.advanceWorld(s,next);s.date=next;const playoff=s.world.tournaments.find(t=>t.key==='promotion:Inglaterra:2');const extra=s.world.fixtures.find(f=>f.extraTime);const top=s.world.tournaments.find(t=>t.key==='league:Inglaterra');await storage.writeCareerText(save.serializeSave(s));return{season:s.world.season,playoff:playoff?{id:playoff.id,phase:playoff.phase,games:s.world.fixtures.filter(f=>f.competitionId===playoff.id).length}:null,extra:extra?{competitionId:extra.competitionId,id:extra.id}:null,moved:top.participants.filter(id=>!oldTop.includes(id)),special:s.world.tournaments.filter(t=>t.regulationId?.startsWith('rules-v2:')).map(t=>t.phase)};},next);}
  const end=await transform('2027-06-30');assert.equal(end.playoff.phase,'complete');assert.equal(end.playoff.games,5);assert.ok(end.extra);assert.ok(end.special.every(phase=>phase==='complete'));await page.reload();await page.locator('[data-action="continue"]').click();await page.locator('#world-panel').waitFor();await page.locator('#competition-confederation').selectOption('UEFA');await page.locator('#competition-select').selectOption(end.playoff.id);assert.match(await page.locator('#competition-detail').innerText(),/Playoffs de acesso/);assert.equal(await page.locator('#competition-detail .fixture-row').count(),5);await page.locator('#notice').waitFor({state:'hidden'});await page.locator('#competition-detail').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:join(screenshots,'67-playoffs-access.png')});
  await page.locator('#competition-confederation').selectOption('all');await page.locator('#competition-select').selectOption(end.extra.competitionId);assert.match(await page.locator('#competition-detail').innerText(),/Após prorrogação/);const row=page.locator('#competition-detail .fixture-row').filter({hasText:'Após prorrogação'}).first();await row.evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:join(screenshots,'68-extra-time.png')});
  const next=await transform('2027-07-01');assert.equal(next.season,2027);assert.equal(next.moved.length,3);await page.reload();await page.locator('[data-action="continue"]').click();await page.locator('#world-panel').waitFor();await page.locator('#competition-confederation').selectOption('UEFA');await page.locator('#competition-select').selectOption('2027:league:Inglaterra');assert.equal(await page.locator('#competition-detail tbody tr').count(),20);await page.locator('.regulation-card summary').click();await page.locator('#competition-detail').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:join(screenshots,'69-new-season.png')});assert.deepEqual(errors,[]);console.log('Season browser passed: all nine special editions complete, English access playoff five matches, extra time displayed, save/reload and three promoted clubs in a 20-team Premier League after rollover.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
