// Review captures from the actual built app, never publish or change a user's save.
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { existsSync, mkdirSync } = require('node:fs');
const { resolve, sep, join } = require('node:path');
const root = resolve(__dirname, '../dist-web');
const output = process.env.REVIEW_OUTPUT || '/tmp/football-rise-review'; mkdirSync(output, { recursive: true });
const server = createServer(async (req, res) => {
  try { const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); const file = resolve(root, '.' + (path === '/' ? '/index.html' : path)); if (!file.startsWith(root + sep)) throw Error('not found'); const body = await readFile(file); res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html' }).end(body); } catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000);
    const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.clock.install();
    const origin = `http://127.0.0.1:${server.address().port}`; await page.goto(origin);
    for (const item of [{ club: 'União do Vale', file: '01-small-rural' }, { club: 'Real Madrid', file: '02-large-city' }, { club: 'Flamengo', file: '03-mountains' }, { club: 'Barcelona', file: '04-coast' }]) {
      await page.evaluate(async ({ name }) => {
        const moduleURL = document.querySelector('script[type=module]').src;
        const career = await import(moduleURL.replace('ui/browser.js', 'application/career.js'));
        const codec = await import(moduleURL.replace('ui/browser.js', 'persistence/save.js'));
        const pack = name === 'União do Vale' ? null : await (await fetch('./data/community-2026-27.json')).json();
        let s = career.createCareer({ name: 'Alex', nationality: 'Brasil', preferredFoot: 'right', position: 'ST', seed: 42, shirtNumber: 99, ...(pack ? { dataPack: pack } : {}) });
        s = career.advanceCareer(s, { type: 'assess', performances: Object.fromEntries(Object.keys(s.player.attributes).map(k => [k, 80])) });
        s = career.advanceCareer(s, { type: 'train', focus: 'finishing' }); s = career.advanceCareer(s, { type: 'scout' });
        const club = s.clubs.find(c => c.name === name); const offer = s.offers.find(o => o.clubId === club.id && o.team === 'youth'); if (!offer) throw Error('Review fixture has no eligible offer: ' + name);
        s = career.advanceCareer(s, { type: 'accept', offerId: offer.id }); s = career.advanceCareer(s, { type: 'prepare' });
        await (await import(moduleURL.replace('ui/browser.js', 'persistence/browser-storage.js'))).writeCareerText(codec.serializeSave(s)); localStorage.setItem('football-rise.sound-muted', 'true');
      }, { name: item.club });
      await page.reload();
      if (item.club === 'Real Madrid' && !process.env.STADIUMS_ONLY) {
        const option = await page.locator('#competition-select option').evaluateAll(items => items.find(o => o.textContent.includes('Champions League'))?.value);
        await page.locator('#competition-select').selectOption(option); await page.locator('#world-panel').evaluate(el => el.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: join(output, '08-competitions.png'), fullPage: false });
      }
      await page.getByRole('button', { name: 'Entrar em campo' }).click(); await page.clock.runFor(50);
      await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.getByRole('button', { name: 'Conhecer o estádio' }).click(); await page.clock.runFor(50);
      await page.screenshot({ path: join(output, item.file + '.png'), fullPage: true });
      console.log('Captured ' + item.file);
      await page.getByRole('button', { name: 'Voltar ao exercício' }).click();
      if (item.club === 'Real Madrid' && !process.env.STADIUMS_ONLY) {
        const r = await page.locator('#football-field').boundingBox(); const x = r.x + r.width * .5, y = r.y + r.height * .5;
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 15, y + 95, { steps: 5 }); await page.mouse.up(); await page.clock.runFor(50);
        await page.screenshot({ path: join(output, '05-gameplay-aim.png'), fullPage: true });
        await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.getByRole('button', { name: 'Ver jogador', exact: true }).click(); await page.clock.runFor(40);
        await page.screenshot({ path: join(output, '07-player-detail.png'), fullPage: true });
        await page.getByRole('button', { name: 'Voltar ao exercício' }).click();
      }
    }
    if (process.env.STADIUMS_ONLY) { console.log('Stadium review ready in ' + output); return; }
    // Training appearance: real UI and orange bib, on a midfield technical course.
    await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.getByRole('button', { name: 'Salvar e voltar' }).click();
    await page.evaluate(async () => { const url = document.querySelector('script[type=module]').src; const codec = await import(url.replace('ui/browser.js', 'persistence/save.js')); const moduleURL = url; const s = codec.deserializeSave(await (await import(url.replace('ui/browser.js', 'persistence/browser-storage.js'))).loadCareerText()); s.stage = 'contracted'; s.preparation = null; await (await import(moduleURL.replace('ui/browser.js', 'persistence/browser-storage.js'))).writeCareerText(codec.serializeSave(s)); });
    await page.reload(); await page.locator('#train select').selectOption('technique'); await page.getByRole('button', { name: 'Praticar no campo' }).click(); await page.clock.runFor(50);
    await page.screenshot({ path: join(output, '06-training-midfield.png'), fullPage: true });
    // A separate demonstration career earns prizes through application commands, with no forged trophy records.
    await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.getByRole('button', { name: 'Salvar e voltar' }).click();
    await page.evaluate(async () => {
      const moduleURL = document.querySelector('script[type=module]').src;
      const career = await import(moduleURL.replace('ui/browser.js', 'application/career.js'));
      const codec = await import(moduleURL.replace('ui/browser.js', 'persistence/save.js'));
      const storage = await import(moduleURL.replace('ui/browser.js', 'persistence/browser-storage.js'));
      let s = career.createCareer({ name: 'Alex · demonstração', nationality: 'Brasil', position: 'ST', preferredFoot: 'right', startingAge: 16, seed: 42 });
      s = career.advanceCareer(s, { type: 'assess', performances: Object.fromEntries(Object.keys(s.player.attributes).map(k => [k, 80])) });
      s = career.advanceCareer(s, { type: 'train', focus: 'finishing' }); s = career.advanceCareer(s, { type: 'scout' }); s = career.advanceCareer(s, { type: 'accept', offerId: s.offers[0].id });
      for (let i = 0; i < 40; i++) {
        if (s.player.energy < 50) s = career.advanceCareer(s, { type: 'recover' });
        s = career.advanceCareer(s, { type: 'prepare' }); s = career.advanceCareer(s, { type: 'performance', performance: { rating: 8.8, minutes: 30, goals: 2, assists: 0 } });
        if (i === 5) s = career.advanceCareer(s, { type: 'promote' });
      }
      if (!s.world.awards.some(a => a.playerId === s.player.id)) throw Error('Demonstration earned no awards');
      await storage.writeCareerText(codec.serializeSave(s));
    });
    await page.reload(); await page.getByRole('heading', { name: 'Sala de troféus', exact: true }).evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: join(output, '09-awards.png'), fullPage: false });
    if (errors.length) throw Error(errors.join('\n'));
    console.log('Review ready in ' + output);
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
