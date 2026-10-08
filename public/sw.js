// HitBoy Web-OS service worker (scope: the site root).
// 1. Scramjet proxy  2. Ultraviolet proxy (fallback engine)  3. Offline cache for the OS itself.
importScripts('scram/scramjet.all.js');
importScripts('uv/uv.bundle.js', 'uv/uv.config.js', 'uv/uv.sw.js');

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const uv = new UVServiceWorker();

const CACHE = 'novaos-v11';
const BASE = new URL('./', self.location).pathname;
// Small core needed to boot offline; everything else is cached the first time it's used.
const SHELL = ['', 'index.html', 'css/os.css', 'css/shells.css', 'manifest.webmanifest',
  ...['icons', 'fs', 'wm', 'games', 'dos', 'browser', 'apps', 'vmbox', 'fatimg', 'runners', 'catalog', 'catalog-data', 'chat', 'ai', 'friendslop', 'linux', 'users', 'setup', 'shells', 'os', 'arrange'].map(f => `js/${f}.js`),
  'scram/scramjet.all.js', 'uv/uv.bundle.js', 'uv/uv.config.js', 'baremux/index.js'].map(p => BASE + p);

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

// Pages under vm/ubuntu24/ need cross-origin isolation (SharedArrayBuffer). Static hosts can't set
// headers, so add them here; it's a no-op where the server already sends them.
const ISOLATED = BASE + 'vm/ubuntu24/';
function isolate(req, res) {
  if (!new URL(req.url).pathname.startsWith(ISOLATED) || res.type === 'opaque') return res;
  const h = new Headers(res.headers);
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Cross-Origin-Embedder-Policy', 'require-corp');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

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

// Ad and tracker blocking for proxied pages (Settings → Proxy). Conservative list: ad networks and analytics only.
const AD_HOSTS = new Set(['doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'google-analytics.com', 'googletagservices.com', 'adservice.google.com',
  'adnxs.com', 'adsrvr.org', 'advertising.com', 'amazon-adsystem.com', 'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com', 'pubmatic.com',
  'rubiconproject.com', 'openx.net', 'casalemedia.com', 'scorecardresearch.com', 'quantserve.com', 'moatads.com', 'adsafeprotected.com', 'doubleverify.com',
  '2mdn.net', 'adform.net', 'smartadserver.com', 'yieldmo.com', 'sharethrough.com', 'teads.tv', 'media.net', 'bidswitch.net', '3lift.com', 'sovrn.com',
  'lijit.com', 'indexww.com', 'contextweb.com', 'gumgum.com', 'zedo.com', 'popads.net', 'popcash.net', 'propellerads.com', 'adsterra.com', 'exoclick.com',
  'juicyads.com', 'hotjar.com', 'clarity.ms', 'bat.bing.com', 'analytics.tiktok.com', 'ads-twitter.com', 'analytics.twitter.com', 'adroll.com', 'chartbeat.com',
  'ads.yahoo.com', 'adtechus.com', 'serving-sys.com', 'mathtag.com', 'adcolony.com', 'unityads.unity3d.com', 'onesignal.com', 'pushcrew.com']);
const blockedHost = h => { for (let d = h; d.includes('.'); d = d.slice(d.indexOf('.') + 1)) if (AD_HOSTS.has(d)) return true; return false; };
const SETTINGS = 'hitboy-settings';
let adblock = true;
const settingsReady = caches.open(SETTINGS).then(c => c.match('/__adblock')).then(r => r ? r.text() : '1').then(v => { adblock = v !== '0'; }).catch(() => {});
self.addEventListener('message', e => {
  if (e.data?.hitboy !== 'adblock') return;
  adblock = !!e.data.on; caches.open(SETTINGS).then(c => c.put('/__adblock', new Response(adblock ? '1' : '0'))).catch(() => {});
});
// The real address behind a proxied request (Scramjet: /scramjet/<encoded URL>; Ultraviolet: /uv/service/<xor codec>).
function proxiedTarget(url) {
  try {
    if (url.pathname.startsWith(BASE + 'scramjet/')) return new URL(decodeURIComponent(url.pathname.slice(BASE.length + 9)));
    if (url.pathname.startsWith(__uv$config.prefix)) return new URL(__uv$config.decodeUrl(url.pathname.slice(__uv$config.prefix.length)));
  } catch (e) {}
  return null;
}

self.addEventListener('fetch', event => {
  // Requests to other sites (APIs, CDNs) go straight to the network; proxy routes are always on this origin.
  if (new URL(event.request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    await settingsReady;
    if (adblock && event.request.destination !== 'document') {
      const target = proxiedTarget(new URL(event.request.url));
      if (target && blockedHost(target.hostname)) return new Response(null, { status: 204 });
    }
    await scramjet.loadConfig();
    if (scramjet.route(event)) return scramjet.fetch(event);
    if (uv.route(event)) return uv.fetch(event);
    const url = new URL(event.request.url);
    if (url.pathname.startsWith(ISOLATED) && url.pathname.includes('/image/')) return isolate(event.request, await fetch(event.request)); // big, don't cache twice
    if (event.request.method === 'GET' && url.origin === location.origin && !url.pathname.endsWith('/wisp/')) return isolate(event.request, await shell(event.request));
    return fetch(event.request);
  })());
});
