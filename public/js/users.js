// Accounts, GRUB boot menu, boot splash and the GDM-style login greeter.
// Passwords are only a local lock: they're hashed and kept in this browser's storage.
const Users = {
  KEY: 'novaos.users',
  list() {
    try { const l = JSON.parse(localStorage.getItem(this.KEY)); if (Array.isArray(l)) return l; } catch (e) {}
    const legacy = localStorage.getItem('novaos.user'); // single-user name from older versions
    return legacy ? [{ name: legacy.replace(/_/g, ' '), user: this.slug(legacy), hash: null, color: AVATAR_COLORS[0] }] : [];
  },
  save(l) { try { localStorage.setItem(this.KEY, JSON.stringify(l)); } catch (e) {} },
  get(user) { return this.list().find(u => u.user === user); },
  slug(n) { return n.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'user'; },
  async hash(pw, user) {
    const data = new TextEncoder().encode('novaos:' + user + ':' + pw);
    if (crypto.subtle) return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(b => b.toString(16).padStart(2, '0')).join('');
    let h = 2166136261; for (const b of data) { h ^= b; h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16); // insecure contexts (file://)
  },
  async create(name, pw) {
    const l = this.list(); let user = this.slug(name), n = 2;
    while (l.some(u => u.user === user)) user = this.slug(name) + n++;
    const u = { name: name.trim(), user, hash: pw ? await this.hash(pw, user) : null, color: AVATAR_COLORS[l.length % AVATAR_COLORS.length] };
    l.push(u); this.save(l); return u;
  },
  async check(u, pw) { return !u.hash || u.hash === await this.hash(pw, u.user); },
  async setPassword(user, pw) { const l = this.list(), u = l.find(x => x.user === user); u.hash = pw ? await this.hash(pw, user) : null; this.save(l); },
  remove(user) { this.save(this.list().filter(u => u.user !== user)); },
};
const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#ec4899', '#22c55e', '#64748b'];
const avatar = (u, size = 96) => `<span class="g-av" style="width:${size}px;height:${size}px;font-size:${size * .38}px;background:${u ? u.color : '#52525b'}">${u ? esc(initials(u.name)) : glyph('plus', size * .4)}</span>`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const Boot = {
  ENTRIES: [
    { label: 'HitBoy Web-OS', run: () => Boot.splash() },
    { label: 'HitBoy Web-OS (safe graphics)', run: () => { OS.set({ theme: 'dark' }); Boot.splash(); } },
    { label: 'HitBoy Web-OS Linux terminal', run: () => { OS.afterLogin = () => OS.launch('linux'); Boot.splash(); } },
    { label: 'Ubuntu 18.04 LTS (VMBox)', run: () => { OS.afterLogin = () => OS.launch('vm', 'ubuntu18'); Boot.splash(); } },
    { label: 'Arch Linux (VMBox)', run: () => { OS.afterLogin = () => OS.launch('vm', 'arch'); Boot.splash(); } },
    { label: 'Windows 98 (VMBox)', run: () => { OS.afterLogin = () => OS.launch('vm', 'win98'); Boot.splash(); } },
    { label: 'UEFI Firmware Settings', run: () => { OS.afterLogin = () => OS.launch('settings', 'system'); Boot.splash(); } },
  ],
  start() {
    if (OS.cfg.fastBoot) return this.splash();
    const g = $('#grub'); g.classList.remove('hidden');
    let sel = 0, left = 5, timer;
    const draw = () => { $('#grub-list').innerHTML = this.ENTRIES.map((e, i) => `<div class="${i === sel ? 'on' : ''}" data-i="${i}">${i === sel ? '*' : '&nbsp;'}${esc(e.label)}</div>`).join(''); };
    const tick = () => { $('#grub-timer').textContent = left > 0 ? `The highlighted entry will be executed automatically in ${left}s.` : ''; if (left-- <= 0) go(); };
    const stop = () => { clearInterval(timer); $('#grub-timer').textContent = ''; };
    const go = () => { stop(); removeEventListener('keydown', key); g.classList.add('hidden'); this.ENTRIES[sel].run(); };
    const key = e => {
      if (e.key === 'ArrowDown') { sel = (sel + 1) % this.ENTRIES.length; stop(); draw(); }
      else if (e.key === 'ArrowUp') { sel = (sel + this.ENTRIES.length - 1) % this.ENTRIES.length; stop(); draw(); }
      else if (e.key === 'Enter') go();
      else return; e.preventDefault();
    };
    $('#grub-list').onclick = e => { const d = e.target.closest('[data-i]'); if (!d) return; if (+d.dataset.i === sel) go(); else { sel = +d.dataset.i; stop(); draw(); } };
    addEventListener('keydown', key); draw(); tick(); timer = setInterval(tick, 1000);
  },
  async splash() {
    const b = $('#boot'), log = $('#boot-log'); b.classList.remove('hidden'); log.textContent = ''; log.classList.add('hidden');
    const esc_ = e => { if (e.key === 'Escape') log.classList.toggle('hidden'); }; addEventListener('keydown', esc_);
    const units = ['Mounting /home (localStorage)', 'Started Journal Service', 'Reached target Local File Systems', 'Started Network Manager',
      'Started Ultraviolet proxy service', 'Started v86 virtualization service', 'Reached target Network', 'Started Window Manager',
      'Loaded ' + Object.keys(ALL_APPS).length + ' applications', 'Started GNOME Display Manager', 'Reached target Graphical Interface'];
    for (const u of units) { log.insertAdjacentHTML('beforeend', `[  <b>OK</b>  ] ${esc(u)}\n`); log.scrollTop = 1e9; await sleep(90 + Math.random() * 110); }
    await sleep(250);
    removeEventListener('keydown', esc_); b.classList.add('hidden'); Greeter.show();
  },
};

