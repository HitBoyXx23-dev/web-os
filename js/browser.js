// Proxy browser (Ultraviolet over Wisp via bare-mux + epoxy) and the App Store catalog.
const BASE = location.pathname.replace(/[^/]*$/, '');

const Proxy = {
  _ready: null,
  supported() { return location.protocol !== 'file:' && 'serviceWorker' in navigator && self.__uv$config && self.BareMux; },
  wispUrl() { return (OS.cfg.wisp || '').trim() || (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + BASE + 'wisp/'; },
  ready() {
    if (!this.supported()) return Promise.reject(new Error(location.protocol === 'file:'
      ? 'The proxy needs NovaOS to be served over http(s). Run "npm start" and open http://localhost:8080.'
      : 'This browser does not support service workers.'));
    return this._ready ||= (async () => {
      const reg = await navigator.serviceWorker.register(BASE + 'uv/sw.js', { scope: __uv$config.prefix });
      const sw = reg.installing || reg.waiting || reg.active;
      if (sw.state !== 'activated') await new Promise(r => sw.addEventListener('statechange', () => sw.state === 'activated' && r()));
      await this.setTransport();
    })().catch(e => { this._ready = null; throw e; });
  },
  async setTransport() {
    const conn = new BareMux.BareMuxConnection(BASE + 'baremux/worker.js');
    await conn.setTransport(BASE + 'epoxy/index.mjs', [{ wisp: this.wispUrl() }]);
  },
  encode(url) { return __uv$config.prefix + __uv$config.encodeUrl(url); },
  decode(path) { return path.startsWith(__uv$config.prefix) ? __uv$config.decodeUrl(path.slice(__uv$config.prefix.length)) : null; },
};

// Turn whatever was typed into a URL (or a search).
function toUrl(v) {
  v = v.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(v)) return 'https://' + v;
  return 'https://duckduckgo.com/?q=' + encodeURIComponent(v);
}

const QUICK_LINKS = [
  { name: 'Google', icon: '🔎', url: 'https://www.google.com' },
  { name: 'YouTube', icon: '▶️', url: 'https://www.youtube.com' },
  { name: 'Discord', icon: '💬', url: 'https://discord.com/app' },
  { name: 'Reddit', icon: '👽', url: 'https://www.reddit.com' },
  { name: 'Poki', icon: '🕹️', url: 'https://poki.com' },
  { name: 'Wikipedia', icon: '📚', url: 'https://en.wikipedia.org' },
];

