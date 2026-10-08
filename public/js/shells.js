// Desktop styles. A style is a combination of parts — top panel, bottom bar, app launcher, window
// buttons and a color theme — so presets (Windows 11, macOS, Ubuntu…) and fully custom "hybrid"
// desktops are the same thing. The CLI style boots into a text console instead (type `startx`).
const SHELL_PARTS = {
  top: { gnome: 'GNOME top bar', mac: 'macOS menu bar', none: 'None' },
  bottom: { dock: 'Floating dock', 'dock-mac': 'macOS dock', 'dock-left': 'Ubuntu side dock', win11: 'Windows 11 taskbar', win10: 'Windows 10 taskbar', kde: 'Plasma panel', none: 'None' },
  launcher: { grid: 'Full-screen app grid', start11: 'Windows 11 Start', start10: 'Windows 10 Start', kickoff: 'Plasma Kickoff' },
  chrome: { gnome: 'GNOME (round, right)', windows: 'Windows 11', windows10: 'Windows 10', mac: 'macOS (traffic lights)', kde: 'Plasma Breeze' },
};
const SHELL_PRESETS = {
  hitboy: { name: 'HitBoy (original)', family: 'HitBoy', top: 'gnome', bottom: 'dock', launcher: 'grid', chrome: 'gnome', theme: 'default' },
  win11: { name: 'Windows 11', family: 'Windows', top: 'none', bottom: 'win11', launcher: 'start11', chrome: 'windows', theme: 'fluent' },
  win10: { name: 'Windows 10', family: 'Windows', top: 'none', bottom: 'win10', launcher: 'start10', chrome: 'windows10', theme: 'fluent10' },
  macos: { name: 'macOS', family: 'macOS', top: 'mac', bottom: 'dock-mac', launcher: 'grid', chrome: 'mac', theme: 'aqua' },
  ubuntu: { name: 'Ubuntu', family: 'Linux', top: 'gnome', bottom: 'dock-left', launcher: 'grid', chrome: 'gnome', theme: 'yaru' },
  gnome: { name: 'GNOME', family: 'Linux', top: 'gnome', bottom: 'dock', launcher: 'grid', chrome: 'gnome', theme: 'adwaita' },
  kde: { name: 'KDE Plasma (Arch)', family: 'Linux', top: 'none', bottom: 'kde', launcher: 'kickoff', chrome: 'kde', theme: 'breeze' },
  cli: { name: 'Command line', family: 'Linux', cli: true, top: 'none', bottom: 'none', launcher: 'grid', chrome: 'gnome', theme: 'default' },
};
// Dark-mode palettes (light mode keeps the neutral light palette, with the theme's accent and wallpaper).
const THEMES = {
  default: { name: 'HitBoy', accent: '#3b82f6', wall: 'linear-gradient(165deg,#20262f 0%,#13171d 55%,#0c0e12 100%)' },
  adwaita: { name: 'Adwaita (GNOME)', accent: '#3584e4', wall: 'radial-gradient(ellipse at 70% 20%, #4a86cf 0%, transparent 50%), linear-gradient(160deg,#1c71d8 0%,#1a3e72 50%,#0f1c33 100%)', dark: { bg: '#1e1e1e', surface: '#242424', 'surface-2': '#2e2e2e', 'surface-3': '#3a3a3a' } },
  fluent: { name: 'Fluent (Windows 11)', accent: '#4cc2ff', wall: 'radial-gradient(ellipse at 50% 115%, #9bd7ff 0%, #2a8ae8 22%, #0b4ab5 45%, #06215a 70%, #020a1f 100%)', dark: { bg: '#1c1c1c', surface: '#202020', 'surface-2': '#272727', 'surface-3': '#2d2d2d' } },
  fluent10: { name: 'Windows 10', accent: '#0078d7', wall: 'linear-gradient(115deg,#00122e 0%,#022a63 38%,#1a74d6 58%,#5fb2ff 62%,#0a3b7a 70%,#00122e 100%)', dark: { bg: '#191919', surface: '#1f1f1f', 'surface-2': '#2b2b2b', 'surface-3': '#333333' } },
  aqua: { name: 'Aqua (macOS)', accent: '#0a84ff', wall: 'linear-gradient(160deg,#f7b267 0%,#e05780 32%,#6a3fb5 65%,#1b1d4b 100%)', dark: { bg: '#1e1e1e', surface: '#1e1e1e', 'surface-2': '#2a2a2a', 'surface-3': '#3a3a3c' } },
  yaru: { name: 'Yaru (Ubuntu)', accent: '#e95420', wall: 'radial-gradient(ellipse at 25% 15%, rgba(233,84,32,.85) 0%, transparent 45%), linear-gradient(160deg,#77216f 0%,#3d0f37 45%,#1a0218 100%)', dark: { bg: '#1d1d1d', surface: '#2c2c2c', 'surface-2': '#303030', 'surface-3': '#3c3c3c' } },
  breeze: { name: 'Breeze (KDE)', accent: '#3daee9', wall: 'linear-gradient(160deg,#1d99f3 0%,#1b5f8f 40%,#0d1b2a 100%)', dark: { bg: '#1b1e20', surface: '#232629', 'surface-2': '#2a2e32', 'surface-3': '#31363b' } },
  catppuccin: { name: 'Catppuccin Mocha', accent: '#cba6f7', wall: 'linear-gradient(160deg,#313244 0%,#1e1e2e 55%,#11111b 100%)', dark: { bg: '#11111b', surface: '#1e1e2e', 'surface-2': '#181825', 'surface-3': '#313244', text: '#cdd6f4', 'text-2': '#a6adc8' } },
  nord: { name: 'Nord', accent: '#88c0d0', wall: 'linear-gradient(160deg,#5e81ac 0%,#3b4252 45%,#2e3440 100%)', dark: { bg: '#242933', surface: '#2e3440', 'surface-2': '#3b4252', 'surface-3': '#434c5e', text: '#eceff4', 'text-2': '#d8dee9' } },
  dracula: { name: 'Dracula', accent: '#bd93f9', wall: 'linear-gradient(160deg,#44475a 0%,#282a36 55%,#191a21 100%)', dark: { bg: '#191a21', surface: '#282a36', 'surface-2': '#21222c', 'surface-3': '#44475a', text: '#f8f8f2', 'text-2': '#bfbfd4' } },
  gruvbox: { name: 'Gruvbox', accent: '#fe8019', wall: 'linear-gradient(160deg,#504945 0%,#282828 55%,#1d2021 100%)', dark: { bg: '#1d2021', surface: '#282828', 'surface-2': '#1d2021', 'surface-3': '#3c3836', text: '#ebdbb2', 'text-2': '#bdae93' } },
  tokyonight: { name: 'Tokyo Night', accent: '#7aa2f7', wall: 'linear-gradient(160deg,#292e42 0%,#1a1b26 55%,#16161e 100%)', dark: { bg: '#16161e', surface: '#1a1b26', 'surface-2': '#16161e', 'surface-3': '#292e42', text: '#c0caf5', 'text-2': '#a9b1d6' } },
  rosepine: { name: 'Rosé Pine', accent: '#ebbcba', wall: 'linear-gradient(160deg,#26233a 0%,#1f1d2e 55%,#191724 100%)', dark: { bg: '#191724', surface: '#1f1d2e', 'surface-2': '#191724', 'surface-3': '#26233a', text: '#e0def4', 'text-2': '#908caa' } },
};
const PALETTE_VARS = ['bg', 'surface', 'surface-2', 'surface-3', 'text', 'text-2'];
const BOTTOM_SIZE = { dock: 76, 'dock-mac': 78, 'dock-left': 0, win11: 48, win10: 40, kde: 44, none: 0 };

