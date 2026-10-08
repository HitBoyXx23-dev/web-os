// Proxy browser — HitBoy Proxy: Scramjet or Ultraviolet rewrite pages; the HitBoy transport carries the
// traffic over Wisp (libcurl.js with an automatic Epoxy fallback, via bare-mux). Also the App Store catalog.
const BASE = location.pathname.replace(/[^/]*$/, '');

const WebProxy = {
  _ready: null, _sj: null,
  ENGINES: { hitboy: 'HitBoy Proxy', scramjet: 'Scramjet', uv: 'Ultraviolet' },
  TRANSPORTS: { hitboy: 'Automatic', libcurl: 'libcurl only', epoxy: 'Epoxy only' },
  engine() { return this.ENGINES[OS.cfg.engine] ? OS.cfg.engine : 'hitboy'; },
  // HitBoy Proxy picks the page engine per site: Scramjet, or Ultraviolet for sites that failed in Scramjet.
  siteEngines() { try { return JSON.parse(localStorage.getItem('novaos.pxSites')) || {}; } catch (e) { return {}; } },
  setSiteEngine(url, eng) { const m = this.siteEngines(), h = hostOf(url); if (eng) m[h] = eng; else delete m[h]; try { localStorage.setItem('novaos.pxSites', JSON.stringify(m)); } catch (e) {} },
  engineFor(url) { const e = this.engine(); return e !== 'hitboy' ? e : this.siteEngines()[hostOf(url)] || 'scramjet'; },
  transport() { return this.TRANSPORTS[OS.cfg.transport] ? OS.cfg.transport : 'hitboy'; },
  supported() { return location.protocol !== 'file:' && 'serviceWorker' in navigator && self.BareMux && self.$scramjetLoadController && self.__uv$config; },
  // Public Wisp server used when this site has no Wisp endpoint of its own (static hosts like Vercel or GitHub Pages).
  PUBLIC_WISP: 'wss://wisp.mercurywork.shop/',
  _auto: null,
  ownWisp() { return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + BASE + 'wisp/'; },
  wispUrl() { return (OS.cfg.wisp || '').trim() || this._auto || this.ownWisp(); },
  // Resolves true if a WebSocket to url opens within ms.
  probe(url, ms = 3000) {
    return new Promise(res => {
      let ws; const done = ok => { clearTimeout(t); try { ws.close(); } catch (e) {} res(ok); };
      const t = setTimeout(() => done(false), ms);
      try { ws = new WebSocket(url); ws.onopen = () => done(true); ws.onerror = () => done(false); } catch (e) { done(false); }
    });
  },
  ready() {
    if (!this.supported()) return Promise.reject(new Error(location.protocol === 'file:'
      ? 'The proxy needs HitBoy Web-OS to be served over http(s), not opened as a file.'
      : 'This browser does not support service workers.'));
    return this._ready ||= (async () => {
      const { ScramjetController } = $scramjetLoadController();
      this._sj = new ScramjetController({
        prefix: BASE + 'scramjet/',
        files: { wasm: BASE + 'scram/scramjet.wasm.wasm', all: BASE + 'scram/scramjet.all.js', sync: BASE + 'scram/scramjet.sync.js' },
      });
      await this._sj.init();
      // Older versions registered a worker under /uv/; the root worker now handles both engines.
      for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope !== new URL(BASE, location).href) await r.unregister();
      await navigator.serviceWorker.register(BASE + 'sw.js', { scope: BASE });
      await navigator.serviceWorker.ready;
      await this.setTransport();
    })().catch(e => { this._ready = null; throw e; });
  },
  async setTransport() {
    if (!(OS.cfg.wisp || '').trim()) this._auto = await this.probe(this.ownWisp()) ? this.ownWisp() : this.PUBLIC_WISP;
    const conn = new BareMux.BareMuxConnection(BASE + 'baremux/worker.js');
    // HitBoy Proxy transport: libcurl.js first, Epoxy automatically for sites that fail there (hitboy/transport.mjs).
    if (this.transport() === 'hitboy') await conn.setTransport(BASE + 'hitboy/transport.mjs', [{ wisp: this.wispUrl() }]);
    else if (this.transport() === 'libcurl') await conn.setTransport(BASE + 'libcurl/index.mjs', [{ websocket: this.wispUrl() }]);
    else await conn.setTransport(BASE + 'epoxy/index.mjs', [{ wisp: this.wispUrl() }]);
  },
  encode(url, eng = this.engineFor(url)) { return eng === 'uv' ? __uv$config.prefix + __uv$config.encodeUrl(url) : this._sj.encodeUrl(url); },
  // Real URL behind a proxied path+query, from either engine.
  decode(path) {
    if (path.startsWith(__uv$config.prefix)) return __uv$config.decodeUrl(path.slice(__uv$config.prefix.length));
    if (this._sj && path.startsWith(BASE + 'scramjet/')) { try { return this._sj.decodeUrl(location.origin + path); } catch (e) {} }
    return null;
  },
};

