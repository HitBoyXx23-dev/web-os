// Boot sequence, login, desktop, start menu, taskbar and power.
const $ = s => document.querySelector(s);
const OS = {
  user: 'user',
  cfg: {},
  load() { try { this.cfg = JSON.parse(localStorage.getItem('novaos.cfg')) || {}; } catch (e) {} this.apply(); },
  set(p) { Object.assign(this.cfg, p); try { localStorage.setItem('novaos.cfg', JSON.stringify(this.cfg)); } catch (e) {} this.apply(); },
  apply() {
    if (this.cfg.wall) $('#desktop').style.background = this.cfg.wall;
    if (this.cfg.accent) document.documentElement.style.setProperty('--accent', this.cfg.accent);
    const c = typeof CLOAKS !== 'undefined' && CLOAKS[this.cfg.cloak];
    document.title = c ? c.title : 'NovaOS';
    let fav = document.querySelector('link[rel=icon]');
    if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
    fav.href = c ? c.icon : "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M8 0l8 8-8 8-8-8z' fill='%234f8cff'/></svg>";
  },
  // Installed App Store apps become regular apps (desktop icon + start menu).
  syncApps() {
    for (const id of Object.keys(ALL_APPS)) if (id.startsWith('web:')) delete ALL_APPS[id];
    for (const id of this.cfg.installed || []) { const s = STORE.find(x => x.id === id); if (s) ALL_APPS['web:' + id] = storeApp(s); }
    this.renderIcons?.();
  },
  // Open a URL inside an about:blank tab so it doesn't appear in history.
  openBlank(url) {
    const w = open('about:blank', '_blank'); if (!w) return this.toast('Pop-up blocked — allow pop-ups for this site.');
    w.document.title = document.title;
    w.document.body.style.margin = 0;
    const f = w.document.createElement('iframe');
    f.src = url; f.style.cssText = 'border:0;width:100vw;height:100vh;display:block';
    f.allow = 'autoplay; fullscreen; clipboard-write; gamepad'; w.document.body.appendChild(f);
  },
  launch(id, arg) {
    const app = ALL_APPS[id]; if (!app) return;
    $('#start-menu').classList.add('hidden');
    WM.open({ title: app.name, icon: app.icon, w: app.w, h: app.h, appId: id, content: (body, win) => app.run(body, win, arg) });
  },
  toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg; t.style.cssText = 'position:fixed;right:12px;bottom:60px;background:var(--panel);border:1px solid var(--border);padding:10px 14px;border-radius:8px;z-index:9999;font-size:13px';
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  },

  async boot() {
    const log = $('#boot-log'), bar = $('#boot-progress');
    const lines = ['NovaOS bootloader v1.0', 'Detecting CPU… ' + (navigator.hardwareConcurrency || 1) + ' cores', 'Memory check… OK',
      'Mounting /home (localStorage)… OK', 'Loading window manager… OK', 'Loading ' + Object.keys(ALL_APPS).length + ' applications… OK',
      'Starting Virtual PC service (v86)… OK', 'Starting proxy service (Ultraviolet)… ' + (Proxy.supported() ? 'OK' : 'needs http(s)'), 'Starting network… OK', 'Welcome.'];
    for (let i = 0; i < lines.length; i++) {
      log.textContent += '[ OK ] ' + lines[i] + '\n'; bar.style.width = ((i + 1) / lines.length * 100) + '%';
      await new Promise(r => setTimeout(r, 160 + Math.random() * 180));
    }
    $('#boot').classList.add('hidden'); this.showLogin();
  },
  showLogin() {
    $('#login').classList.remove('hidden');
    const name = localStorage.getItem('novaos.user'); if (name) $('#login-name').value = name;
    $('#login-name').focus();
    const go = () => {
      this.user = ($('#login-name').value.trim() || 'user').replace(/\s+/g, '_');
      try { localStorage.setItem('novaos.user', this.user); } catch (e) {}
      $('#login').classList.add('hidden'); $('#desktop').classList.remove('hidden'); $('#start-user').textContent = '👤 ' + this.user;
    };
    $('#login-btn').onclick = go; $('#login-name').onkeydown = e => e.key === 'Enter' && go();
  },

  initDesktop() {
    this.renderIcons = () => {
      const icons = ['games', 'vm', 'browser', 'store', 'files', 'terminal', 'notepad', 'media', 'paint', 'calc', 'snake', 'g2048', 'mines', 'settings',
        ...Object.keys(ALL_APPS).filter(id => id.startsWith('web:'))];
      $('#icons').innerHTML = icons.map(id => `<div class="icon" data-id="${id}"><span class="em">${ALL_APPS[id].icon}</span>${esc(ALL_APPS[id].name)}</div>`).join('');
    };
    this.renderIcons();
    $('#icons').addEventListener('click', e => { document.querySelectorAll('.icon').forEach(i => i.classList.remove('sel')); e.target.closest('.icon')?.classList.add('sel'); });
    $('#icons').addEventListener('dblclick', e => { const i = e.target.closest('.icon'); if (i) this.launch(i.dataset.id); });

    // Start menu
    const renderStart = q => {
      q = (q || '').toLowerCase(); const groups = {};
      for (const [id, a] of Object.entries(ALL_APPS)) if (a.name.toLowerCase().includes(q)) (groups[a.cat] ||= []).push(`<div class="card" data-id="${id}"><div class="em">${a.icon}</div>${a.name}</div>`);
      $('#start-list').innerHTML = Object.entries(groups).map(([c, items]) => `<h4>${c}</h4>${items.join('')}`).join('') || '<p>No results</p>';
    };
    renderStart();
    $('#start-search').oninput = e => renderStart(e.target.value);
    $('#start-search').onkeydown = e => { if (e.key === 'Enter') { const f = $('#start-list .card'); if (f) this.launch(f.dataset.id); } };
    $('#start-list').onclick = e => { const c = e.target.closest('.card'); if (c) this.launch(c.dataset.id); };
    $('#start-btn').onclick = e => { e.stopPropagation(); const m = $('#start-menu'); m.classList.toggle('hidden'); if (!m.classList.contains('hidden')) { $('#start-search').value = ''; renderStart(); $('#start-search').focus(); } };
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest('#start-menu,#start-btn')) $('#start-menu').classList.add('hidden');
      if (!e.target.closest('#ctx-menu')) $('#ctx-menu').classList.add('hidden');
    });
    document.querySelectorAll('[data-power]').forEach(b => b.onclick = () => this.power(b.dataset.power));

    // Desktop right-click menu
    $('#icons').oncontextmenu = e => {
      e.preventDefault(); const m = $('#ctx-menu');
      const items = [['🔄 Refresh', () => location.reload()], ['📝 New note', () => this.launch('notepad')], ['⌨️ Open Terminal', () => this.launch('terminal')], ['📊 Task Manager', () => this.launch('taskmgr')], ['🛍️ App Store', () => this.launch('store')], ['🖼️ Personalize', () => this.launch('settings')], ['ℹ️ About NovaOS', () => this.launch('about')]];
      m.innerHTML = ''; items.forEach(([t, f]) => { const d = document.createElement('div'); d.textContent = t; d.onclick = () => { m.classList.add('hidden'); f(); }; m.appendChild(d); });
      m.style.left = Math.min(e.clientX, innerWidth - 170) + 'px'; m.style.top = Math.min(e.clientY, innerHeight - 200) + 'px'; m.classList.remove('hidden');
    };

    // Panic key: jump to a safe page instantly.
    addEventListener('keydown', e => {
      if (this.cfg.panicKey && e.key === this.cfg.panicKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) location.replace(this.cfg.panicUrl || 'https://classroom.google.com');
    });
    // Keyboard shortcut: Ctrl+Space / Meta opens start
    addEventListener('keydown', e => { if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); $('#start-btn').click(); } });

    const tick = () => { const d = new Date(); $('#clock').innerHTML = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '<br>' + d.toLocaleDateString(); $('#login-clock').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    tick(); setInterval(tick, 1000);
  },
  power(kind) {
    $('#start-menu').classList.add('hidden');
    if (kind === 'lock') { $('#desktop').classList.add('hidden'); this.showLogin(); return; }
    WM.closeAll(); $('#desktop').classList.add('hidden');
    if (kind === 'restart') { $('#boot-log').textContent = ''; $('#boot-progress').style.width = 0; $('#boot').classList.remove('hidden'); this.boot(); }
    else $('#off').classList.remove('hidden');
  },
};
OS.load(); OS.syncApps(); OS.initDesktop(); OS.boot();
if (Proxy.supported()) Proxy.ready().catch(() => {}); // warm up the proxy in the background
