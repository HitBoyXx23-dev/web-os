// Shell: boot, login, desktop, start menu, taskbar, quick settings, power.
const $ = s => document.querySelector(s);
const initials = n => (n || '?').replace(/_/g, ' ').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

const WALLPAPERS = {
  Graphite: 'linear-gradient(165deg,#20262f 0%,#13171d 55%,#0c0e12 100%)',
  Harbor: 'linear-gradient(170deg,#1e3a5f 0%,#0f2238 50%,#0a1626 100%)',
  Moss: 'linear-gradient(165deg,#2c3a2e 0%,#1a241c 60%,#111712 100%)',
  Clay: 'linear-gradient(165deg,#5b4636 0%,#3a2c22 55%,#241b15 100%)',
  Mist: 'linear-gradient(165deg,#dfe4ea 0%,#c9d1db 60%,#b7c1cd 100%)',
  Dune: 'linear-gradient(170deg,#e8dccb 0%,#d6c4ab 60%,#c2ab8d 100%)',
};
const ACCENTS = ['#3b82f6', '#6366f1', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#71717a'];
const PINNED = ['browser', 'games', 'vm', 'store', 'files', 'terminal', 'notepad', 'media', 'paint', 'calc', 'settings', 'taskmgr'];

const OS = {
  user: 'user',
  cfg: {},
  load() { try { this.cfg = JSON.parse(localStorage.getItem('novaos.cfg')) || {}; } catch (e) {} this.apply(); },
  set(p) { Object.assign(this.cfg, p); try { localStorage.setItem('novaos.cfg', JSON.stringify(this.cfg)); } catch (e) {} this.apply(); },
  apply() {
    const wall = this.cfg.wall || WALLPAPERS.Graphite;
    $('#desktop').style.background = wall; $('#login').style.background = wall;
    document.documentElement.style.setProperty('--accent', this.cfg.accent || ACCENTS[0]);
    document.documentElement.dataset.theme = this.cfg.theme || 'dark';
    const c = typeof CLOAKS !== 'undefined' && CLOAKS[this.cfg.cloak];
    document.title = c ? c.title : 'NovaOS';
    let fav = document.querySelector('link[rel=icon]');
    if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
    fav.href = c ? c.icon : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="3" y="3" width="11" height="11" rx="3" fill="${this.cfg.accent || ACCENTS[0]}"/><rect x="18" y="3" width="11" height="11" rx="3" fill="${this.cfg.accent || ACCENTS[0]}" opacity=".5"/><rect x="3" y="18" width="11" height="11" rx="3" fill="${this.cfg.accent || ACCENTS[0]}" opacity=".5"/><rect x="18" y="18" width="11" height="11" rx="3" fill="${this.cfg.accent || ACCENTS[0]}"/></svg>`)}`;
  },
  // Installed App Store apps become regular apps (desktop icon + start menu).
  syncApps() {
    for (const id of Object.keys(ALL_APPS)) if (id.startsWith('web:')) delete ALL_APPS[id];
    for (const id of this.cfg.installed || []) { const s = STORE.find(x => x.id === id); if (s) ALL_APPS['web:' + id] = storeApp(s); }
    this.renderIcons?.();
  },
  // Open a URL inside an about:blank tab so it doesn't appear in history.
  openBlank(url) {
    const w = open('about:blank', '_blank'); if (!w) return this.toast('Pop-up blocked. Allow pop-ups for this site and try again.');
    w.document.title = document.title;
    w.document.body.style.margin = 0;
    const f = w.document.createElement('iframe');
    f.src = url; f.style.cssText = 'border:0;width:100vw;height:100vh;display:block';
    f.allow = 'autoplay; fullscreen; clipboard-write; gamepad'; w.document.body.appendChild(f);
  },
  launch(id, arg) {
    const app = ALL_APPS[id]; if (!app) return;
    this.closeFlyouts();
    return WM.open({ title: app.name, icon: app.icon, w: app.w, h: app.h, appId: id, content: (body, win) => app.run(body, win, arg) });
  },
  toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  },
  closeFlyouts(except) { for (const s of ['#start-menu', '#power-menu', '#ctx-menu', '#quick']) if (s !== except) $(s).classList.add('hidden'); $('#start-btn').classList.toggle('open', except === '#start-menu'); },
  toggle(sel) { const open = $(sel).classList.contains('hidden'); this.closeFlyouts(open ? sel : null); $(sel).classList.toggle('hidden', !open); return open; },
  menu(el, items, x, y) {
    el.innerHTML = ''; for (const it of items) {
      if (it === '-') { el.insertAdjacentHTML('beforeend', '<div class="menu-sep"></div>'); continue; }
      const d = document.createElement('div'); d.className = 'menu-item'; d.innerHTML = glyph(it[0]) + `<span>${esc(it[1])}</span>`;
      d.onclick = () => { el.classList.add('hidden'); it[2](); }; el.appendChild(d);
    }
    el.classList.remove('hidden');
    el.style.left = Math.min(x, innerWidth - el.offsetWidth - 8) + 'px'; el.style.top = Math.min(y, innerHeight - el.offsetHeight - 8) + 'px';
  },

  async boot() {
    const st = $('#boot-status');
    const steps = ['Starting', 'Loading window manager', 'Loading ' + Object.keys(ALL_APPS).length + ' apps', 'Preparing proxy', 'Almost ready'];
    for (const s of steps) { st.textContent = s; await new Promise(r => setTimeout(r, 260 + Math.random() * 200)); }
    $('#boot').classList.add('hidden'); this.showLogin();
  },
  showLogin() {
    $('#login').classList.remove('hidden');
    const name = localStorage.getItem('novaos.user') || '';
    const inp = $('#login-name'); inp.value = name; $('#login-avatar').textContent = initials(name || 'Guest');
    inp.oninput = () => $('#login-avatar').textContent = initials(inp.value || 'Guest');
    setTimeout(() => inp.focus(), 50);
    $('#login-form').onsubmit = e => {
      e.preventDefault();
      this.user = (inp.value.trim() || 'guest').replace(/\s+/g, '_');
      try { localStorage.setItem('novaos.user', this.user); } catch (e) {}
      $('#login').classList.add('hidden'); $('#desktop').classList.remove('hidden');
      $('#start-user').textContent = this.user.replace(/_/g, ' '); $('#start-av').textContent = initials(this.user);
    };
  },

  initDesktop() {
    document.querySelectorAll('.mark-slot').forEach(s => s.appendChild($('#mark-tpl').content.cloneNode(true)));
    $('#start-btn').innerHTML = $('#mark-tpl').innerHTML.replace('class="mark"', 'class="mark" style="width:22px;height:22px;color:var(--accent)"');
    $('#login-go').innerHTML = glyph('forward', 18);
    $('#ss-icon').innerHTML = glyph('search');
    $('#power-btn').innerHTML = glyph('power', 18);
    $('#tray-status').innerHTML = glyph('wifi') + glyph('volume') + '<span class="dot" id="px-dot" title="Proxy"></span>';

    this.renderIcons = () => {
      const ids = ['browser', 'games', 'vm', 'store', 'files', 'terminal', 'notepad', 'media', 'settings', ...Object.keys(ALL_APPS).filter(id => id.startsWith('web:'))];
      $('#icons').innerHTML = ids.map(id => `<div class="icon" data-id="${id}">${tile(ALL_APPS[id].icon, 44)}<span>${esc(ALL_APPS[id].name)}</span></div>`).join('');
    };
    this.renderIcons();
    $('#icons').addEventListener('pointerdown', e => { document.querySelectorAll('.icon.sel').forEach(i => i.classList.remove('sel')); e.target.closest('.icon')?.classList.add('sel'); });
    $('#icons').addEventListener('dblclick', e => { const i = e.target.closest('.icon'); if (i) this.launch(i.dataset.id); });

    // Start menu
    const cell = id => `<div class="app-cell" data-id="${id}">${tile(ALL_APPS[id].icon, 40)}<span>${esc(ALL_APPS[id].name)}</span></div>`;
    const renderStart = q => {
      q = (q || '').trim().toLowerCase();
      if (!q) {
        const games = Object.keys(GAME_APPS), web = Object.keys(ALL_APPS).filter(i => i.startsWith('web:'));
        $('#start-list').innerHTML = `<div class="start-sec">Pinned</div><div class="app-grid">${PINNED.map(cell).join('')}</div>
          <div class="start-sec">Games</div><div class="app-grid">${games.map(cell).join('')}</div>` +
          (web.length ? `<div class="start-sec">Installed</div><div class="app-grid">${web.map(cell).join('')}</div>` : '');
        return;
      }
      const hits = Object.keys(ALL_APPS).filter(id => ALL_APPS[id].name.toLowerCase().includes(q));
      $('#start-list').innerHTML = `<div class="start-sec">Results</div>` + (hits.length ? `<div class="app-grid">${hits.map(cell).join('')}</div>` : `<div class="empty">No apps match “${esc(q)}”.<br><br><button class="primary" id="web-search">Search the web</button></div>`);
      $('#start-list .app-cell')?.classList.add('kbd');
      $('#web-search')?.addEventListener('click', () => this.launch('browser', toUrl(q)));
    };
    $('#start-search').oninput = e => renderStart(e.target.value);
    $('#start-search').onkeydown = e => {
      if (e.key !== 'Enter') return;
      const f = $('#start-list .app-cell'); if (f) this.launch(f.dataset.id); else if (e.target.value.trim()) this.launch('browser', toUrl(e.target.value));
    };
    $('#start-list').onclick = e => { const c = e.target.closest('.app-cell'); if (c) this.launch(c.dataset.id); };
    $('#start-btn').onclick = () => { if (this.toggle('#start-menu')) { $('#start-search').value = ''; renderStart(); $('#start-search').focus(); } };
    $('#power-btn').onclick = e => {
      const r = e.currentTarget.getBoundingClientRect();
      this.menu($('#power-menu'), [['lock', 'Lock', () => this.power('lock')], ['reload', 'Restart', () => this.power('restart')], ['power', 'Shut down', () => this.power('shutdown')]], r.left - 140, r.top - 120);
    };
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest('.flyout,#start-btn,#tray')) this.closeFlyouts();
      else if (!e.target.closest('#power-menu,#power-btn')) $('#power-menu').classList.add('hidden');
    });

    // Quick settings + calendar
    $('#tray-status').onclick = () => this.toggle('#quick') && this.renderQuick('settings');
    $('#clock').onclick = () => this.toggle('#quick') && this.renderQuick('calendar');

    // Desktop right-click menu
    $('#icons').oncontextmenu = e => {
      e.preventDefault(); this.closeFlyouts();
      const i = e.target.closest('.icon');
      const items = i ? [['open', 'Open', () => this.launch(i.dataset.id)]] : [
        ['reload', 'Refresh', () => this.renderIcons()], ['notepad', 'New text document', () => this.launch('notepad')], ['terminal', 'Open in Terminal', () => this.launch('terminal')], '-',
        ['store', 'App Store', () => this.launch('store')], ['taskmgr', 'Task Manager', () => this.launch('taskmgr')], '-',
        ['paint', 'Personalize', () => this.launch('settings', 'appearance')], ['about', 'About NovaOS', () => this.launch('about')]];
      this.menu($('#ctx-menu'), items, e.clientX, e.clientY);
    };

    // Keyboard shortcuts
    addEventListener('keydown', e => {
      if (this.cfg.panicKey && e.key === this.cfg.panicKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return location.replace(this.cfg.panicUrl || 'https://classroom.google.com');
      if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); $('#start-btn').click(); }
      else if (e.altKey && e.code === 'Backquote') { e.preventDefault(); WM.cycle(); }
      else if (e.altKey && e.key.toLowerCase() === 'w') { const w = WM.focused(); if (w) { e.preventDefault(); WM.close(w.id); } }
      else if (e.altKey && e.key.toLowerCase() === 't') { e.preventDefault(); this.launch('terminal'); }
      else if (e.key === 'Escape') this.closeFlyouts();
    });

    const tick = () => {
      const d = new Date(), t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      $('#clock').innerHTML = `${t}<br>${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
      $('#login-clock').textContent = t; $('#login-date').textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };
    tick(); setInterval(tick, 1000);
  },

  renderQuick(view) {
    const q = $('#quick');
    if (view === 'calendar') {
      const d = new Date(), first = new Date(d.getFullYear(), d.getMonth(), 1), days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<span class="dow">${x}</span>`).join('');
      const prevDays = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
      for (let i = first.getDay(); i > 0; i--) cells += `<span class="dim">${prevDays - i + 1}</span>`;
      for (let i = 1; i <= days; i++) cells += `<span class="${i === d.getDate() ? 'today' : ''}">${i}</span>`;
      q.innerHTML = `<div><div style="font-size:15px;font-weight:600">${d.toLocaleDateString([], { weekday: 'long' })}</div><div class="muted">${d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</div></div>
        <div class="cal">${cells}</div>`;
      return;
    }
    const dark = (this.cfg.theme || 'dark') === 'dark', px = this.cfg.proxy !== false;
    q.innerHTML = `<div class="qs-grid">
        <button class="qs ${dark ? 'on' : ''}" data-q="theme">${glyph(dark ? 'moon' : 'sun', 18)}${dark ? 'Dark' : 'Light'}</button>
        <button class="qs ${px ? 'on' : ''}" data-q="proxy">${glyph('shield', 18)}Proxy</button>
        <button class="qs" data-q="settings">${glyph('settings', 18)}Settings</button>
      </div>
      <div class="status-line"><span class="dot" id="qs-dot"></span><span id="qs-px">Checking proxy…</span></div>
      <div class="row" style="justify-content:space-between"><span class="muted small">${WM.wins.size} open window${WM.wins.size === 1 ? '' : 's'}</span>
      <button class="ghost small" data-q="taskmgr">${glyph('taskmgr', 14)}Task Manager</button></div>`;
    q.onclick = e => {
      const b = e.target.closest('[data-q]'); if (!b) return;
      const k = b.dataset.q;
      if (k === 'theme') { this.set({ theme: dark ? 'light' : 'dark' }); this.renderQuick(); }
      else if (k === 'proxy') { this.set({ proxy: !px }); this.renderQuick(); }
      else this.launch(k);
    };
    this.proxyStatus().then(([ok, msg]) => { if (!$('#qs-px')) return; $('#qs-px').textContent = msg; $('#qs-dot').className = 'dot ' + (ok ? 'ok' : 'bad'); });
  },
  async proxyStatus() {
    if (this.cfg.proxy === false) return [false, 'Proxy off — sites load directly'];
    try { await Proxy.ready(); return [true, 'Proxy connected via ' + new URL(Proxy.wispUrl()).host]; } catch (e) { return [false, e.message]; }
  },

  power(kind) {
    this.closeFlyouts();
    if (kind === 'lock') { $('#desktop').classList.add('hidden'); this.showLogin(); return; }
    WM.closeAll(); $('#desktop').classList.add('hidden');
    if (kind === 'restart') { $('#boot').classList.remove('hidden'); this.boot(); }
    else $('#off').classList.remove('hidden');
  },
};

OS.load(); OS.syncApps(); OS.initDesktop(); OS.boot();
OS.proxyStatus().then(([ok]) => { const d = $('#px-dot'); if (d) d.className = 'dot ' + (ok ? 'ok' : 'bad'); });
