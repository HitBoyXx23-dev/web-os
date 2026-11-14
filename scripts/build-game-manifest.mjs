// Builds public/games/manifest-index.json + games-*.json chunks from curated sources only:
// WEB_CATALOG in catalog.js + catalog-data.js, App Store "Games" URLs, and data/game-url-lists/*.json.
// Optional: pass --feed after `npm run games:feed` to merge GameMonetize entries from public/games/catalog-gamemonetize.json
// (official publisher feed only — never invent titles). Run: npm run games
import { mkdir, readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = root + '/public/games';
const listsDir = root + '/data/game-url-lists';
const CHUNK = 500;
const withFeed = process.argv.includes('--feed');

const norm = url => {
  try {
    const u = new URL(String(url).trim());
    if (!/^https?:$/.test(u.protocol)) return '';
    u.hash = '';
    let href = u.href;
    if (href.endsWith('/') && u.pathname !== '/') href = href.slice(0, -1);
    return href;
  } catch (e) {
    return '';
  }
};

const hashId = (url, name) => {
  let h = 0;
  const s = url + '\0' + name;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return 'g' + (h >>> 0).toString(36);
};

const seen = new Map();
const add = (cat, name, url, source, icon) => {
  name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  cat = String(cat || 'Other').replace(/\s+/g, ' ').trim().slice(0, 32);
  const u = norm(url);
  if (!name || !u) return;
  if (seen.has(u)) return;
  const row = { id: hashId(u, name), cat, name, url: u, source };
  if (icon) row.icon = String(icon).slice(0, 48);
  seen.set(u, row);
};

const catalogJs = await readFile(root + '/public/js/catalog.js', 'utf8');
const m = catalogJs.match(/const WEB_CATALOG = \[([\s\S]*?)\];/);
if (!m) throw new Error('WEB_CATALOG not found in catalog.js');
for (const [cat, name, url, icon] of eval(`[${m[1]}]`)) add(cat, name, url, 'catalog.js', icon);

const STORE = [], WEB_CATALOG = [];
new Function('STORE', 'WEB_CATALOG', await readFile(root + '/public/js/catalog-data.js', 'utf8'))(STORE, WEB_CATALOG);
for (const [cat, name, url, icon] of WEB_CATALOG) add(cat, name, url, 'catalog-data.js', icon);
for (const s of STORE) {
  if (s.cat !== 'Games' || !s.url) continue;
  add(s.cat, s.name, s.url, 'catalog-data-store', null);
}

try {
  for (const f of await readdir(listsDir)) {
    if (!f.endsWith('.json')) continue;
    const list = JSON.parse(await readFile(`${listsDir}/${f}`, 'utf8'));
    if (!Array.isArray(list)) continue;
    for (const e of list) add(e.cat, e.name, e.url, `list:${f}`, e.icon);
  }
} catch (e) {
  if (e.code !== 'ENOENT') console.warn(e.message);
}

if (withFeed) {
  try {
    const raw = JSON.parse(await readFile(`${outDir}/catalog-gamemonetize.json`, 'utf8'));
    const games = raw.games || raw;
    for (const g of games) {
      if (Array.isArray(g)) {
        const [h, name, cat] = g;
        if (h && name) add(cat, name, `https://html5.gamemonetize.co/${h}/`, 'gamemonetize-feed');
      } else if (g?.url && g?.name) {
        add(g.cat, g.name, g.url, 'gamemonetize-feed');
      }
    }
    console.log(`merged GameMonetize feed (${games.length} rows scanned)`);
  } catch (e) {
    console.warn('No catalog-gamemonetize.json — run npm run games:feed first, or omit --feed');
  }
}

const entries = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.url.localeCompare(b.url));
await mkdir(outDir, { recursive: true });

const chunks = [];
for (let i = 0; i < entries.length; i += CHUNK) {
  const file = `games-${String(chunks.length).padStart(3, '0')}.json`;
  await writeFile(`${outDir}/${file}`, JSON.stringify(entries.slice(i, i + CHUNK)));
  chunks.push(file);
}
await writeFile(`${outDir}/manifest-index.json`, JSON.stringify({
  built: new Date().toISOString().slice(0, 10),
  total: entries.length,
  policy: 'official and curated URLs only',
  chunkSize: CHUNK,
  chunks,
}));

try {
  await unlink(`${outDir}/catalog.json`);
  console.log('removed legacy public/games/catalog.json');
} catch (e) {}

console.log(`wrote ${entries.length} real games in ${chunks.length} chunk(s) under public/games/`);