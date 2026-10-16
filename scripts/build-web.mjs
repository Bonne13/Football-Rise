import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
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
for (const path of ['ui/browser.js', 'persistence/save.js']) { const dest = join(target, 'modules', path); await mkdir(dirname(dest), { recursive: true }); await cp(join(root, 'dist', path), dest); }
await writeFile(join(target, '.nojekyll'), ''); console.log('Site gerado em dist-web/.');
