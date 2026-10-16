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
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#create').waitFor();
    const cases = process.env.SURROUNDINGS_REVIEW ? [['Vasco','29-sao-januario'],['Santos','29-vila-belmiro'],['Bournemouth','29-dean-court'],['Eibar','29-ipurua'],['Flamengo','29-maracana']] : [['Flamengo','27-maracana'],['Botafogo','27-nilton-santos'],['Liverpool','27-anfield'],['Real Madrid','27-bernabeu'],['Bayern München','27-allianz-arena'],['Santos','27-vila-belmiro'],['Inter','27-san-siro']];
    for (const [name, file] of cases) {
      const stadiumName = await page.evaluate(async name => {
        window.disposeControls?.();
        const url=document.querySelector('script[type=module]').src, load=p=>import(url.replace('ui/browser.js',p));
        const [{mountField},{createSession},{createCareer},{stadiumFor},{clubKits}] = await Promise.all(['ui/field.js','application/drills.js','application/career.js','data/stadiums.js','data/kits.js'].map(load));
        const pack=await(await fetch('./data/community-2026-27.json')).json(); const club=pack.clubs.find(p=>p.club.name===name);
        const attributes=createCareer({name:'Prévia',nationality:'Brasil',position:'ST',preferredFoot:'right',seed:42}).player.attributes;
        const stadium=stadiumFor(club.club); const host=document.querySelector('#app');host.innerHTML='';
        window.disposeControls=mountField(host,{attributes,fixtureLabel:'Prévia arquitetônica · recreação aproximada',appearance:{number:10,training:false,kit:club.kits[0],stadium},session:createSession('practice',42,'shoot'),onProgress(){},onComplete(){},onExit(){}});
        return stadium.name;
      },name);
      await page.clock.runFor(50); assert.equal(await page.locator('#football-field').getAttribute('data-renderer'),'webgl');
      assert.match(await page.locator('#stadium-caption').innerText(), /recriação aproximada/);
      assert.ok((await page.locator('#stadium-caption').innerText()).includes(stadiumName));
      await page.locator('#field-pause').click(); await page.locator('#field-stadium').click(); await page.clock.runFor(50);
      const clock=await page.locator('#field-clock').innerText();
      await page.screenshot({path:join(screenshots,file+'.png')});
      await page.locator('#field-return').click(); await page.clock.runFor(50);
      assert.equal(await page.locator('#field-clock').innerText(),clock);
      if (process.env.SURROUNDINGS_REVIEW) await page.screenshot({path:join(screenshots,file.replace('29-','30-field-')+'.png')});
      console.log('Captured',name,stadiumName);
    }
    await page.setViewportSize({width:390,height:844});await page.clock.runFor(50);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(screenshots,process.env.SURROUNDINGS_REVIEW ? '31-surroundings-mobile.png' : '28-stadium-mobile.png')});
    assert.deepEqual(errors,[]);console.log(`Stadiums passed: ${cases.length} ground profiles, WebGL, approximate reference captions, panorama/return without time advance and mobile layout.`);
  } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
