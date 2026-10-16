const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { existsSync, mkdirSync } = require('node:fs');
const { resolve, sep, join } = require('node:path');
const { tmpdir } = require('node:os');
const root = resolve(__dirname, '../dist-web');
const screenshots = join(tmpdir(), 'football-rise-browser'); mkdirSync(screenshots, { recursive: true });
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
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.clock.install();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);
    await page.getByRole('button', { name: 'Usar base comunitária' }).click();
    await page.waitForFunction(() => localStorage.getItem('football-rise.data-pack.v1'));
    await page.getByText('Consultar clubes e jogadores', { exact: true }).click();
    await page.getByLabel('Clube do catálogo').selectOption({ label: 'Real Madrid · Espanha' });
    assert.match(await page.locator('#pack-roster').innerText(), /Mbapp/);
    // Build a legitimate contracted fixture through the public application API.
    await page.evaluate(async () => {
      const moduleURL = document.querySelector('script[type=module]').src;
      const career = await import(moduleURL.replace('ui/browser.js', 'application/career.js'));
      const codec = await import(moduleURL.replace('ui/browser.js', 'persistence/save.js'));
      let s = career.createCareer({ name: 'Alex Desktop', nationality: 'Brasil', preferredFoot: 'right', position: 'ST', seed: 42, shirtNumber: 9 });
      s = career.advanceCareer(s, { type: 'assess', performances: Object.fromEntries(Object.keys(s.player.attributes).map(k => [k, 80])) });
      s = career.advanceCareer(s, { type: 'train', focus: 'finishing' });
      s = career.advanceCareer(s, { type: 'scout' });
      s = career.advanceCareer(s, { type: 'accept', offerId: s.offers[0].id });
      await (await import(moduleURL.replace('ui/browser.js', 'persistence/browser-storage.js'))).writeCareerText(codec.serializeSave(s));
    });
    await page.reload();
    assert.equal(await page.locator('#world-panel').isVisible(), true);
    const champions = await page.locator('#competition-select option').evaluateAll(items => items.find(o => o.textContent.includes('Champions League'))?.value);
    await page.locator('#competition-select').selectOption(champions); assert.match(await page.locator('#competition-detail').innerText(), /Champions League/);
    await page.getByLabel('Número da camisa').selectOption('10'); await page.getByRole('button', { name: 'Escolher número' }).click();
    assert.match(await page.locator('#notice').innerText(), /Número ocupado/);
    await page.getByLabel('Número da camisa').selectOption('99'); await page.getByRole('button', { name: 'Escolher número' }).click();
    await page.waitForFunction(() => document.querySelector('.wardrobe h2')?.textContent === 'Sua camisa · 99');
    assert.equal(await page.locator('.wardrobe h2').innerText(), 'Sua camisa · 99');
    await page.getByLabel('Uniforme de jogo').selectOption('2'); await page.getByRole('button', { name: 'Usar uniforme' }).click(); await page.waitForFunction(() => !document.querySelector('#app')?.hasAttribute('aria-busy'));
    await page.reload(); assert.equal(await page.getByLabel('Uniforme de jogo').inputValue(), '2');
    await page.getByRole('button', { name: 'Preparar próxima partida' }).click();
    await page.getByRole('button', { name: 'Entrar em campo' }).click(); await page.clock.runFor(50);
    const clock = await page.locator('#field-clock').innerText();
    await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.getByRole('button', { name: 'Conhecer o estádio' }).click(); await page.clock.runFor(100);
    assert.equal(await page.locator('.field-stage').getAttribute('data-view'), 'stadium');
    assert.equal(await page.locator('#field-clock').innerText(), clock);
    await page.getByRole('button', { name: 'Voltar ao exercício' }).click();
    assert.equal(await page.locator('.field-stage').getAttribute('data-view'), 'player');
    const field = page.locator('#football-field'); const r = await field.boundingBox();
    assert.equal(await field.getAttribute('data-renderer'), 'webgl');
    const x = r.x + r.width * .48, y = r.y + r.height * .5;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 15, y + 95, { steps: 5 }); await page.clock.runFor(50);
    const before = await page.locator('#football-field').getAttribute('data-aim');
    assert.equal(await page.locator('#contact-dock').isVisible(), false);
    await page.mouse.up(); await page.clock.runFor(50);
    assert.equal(await page.locator('#football-field').getAttribute('data-aim'), before); // confirmation preserves the selected aim
    assert.equal(await page.locator('#contact-dock').isVisible(), true);
    const power = await page.locator('#shot-power-value').innerText();
    await page.screenshot({ path: join(screenshots, 'desktop-kit.png'), fullPage: true });
    const ball = await page.locator('#contact-ball').boundingBox();
    await page.mouse.click(ball.x + ball.width * .55, ball.y + ball.height / 2);
    assert.equal(await page.locator('.field-stage').getAttribute('data-phase'), 'flight');
    assert.equal(await page.locator('#shot-power-value').innerText(), power);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('Desktop passed: community catalog, number requirements, free selection, kit/save persistence, mouse aim, fixed camera and curve click using locked power.');
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
