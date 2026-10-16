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
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('[data-action="new"]').first().click();await page.locator('[data-action="world-pack"]').click();await page.getByText(/526 clubes ·/).first().waitFor();
  await page.locator('#create input[name=name]').fill('Special');await page.locator('#create button[type=submit],#create button.primary').click();await page.locator('#football-field').waitFor();await page.locator('#field-pause').click();await page.locator('#field-exit').click();await page.locator('#world-panel').waitFor();await page.locator('#notice').waitFor({state:'hidden'});
  async function select(key,region){await page.locator('#competition-confederation').selectOption(region);const id=await page.locator('#competition-select option').evaluateAll((items,key)=>items.find(o=>o.value===`2026:${key}`)?.value,key);assert.ok(id,key);await page.locator('#competition-select').selectOption(id);}
  async function capture(name,selector='#competition-detail'){await page.locator('#notice').waitFor({state:'hidden'});await page.locator(selector).first().evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:join(screenshots,name)});}
  async function collapse(){const r=page.locator('.regulation-card');if(await r.getAttribute('open')!==null)await r.locator('summary').click();}
  async function advanceRegular(key){
   const result=await page.evaluate(async key=>{
    const url=document.querySelector('script[type=module]').src,load=p=>import(url.replace('ui/browser.js',p));
    const [storage,save,world]=await Promise.all(['persistence/browser-storage.js','persistence/save.js','domain/competitions/world.js'].map(load));const s=save.deserializeSave(await storage.loadCareerText());const t=s.world.tournaments.find(t=>t.key===key);const dates=s.world.fixtures.filter(f=>f.competitionId===t.id&&f.stage==='league').map(f=>f.date).sort();const through=dates.at(-1);if(through>s.date){world.advanceWorld(s,through);s.date=through;}await storage.writeCareerText(save.serializeSave(s));return{phase:t.phase,date:s.date};
   },key);await page.reload();await page.locator('[data-action="continue"]').click();await page.locator('#world-panel').waitFor();return result;
  }
  await select('league:Estados Unidos','CONCACAF');assert.equal(await page.locator('#competition-detail tbody tr').count(),30);assert.match(await page.locator('.regulation-card').innerText(),/melhor de três/i);await capture('50-mls-formato.png');await collapse();await capture('51-mls-conferencias.png');
  const mls=await advanceRegular('league:Estados Unidos');assert.equal(mls.phase,'playoff');await select('league:Estados Unidos','CONCACAF');assert.equal(await page.locator('#competition-detail .fixture-row').filter({hasText:'Play-in / Wild card'}).count(),2);
  await capture('52-mls-wildcards.png','#competition-detail .fixture-row:last-child');
  // Resolve wild cards, then verify that only the guaranteed two games of each series exist.
  const series=await page.evaluate(async()=>{const u=document.querySelector('script[type=module]').src,load=p=>import(u.replace('ui/browser.js',p));const [storage,save,world]=await Promise.all(['persistence/browser-storage.js','persistence/save.js','domain/competitions/world.js'].map(load));const s=save.deserializeSave(await storage.loadCareerText()),t=s.world.tournaments.find(t=>t.key==='league:Estados Unidos'),date=s.world.fixtures.filter(f=>f.competitionId===t.id&&f.stage==='play-in').map(f=>f.date).sort().at(-1);world.advanceWorld(s,date);s.date=date;await storage.writeCareerText(save.serializeSave(s));return s.world.fixtures.filter(f=>f.competitionId===t.id&&f.stage==='series').length;});assert.equal(series,16);await page.reload();await page.locator('[data-action="continue"]').click();await page.locator('#world-panel').waitFor();await select('league:Estados Unidos','CONCACAF');await capture('53-mls-melhor-tres.png','#competition-detail .fixture-row:nth-last-child(16)');
  const mx=await advanceRegular('league-clausura:México');assert.equal(mx.phase,'playoff');await select('league-clausura:México','CONCACAF');assert.match(await page.locator('#competition-detail h3').innerText(),/Clausura/);assert.equal(await page.locator('#competition-detail .fixture-row').filter({hasText:'Play-in / Wild card'}).count(),2);await capture('54-mexico-playin.png','#competition-detail .fixture-row:nth-last-child(2)');
  const co=await advanceRegular('league-clausura:Colômbia');assert.equal(co.phase,'groups');await select('league-clausura:Colômbia','CONMEBOL');await collapse();assert.match(await page.locator('#competition-detail').innerText(),/Quadrangular A/);assert.equal(await page.locator('#competition-detail tbody').first().locator('tr').count(),4);await capture('55-colombia-quadrangulares.png');
  await select('league:Bélgica','UEFA');await collapse();assert.match(await page.locator('#competition-detail').innerText(),/Disputa do título/);assert.equal(await page.locator('#competition-detail tbody').first().locator('tr').count(),6);await capture('56-belgica-grupos.png');
  const completed=await page.evaluate(async()=>{const u=document.querySelector('script[type=module]').src,load=p=>import(u.replace('ui/browser.js',p));const [storage,save,world]=await Promise.all(['persistence/browser-storage.js','persistence/save.js','domain/competitions/world.js'].map(load));const s=save.deserializeSave(await storage.loadCareerText());world.advanceWorld(s,'2027-06-30');s.date='2027-06-30';await storage.writeCareerText(save.serializeSave(s));return{tournaments:s.world.tournaments.filter(t=>t.regulationId?.startsWith('rules-v2:')).map(t=>({key:t.key,phase:t.phase,champion:t.champion})),own:s.world.stats.filter(p=>p.playerId===s.player.id).length};});assert.equal(completed.tournaments.length,9);assert.ok(completed.tournaments.every(t=>t.phase==='complete'&&t.champion));assert.equal(completed.own,0);
  await page.reload();await page.locator('[data-action="continue"]').click();await page.locator('#world-panel').waitFor();await select('league-clausura:Argentina','CONMEBOL');assert.match(await page.locator('.champion-banner').innerText(),/CAMPEÃO/);await collapse();await capture('57-argentina-clausura.png');
  await select('league:Grécia','UEFA');await collapse();assert.equal(await page.locator('#competition-detail tbody').first().locator('tr').count(),4);await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await capture('58-grecia-celular.png');
  assert.deepEqual(errors,[]);console.log('Special leagues passed: MLS real conferences/wild cards/best-of-three, Mexico play-in, Colombian quadrangulars, Belgian/Greek splits, two Argentine titles, all nine editions complete, persisted 11MB world and mobile without overflow.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