// Turn whatever was typed into a URL (or a search).
function toUrl(v) {
  v = v.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(v)) return 'https://' + v;
  return 'https://duckduckgo.com/?q=' + encodeURIComponent(v);
}

const QUICK_LINKS = [
  { name: 'Google', mono: 'G', bg: '#4285f4', url: 'https://www.google.com' },
  { name: 'YouTube', img: 'youtube', mono: 'YT', bg: '#dc2626', url: 'https://www.youtube.com' },
  { name: 'Discord', img: 'discord', mono: 'Dc', bg: '#5865f2', url: 'https://discord.com/app' },
  { name: 'Reddit', img: 'reddit', mono: 'R', bg: '#ff4500', url: 'https://www.reddit.com' },
  { name: 'Poki', mono: 'Po', bg: '#0ea5e9', url: 'https://poki.com' },
  { name: 'Wikipedia', img: 'wikipedia', mono: 'W', bg: '#3f3f46', url: 'https://en.wikipedia.org' },
];
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
const monoOf = u => { const h = hostOf(u); return h.charAt(0).toUpperCase() + (h.charAt(1) || ''); };

// opts: { url, single, title } — single = app mode (no tab strip).
function BrowserApp(body, win, opts = {}) {
  body.innerHTML = `<div class="fill browser">
    <div class="tabs"><div class="tablist"></div><button class="icon-btn newtab" title="New tab">${glyph('plus')}</button></div>
    <div class="toolbar">
      <button class="icon-btn bk" title="Back">${glyph('back')}</button><button class="icon-btn fw" title="Forward">${glyph('forward')}</button>
      <button class="icon-btn rl" title="Reload">${glyph('reload')}</button><button class="icon-btn hm" title="Home">${glyph('home')}</button>
      <div class="omni"><input class="u" spellcheck="false" placeholder="Search or enter address"><button class="badge px" title="Toggle proxy"></button></div>
      <button class="icon-btn bm" title="Bookmark this page">${glyph('star')}</button><button class="icon-btn pop" title="Open in about:blank tab">${glyph('external')}</button>
    </div>
    <div class="loadbar"></div>
    <div class="bmbar"></div>
    <div class="grow pages"></div></div>`;
  if (opts.single) body.querySelector('.tabs').style.display = 'none';
  const $b = s => body.querySelector(s);
  const u = $b('.u'), pages = $b('.pages'), bar = $b('.loadbar');
  const tabs = []; let cur = null;
  const proxyOn = () => OS.cfg.proxy !== false;
  const loading = on => { bar.style.opacity = 1; bar.style.width = on ? '70%' : '100%'; if (!on) setTimeout(() => { bar.style.opacity = 0; bar.style.width = 0; }, 300); };

  const renderPx = () => { const b = $b('.px'); b.innerHTML = glyph('shield', 12) + (proxyOn() ? 'Proxy' : 'Direct'); b.classList.toggle('on', proxyOn()); };
  const renderBookmarks = () => {
    const bms = OS.cfg.bookmarks || [];
    $b('.bmbar').innerHTML = bms.map((b, i) => `<button data-i="${i}" title="${esc(b.url)}">${esc(b.title.slice(0, 28))}</button>`).join('');
    $b('.bmbar').style.display = bms.length ? '' : 'none';
    $b('.bm').classList.toggle('on', !!cur && bms.some(b => b.url === cur.url));
  };
  const renderTabs = () => {
    $b('.tablist').innerHTML = tabs.map((t, i) => `<div class="tab${t === cur ? ' on' : ''}" data-i="${i}" title="${esc(t.title || 'New Tab')}"><span>${esc(t.title || 'New Tab')}</span><button class="tx" data-x="${i}">${glyph('close', 12)}</button></div>`).join('');
    if (cur) WM.setTitle(win, opts.single ? (opts.title || 'Browser') : (cur.title || 'New Tab') + ' — Browser');
  };
  const homeHtml = () => `<div class="newtab-page"><div class="nt-brand"><span style="color:var(--accent)">${document.getElementById('mark-tpl').innerHTML.replace('class="mark"', 'class="mark" style="width:30px;height:30px"')}</span>Search</div>
    <div class="nt-q">${glyph('search', 18)}<input placeholder="Search the web or type an address" spellcheck="false"></div>
    <div class="shortcuts">${[...QUICK_LINKS, ...(OS.cfg.bookmarks || []).map(b => ({ name: b.title, url: b.url }))].slice(0, 16).map(l =>
      `<div class="app-cell" data-url="${esc(l.url)}" title="${esc(l.url)}">${tile(l.img ? realIcon(l.img) : { mono: l.mono || monoOf(l.url), bg: l.bg || '#52525b' }, 40)}<span style="max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.name)}</span></div>`).join('')}</div>
    <div class="status-line"><span class="dot"></span><span class="nt-status">${proxyOn() ? 'Connecting to proxy…' : 'Proxy is off. Sites load directly.'}</span></div></div>`;

  const select = t => {
    cur = t; tabs.forEach(x => x.el.style.display = x === t ? '' : 'none');
    u.value = t.url || ''; renderTabs(); renderBookmarks();
  };
  const newTab = url => {
    const el = document.createElement('div'); el.className = 'page'; pages.appendChild(el);
    const t = { el, url: '', title: 'New Tab', frame: null }; tabs.push(t); select(t);
    url ? navigate(t, url) : home(t);
    return t;
  };
  const closeTab = t => {
    const i = tabs.indexOf(t); t.el.remove(); tabs.splice(i, 1);
    if (!tabs.length) return opts.single ? WM.close(win.id) : newTab();
    if (cur === t) select(tabs[Math.max(0, i - 1)]); else renderTabs();
  };
  const home = t => {
    t.url = ''; t.title = 'New Tab'; t.frame = null; t.el.innerHTML = homeHtml();
    const q = t.el.querySelector('.nt-q input');
    q.onkeydown = e => e.key === 'Enter' && q.value.trim() && navigate(t, toUrl(q.value));
    t.el.querySelector('.shortcuts').onclick = e => { const c = e.target.closest('[data-url]'); if (c) navigate(t, c.dataset.url); };
    if (proxyOn()) OS.proxyStatus().then(([ok, m]) => { const s = t.el.querySelector('.nt-status'); if (s) { s.textContent = m; s.previousElementSibling.className = 'dot ' + (ok ? 'ok' : 'bad'); } });
    if (t === cur) { u.value = ''; renderTabs(); renderBookmarks(); setTimeout(() => q.focus()); }
  };
  const navigate = async (t, url, retry) => {
    if (!retry) t.retried = false;
    t.url = url; t.title = hostOf(url); if (t === cur) { u.value = url; renderTabs(); renderBookmarks(); }
    let src = url;
    loading(true);
    if (proxyOn()) {
      t.el.innerHTML = '';
      try { await WebProxy.ready(); t.engine = WebProxy.engineFor(url); src = WebProxy.encode(url, t.engine); }
      catch (e) {
        loading(false);
        t.el.innerHTML = `<div class="notice"><h3>Can't reach the proxy</h3><p class="muted">${esc(e.message)}</p>
          <p class="muted">Set a Wisp server in Settings → Proxy, or turn the proxy off. Many sites refuse to load without it.</p>
          <div class="row"><button class="primary" data-act="settings">Open proxy settings</button><button data-act="direct">Load directly</button></div></div>`;
        t.el.querySelector('[data-act=settings]').onclick = () => OS.launch('settings', 'proxy');
        t.el.querySelector('[data-act=direct]').onclick = () => { OS.set({ proxy: false }); renderPx(); navigate(t, url); };
        return;
      }
    }
    t.el.innerHTML = ''; const f = document.createElement('iframe');
    f.setAttribute('allow', 'autoplay; fullscreen; clipboard-write; gamepad; encrypted-media');
    f.setAttribute('allowfullscreen', ''); f.src = src; t.el.appendChild(f); t.frame = f;
    f.onload = () => {
      loading(false);
      try { // same-origin when proxied: read the real URL and title
        const real = WebProxy.decode(f.contentWindow.location.pathname + f.contentWindow.location.search + f.contentWindow.location.hash);
        if (real) t.url = real;
        t.title = f.contentDocument.title || hostOf(t.url);
        // links that try to open new windows open as new tabs instead
        f.contentWindow.open = (href) => { if (href) newTab(new URL(href, t.url).href); return null; };
        // HitBoy Proxy: if this engine's error page shows up, retry the site once with the other engine and remember it
        const text = f.contentDocument.body?.innerText || '';
        const failed = text.length < 3000 && /There was an error loading|Error processing your request/.test(text); // the engines' own error pages
        if (failed && WebProxy.engine() === 'hitboy' && !t.retried) {
          t.retried = true; const other = t.engine === 'uv' ? 'scramjet' : 'uv';
          WebProxy.setSiteEngine(t.url, other === 'scramjet' ? null : other);
          return navigate(t, t.url, true);
        }
      } catch (e) {}
      if (t === cur) { u.value = t.url; renderBookmarks(); } renderTabs();
      addHistory(t.url, t.title);
    };
  };
  const addHistory = (url, title) => {
    const h = (OS.cfg.history || []).filter(x => x.url !== url); h.unshift({ url, title, at: Date.now() }); OS.set({ history: h.slice(0, 100) });
  };

  u.onkeydown = e => { if (e.key === 'Enter' && u.value.trim()) navigate(cur, toUrl(u.value)); };
  u.onfocus = () => u.select();
  $b('.bk').onclick = () => { try { cur.frame.contentWindow.history.back(); } catch (e) {} };
  $b('.fw').onclick = () => { try { cur.frame.contentWindow.history.forward(); } catch (e) {} };
  $b('.rl').onclick = () => cur.url ? navigate(cur, cur.url) : home(cur);
  $b('.hm').onclick = () => home(cur);
  $b('.newtab').onclick = () => newTab();
  $b('.tablist').onclick = e => { const x = e.target.closest('[data-x]'); if (x) return closeTab(tabs[x.dataset.x]); const el = e.target.closest('.tab'); if (el) select(tabs[el.dataset.i]); };
  $b('.tablist').onauxclick = e => { const el = e.target.closest('.tab'); if (el && e.button === 1) closeTab(tabs[el.dataset.i]); };
  $b('.bm').onclick = () => {
    if (!cur.url) return; let bms = OS.cfg.bookmarks || [];
    bms = bms.some(b => b.url === cur.url) ? bms.filter(b => b.url !== cur.url) : [...bms, { url: cur.url, title: cur.title || cur.url }];
    OS.set({ bookmarks: bms }); renderBookmarks();
  };
  $b('.bmbar').onclick = e => { const b = e.target.closest('button'); if (b) navigate(cur, OS.cfg.bookmarks[b.dataset.i].url); };
  $b('.px').onclick = () => { OS.set({ proxy: !proxyOn() }); renderPx(); if (cur.url) navigate(cur, cur.url); else home(cur); };
  $b('.pop').onclick = async () => {
    if (!cur.url) return;
    let url = cur.url;
    if (proxyOn()) { try { await WebProxy.ready(); url = location.origin + WebProxy.encode(cur.url); } catch (e) {} }
    OS.openBlank(url);
  };
  renderPx(); newTab(opts.url);
}

// App Store catalog: web apps that open through the proxy browser in app mode.
const STORE = [
  { id: 'youtube', img: 'youtube', name: 'YouTube', mono: 'YT', bg: '#dc2626', desc: 'Videos and music', url: 'https://www.youtube.com', cat: 'Entertainment' },
  { id: 'spotify', img: 'spotify', name: 'Spotify', mono: 'Sp', bg: '#16a34a', desc: 'Music and podcasts', url: 'https://open.spotify.com', cat: 'Entertainment' },
  { id: 'twitch', img: 'gnome-twitch', name: 'Twitch', mono: 'Tw', bg: '#7c3aed', desc: 'Live streams', url: 'https://www.twitch.tv', cat: 'Entertainment' },
  { id: 'soundcloud', img: 'soundcloud', name: 'SoundCloud', mono: 'SC', bg: '#ea580c', desc: 'Independent music', url: 'https://soundcloud.com', cat: 'Entertainment' },
  { id: 'discord', img: 'discord', name: 'Discord', mono: 'Dc', bg: '#5865f2', desc: 'Chat with friends', url: 'https://discord.com/app', cat: 'Social' },
  { id: 'reddit', img: 'reddit', name: 'Reddit', mono: 'R', bg: '#ff4500', desc: 'Communities', url: 'https://www.reddit.com', cat: 'Social' },
  { id: 'tiktok', img: 'tiktok', name: 'TikTok', mono: 'Tk', bg: '#18181b', desc: 'Short videos', url: 'https://www.tiktok.com', cat: 'Social' },
  { id: 'poki', name: 'Poki', mono: 'Po', bg: '#0ea5e9', desc: 'Browser games', url: 'https://poki.com', cat: 'Games' },
  { id: 'crazygames', name: 'CrazyGames', mono: 'CG', bg: '#9333ea', desc: 'Browser games', url: 'https://www.crazygames.com', cat: 'Games' },
  { id: 'coolmath', name: 'Coolmath Games', mono: 'CM', bg: '#0284c7', desc: 'Puzzle and logic games', url: 'https://www.coolmathgames.com', cat: 'Games' },
  { id: 'scratch', img: 'scratch', name: 'Scratch', mono: 'Sc', bg: '#f59e0b', desc: 'Make games and animations', url: 'https://scratch.mit.edu', cat: 'Create' },
  { id: 'github', img: 'github-desktop', name: 'GitHub', mono: 'GH', bg: '#27272a', desc: 'Code hosting', url: 'https://github.com', cat: 'Create' },
  { id: 'vscode', img: 'visual-studio-code', name: 'VS Code', mono: 'VS', bg: '#0078d4', desc: 'Code editor', url: 'https://vscode.dev', cat: 'Create' },
  { id: 'photopea', img: 'gimp', name: 'Photopea', mono: 'Pp', bg: '#0d9488', desc: 'Photo editor', url: 'https://www.photopea.com', cat: 'Create' },
  { id: 'wikipedia', img: 'wikipedia', name: 'Wikipedia', mono: 'W', bg: '#3f3f46', desc: 'Encyclopedia', url: 'https://en.wikipedia.org', cat: 'Tools' },
  { id: 'gtranslate', img: 'google-translate', name: 'Translate', mono: 'Tr', bg: '#2563eb', desc: 'Translate text', url: 'https://translate.google.com', cat: 'Tools' },
];
const storeIcon = s => s.icon || (s.img ? realIcon(s.img) : s.fav ? favIcon(s.url) : { mono: s.mono, bg: s.bg });
const storeApp = s => ({ name: s.name, icon: storeIcon(s), cat: 'Installed', w: 1000, h: 680, run: (b, w) => BrowserApp(b, w, { url: s.url, single: true, title: s.name }) });
