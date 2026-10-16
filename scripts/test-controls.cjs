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
    async function field(kind, kit = 0, number = 99) {
      await page.evaluate(async ({ kind, kit, number }) => {
        window.disposeControls?.();
        const url = document.querySelector('script[type=module]').src, load = path => import(url.replace('ui/browser.js', path));
        const [{ mountField }, { createSession }, { createCareer }, { clubKits, trainingKit }, { stadiumFor }] = await Promise.all(['ui/field.js', 'application/drills.js', 'application/career.js', 'data/kits.js', 'data/stadiums.js'].map(load));
        const attributes = createCareer({ name: 'Prévia', nationality: 'Brasil', preferredFoot: 'right', position: 'ST', seed: 42 }).player.attributes;
        const host = document.querySelector('#app'); host.innerHTML = '';
        window.disposeControls = mountField(host, { fixtureLabel: 'Prévia de controles e uniformes · cenário simulado', appearance: { number, training: kind === 'technique', kit: kind === 'technique' ? trainingKit : clubKits.kitsFor('vale')[kit], stadium: stadiumFor() }, attributes, session: createSession('practice', 42, kind), onProgress() {}, onComplete() {}, onExit() {} });
      }, { kind, kit, number });
      console.log('Mounted', kind, kit, number);
      await page.clock.runFor(50); assert.equal(await page.locator('#football-field').getAttribute('data-renderer'), 'webgl');
    }
    if (!process.env.GOAL_REVIEW_ONLY) {
    for (const [kit, number] of [[0, 99], [1, 10], [2, 7]]) {
      await field('shoot', kit, number);
      await page.locator('#field-pause').click(); await page.locator('#field-player').click(); await page.clock.runFor(50);
      if (kit === 0) await page.screenshot({ path: join(screenshots, '10-shirt-front.png') });
      await page.locator('#player-turn').click(); await page.clock.runFor(50);
      await page.screenshot({ path: join(screenshots, `11-shirt-back-${kit + 1}.png`) }); console.log('Captured kit', kit + 1);
      assert.equal(await page.locator('#player-turn').innerText(), 'Ver frente');
    }
    // Exercise every preview action without altering the career or drill clock.
    const frozen = await page.locator('#field-clock').innerText();
    for (const action of ['header', 'bicycle', 'volley', 'celebrate', 'yellow-card', 'red-card', 'injury']) {
      await page.locator('#player-animation').selectOption(action); await page.clock.runFor(170);
      assert.match(await page.locator('#stadium-mode-note').innerText(), /Demonstração/);
      assert.equal(await page.locator('#field-clock').innerText(), frozen);
    }
    }
    await field('shoot');
    const canvas = page.locator('#football-field'), r = await canvas.boundingBox(), x = r.x + r.width * .5, y = r.y + r.height * .5;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 8, y + 60); await page.clock.runFor(50);
    const target = await page.locator('#aim-reticle').getAttribute('style'), power = await page.locator('#shot-power-value').innerText();
    await page.mouse.move(x + 16, y + 120); await page.clock.runFor(50);
    assert.equal(await page.locator('#aim-reticle').getAttribute('style'), target); assert.notEqual(await page.locator('#shot-power-value').innerText(), power);
    await page.mouse.up(); await page.clock.runFor(50); assert.equal(await page.locator('#contact-dock').isVisible(), true);
    await page.screenshot({ path: join(screenshots, '12-refined-aim.png') });
    const ball = await page.locator('#contact-ball').boundingBox(); await page.mouse.click(ball.x + ball.width / 2, ball.y + ball.height / 2);
    assert.equal(await page.locator('.field-stage').getAttribute('data-phase'), 'flight');
    await page.clock.runFor(1200);
    assert.equal(await page.locator('#referee-decision').innerText(), 'Árbitro: gol confirmado');
    await page.locator('#field-pause').click(); await page.locator('#field-goal-review').click(); await page.clock.runFor(50);
    assert.match(await page.locator('#stadium-mode-note').innerText(), /bola inteira/);
    await page.screenshot({ path: join(screenshots, '15-goal-line-review.png') });
    await page.locator('#field-return').click();
    if (process.env.GOAL_REVIEW_ONLY) { assert.deepEqual(errors, []); console.log('Goal review passed: actual goal, frozen scene, unobstructed ball and line.'); return; }
    await field('technique');
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 70); await page.clock.runFor(600);
    assert.equal(await page.locator('#pull-origin').isVisible(), true); assert.equal(await page.locator('#pull-origin').getAttribute('class'), 'dribble-stick');
    assert.notEqual(await page.locator('#field-clock').innerText(), 'PREPARE SUA JOGADA');
    await page.screenshot({ path: join(screenshots, '13-dribble-control.png') });
    await page.mouse.up(); await page.clock.runFor(50); assert.equal(await page.locator('#pull-origin').isVisible(), false);
    await canvas.press('Escape'); const stopped = await page.locator('#field-clock').innerText(); await page.clock.runFor(500);
    assert.equal(await page.locator('#field-clock').innerText(), stopped); await page.locator('#field-resume').click();
    await page.keyboard.down('w'); await page.clock.runFor(300); await page.keyboard.up('w');
    // A separate touch context exercises pointer capture, cancellation and the same stick.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 40, y: y - 50 }] }); await page.clock.runFor(200);
    assert.equal(await page.locator('#pull-origin').isVisible(), true);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await page.clock.runFor(50);
    assert.equal(await page.locator('#pull-origin').isVisible(), false);
    // Contact sheet uses the exact in-game atlas, not a generated concept image.
    await page.evaluate(async () => {
      const url = document.querySelector('script[type=module]').src;
      const { paintPixelPlayers, PLAYER_ANIMATIONS, SPRITE_SIZE } = await import(url.replace('ui/browser.js', 'ui/pixel-player.js'));
      const { clubKits } = await import(url.replace('ui/browser.js', 'data/kits.js'));
      const canvas = document.createElement('canvas'); canvas.id = 'animation-sheet'; canvas.width = 1000; canvas.height = 1650;
      canvas.style.cssText = 'position:absolute;left:0;top:0;z-index:10000;width:1000px;height:1650px'; document.body.append(canvas);
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#101e2b'; ctx.fillRect(0, 0, 1000, 1650); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#eef7ed'; ctx.font = 'bold 25px sans-serif'; ctx.fillText('FOOTBALL RISE · SPRITES E ANIMAÇÕES', 30, 42);
      ctx.font = '15px sans-serif'; ctx.fillText('Prévia de poses · lances especiais, cartões e lesão são demonstrações', 30, 70);
      let row = 0;
      for (const [action, config] of Object.entries(PLAYER_ANIMATIONS)) {
        const official = action.endsWith('-card') || action === 'offside' || action === 'goal-check' || action === 'assistant-flag';
        const atlas = document.createElement('canvas'), kit = official ? { ...clubKits.kitsFor('vale')[0], shirt: '#202d3c', shorts: '#202d3c', socks: '#202d3c', pattern: 'plain' } : clubKits.kitsFor('vale')[0];
        paintPixelPlayers(atlas, kit, 10, false, 0, official ? 'official' : 'player');
        const y = 90 + row * 150; ctx.fillStyle = row % 2 ? '#182b39' : '#132431'; ctx.fillRect(20, y, 960, 145);
        ctx.fillStyle = '#cee7dd'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(config.label, 35, y + 28);
        for (let i = 0; i < 4; i++) {
          const frame = config.start + Math.round(i / 3 * (config.count - 1));
          ctx.drawImage(atlas, frame * SPRITE_SIZE.width, (action === 'celebrate' ? 1 : 0) * SPRITE_SIZE.height, SPRITE_SIZE.width, SPRITE_SIZE.height, 270 + i * 170, y + 5, 112, 140);
        }
        row++;
      }
    });
    await page.locator('#animation-sheet').screenshot({ path: join(screenshots, '14-pixel-animations.png') });
    assert.deepEqual(errors, []);
    console.log('Controls passed: pixel players and kit atlas (99/10/7), seven animation previews, front/back inspection, angle-independent charge, single aim/curve shot, mouse/touch dribbling, keyboard, pause and pointer cancellation.');
  } finally { await browser?.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
