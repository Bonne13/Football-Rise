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
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.setDefaultTimeout(120000);
    const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.clock.install();
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('[data-action="new"]').first().click(); await page.locator('#create').waitFor();
    async function setup(kind, mode = 'practice') {
      await page.evaluate(async ({kind, mode}) => {
        window.disposeVAR?.(); const url = document.querySelector('script[type=module]').src, load = path => import(url.replace('ui/browser.js',path));
        const [{mountField},{createSession},{createCareer},{clubKits},{stadiumFor}] = await Promise.all(['ui/field.js','application/drills.js','application/career.js','data/kits.js','data/stadiums.js'].map(load));
        const s = createCareer({name:'VAR',nationality:'Brasil',position:'ST',preferredFoot:'right',seed:42});
        const session = createSession(mode,42,kind); if(mode==='match') session.sequence = [kind];
        window.varProgressCalls = 0;
        window.disposeVAR = mountField(document.querySelector('#app'), { fixtureLabel:'Revisão do lance · simulação', appearance:{number:10,training:false,kit:clubKits.kitsFor('vale')[0],stadium:stadiumFor()}, attributes:s.player.attributes,session,onProgress(){window.varProgressCalls++},onComplete(){},onExit(){} });
      },{kind,mode}); await page.clock.runFor(50);
    }
    async function kick(dx,dy) {
      const r = await page.locator('#football-field').boundingBox(), x = r.x+r.width*.5,y=r.y+r.height*.5;
      await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+dx,y+dy); await page.mouse.up(); await page.clock.runFor(50);
      const ball = await page.locator('#contact-ball').boundingBox(); await page.mouse.click(ball.x+ball.width/2,ball.y+ball.height/2); await page.clock.runFor(1400);
    }
    async function seek(value) { await page.locator('#var-progress').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},value); }
    const textureCheck = await page.evaluate(async () => {
      const url = document.querySelector('script[type=module]').src;
      const {paintPixelPlayers} = await import(url.replace('ui/browser.js','ui/pixel-player.js'));
      const {OFFICIAL_KITS} = await import(url.replace('ui/browser.js','data/official-kits.js'));
      const pixels = (kit,number,role) => {const c=document.createElement('canvas');paintPixelPlayers(c,kit,number,false,0,role);return c.getContext('2d').getImageData(0,0,c.width,c.height).data;};
      return Object.entries(OFFICIAL_KITS).map(([color,kit])=>{
        const a=pixels(kit,7,'official'),b=pixels(kit,99,'official'),p=pixels(kit,7,'player'),q=pixels(kit,99,'player');
        return {color,officialIndependent:a.every((v,i)=>v===b[i]),playersNumbered:p.some((v,i)=>v!==q[i])};
      });
    });
    for(const result of textureCheck){assert.equal(result.officialIndependent,true);assert.equal(result.playersNumbered,true);}
    await setup('vision','match'); await kick(18.46,90.55);
    assert.match(await page.locator('#field-feedback').innerText(),/Impedimento/);
    assert.equal(await page.locator('#var-overlay').isVisible(),true);await page.locator('#var-close').click();
    const time = await page.locator('#field-clock').innerText();
    await page.locator('#field-pause').click(); await page.locator('#field-var').click(); await page.clock.runFor(250); await page.locator('#var-pause').click();
    assert.equal(await page.locator('.field-stage').getAttribute('data-var-phase'),'assistant');
    await page.screenshot({path:join(screenshots,'16-assistant-offside.png')});
    await seek(2.5); assert.equal(await page.locator('#var-room').isVisible(),true);
    await page.screenshot({path:join(screenshots,'17-var-room.png')});
    const pausedAt = await page.locator('#var-progress').inputValue(); await page.clock.runFor(500); assert.equal(await page.locator('#var-progress').inputValue(),pausedAt);
    await seek(8.5); assert.equal(await page.locator('.field-stage').getAttribute('data-var-phase'),'walk');
    await page.screenshot({path:join(screenshots,'18-referee-walking.png')});
    await seek(12); await page.screenshot({path:join(screenshots,'19-pitchside-monitor.png')});
    await seek(15); assert.match(await page.locator('#var-title').innerText(),/IMPEDIMENTO CONFIRMADO/);
    await page.screenshot({path:join(screenshots,'20-var-verdict.png')});
    for (const [color,file] of [['black','22-official-black.png'],['yellow','23-official-yellow.png'],['red','24-official-red.png']]) {
      await page.locator('#var-close').click();await page.locator('#field-pause').click();await page.locator('#officials-kit').selectOption(color);
      assert.equal(await page.evaluate(()=>localStorage.getItem('football-rise.officials-kit')),color);
      await page.locator('#field-var').click();await page.locator('#var-pause').click();await seek(15);
      await page.screenshot({path:join(screenshots,file)});
    }
    assert.equal(await page.locator('#field-clock').innerText(),time); assert.equal(await page.evaluate(()=>window.varProgressCalls),0);
    await page.setViewportSize({width:390,height:844}); await seek(2.5);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(screenshots,'21-var-mobile.png')});
    await page.locator('#var-close').click(); assert.equal(await page.locator('#var-overlay').isVisible(),false);
    assert.match(await page.locator('#field-feedback').innerText(),/Impedimento/);
    await page.locator('#field-next').click(); assert.equal(await page.evaluate(()=>window.varProgressCalls),1);
    // An actual match goal starts the review automatically; leaving cannot repeat it.
    await page.setViewportSize({width:1280,height:800}); await setup('shoot','match'); await kick(16,120);
    assert.equal(await page.locator('#var-overlay').isVisible(),true);
    await seek(15); assert.equal(await page.locator('#var-title').innerText(),'GOL CONFIRMADO');
    await page.locator('#var-close').click(); await page.clock.runFor(100);
    assert.equal(await page.locator('#var-overlay').isVisible(),false); assert.equal(await page.evaluate(()=>window.varProgressCalls),0);
    assert.deepEqual(errors,[]);
    console.log('Officials and VAR passed: number-free officials in all poses, black/yellow/red kits, retained player numbers, actual offside, assistant, three-person room, walk/monitor, verdict, frozen clock, mobile layout, skip, single result recording and automatic match-goal review.');
  } finally { await browser?.close(); await new Promise(r=>server.close(r)); }
})().catch(e=>{console.error(e);process.exitCode=1});
