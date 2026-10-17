import { cp, mkdir, readdir, rm, writeFile, readFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url)); const target = join(root, 'dist-web');
await rm(target, { recursive: true, force: true }); await mkdir(target, { recursive: true }); await cp(join(root, 'web'), target, { recursive: true });
async function copy(directory) {
  for (const e of await readdir(join(root, 'dist', directory), { withFileTypes: true })) {
    const path = join(directory, e.name); if (e.isDirectory()) await copy(path);
    else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) { const dest = join(target, 'modules', path); await mkdir(dirname(dest), { recursive: true }); await cp(join(root, 'dist', path), dest); }
  }
}
for (const d of ['application', 'core', 'data', 'domain']) await copy(d);
for (const path of ['ui/bench-layout.js', 'ui/benches3d.js', 'ui/club-catalog.js', 'ui/patch-markup.js', 'ui/main-menu.js', 'persistence/save-library.js', 'ui/browser.js', 'ui/competitions.js', 'ui/field.js', 'ui/field3d.js', 'ui/pixel-player.js', 'ui/var-room.js', 'ui/var3d.js', 'ui/stadium3d.js', 'ui/stadium-surroundings.js', 'ui/aim-state.js', 'persistence/save.js', 'persistence/world.js', 'persistence/browser-storage.js']) { const dest = join(target, 'modules', path); await mkdir(dirname(dest), { recursive: true }); await cp(join(root, 'dist', path), dest); }
// A new module directory invalidates the entire import graph on mobile browsers.
const hash = createHash('sha256');
async function fingerprint(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    hash.update(entry.name);
    if (entry.isDirectory()) await fingerprint(path); else hash.update(await readFile(path));
  }
}
await fingerprint(join(target, 'modules'));
hash.update(await readFile(join(target, 'style.css')));
const version = hash.digest('hex').slice(0, 12);
await rename(join(target, 'modules'), join(target, `modules-${version}`));
const html = await readFile(join(target, 'index.html'), 'utf8');
await writeFile(join(target, 'index.html'), html.replace('./modules/', `./modules-${version}/`).replace('./style.css', `./style.css?v=${version}`).replace('./vendor/three.min.js', `./vendor/three.min.js?v=${version}`));
await writeFile(join(target, '.nojekyll'), ''); console.log('Site gerado em dist-web/.');
