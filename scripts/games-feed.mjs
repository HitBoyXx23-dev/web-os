// Builds public/games/catalog.json: a compact catalog of HTML5 games from GameMonetize's public publisher feed
// (https://gamemonetize.com/feed.php — meant for embedding games on other sites). Run: npm run games
// Each entry is [hash, title, category, width, height, tags]; the thumbnail and play URLs are derived from the hash.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../public/games/', import.meta.url));
const PER_PAGE = 500, MAX_PAGES = 80;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hashOf = url => (String(url).match(/gamemonetize\.co\/([0-9a-z]{32})\//) || [])[1];
const tidy = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

async function page(n) {
  for (let tries = 0; tries < 8; tries++) {
    try {
      const r = await fetch(`https://gamemonetize.com/feed.php?format=0&num=${PER_PAGE}&page=${n}`, { headers: { 'user-agent': 'Mozilla/5.0 HitBoyWebOS catalog builder' } });
      const text = await r.text();
      if (r.ok && text.trim().startsWith('[')) return JSON.parse(text);
      console.log(`page ${n}: ${r.status} ${text.slice(0, 40)} — waiting`);
    } catch (e) { console.log(`page ${n}: ${e.message}`); }
    await sleep(20000 * (tries + 1));
  }
  throw new Error('feed kept refusing page ' + n);
}

let seen = new Map();
try { for (const g of JSON.parse(await readFile(out + 'catalog.json', 'utf8')).games) seen.set(g[0], g); } catch (e) {}
const start = seen.size;
for (let n = 1; n <= MAX_PAGES; n++) {
  let list; try { list = await page(n); } catch (e) { console.log(e.message + ' — saving what we have'); break; }
  if (!list.length) break;
  for (const g of list) {
    const h = hashOf(g.url); if (!h || !g.title) continue;
    seen.set(h, [h, tidy(g.title, 60), tidy(g.category, 24) || 'Other', +g.width || 800, +g.height || 600, tidy(g.tags, 80).toLowerCase()]);
  }
  console.log(`page ${n}: ${list.length} games, ${seen.size} total`);
  if (list.length < PER_PAGE) break;
  await sleep(4000);
}
await mkdir(out, { recursive: true });
const games = [...seen.values()];
await writeFile(out + 'catalog.json', JSON.stringify({ source: 'GameMonetize', built: new Date().toISOString().slice(0, 10), games }));
console.log(`wrote ${games.length} games (${games.length - start} new)`);