const Shell = {
  // The active style: a preset, or the user's custom combination.
  current() {
    const c = OS.cfg, preset = SHELL_PRESETS[c.shell] || (c.shell === 'custom' ? null : SHELL_PRESETS.hitboy);
    return preset ? { ...preset, id: c.shell in SHELL_PRESETS ? c.shell : 'hitboy' } : { name: 'Custom', id: 'custom', ...SHELL_PRESETS.hitboy, ...c.shellCustom, cli: false };
  },
  theme() { return THEMES[OS.cfg.themeName] || THEMES[this.current().theme] || THEMES.default; },
  choose(id) {
    OS.set({ shell: id, themeName: null, wall: null, accent: null }); this.apply();
    if (this.current().cli) { WM.closeAll(); OS.closeFlyouts(); this.showCli(); } // text only: the desktop goes away
  },
  customize(patch) {
    const s = this.current();
    OS.set({ shell: 'custom', shellCustom: { top: s.top, bottom: s.bottom, launcher: s.launcher, chrome: s.chrome, theme: s.theme, ...OS.cfg.shellCustom, ...patch } });
    this.apply();
  },

  apply() {
    const s = this.current(), root = document.documentElement, t = this.theme();
    root.dataset.chrome = s.chrome; root.dataset.top = s.top; root.dataset.bottom = s.bottom; root.dataset.shell = s.id;
    root.classList.toggle('no-blur', OS.cfg.transparency === false);
    root.style.setProperty('--win-radius', (OS.cfg.radius ?? (s.chrome === 'windows10' ? 0 : s.chrome === 'windows' ? 8 : 12)) + 'px');
    for (const v of PALETTE_VARS) root.style.removeProperty('--' + v);
    if ((OS.cfg.theme || 'dark') === 'dark' && t.dark) for (const [k, v] of Object.entries(t.dark)) root.style.setProperty('--' + k, v);
    // Work area
    WA.top = s.top === 'none' ? 0 : s.top === 'mac' ? 28 : 32;
    WA.bottom = BOTTOM_SIZE[s.bottom] ?? 0; WA.left = s.bottom === 'dock-left' ? 68 : 0;
    root.style.setProperty('--wa-top', WA.top + 'px'); root.style.setProperty('--wa-bottom', WA.bottom + 'px'); root.style.setProperty('--wa-left', WA.left + 'px');
    $('#icons').classList.toggle('hidden', OS.cfg.desktopIcons === false);
    this.renderTop(); OS.renderDock(); this.renderTaskbar();
  },

  // ---- top panel ----
  renderTop() {
    const s = this.current(), el = $('#topbar');
    el.classList.toggle('hidden', s.top === 'none');
    const status = `<button class="tb-pill" id="tb-status" data-act="status"><span class="dot" id="px-dot" title="Proxy"></span>${glyph('wifi', 15)}${glyph('volume', 15)}${s.top === 'mac' ? '' : glyph('power', 15)}</button>`;
    if (s.top === 'mac') {
      const w = WM.focused(), app = w ? (w.appId && ALL_APPS[w.appId] ? ALL_APPS[w.appId].name : w.title) : 'Finder';
      el.innerHTML = `<div class="tb-left"><button class="tb-pill mac-logo" data-act="sysmenu" title="System">${$('#mark-tpl').innerHTML.replace('class="mark"', 'class="mark" style="width:14px;height:14px"')}</button>
        <b class="mac-app" id="tb-app">${esc(app)}</b>${['File', 'Edit', 'View', 'Window', 'Help'].map(m => `<button class="tb-pill mac-menu" data-act="menu" data-menu="${m}">${m}</button>`).join('')}</div>
        <span></span><div class="tb-right">${status}<button class="tb-pill" id="tb-clock" data-act="clock"></button></div>`;
    } else if (s.top === 'gnome') {
      el.innerHTML = `<div class="tb-left"><button class="tb-pill" id="act-btn" data-act="activities">Activities</button><span id="tb-app"></span></div>
        <button class="tb-pill" id="tb-clock" data-act="clock"></button><div class="tb-right">${status}</div>`;
      OS.renderTop();
    } else el.innerHTML = '';
    OS.tick?.(); OS.updateProxyDot();
  },
  topClick(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, r = b.getBoundingClientRect();
    if (a === 'activities') return $('#launcher').classList.contains('hidden') ? OS.openLauncher() : OS.closeFlyouts();
    if (a === 'clock') return OS.toggle('#calendar') && OS.renderCalendar();
    if (a === 'status') return OS.toggle('#quick') && OS.renderQuick();
    if (a === 'sysmenu') return OS.menu($('#ctx-menu'), [['about', 'About HitBoy Web-OS', () => OS.launch('about')], '-', ['settings', 'System Settings…', () => OS.launch('settings')], ['store', 'App Store…', () => OS.launch('store')], '-',
      ['taskmgr', 'Force Quit…', () => OS.launch('taskmgr')], '-', ['moon', 'Sleep', () => OS.power('lock')], ['reload', 'Restart…', () => OS.power('restart')], ['power', 'Shut Down…', () => OS.power('shutdown')], '-', ['lock', 'Lock Screen', () => OS.power('lock')], ['back', `Log Out ${OS.account?.name || ''}…`, () => OS.power('logout')]], r.left, r.bottom + 4);
    if (a === 'menu') {
      const w = WM.focused(), items = {
        File: [['plus', 'New Window', () => w?.appId ? OS.launch(w.appId) : OS.launch('files')], ['open', 'Open…', () => OS.launch('files')], '-', ['close', 'Close Window', () => w && WM.close(w.id)]],
        Edit: [['notepad', 'Undo', () => document.execCommand('undo')], ['notepad', 'Redo', () => document.execCommand('redo')], '-', ['file', 'Copy', () => document.execCommand('copy')], ['file', 'Paste', () => navigator.clipboard?.readText?.().then(t => document.execCommand('insertText', false, t)).catch(() => {})], ['grid', 'Select All', () => document.execCommand('selectAll')]],
        View: [['grid', 'Show All Applications', () => OS.openLauncher()], ['max', 'Enter Full Screen', () => document.documentElement.requestFullscreen?.()]],
        Window: [['min', 'Minimize', () => w && WM.minimize(w.id)], ['max', 'Zoom', () => w && WM.toggleMax(w)], '-', ...WM.byZ().map(x => ['file', x.title, () => WM.focus(x.id)])],
        Help: [['about', 'HitBoy Web-OS Help', () => OS.launch('about')]],
      }[b.dataset.menu];
      OS.menu($('#ctx-menu'), items, r.left, r.bottom + 4);
    }
  },

  // ---- bottom taskbar (Windows / Plasma) ----
  renderTaskbar() {
    const s = this.current(), el = $('#taskbar'), kind = ['win11', 'win10', 'kde'].includes(s.bottom) ? s.bottom : null;
    el.classList.toggle('hidden', !kind); if (!kind) return;
    el.dataset.kind = kind;
    const pinned = OS.dock(), running = [];
    for (const w of WM.byZ().reverse()) { const k = w.appId || w.id; if (!pinned.includes(k) && !running.includes(k)) running.push(k); }
    const item = k => {
      const wins = OS.groupWins(k), w = wins[0], app = ALL_APPS[k], icon = app ? app.icon : w.icon, label = app ? app.name : w.title;
      const focused = wins.some(x => x.el.classList.contains('focused') && !x.el.classList.contains('min'));
      return `<button class="tk-item${wins.length ? ' open' : ''}${focused ? ' focused' : ''}" data-dock="${esc(k)}" title="${esc(label)}">${tile(icon, kind === 'win10' ? 24 : 26)}${kind === 'kde' && wins.length ? `<span class="tk-label">${esc(w.title)}</span>` : ''}</button>`;
    };
    const tray = `<div class="tk-tray"><button class="tk-btn" id="tb-status" data-act="status"><span class="dot" id="px-dot"></span>${glyph('wifi', 16)}${glyph('volume', 16)}</button>
      <button class="tk-btn tk-clock" id="tb-clock" data-act="clock"></button>${kind === 'win10' ? '<button class="tk-btn tk-notif" data-act="clock" title="Notifications">' + glyph('file', 16) + '</button><span class="tk-peek"></span>' : ''}</div>`;
    const startBtn = kind === 'kde' ? `<button class="tk-btn tk-start" data-act="start" title="Application Launcher">${glyph('grid', 22)}</button>`
      : `<button class="tk-btn tk-start" data-act="start" title="Start">${WIN_LOGO}</button>`;
    const search = kind === 'win10' ? `<button class="tk-search" data-act="start">${glyph('search', 16)}<span>Type here to search</span></button>`
      : kind === 'win11' ? `<button class="tk-btn" data-act="start" title="Search">${glyph('search', 20)}</button>` : '';
    el.innerHTML = `<div class="tk-main">${startBtn}${search}<div class="tk-apps">${pinned.map(item).join('')}${running.map(item).join('')}</div></div>${tray}`;
    OS.tick?.(); OS.updateProxyDot();
  },
  taskbarClick(e) {
    const d = e.target.closest('[data-dock]'); if (d) return OS.activate(d.dataset.dock);
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'start') return $('#startmenu').classList.contains('hidden') ? this.openStart() : OS.closeFlyouts();
    if (a === 'clock') return OS.toggle('#calendar') && OS.renderCalendar();
    if (a === 'status') return OS.toggle('#quick') && OS.renderQuick();
  },

  // ---- Start menus ----
  openStart() {
    OS.closeFlyouts('#startmenu'); const m = $('#startmenu'); m.classList.remove('hidden');
    m.dataset.kind = this.current().launcher; m.dataset.view = 'home'; this.renderStart(); setTimeout(() => m.querySelector('input')?.focus(), 30);
  },
  renderStart(q = '') {
    const m = $('#startmenu'), kind = m.dataset.kind, u = OS.account;
    const all = Object.keys(ALL_APPS).filter(id => !ALL_APPS[id].hidden).sort((a, b) => ALL_APPS[a].name.localeCompare(ALL_APPS[b].name));
    const hits = q ? all.filter(id => ALL_APPS[id].name.toLowerCase().includes(q.toLowerCase())) : null;
    const cell = (id, size = 32) => `<button class="sm-cell" data-app="${id}">${tile(ALL_APPS[id].icon, size)}<span>${esc(ALL_APPS[id].name)}</span></button>`;
    const row = id => `<button class="sm-row" data-app="${id}">${tile(ALL_APPS[id].icon, 24)}<span>${esc(ALL_APPS[id].name)}</span></button>`;
    const alpha = list => { let last = '', h = ''; for (const id of list) { const l = ALL_APPS[id].name[0].toUpperCase(); if (l !== last) { h += `<div class="sm-letter">${/[A-Z]/.test(l) ? l : '#'}</div>`; last = l; } h += row(id); } return h; };
    const pinned = [...new Set([...OS.dock(), 'notepad', 'calc', 'paint', 'media', 'taskmgr', 'linux', 'dos:doom', 'snake', 'g2048', 'mines'])].filter(id => ALL_APPS[id]).slice(0, 18);
    const power = `<button class="tk-btn" data-power="menu" title="Power">${glyph('power', 18)}</button>`;
    const user = `<div class="user-chip">${avatar(u, 32)}<span>${esc(u?.name || '')}</span></div>`;
    const search = `<div class="sm-search">${glyph('search', 16)}<input placeholder="${kind === 'kickoff' ? 'Search…' : 'Search for apps, settings and documents'}" value="${esc(q)}" spellcheck="false"></div>`;
    if (kind === 'start11') {
      m.innerHTML = `${search}<div class="sm-body">${hits ? `<div class="sm-sec"><b>Best match</b></div><div class="sm-list">${hits.map(row).join('') || '<p class="muted pad">No results</p>'}</div>`
        : m.dataset.view === 'all' ? `<div class="sm-sec"><b>All apps</b><button class="ghost small" data-view="home">${glyph('back', 12)} Back</button></div><div class="sm-list">${alpha(all)}</div>`
        : `<div class="sm-sec"><b>Pinned</b><button class="ghost small" data-view="all">All apps ${glyph('forward', 12)}</button></div><div class="sm-grid">${pinned.map(id => cell(id)).join('')}</div>
           <div class="sm-sec"><b>Recommended</b></div><div class="sm-rec">${FS.list('/Documents').filter(f => f.type === 'file').slice(0, 4).map(f => `<button class="sm-row" data-file="${esc(f.path)}">${glyph('file', 22)}<span>${esc(f.name)}<small>Documents</small></span></button>`).join('')}</div>`}</div>
        <div class="sm-foot">${user}${power}</div>`;
    } else if (kind === 'start10') {
      m.innerHTML = `<div class="sm-rail"><button class="tk-btn" title="${esc(u?.name || '')}">${avatar(u, 24)}</button><span class="grow"></span>
          <button class="tk-btn" data-app="files" title="Documents">${glyph('file', 18)}</button><button class="tk-btn" data-app="files" title="Pictures">${glyph('paint', 18)}</button>
          <button class="tk-btn" data-app="settings" title="Settings">${glyph('settings', 18)}</button>${power}</div>
        <div class="sm-col">${search}<div class="sm-list">${hits ? hits.map(row).join('') || '<p class="muted pad">No results</p>' : alpha(all)}</div></div>
        <div class="sm-tiles"><div class="sm-sec"><b>Productivity</b></div><div class="sm-tilegrid">${pinned.slice(0, 9).map(id => `<button class="sm-tile" data-app="${id}">${tile(ALL_APPS[id].icon, 34)}<span>${esc(ALL_APPS[id].name)}</span></button>`).join('')}</div>
          <div class="sm-sec"><b>Play</b></div><div class="sm-tilegrid">${pinned.filter(id => ALL_APPS[id].cat === 'Games').slice(0, 6).map(id => `<button class="sm-tile" data-app="${id}">${tile(ALL_APPS[id].icon, 34)}<span>${esc(ALL_APPS[id].name)}</span></button>`).join('')}</div></div>`;
    } else { // kickoff
      const cats = { Favorites: pinned, 'All Applications': all, Games: all.filter(id => ALL_APPS[id].cat === 'Games'), System: all.filter(id => ALL_APPS[id].cat === 'System'), Utilities: all.filter(id => ALL_APPS[id].cat === 'Apps') };
      const cat = m.dataset.cat || 'Favorites';
      m.innerHTML = `<div class="ko-head">${user}${search}</div><div class="ko-body"><div class="ko-cats">${Object.keys(cats).map(c => `<button class="sm-row ${c === cat && !hits ? 'on' : ''}" data-cat="${c}">${glyph({ Favorites: 'star', 'All Applications': 'grid', Games: 'games', System: 'settings', Utilities: 'calc' }[c], 18)}<span>${c}</span></button>`).join('')}</div>
        <div class="sm-list">${(hits || cats[cat]).map(row).join('') || '<p class="muted pad">No results</p>'}</div></div>
        <div class="ko-foot"><button class="ghost small" data-power="lock">${glyph('lock', 14)}Lock</button><button class="ghost small" data-power="logout">${glyph('back', 14)}Log Out</button><span class="grow"></span>
          <button class="ghost small" data-power="restart">${glyph('reload', 14)}Restart</button><button class="ghost small" data-power="shutdown">${glyph('power', 14)}Shut Down</button></div>`;
    }
    const inp = m.querySelector('input');
    inp.oninput = () => { const v = inp.value; this.renderStart(v); const n = $('#startmenu input'); n.focus(); n.setSelectionRange(v.length, v.length); };
    inp.onkeydown = e => { if (e.key === 'Enter') { const f = m.querySelector('[data-app]:not(.tk-btn)'); if (f) OS.launch(f.dataset.app); else if (inp.value.trim()) OS.launch('browser', toUrl(inp.value)); } };
  },
  startClick(e) {
    const m = $('#startmenu'), t = e.target;
    const app = t.closest('[data-app]'); if (app) return OS.launch(app.dataset.app);
    const f = t.closest('[data-file]'); if (f) return OS.launch('notepad', f.dataset.file);
    const v = t.closest('[data-view]'); if (v) { m.dataset.view = v.dataset.view; return this.renderStart(); }
    const c = t.closest('[data-cat]'); if (c) { m.dataset.cat = c.dataset.cat; return this.renderStart(); }
    const p = t.closest('[data-power]'); if (!p) return;
    if (p.dataset.power !== 'menu') return OS.power(p.dataset.power);
    const r = p.getBoundingClientRect();
    OS.menu($('#ctx-menu'), [['lock', 'Lock', () => OS.power('lock')], ['back', 'Sign out', () => OS.power('logout')], '-', ['moon', 'Sleep', () => OS.power('lock')], ['reload', 'Restart', () => OS.power('restart')], ['power', 'Shut down', () => OS.power('shutdown')]], r.left - 60, r.top - 220);
  },

  // ---- CLI ----
  showCli() {
    const el = $('#cli'); el.classList.remove('hidden'); $('#desktop').classList.add('cli-mode');
    el.innerHTML = '';
    const fake = { id: 'cli', el, cleanup: [], body: el };
    APPS.terminal.run(el, fake);
    el.querySelector('.out').textContent = `${OS.loginNote || ''}HitBoy Web-OS 3.0 (tty1)\n\n${OS.user} logged in. Type "startx" to start a desktop ("startx macos", "startx win11"…),\n"desktops" to list them, or "help" for other commands.\n\n`;
    el.querySelector('input').focus();
  },
  // True while the command-line session is on screen: nothing graphical may open then.
  cliActive() { return !$('#cli').classList.contains('hidden'); },
  cliPrint(s) { const out = $('#cli .out'); if (!out) return; out.textContent += s + '\n'; $('#cli .term').scrollTop = 1e9; },
  hideCli() { $('#cli').classList.add('hidden'); $('#cli').innerHTML = ''; $('#desktop').classList.remove('cli-mode'); },
};

