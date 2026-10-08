// Desktop shell: top bar, dock, app launcher, quick settings, calendar/notifications, power.
const $ = s => document.querySelector(s);
const initials = n => (n || '?').replace(/_/g, ' ').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

const WALLPAPERS = {
  Graphite: 'linear-gradient(165deg,#20262f 0%,#13171d 55%,#0c0e12 100%)',
  Harbor: 'linear-gradient(170deg,#1e3a5f 0%,#0f2238 50%,#0a1626 100%)',
  Moss: 'linear-gradient(165deg,#2c3a2e 0%,#1a241c 60%,#111712 100%)',
  Clay: 'linear-gradient(165deg,#5b4636 0%,#3a2c22 55%,#241b15 100%)',
  Mist: 'linear-gradient(165deg,#dfe4ea 0%,#c9d1db 60%,#b7c1cd 100%)',
  Dune: 'linear-gradient(170deg,#e8dccb 0%,#d6c4ab 60%,#c2ab8d 100%)',
};
const ACCENTS = ['#3b82f6', '#6366f1', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#71717a'];
const DEFAULT_DOCK = ['browser', 'files', 'terminal', 'games', 'vm', 'store', 'settings'];
const FLYOUTS = ['#quick', '#calendar', '#ctx-menu', '#launcher', '#startmenu'];
const fmtTime = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const OS = {
  user: 'user', account: null, cfg: {}, notes: [], afterLogin: null,
  load() { try { this.cfg = JSON.parse(localStorage.getItem('novaos.cfg')) || {}; } catch (e) {} this.apply(); },
  set(p) { Object.assign(this.cfg, p); try { localStorage.setItem('novaos.cfg', JSON.stringify(this.cfg)); } catch (e) {} this.apply(); },
  apply() {
    const t = typeof Shell !== 'undefined' ? Shell.theme() : null;
    const wall = this.cfg.wall || t?.wall || WALLPAPERS.Graphite, accent = this.cfg.accent || t?.accent || ACCENTS[0];
    $('#desktop').style.background = wall; $('#greeter').style.background = wall;
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.dataset.theme = this.cfg.theme || 'dark';
    if (typeof Shell !== 'undefined' && $('#topbar').dataset.ready) Shell.apply();
    // brightness + night light are real display filters
    const f = [];
    if ((this.cfg.brightness ?? 100) < 100) f.push(`brightness(${Math.max(30, this.cfg.brightness)}%)`);
    if (this.cfg.night) f.push('sepia(.35) saturate(1.15) hue-rotate(-12deg)');
    document.body.style.filter = f.join(' ');
    const c = typeof CLOAKS !== 'undefined' && CLOAKS[this.cfg.cloak];
    document.title = c ? c.title : 'HitBoy Web-OS';
    let fav = document.querySelector('link[rel=icon]');
    if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
    fav.href = c ? c.icon : 'data:image/svg+xml,' + encodeURIComponent($('#mark-tpl').innerHTML.trim().replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg" style="color:${accent}"`).replace(/currentColor/g, accent));
  },
  dock() { return (this.cfg.dock || DEFAULT_DOCK).filter(id => ALL_APPS[id]); },
  // Installed App Store apps become regular apps (desktop icon, dock, launcher).
  syncApps() {
    for (const id of Object.keys(ALL_APPS)) if (id.startsWith('web:')) delete ALL_APPS[id];
    for (const id of this.cfg.installed || []) { const s = STORE.find(x => x.id === id); if (s) ALL_APPS['web:' + id] = storeApp(s); }
    this.renderIcons?.(); this.renderDock?.();
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
    // The command-line style is text only: no windows.
    if (Shell.cliActive()) return Shell.cliPrint(`${id}: cannot open display: no graphical session (type "startx" to start a desktop)`);
    this.closeFlyouts();
    return WM.open({ title: app.name, icon: app.icon, w: app.w, h: app.h, appId: id, content: (body, win) => app.run(body, win, arg) });
  },
  // Notifications: shown as a banner (unless Do Not Disturb) and kept in the calendar panel.
  toast(msg) {
    this.notes.unshift({ msg, at: new Date() }); this.notes = this.notes.slice(0, 30);
    $('#tb-clock')?.classList.toggle('has-notes', !!this.notes.length);
    if (this.cfg.dnd || Shell.cliActive() || !$('#tty').classList.contains('hidden')) return;
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<b>HitBoy Web-OS</b><span></span>`; t.querySelector('span').textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
  },
  closeFlyouts(except) {
    if (except) document.querySelectorAll('.toast').forEach(t => t.remove());
    for (const s of FLYOUTS) if (s !== except) $(s).classList.add('hidden');
    $('#act-btn')?.classList.toggle('on', except === '#launcher');
    $('#tb-clock')?.classList.toggle('on', except === '#calendar');
    $('#tb-status')?.classList.toggle('on', except === '#quick');
  },
  toggle(sel) { const open = $(sel).classList.contains('hidden'); this.closeFlyouts(open ? sel : null); $(sel).classList.toggle('hidden', !open); return open; },
  menu(el, items, x, y) {
    el.innerHTML = ''; for (const it of items) {
      if (it === '-') { el.insertAdjacentHTML('beforeend', '<div class="menu-sep"></div>'); continue; }
      const d = document.createElement('div'); d.className = 'menu-item'; d.innerHTML = glyph(it[0]) + `<span>${esc(it[1])}</span>`;
      d.onclick = () => { el.classList.add('hidden'); it[2](); }; el.appendChild(d);
    }
    el.classList.remove('hidden');
    el.style.left = Math.max(8, Math.min(x, innerWidth - el.offsetWidth - 8)) + 'px'; el.style.top = Math.max(8, Math.min(y, innerHeight - el.offsetHeight - 8)) + 'px';
  },

  enterDesktop(unlocking) {
    $('#desktop').classList.remove('hidden');
    Shell.apply();
    if (Shell.current().cli) { if (unlocking && Shell.cliActive()) $('#cli input')?.focus(); else Shell.showCli(); } else this.set({ lastGui: this.cfg.shell || 'hitboy' });
    if (!unlocking) {
      const greet = new Date().getHours(); this.toast(`Good ${greet < 12 ? 'morning' : greet < 18 ? 'afternoon' : 'evening'}, ${this.account.name.split(' ')[0]}.`);
      if (this.afterLogin) { const f = this.afterLogin; this.afterLogin = null; f(); }
    }
  },

  initDesktop() {
    document.querySelectorAll('.mark-slot').forEach(s => s.appendChild($('#mark-tpl').content.cloneNode(true)));
    $('#l-icon').innerHTML = glyph('search', 16);
    $('#topbar').dataset.ready = 1;
    WM.onChange = () => { this.renderDock(); if (Shell.current().top === 'mac') Shell.renderTop(); else this.renderTop(); Shell.renderTaskbar(); };
    $('#topbar').onclick = e => Shell.topClick(e);
    $('#taskbar').onclick = e => Shell.taskbarClick(e);
    $('#taskbar').oncontextmenu = $('#dock').oncontextmenu = e => this.dockMenu(e);
    $('#startmenu').onclick = e => Shell.startClick(e);

    this.renderIcons = () => {
      const ids = ['browser', 'games', 'vm', 'linux', 'store', 'files', 'terminal', ...Object.keys(ALL_APPS).filter(id => id.startsWith('web:'))];
      $('#icons').innerHTML = ids.map(id => `<div class="icon" data-id="${id}">${tile(ALL_APPS[id].icon, 44)}<span>${esc(ALL_APPS[id].name)}</span></div>`).join('');
    };
    this.renderIcons();
    $('#icons').addEventListener('pointerdown', e => { document.querySelectorAll('.icon.sel').forEach(i => i.classList.remove('sel')); e.target.closest('.icon')?.classList.add('sel'); });
    $('#icons').addEventListener('dblclick', e => { const i = e.target.closest('.icon'); if (i) this.launch(i.dataset.id); });

    // Dock
    $('#dock').onclick = e => {
      const b = e.target.closest('[data-dock]'); if (!b) return;
      if (b.dataset.dock === '@apps') return this.openLauncher();
      this.activate(b.dataset.dock);
    };
    this.dockMenu = e => {
      const b = e.target.closest('[data-dock]'); if (!b || b.dataset.dock === '@apps') return; e.preventDefault();
      const id = b.dataset.dock, wins = this.groupWins(id), pinned = this.dock().includes(id), r = b.getBoundingClientRect();
      const items = [];
      const setDock = dock => { this.set({ dock }); this.renderDock(); };
      if (ALL_APPS[id]) items.push(['plus', 'New Window', () => this.launch(id)], pinned ? ['close', 'Unpin from Dock', () => setDock(this.dock().filter(x => x !== id))] : ['star', 'Pin to Dock', () => setDock([...this.dock(), id])]);
      if (wins.length) items.push('-', ['power', wins.length > 1 ? `Quit ${wins.length} Windows` : 'Quit', () => wins.forEach(w => WM.close(w.id))]);
      this.menu($('#ctx-menu'), items, r.left, r.top - 12 - items.length * 34);
    };


    // Launcher
    $('#l-input').oninput = () => this.renderLauncher();
    $('#l-input').onkeydown = e => {
      if (e.key !== 'Enter') return;
      const f = $('#l-grid .app-cell'); if (f) this.launch(f.dataset.id); else if (e.target.value.trim()) this.launch('browser', toUrl(e.target.value));
    };
    $('#launcher').onclick = e => { const c = e.target.closest('.app-cell'); if (c) return this.launch(c.dataset.id); if (e.target.id === 'web-search') return this.launch('browser', toUrl($('#l-input').value)); if (!e.target.closest('.l-search')) this.closeFlyouts(); };

    document.addEventListener('pointerdown', e => {
      if (!e.target.closest('.flyout,#launcher,#topbar,#dock,#taskbar')) this.closeFlyouts();
      else if (!e.target.closest('#ctx-menu')) $('#ctx-menu').classList.add('hidden');
    });

    // Desktop right-click menu
    $('#icons').oncontextmenu = e => {
      e.preventDefault(); this.closeFlyouts();
      const i = e.target.closest('.icon');
      const items = i ? [['open', 'Open', () => this.launch(i.dataset.id)], ['star', 'Pin to Dock', () => { this.set({ dock: [...new Set([...this.dock(), i.dataset.id])] }); this.renderDock(); Shell.renderTaskbar(); }],
        '-', ['trash', 'Remove from Desktop', () => this.removeFromDesktop(i.dataset.id)]] : [
        ['grid', 'Arrange Icons', () => { this.set({ iconPos: {} }); this.renderIcons(); }],
        ['notepad', 'New Document', () => this.launch('notepad')], ['terminal', 'Open in Terminal', () => this.launch('terminal')], '-',
        ['grid', 'Show Applications', () => this.openLauncher()], ['taskmgr', 'System Monitor', () => this.launch('taskmgr')], '-',
        ['paint', 'Change Background…', () => this.launch('settings', 'appearance')], ['settings', 'Settings', () => this.launch('settings')]];
      this.menu($('#ctx-menu'), items, e.clientX, e.clientY);
    };

    // Keyboard shortcuts
    addEventListener('keydown', e => {
      if ($('#desktop').classList.contains('hidden')) return;
      if (this.cfg.panicKey && e.key === this.cfg.panicKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return location.replace(this.cfg.panicUrl || 'https://classroom.google.com');
      if (!$('#cli').classList.contains('hidden')) return;
      if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); $('#launcher').classList.contains('hidden') && $('#startmenu').classList.contains('hidden') ? this.openLauncher() : this.closeFlyouts(); }
      else if (e.altKey && e.code === 'Backquote') { e.preventDefault(); WM.cycle(); }
      else if (e.altKey && e.key.toLowerCase() === 'w') { const w = WM.focused(); if (w) { e.preventDefault(); WM.close(w.id); } }
      else if (e.altKey && e.key.toLowerCase() === 't') { e.preventDefault(); this.launch('terminal'); }
      else if (e.altKey && e.key.toLowerCase() === 'l') { e.preventDefault(); this.power('lock'); }
      else if (e.key === 'Escape') this.closeFlyouts();
    });

    this.tick = () => {
      const d = new Date(), date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }), clk = $('#tb-clock'), s = Shell.current();
      if (clk) {
        if (['win11', 'win10'].includes(s.bottom) && s.top === 'none') clk.innerHTML = `${fmtTime(d)}<br>${d.toLocaleDateString()}`;
        else if (s.bottom === 'kde' && s.top === 'none') clk.innerHTML = `${fmtTime(d)}<br>${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`;
        else clk.textContent = s.top === 'mac' ? `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}  ${fmtTime(d)}` : `${date}  ${fmtTime(d)}`;
        clk.classList.toggle('has-notes', !!this.notes.length);
      }
      $('#g-clock').textContent = `${date}  ${fmtTime(d)}`;
      $('#g-lock-time').textContent = fmtTime(d).replace(/\s?[AP]M$/i, ''); $('#g-lock-date').textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };
    this.tick(); setInterval(this.tick, 1000);
    addEventListener('resize', () => { for (const w of WM.wins.values()) if (w.el.offsetTop < WA.top) w.el.style.top = WA.top + 'px'; });
  },

  // Windows for a dock entry, newest-focused first. Entries are app ids, or a window id for app-less windows.
  groupWins(key) { return WM.byZ().filter(w => (w.appId || w.id) === key); },
  // Dock/taskbar click: launch, focus, cycle through the app's windows, or minimize.
  activate(key) {
    const wins = this.groupWins(key);
    if (!wins.length) return this.launch(key);
    const top = wins[0], focused = top.el.classList.contains('focused') && !top.el.classList.contains('min');
    if (focused && wins.length === 1) WM.minimize(top.id);
    else if (focused) WM.focus(wins[wins.length - 1].id);
    else WM.focus(top.id);
  },
  renderDock() {
    const bottom = typeof Shell !== 'undefined' ? Shell.current().bottom : 'dock', dock = $('#dock');
    dock.classList.toggle('hidden', !bottom.startsWith('dock'));
    dock.dataset.kind = bottom;
    if (!bottom.startsWith('dock')) return;
    const pinned = this.dock(), running = [];
    for (const w of WM.byZ().reverse()) { const k = w.appId || w.id; if (!pinned.includes(k) && !running.includes(k)) running.push(k); }
    const item = k => {
      const wins = this.groupWins(k), w = wins[0], app = ALL_APPS[k];
      const icon = app ? app.icon : w.icon, label = app ? app.name : w.title;
      const focused = wins.some(x => x.el.classList.contains('focused'));
      return `<button class="dock-item${focused ? ' focused' : ''}" data-dock="${esc(k)}" data-label="${esc(label)}">${tile(icon, 44)}<span class="dots">${'<i></i>'.repeat(Math.min(wins.length, 3))}</span></button>`;
    };
    $('#dock').innerHTML = pinned.map(item).join('') + (running.length ? '<span class="dock-sep"></span>' + running.map(item).join('') : '') +
      `<span class="dock-sep"></span><button class="dock-item" data-dock="@apps" data-label="Show Applications"><span class="apps-btn">${glyph('grid', 22)}</span></button>`;
  },
  renderTop() {
    const w = WM.focused(), el = $('#tb-app');
    if (!el) return; // no top bar in this desktop style
    el.innerHTML = w ? `${tile(w.icon, 16)}<span>${esc(w.appId && ALL_APPS[w.appId] ? ALL_APPS[w.appId].name : w.title)}</span>` : '';
  },
  openLauncher() {
    if (Shell.current().launcher !== 'grid') return Shell.openStart();
    this.closeFlyouts('#launcher'); $('#launcher').classList.remove('hidden');
    $('#l-input').value = ''; this.renderLauncher(); setTimeout(() => $('#l-input').focus(), 30);
  },
  renderLauncher() {
    const q = $('#l-input').value.trim().toLowerCase();
    const cell = id => `<div class="app-cell" data-id="${id}">${tile(ALL_APPS[id].icon, 64)}<span>${esc(ALL_APPS[id].name)}</span></div>`;
    if (q) {
      const hits = Object.keys(ALL_APPS).filter(id => ALL_APPS[id].name.toLowerCase().includes(q));
      $('#l-grid').innerHTML = hits.length ? `<div class="l-grid">${hits.map(cell).join('')}</div>` : `<div class="empty">No applications match “${esc(q)}”<br><br><button class="primary" id="web-search">${glyph('search', 14)}Search the web</button></div>`;
      return;
    }
    const apps = Object.keys(APPS).filter(id => id !== 'about' && !APPS[id].hidden), games = [...Object.keys(GAME_APPS), ...Object.keys(DOS_APPS)], web = Object.keys(ALL_APPS).filter(i => i.startsWith('web:'));
    $('#l-grid').innerHTML = `<div class="l-sec">Applications</div><div class="l-grid">${apps.map(cell).join('')}</div>
      <div class="l-sec">Games</div><div class="l-grid">${games.map(cell).join('')}</div>` +
      (web.length ? `<div class="l-sec">Installed</div><div class="l-grid">${web.map(cell).join('')}</div>` : '');
  },

  renderQuick() {
    const c = this.cfg, dark = (c.theme || 'dark') === 'dark', u = this.account;
    const pill = (k, g, label, on, sub) => `<button class="qs-pill ${on ? 'on' : ''}" data-q="${k}">${glyph(g, 16)}<span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
    $('#quick').innerHTML = `<div class="qs-top">
        <div class="user-chip">${avatar(u, 30)}<span>${esc(u ? u.name : '')}</span></div>
        <span class="grow"></span>
        <button class="qs-round" data-q="settings" title="Settings">${glyph('settings', 16)}</button>
        <button class="qs-round" data-q="lock" title="Lock">${glyph('lock', 16)}</button>
        <button class="qs-round" data-q="power" title="Power Off / Log Out">${glyph('power', 16)}</button></div>
      <div class="qs-power hidden">
        <button class="menu-item" data-q="suspend">${glyph('moon')}Suspend</button><button class="menu-item" data-q="restart">${glyph('reload')}Restart…</button>
        <button class="menu-item" data-q="shutdown">${glyph('power')}Power Off…</button><div class="menu-sep"></div><button class="menu-item" data-q="logout">${glyph('back')}Log Out</button></div>
      <label class="qs-slider">${glyph('sun', 16)}<input type="range" min="30" max="100" value="${c.brightness ?? 100}" data-q="brightness"></label>
      <div class="qs-pills">
        ${pill('proxy', 'shield', 'Proxy', c.proxy !== false, '<span id="qs-px">…</span>')}
        ${pill('theme', dark ? 'moon' : 'sun', 'Dark Style', dark)}
        ${pill('night', 'moon', 'Night Light', c.night)}
        ${pill('dnd', 'volume', 'Do Not Disturb', c.dnd)}
      </div>`;
    const q = $('#quick');
    q.onclick = e => {
      const b = e.target.closest('button[data-q]'); if (!b) return; const k = b.dataset.q;
      if (k === 'power') return q.querySelector('.qs-power').classList.toggle('hidden');
      if (k === 'proxy') this.set({ proxy: c.proxy === false });
      else if (k === 'theme') this.set({ theme: dark ? 'light' : 'dark' });
      else if (k === 'night') this.set({ night: !c.night });
      else if (k === 'dnd') this.set({ dnd: !c.dnd });
      else if (k === 'settings') return this.launch('settings');
      else if (k === 'suspend') return this.power('lock');
      else return this.power(k);
      this.renderQuick(); this.updateProxyDot();
    };
    q.querySelector('[data-q=brightness]').oninput = e => this.set({ brightness: +e.target.value });
    this.proxyStatus().then(([ok, msg]) => { const s = $('#qs-px'); if (s) s.textContent = ok ? new URL(WebProxy.wispUrl()).host : c.proxy === false ? 'Off' : 'Unavailable'; });
  },
  renderCalendar(offset = 0) {
    const now = new Date(), m = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(), prev = new Date(m.getFullYear(), m.getMonth(), 0).getDate();
    let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<span class="dow">${x}</span>`).join('');
    for (let i = m.getDay(); i > 0; i--) cells += `<span class="dim">${prev - i + 1}</span>`;
    for (let i = 1; i <= days; i++) cells += `<span class="${!offset && i === now.getDate() ? 'today' : ''}">${i}</span>`;
    const ago = d => { const s = (Date.now() - d) / 1000; return s < 60 ? 'Just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : fmtTime(d); };
    $('#calendar').innerHTML = `<div class="cal-notes">${this.notes.length ? this.notes.map(n => `<div class="note"><div class="note-h"><b>HitBoy Web-OS</b><span>${ago(n.at)}</span></div>${esc(n.msg)}</div>`).join('') : `<div class="cal-empty">${glyph('volume', 28)}<span>No Notifications</span></div>`}
        <div class="cal-foot"><label class="row small"><span>Do Not Disturb</span><input type="checkbox" class="switch" id="cal-dnd" ${this.cfg.dnd ? 'checked' : ''}></label><button class="ghost small" id="cal-clear" ${this.notes.length ? '' : 'disabled'}>Clear</button></div></div>
      <div class="cal-side"><div class="cal-today"><small>${now.toLocaleDateString([], { weekday: 'long' })}</small><b>${now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</b></div>
        <div class="cal-nav"><button class="icon-btn" data-m="-1">${glyph('back', 14)}</button><span>${m.toLocaleDateString([], { month: 'long', year: 'numeric' })}</span><button class="icon-btn" data-m="1">${glyph('forward', 14)}</button></div>
        <div class="cal">${cells}</div></div>`;
    $('#calendar').querySelectorAll('[data-m]').forEach(b => b.onclick = () => this.renderCalendar(offset + +b.dataset.m));
    $('#cal-clear').onclick = () => { this.notes = []; $('#tb-clock').classList.remove('has-notes'); this.renderCalendar(offset); };
    $('#cal-dnd').onchange = e => this.set({ dnd: e.target.checked });
  },
  async proxyStatus() {
    if (this.cfg.proxy === false) return [false, 'Proxy off — sites load directly'];
    try { await WebProxy.ready(); return [true, 'HitBoy Proxy connected via ' + new URL(WebProxy.wispUrl()).host]; } catch (e) { return [false, e.message]; }
  },
  updateProxyDot() { this.proxyStatus().then(([ok]) => { const d = $('#px-dot'); if (d) d.className = 'dot ' + (ok ? 'ok' : 'bad'); }); },

  power(kind) {
    this.closeFlyouts();
    if (kind === 'lock') { Greeter.show(this.user); return; }
    if (kind === 'logout') { WM.closeAll(); Shell.hideCli(); $('#desktop').classList.add('hidden'); Greeter.show(); return; }
    WM.closeAll(); Shell.hideCli(); $('#desktop').classList.add('hidden'); Greeter.hide();
    if (kind === 'restart') Boot.start();
    else $('#off').classList.remove('hidden');
  },
};

OS.load();
// HitBoy's own sites come installed (once, so uninstalling them sticks).
if (!OS.cfg.hitboySites) OS.set({ installed: [...new Set([...(OS.cfg.installed || []), ...HITBOY_SITES.map(x => x.id)])], hitboySites: 1 });
OS.syncApps(); OS.initDesktop();
FS.ready.then(() => Boot.start());
// Register the service worker right away so HitBoy Web-OS works offline and can be installed as an app.
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register(BASE + 'sw.js', { scope: BASE }).catch(() => {});
OS.updateProxyDot();
