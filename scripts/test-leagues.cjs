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
    const errors = []; page.on('pageerror', e => errors.push(e.message)); 
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#create').waitFor();
    await page.locator('[data-action="world-pack"]').click();
    await page.getByText(/526 clubes ·/).first().waitFor();
    await page.locator('#create input[name=name]').fill('Global');await page.locator('#create button[type=submit],#create button.primary').click();
    await page.locator('#football-field').waitFor();await page.locator('#field-pause').click();await page.locator('#field-exit').click();
    await page.locator('#world-panel').waitFor();
    assert.ok(await page.locator('#competition-select option').count()>=270);
    await page.locator('#competition-confederation').selectOption('UEFA');
    assert.equal(await page.locator('#competition-select option:not([disabled])').evaluateAll(items=>items.every(o=>o.dataset.region==='UEFA')),true);
    const division=await page.locator('#competition-select option').evaluateAll(items=>items.find(o=>o.value.includes('league2:Inglaterra'))?.value);
    assert.ok(division);await page.locator('#competition-select').selectOption(division);
    assert.match(await page.locator('#competition-detail h3').innerText(),/Championship/);
    assert.equal(await page.locator('#competition-detail tbody tr').count(),24);
    await page.locator('#world-panel').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:join(screenshots,'40-league-second-division.png')});
    await page.locator('#competition-confederation').selectOption('CONCACAF');
    const concacaf=await page.locator('#competition-select option').evaluateAll(items=>items.find(o=>o.value.endsWith(':concacaf-champions'))?.value);
    await page.locator('#competition-select').selectOption(concacaf);
    assert.match(await page.locator('#competition-detail h3').innerText(),/CONCACAF Champions Cup/);
    assert.match(await page.locator('#competition-detail .badge').innerText(),/Mata-mata/);
    await page.locator('#world-panel').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:join(screenshots,'41-concacaf.png')});
    await page.locator('#competition-confederation').selectOption('CONMEBOL');
    const sud=await page.locator('#competition-select option').evaluateAll(items=>items.find(o=>o.value.endsWith(':sudamericana'))?.value);await page.locator('#competition-select').selectOption(sud);
    assert.match(await page.locator('#competition-detail h3').innerText(),/Sudamericana/);
    await page.locator('#world-panel').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:join(screenshots,'42-sudamericana.png')});
    const bolivia=await page.locator('#competition-select option').evaluateAll(items=>items.find(o=>o.value.endsWith(':league:Bolívia'))?.value);await page.locator('#competition-select').selectOption(bolivia);
    assert.match(await page.locator('#competition-detail').innerText(),/Sem participantes suficientes/);
    await page.reload();await page.locator('#world-panel').waitFor();assert.ok(await page.locator('#competition-select option').count()>=270);
    // Resume through the real save boundary, then exercise autonomous calendar progression in the UI.
    await page.evaluate(async()=>{
      const url=document.querySelector('script[type=module]').src,load=p=>import(url.replace('ui/browser.js',p));
      const [{loadCareerText,writeCareerText},{serializeSave,deserializeSave},{advanceCareer}]=await Promise.all(['persistence/browser-storage.js','persistence/save.js','application/career.js'].map(load));
      let s=deserializeSave(await loadCareerText());s=advanceCareer(s,{type:'assess',performances:Object.fromEntries(Object.keys(s.player.attributes).map(k=>[k,80]))});
      await writeCareerText(serializeSave(s));
    });await page.reload();await page.locator('#world-panel').waitFor();
    await page.locator('[data-action="advance-week"]').click();
    await page.waitForFunction(()=>!document.querySelector('#app').inert);
    const simulated=await page.evaluate(async()=>{const u=document.querySelector('script[type=module]').src;const a=await import(u.replace('ui/browser.js','persistence/browser-storage.js'));const b=await import(u.replace('ui/browser.js','persistence/save.js'));const s=b.deserializeSave(await a.loadCareerText());return {played:s.world.fixtures.filter(f=>f.homeGoals!==null).length,own:s.world.stats.filter(p=>p.playerId===s.player.id).length}});
    assert.ok(simulated.played>0);assert.equal(simulated.own,0);
    await page.setViewportSize({width:390,height:844});await page.locator('#world-panel').evaluate(el=>el.scrollIntoView({block:'start'}));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(screenshots,'43-leagues-mobile.png')});
    assert.deepEqual(errors,[]);console.log('Leagues passed: 526-club pack, divisional tables, confederation filters, CONCACAF/Sudamericana, unavailable-country notice, persisted world, autonomous week without player stats and mobile layout.');
  } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