// Extra commands for the Terminal app (and the CLI desktop).
window.TERM_EXTRA = {
  desktops: () => Object.entries(SHELL_PRESETS).map(([id, p]) => `${id.padEnd(8)} ${p.name}`).join('\n') + '\ncustom   Your hybrid combination (Settings → Desktop)',
  startx: a => {
    const id = a[0] || (OS.cfg.lastGui && OS.cfg.lastGui !== 'cli' ? OS.cfg.lastGui : 'hitboy');
    if (!SHELL_PRESETS[id] && id !== 'custom') return `startx: unknown desktop "${id}" (see "desktops")`;
    if (id === 'cli') return 'startx: already in the command line';
    OS.set({ shell: id }); Shell.hideCli(); Shell.apply(); return '';
  },
  logout: () => { OS.power('logout'); return ''; },
  exit: () => { OS.power('logout'); return ''; },
  lock: () => { OS.power('lock'); return ''; },
  reboot: () => { OS.power('restart'); return ''; },
  poweroff: () => { OS.power('shutdown'); return ''; },
  shutdown: () => { OS.power('shutdown'); return ''; },
  setup: () => { Setup.start({ rerun: true }); return ''; },
  theme: a => THEMES[a[0]] ? (OS.set({ themeName: a[0], accent: null, wall: null }), Shell.apply(), `Theme set to ${THEMES[a[0]].name}`) : 'Themes: ' + Object.keys(THEMES).join(', '),
};

const WIN_LOGO = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="1" y="1" width="8.5" height="8.5" rx="1" fill="#4cc2ff"/><rect x="10.5" y="1" width="8.5" height="8.5" rx="1" fill="#4cc2ff"/><rect x="1" y="10.5" width="8.5" height="8.5" rx="1" fill="#4cc2ff"/><rect x="10.5" y="10.5" width="8.5" height="8.5" rx="1" fill="#4cc2ff"/></svg>';

// Small CSS mock-up of a desktop style, used by the style pickers.
function shellPreview(p) {
  const t = THEMES[p.theme] || THEMES.default;
  return `<div class="sp" style="background:${t.wall};--sp-accent:${t.accent}" data-top="${p.top}" data-bottom="${p.bottom}" data-chrome="${p.chrome}" data-cli="${p.cli ? 1 : 0}">
    <i class="sp-top"></i><i class="sp-win"><b></b></i><i class="sp-bottom"></i>${p.cli ? '<i class="sp-cli">$ startx_</i>' : ''}</div>`;
}
