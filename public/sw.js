// HitBoy Web-OS service worker (scope: the site root).
// 1. HitBoy Proxy (public/hitboy/engine.js, this site's own rewriter)
// 2. Scramjet (separate page engine)
// 3. Ultraviolet still answers old /uv/ links; it is not the HitBoy engine
// 4. Offline cache for the OS itself.
importScripts('scram/scramjet.all.js');
importScripts('uv/uv.bundle.js', 'uv/uv.config.js', 'uv/uv.sw.js');
importScripts('baremux/index.js');
importScripts('hitboy/engine.js');

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const uv = new UVServiceWorker();

const CACHE = 'novaos-v22';
const BASE = new URL('./', self.location).pathname;
// Small core needed to boot offline; everything else is cached the first time it's used.
const SHELL = ['', 'index.html', 'css/os.css', 'css/shells.css', 'manifest.webmanifest',
  ...['icons', 'fs', 'wm', 'games', 'dos', 'browser', 'apps', 'vmbox', 'fatimg', 'runners', 'catalog', 'catalog-data', 'chat', 'ai', 'generate', 'code', 'friendslop', 'live', 'doodle', 'games2', 'games3d', 'linux', 'users', 'setup', 'shells', 'os', 'arrange'].map(f => `js/${f}.js`),
  'scram/scramjet.all.js', 'uv/uv.bundle.js', 'uv/uv.config.js', 'baremux/index.js', 'hitboy/engine.js'].map(p => BASE + p);

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
    const type = res.headers.get('content-type') || '';
    const heavy = +(res.headers.get('content-length') || 0) > 2 * 1024 * 1024 || /^(video|audio)\//.test(type);
    if (res.ok && res.status === 200 && !req.headers.has('range') && !heavy) {
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
// The real address behind a proxied request.
// HitBoy: /hb/<absolute URL>. Scramjet: /scramjet/<encoded URL>. Ultraviolet: /uv/service/<xor codec>.
function proxiedTarget(url) {
  try {
    const hit = self.HitBoyProxy && HitBoyProxy.targetOf(url.href, BASE);
    if (hit) return hit;
    if (url.pathname.startsWith(BASE + 'scramjet/')) return new URL(decodeURIComponent(url.pathname.slice(BASE.length + 9)));
    if (url.pathname.startsWith(__uv$config.prefix)) return new URL(__uv$config.decodeUrl(url.pathname.slice(__uv$config.prefix.length)));
  } catch (e) {}
  return null;
}

const PROXY_PREFIXES = [BASE + 'hb/', BASE + 'scramjet/', BASE + 'uv/'];
const proxyPath = path => PROXY_PREFIXES.some(p => path.startsWith(p));
// Proxied pages are same-origin with the desktop, so a framed site can reach the real top window.
// Hide that window: top stays inside the proxy, and parent does too when the parent is the desktop.
const FRAME_GUARD = `<script>(function(){try{var w=window,marks=${JSON.stringify([BASE + 'hb/', BASE + 'scramjet/', BASE + 'uv/'])};function proxied(win){try{var p=String(win.location.pathname);for(var i=0;i<marks.length;i++)if(p.indexOf(marks[i])===0)return true;}catch(e){}return false;}if(!proxied(w))return;var topProxy=w;try{var p=w;while(p.parent&&p.parent!==p&&proxied(p.parent))p=p.parent;topProxy=p;}catch(e){}try{Object.defineProperty(w,"top",{configurable:true,get:function(){return topProxy;}});}catch(e){}try{if(w.parent&&!proxied(w.parent))Object.defineProperty(w,"parent",{configurable:true,get:function(){return w;}});}catch(e){}}catch(e){}})();</script>`;

const HB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
let hbClient = null;
function hitboyClient() { return hbClient || (hbClient = new BareMux.BareClient()); }
async function hitboyFetch(event) {
  const target = HitBoyProxy.targetOf(event.request.url, BASE);
  if (!target) return new Response('There was an error loading this page.', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  const req = event.request;
  const headers = { 'user-agent': HB_UA, accept: req.headers.get('accept') || '*/*', 'accept-language': req.headers.get('accept-language') || 'en-US,en;q=0.9' };
  const range = req.headers.get('range'); if (range) headers.range = range;
  const ctype = req.headers.get('content-type'); if (ctype) headers['content-type'] = ctype;
  try { headers.referer = target.origin + '/'; } catch (e) {}
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') body = await req.arrayBuffer();
  const res = await hitboyClient().fetch(target.href, { method: req.method, headers, body, redirect: 'follow' });
  const finalURL = res.finalURL || target.href;
  return HitBoyProxy.rewriteResponse(res, finalURL, self.location.origin + BASE, req.destination);
}

async function shield(event, res) {
  const dest = event.request.destination;
  const type = res.headers.get('content-type') || '';
  if ((dest !== 'document' && dest !== 'iframe') || !type.includes('text/html') || !res.body) return res;
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('x-frame-options');
  if (+(res.headers.get('content-length') || 0) > 8 * 1024 * 1024) return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  let html; try { html = await res.text(); } catch (e) { return new Response('There was an error loading this page.', { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' } }); }
  const out = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + FRAME_GUARD) : FRAME_GUARD + html;
  return new Response(out, { status: res.status, statusText: res.statusText, headers });
}

self.addEventListener('fetch', event => {
  // Requests to other sites (APIs, CDNs) go straight to the network; proxy routes are always on this origin.
  let url; try { url = new URL(event.request.url); } catch (e) { return; }
  if (url.origin !== location.origin) return;
  event.respondWith((async () => {
    try {
      await settingsReady;
      if (adblock && event.request.destination !== 'document') {
        const target = proxiedTarget(url);
        let referrer = null; try { referrer = proxiedTarget(new URL(event.request.referrer)); } catch (e) {}
        const videoSite = referrer && /(^|\.)(youtube\.com|youtu\.be|googlevideo\.com|ytimg\.com|twitch\.tv|spotify\.com)$/.test(referrer.hostname);
        if (target && blockedHost(target.hostname) && !videoSite) return new Response(null, { status: 204 });
      }
      if (url.pathname.startsWith(BASE + 'hb/')) {
        try { return shield(event, await hitboyFetch(event)); }
        catch (err) { return new Response('There was an error loading this page.', { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' } }); }
      }
      await scramjet.loadConfig();
      if (scramjet.route(event)) return shield(event, await scramjet.fetch(event));
      if (uv.route(event)) return shield(event, await uv.fetch(event));
      if (url.pathname.startsWith(BASE + 'api/')) return fetch(event.request);
      if (url.pathname.startsWith(ISOLATED) && url.pathname.includes('/image/')) return isolate(event.request, await fetch(event.request));
      if (proxyPath(url.pathname)) return new Response('There was an error loading this page.', { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      if (event.request.method === 'GET' && !url.pathname.endsWith('/wisp/')) return isolate(event.request, await shell(event.request));
      return fetch(event.request);
    } catch (e) {
      if (proxyPath(url.pathname)) return new Response('There was an error loading this page.', { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      try { return await fetch(event.request); } catch (err) { return new Response('Offline', { status: 503 }); }
    }
  })());
});