const Greeter = {
  show(lockUser) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    $('#greeter').classList.remove('hidden');
    $('#g-power').innerHTML = glyph('power', 15);
    $('#g-tray-icons').innerHTML = glyph('wifi', 15) + glyph('volume', 15);
    $('#g-power').onclick = e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); OS.menu($('#ctx-menu'), [['reload', 'Restart', () => OS.power('restart')], ['power', 'Power Off', () => OS.power('shutdown')]], r.right - 180, r.bottom + 6); };
    const lock = $('#g-lock'), main = $('#g-main');
    if (lockUser) {
      // GNOME-style shield: clock first, any key/click reveals the password prompt.
      lock.classList.remove('hidden', 'up'); main.classList.add('hidden');
      const reveal = () => { removeEventListener('keydown', reveal); lock.removeEventListener('click', reveal); lock.classList.add('up'); main.classList.remove('hidden'); this.prompt(Users.get(lockUser), true); };
      setTimeout(() => { addEventListener('keydown', reveal); lock.addEventListener('click', reveal); }, 200);
      return;
    }
    lock.classList.add('hidden'); main.classList.remove('hidden');
    const users = Users.list();
    if (!users.length) return this.setup(true);
    if (users.length === 1) return this.prompt(users[0]);
    this.pick();
  },
  hide() { $('#greeter').classList.add('hidden'); },
  pick() {
    const users = Users.list();
    $('#g-main').innerHTML = `<div class="g-card g-users">${users.map(u => `<button class="g-user" data-u="${esc(u.user)}">${avatar(u, 40)}<span>${esc(u.name)}</span></button>`).join('')}
      <button class="g-link" id="g-new">Not listed?</button></div>`;
    $('#g-main').onclick = e => { const b = e.target.closest('[data-u]'); if (b) this.prompt(Users.get(b.dataset.u)); if (e.target.id === 'g-new') this.setup(); };
  },
  prompt(u, locked) {
    const multi = Users.list().length > 1;
    $('#g-main').innerHTML = `<div class="g-prompt">${avatar(u, 96)}<div class="g-name">${esc(u.name)}</div>
      <form id="g-form" class="g-field">${multi && !locked ? `<button type="button" class="g-round" id="g-back" title="Back">${glyph('back', 16)}</button>` : ''}
        ${u.hash ? `<input type="password" id="g-pw" placeholder="Password" autocomplete="current-password">` : `<span class="g-nopw">No password</span>`}
        <button type="submit" class="g-round primary" title="Sign in">${glyph('forward', 16)}</button></form>
      <div class="g-msg" id="g-msg"></div>
      ${!locked && !multi ? '<button class="g-link" id="g-new">Not listed?</button>' : ''}</div>`;
    const pw = $('#g-pw'); setTimeout(() => (pw || $('#g-form button[type=submit]')).focus(), 60);
    $('#g-back')?.addEventListener('click', () => this.pick());
    $('#g-new')?.addEventListener('click', () => this.setup());
    $('#g-form').onsubmit = async e => {
      e.preventDefault();
      if (await Users.check(u, pw ? pw.value : '')) return this.done(u, locked);
      $('#g-msg').textContent = "Sorry, that didn't work. Please try again.";
      const f = $('#g-form'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); pw.value = ''; pw.focus();
    };
  },
  setup(first) {
    $('#g-main').innerHTML = `<form class="g-card g-setup" id="g-setup">
      <div class="g-setup-head">${first ? '<h2>Welcome to HitBoy Web-OS</h2><p>Create your account to get started.</p>' : '<h2>Add account</h2><p>Each account gets its own sign-in.</p>'}</div>
      <label class="field">Full name<input id="s-name" required maxlength="32" autocomplete="name" spellcheck="false"></label>
      <label class="field">Username<input id="s-user" disabled></label>
      <label class="field"><span>Password <span class="muted">(optional)</span></span><input id="s-pw" type="password" autocomplete="new-password"></label>
      <label class="field s-pw2 hidden">Confirm password<input id="s-pw2" type="password" autocomplete="new-password"></label>
      <div class="g-msg" id="g-msg"></div>
      <div class="row" style="justify-content:flex-end">${first ? '' : '<button type="button" class="ghost" id="s-cancel">Cancel</button>'}<button class="primary" type="submit">${first ? 'Get started' : 'Add account'}</button></div>
    </form>`;
    const n = $('#s-name'), p = $('#s-pw'), p2 = $('#s-pw2');
    n.oninput = () => $('#s-user').value = Users.slug(n.value || '');
    p.oninput = () => $('.s-pw2').classList.toggle('hidden', !p.value);
    $('#s-cancel')?.addEventListener('click', () => this.show());
    setTimeout(() => n.focus(), 60);
    $('#g-setup').onsubmit = async e => {
      e.preventDefault();
      if (p.value && p.value !== p2.value) { $('#g-msg').textContent = "Passwords don't match."; return p2.focus(); }
      const u = await Users.create(n.value, p.value);
      first ? this.pickStyle(u) : this.prompt(u);
    };
  },
  // First boot: choose how the desktop looks (changeable later in Settings → Desktop).
  pickStyle(u) {
    $('#g-main').innerHTML = `<div class="g-card g-setup g-style"><div class="g-setup-head"><h2>Choose your desktop</h2><p>You can change this, or mix parts of each, any time in Settings → Desktop.</p></div>
      <div class="style-grid">${Object.entries(SHELL_PRESETS).map(([id, p]) => `<button class="style-card" data-shell="${id}">${shellPreview(p)}<b>${esc(p.name)}</b><small>${p.family}</small></button>`).join('')}</div></div>`;
    $('#g-main').onclick = e => { const b = e.target.closest('[data-shell]'); if (!b) return; $('#g-main').onclick = null; OS.set({ shell: b.dataset.shell, themeName: null, wall: null, accent: null }); this.done(u); };
  },
  done(u, unlocking) {
    OS.user = u.user; OS.account = u;
    try { localStorage.setItem('novaos.lastUser', u.user); } catch (e) {}
    this.hide(); OS.enterDesktop(unlocking);
  },
};
