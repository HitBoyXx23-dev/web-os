// Builds public/catalog/apps-*.json: curated STORE + HTML5 games (chunked lazy load). Run: npm run apps
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = root + '/public/catalog';
const CHUNK = 500;

const STORE = [], WEB_CATALOG = [];
new Function('STORE', 'WEB_CATALOG', await readFile(root + '/public/js/catalog-data.js', 'utf8'))(STORE, WEB_CATALOG);

const seen = new Set();
const entries = [];
const push = e => {
  const id = String(e.id || '').slice(0, 48);
  const url = String(e.url || '');
  if (!id || !e.name || !url || seen.has(id)) return;
  seen.add(id);
  entries.push({ id, name: String(e.name).slice(0, 80), desc: String(e.desc || '').slice(0, 120), url, cat: String(e.cat || 'Other').slice(0, 32), ...(e.fav ? { fav: 1 } : {}) });
};

for (const s of STORE) push(s);

let games = [];
try { games = JSON.parse(await readFile(root + '/public/games/catalog.json', 'utf8')).games || []; } catch (e) {}
for (const g of games) {
  const [h, name, cat] = g;
  push({ id: `gm-${h}`, name, desc: `HTML5 · ${cat || 'game'}`, url: `https://html5.gamemonetize.co/${h}/`, cat: 'Games' });
}

await mkdir(outDir, { recursive: true });
const chunks = [];
for (let i = 0; i < entries.length; i += CHUNK) {
  const file = `apps-${String(chunks.length).padStart(3, '0')}.json`;
  await writeFile(`${outDir}/${file}`, JSON.stringify(entries.slice(i, i + CHUNK)));
  chunks.push(file);
}
await writeFile(`${outDir}/apps-index.json`, JSON.stringify({ built: new Date().toISOString().slice(0, 10), total: entries.length, chunkSize: CHUNK, chunks }));
console.log(`wrote ${entries.length} apps in ${chunks.length} chunk(s)`);