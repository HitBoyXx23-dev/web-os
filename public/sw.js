// NovaOS service worker (scope: the site root).
// 1. Scramjet proxy  2. Ultraviolet proxy (fallback engine)  3. Offline cache for the OS itself.
importScripts('scram/scramjet.all.js');
importScripts('uv/uv.bundle.js', 'uv/uv.config.js', 'uv/uv.sw.js');

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const uv = new UVServiceWorker();

const CACHE = 'novaos-v2';
const BASE = new URL('./', self.location).pathname;
// Small core needed to boot offline; everything else is cached the first time it's used.
const SHELL = ['', 'index.html', 'css/os.css', 'manifest.webmanifest',
  ...['icons', 'fs', 'wm', 'games', 'dos', 'browser', 'apps', 'linux', 'users', 'os'].map(f => `js/${f}.js`),
  'scram/scramjet.all.js', 'uv/uv.bundle.js', 'uv/uv.config.js', 'baremux/index.js'].map(p => BASE + p);

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

// Network first so updates show up immediately; fall back to the cache when offline.
async function shell(req) {
  try {
    const res = await fetch(req);
    if (res.ok && res.status === 200 && !req.headers.has('range')) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
    }
    return res;
  } catch (err) {
    const hit = await caches.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await caches.match(BASE + 'index.html'));
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    await scramjet.loadConfig();
    if (scramjet.route(event)) return scramjet.fetch(event);
    if (uv.route(event)) return uv.fetch(event);
    const url = new URL(event.request.url);
    if (event.request.method === 'GET' && url.origin === location.origin && !url.pathname.endsWith('/wisp/')) return shell(event.request);
    return fetch(event.request);
  })());
});