// opts: { url, single } — single = app mode (no tab strip).
function BrowserApp(body, win, opts = {}) {
  body.innerHTML = `<div class="fill browser">
    <div class="tabs"><div class="tablist"></div><button class="newtab" title="New tab">＋</button></div>
    <div class="toolbar">
      <button class="bk" title="Back">←</button><button class="fw" title="Forward">→</button><button class="rl" title="Reload">⟳</button><button class="hm" title="Home">⌂</button>
      <input class="u grow" spellcheck="false" placeholder="Search or enter address">
      <button class="bm" title="Bookmark">☆</button><button class="px" title="Toggle proxy"></button><button class="pop" title="Open in about:blank tab">⧉</button>
    </div>
    <div class="bmbar"></div>
    <div class="grow pages"></div></div>`;
  if (opts.single) body.querySelector('.tabs').style.display = 'none';
  const $b = s => body.querySelector(s);
  const u = $b('.u'), pages = $b('.pages');
  const tabs = []; let cur = null;
  const proxyOn = () => OS.cfg.proxy !== false;

  const renderPx = () => { $b('.px').textContent = proxyOn() ? '🛡️ Proxy' : '🌐 Direct'; $b('.px').style.background = proxyOn() ? 'var(--accent)' : ''; };
  const renderBookmarks = () => {
    const bms = OS.cfg.bookmarks || [];
    $b('.bmbar').innerHTML = bms.map((b, i) => `<button data-i="${i}" title="${esc(b.url)}">${esc(b.title.slice(0, 24))}</button>`).join('');
    $b('.bmbar').style.display = bms.length ? '' : 'none';
    if (cur) $b('.bm').textContent = bms.some(b => b.url === cur.url) ? '★' : '☆';
  };
  const renderTabs = () => {
    $b('.tablist').innerHTML = tabs.map((t, i) => `<div class="tab${t === cur ? ' on' : ''}" data-i="${i}"><span>${esc(t.title || 'New Tab')}</span><b data-x="${i}">×</b></div>`).join('');
    if (opts.single && cur) win.el.querySelector('.titlebar .t').textContent = (opts.title || 'Browser') + (cur.title ? ' — ' + cur.title : '');
  };
  const homeHtml = () => `<div class="newtab-page"><div class="nt-logo">◆ Nova Browser</div>
    <input class="nt-q" placeholder="Search the web or type a URL">
    <div class="grid-cards">${[...QUICK_LINKS, ...(OS.cfg.bookmarks || [])].map(l => `<div class="card" data-url="${esc(l.url)}"><div class="em">${esc(l.icon || '⭐')}</div>${esc(l.name || l.title)}</div>`).join('')}</div>
    <p class="nt-status"></p></div>`;

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
    const q = t.el.querySelector('.nt-q');
    q.onkeydown = e => e.key === 'Enter' && q.value.trim() && navigate(t, toUrl(q.value));
    t.el.querySelector('.grid-cards').onclick = e => { const c = e.target.closest('.card'); if (c) navigate(t, c.dataset.url); };
    if (proxyOn()) Proxy.ready().then(() => t.el.querySelector('.nt-status') && (t.el.querySelector('.nt-status').textContent = '🛡️ Proxy connected via ' + Proxy.wispUrl()))
      .catch(e => t.el.querySelector('.nt-status') && (t.el.querySelector('.nt-status').textContent = '⚠️ ' + e.message));
    if (t === cur) { u.value = ''; renderTabs(); renderBookmarks(); setTimeout(() => q.focus()); }
  };
  const navigate = async (t, url) => {
    t.url = url; t.title = new URL(url).hostname; if (t === cur) { u.value = url; renderTabs(); renderBookmarks(); }
    let src = url;
    if (proxyOn()) {
      t.el.innerHTML = '<div class="pad" style="color:var(--muted)">Connecting to proxy…</div>';
      try { await Proxy.ready(); src = Proxy.encode(url); }
      catch (e) { t.el.innerHTML = `<div class="pad"><h3>⚠️ Proxy unavailable</h3><p>${esc(e.message)}</p><p>You can set a Wisp server in Settings → Proxy, or switch to Direct mode (🛡️ button) — many sites refuse to load directly.</p></div>`; return; }
    }
    t.el.innerHTML = ''; const f = document.createElement('iframe');
    f.setAttribute('allow', 'autoplay; fullscreen; clipboard-write; gamepad; encrypted-media');
    f.setAttribute('allowfullscreen', ''); f.src = src; t.el.appendChild(f); t.frame = f;
    f.onload = () => {
      try { // same-origin when proxied: read the real URL and title
        const real = Proxy.decode(f.contentWindow.location.pathname + f.contentWindow.location.search);
        if (real) t.url = real;
        t.title = f.contentDocument.title || t.title;
        // links that try to open new windows open as new tabs instead
        f.contentWindow.open = (href) => { if (href) newTab(new URL(href, t.url).href); return null; };
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
  $b('.tablist').onclick = e => { if (e.target.dataset.x) return closeTab(tabs[e.target.dataset.x]); const el = e.target.closest('.tab'); if (el) select(tabs[el.dataset.i]); };
  $b('.tablist').onauxclick = e => { const el = e.target.closest('.tab'); if (el && e.button === 1) closeTab(tabs[el.dataset.i]); };
  $b('.bm').onclick = () => {
    if (!cur.url) return; let bms = OS.cfg.bookmarks || [];
    bms = bms.some(b => b.url === cur.url) ? bms.filter(b => b.url !== cur.url) : [...bms, { url: cur.url, title: cur.title || cur.url }];
    OS.set({ bookmarks: bms }); renderBookmarks();
  };
  $b('.bmbar').onclick = e => { const b = e.target.closest('button'); if (b) navigate(cur, OS.cfg.bookmarks[b.dataset.i].url); };
  $b('.px').onclick = () => { OS.set({ proxy: !proxyOn() }); renderPx(); if (cur.url) navigate(cur, cur.url); else home(cur); };
  $b('.pop').onclick = () => cur.url && OS.openBlank(proxyOn() && Proxy.supported() ? location.origin + Proxy.encode(cur.url) : cur.url);
  renderPx(); newTab(opts.url);
}

// App Store catalog: web apps that open through the proxy browser in app mode.
const STORE = [
  { id: 'youtube', name: 'YouTube', icon: '▶️', url: 'https://www.youtube.com', cat: 'Media' },
  { id: 'spotify', name: 'Spotify', icon: '🎧', url: 'https://open.spotify.com', cat: 'Media' },
  { id: 'twitch', name: 'Twitch', icon: '📺', url: 'https://www.twitch.tv', cat: 'Media' },
  { id: 'soundcloud', name: 'SoundCloud', icon: '☁️', url: 'https://soundcloud.com', cat: 'Media' },
  { id: 'discord', name: 'Discord', icon: '💬', url: 'https://discord.com/app', cat: 'Social' },
  { id: 'reddit', name: 'Reddit', icon: '👽', url: 'https://www.reddit.com', cat: 'Social' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', url: 'https://www.tiktok.com', cat: 'Social' },
  { id: 'poki', name: 'Poki', icon: '🕹️', url: 'https://poki.com', cat: 'Games' },
  { id: 'crazygames', name: 'CrazyGames', icon: '🤪', url: 'https://www.crazygames.com', cat: 'Games' },
  { id: 'coolmath', name: 'Coolmath Games', icon: '➗', url: 'https://www.coolmathgames.com', cat: 'Games' },
  { id: 'scratch', name: 'Scratch', icon: '🐱', url: 'https://scratch.mit.edu', cat: 'Create' },
  { id: 'github', name: 'GitHub', icon: '🐙', url: 'https://github.com', cat: 'Create' },
  { id: 'vscode', name: 'VS Code Web', icon: '🧑‍💻', url: 'https://vscode.dev', cat: 'Create' },
  { id: 'photopea', name: 'Photopea', icon: '🖌️', url: 'https://www.photopea.com', cat: 'Create' },
  { id: 'wikipedia', name: 'Wikipedia', icon: '📚', url: 'https://en.wikipedia.org', cat: 'Tools' },
  { id: 'gtranslate', name: 'Translate', icon: '🈯', url: 'https://translate.google.com', cat: 'Tools' },
];
const storeApp = s => ({ name: s.name, icon: s.icon, cat: 'Installed', w: 1000, h: 680, run: (b, w) => BrowserApp(b, w, { url: s.url, single: true, title: s.name }) });
