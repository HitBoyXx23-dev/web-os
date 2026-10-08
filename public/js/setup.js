// Setup: the first-boot wizard (desktop style, appearance, account, options).
// Run it again any time with "setup" in the terminal or Settings → System → Run setup again.
const Setup = {
  start(opts = {}) {
    const rerun = !!opts.rerun, c = OS.cfg, el = $('#setup');
    if (rerun) { WM.closeAll(); Shell.hideCli(); $('#desktop').classList.add('hidden'); }
    $('#greeter').classList.add('hidden'); $('#tty').classList.add('hidden'); el.classList.remove('hidden');
    const st = {
      shell: c.shell && (c.shell in SHELL_PRESETS || c.shell === 'custom') ? c.shell : 'hitboy',
      custom: { ...SHELL_PRESETS.hitboy, ...c.shellCustom }, mode: c.theme || 'dark', themeName: c.themeName || null,
      name: '', pw: '', pw2: '', proxy: c.proxy !== false, boot: !c.fastBoot, icons: c.desktopIcons !== false, cloak: c.cloak || 'None',
    };
    const preset = () => st.shell === 'custom' ? st.custom : SHELL_PRESETS[st.shell];
    const theme = () => THEMES[st.themeName] || THEMES[preset().theme] || THEMES.default;
    const steps = () => [['welcome', 'Welcome'], ['desktop', 'Desktop'], ...(preset().cli ? [] : [['look', 'Appearance']]),
      ...(rerun ? [] : [['account', 'Account']]), ['options', 'Apps & privacy'], ['install', rerun ? 'Apply' : 'Install']];
    let step = 'welcome';
    const sel = (part, v) => `<select data-part="${part}">${Object.entries(SHELL_PARTS[part]).map(([k, n]) => `<option value="${k}" ${st.custom[part] === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    const sw = (key, label, sub) => `<label class="su-opt"><div><b>${label}</b><small>${sub}</small></div><input type="checkbox" class="switch" data-opt="${key}" ${st[key] ? 'checked' : ''}></label>`;

    const views = {
      welcome: () => `<div class="su-hero"><div class="su-mark"></div><h1>Welcome to HitBoy Web-OS</h1>
        <p>Let's set up your computer. It takes about a minute, and you can change everything later in Settings.</p>
        <ul class="su-feats">${[['vm', 'Windows, macOS and Linux desktops — or just a command line'], ['games', '115+ games, Doom and classic consoles'], ['browser', 'A proxy browser for YouTube, Discord and more'], ['terminal', 'Virtual machines: Ubuntu, Arch Linux, Windows 98']].map(([g, t]) => `<li>${tile(g, 30)}<span>${t}</span></li>`).join('')}</ul></div>`,
      desktop: () => `<h2>Choose your desktop</h2><p class="su-sub">How HitBoy Web-OS looks and works. The command line is text only — no windows, mouse or desktop.</p>
        <div class="style-grid su-styles">${Object.entries(SHELL_PRESETS).map(([id, p]) => `<button class="style-card ${st.shell === id ? 'on' : ''}" data-shell="${id}">${shellPreview(p)}<b>${esc(p.name)}</b><small>${p.family}${id === 'hitboy' ? ' · recommended' : ''}</small></button>`).join('')}
          <button class="style-card ${st.shell === 'custom' ? 'on' : ''}" data-shell="custom">${shellPreview({ ...st.custom, cli: false })}<b>Hybrid</b><small>Mix and match</small></button></div>
        ${st.shell === 'custom' ? `<div class="su-hybrid">${['top', 'bottom', 'launcher', 'chrome'].map(p => `<label class="field">${{ top: 'Top bar', bottom: 'Taskbar / dock', launcher: 'App launcher', chrome: 'Window buttons' }[p]}${sel(p)}</label>`).join('')}</div>` : ''}`,
      look: () => `<h2>Appearance</h2><p class="su-sub">Pick a color theme. "Match desktop" uses the one that comes with ${esc(st.shell === 'custom' ? 'your hybrid desktop' : preset().name)}.</p>
        <div class="seg su-mode">${['dark', 'light'].map(m => `<button data-mode="${m}" class="${st.mode === m ? 'on' : ''}">${m === 'dark' ? 'Dark' : 'Light'}</button>`).join('')}</div>
        <div class="su-themes"><button class="su-theme ${!st.themeName ? 'on' : ''}" data-theme=""><i style="background:${(THEMES[preset().theme] || THEMES.default).wall}"></i><b>Match desktop</b></button>
          ${Object.entries(THEMES).map(([id, t]) => `<button class="su-theme ${st.themeName === id ? 'on' : ''}" data-theme="${id}"><i style="background:${t.wall}"><em style="background:${t.accent}"></em></i><b>${esc(t.name)}</b></button>`).join('')}</div>`,
      account: () => `<h2>Create your account</h2><p class="su-sub">Used to sign in. The password is optional and only stored (hashed) in this browser.</p>
        <div class="su-form"><label class="field">Your name<input data-f="name" value="${esc(st.name)}" maxlength="32" autocomplete="name" spellcheck="false"></label>
        <label class="field">Username<input class="su-user" value="${esc(st.name ? Users.slug(st.name) : '')}" disabled></label>
        <label class="field"><span>Password <span class="muted">(optional)</span></span><input data-f="pw" type="password" value="${esc(st.pw)}" autocomplete="new-password"></label>
        <label class="field">Confirm password<input data-f="pw2" type="password" value="${esc(st.pw2)}" autocomplete="new-password"></label></div>`,
      options: () => `<h2>Apps & privacy</h2><p class="su-sub">You can change these in Settings.</p>
        <div class="su-opts">${sw('proxy', 'Proxy browser', 'Open websites and web games through the built-in proxy')}
        ${sw('boot', 'Boot menu', 'Show the GRUB menu and boot messages at startup')}
        ${preset().cli ? '' : sw('icons', 'Desktop icons', 'Show app shortcuts on the desktop')}
        <label class="su-opt"><div><b>Tab disguise</b><small>Make this browser tab look like another site</small></div><select data-cloak>${Object.keys(CLOAKS).map(k => `<option ${st.cloak === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label></div>`,
      install: () => `<h2>${rerun ? 'Applying your settings' : 'Installing HitBoy Web-OS'}</h2><p class="su-sub su-status">Almost there…</p>
        <div class="su-bar"><i></i></div><pre class="su-log"></pre>`,
    };

    const draw = () => {
      const list = steps(), idx = list.findIndex(s => s[0] === step), t = theme();
      el.style.background = preset().cli ? '#050505' : t.wall;
      el.innerHTML = `<div class="su-win"><aside><div class="su-brand"><span class="su-logo"></span>Setup</div>
          <ol>${list.map(([id, n], i) => `<li class="${i < idx ? 'done' : i === idx ? 'on' : ''}">${n}</li>`).join('')}</ol></aside>
        <section><div class="su-body">${views[step]()}</div><div class="su-msg"></div>
          <footer>${step === 'install' ? '' : `${idx > 0 ? '<button class="ghost" data-nav="back">Back</button>' : rerun ? '<button class="ghost" data-nav="cancel">Cancel</button>' : ''}<span class="grow"></span>
          <button class="primary" data-nav="next">${list[idx + 1]?.[0] === 'install' ? (rerun ? 'Apply' : 'Install') : step === 'welcome' ? 'Get started' : 'Next'}</button>`}</footer></section></div>`;
      el.querySelectorAll('.su-logo, .su-mark').forEach(s => s.appendChild($('#mark-tpl').content.cloneNode(true)));
      el.querySelector('[data-f=name]')?.focus();
      el.querySelector('.su-hybrid')?.scrollIntoView({ block: 'nearest' });
      if (step === 'install') install();
    };
    const msg = t => { el.querySelector('.su-msg').textContent = t; };

    const next = () => {
      if (step === 'account') {
        if (!st.name.trim()) return msg('Enter your name.');
        if (st.pw !== st.pw2) return msg("Passwords don't match.");
      }
      const list = steps(); step = list[list.findIndex(s => s[0] === step) + 1][0]; draw();
    };
    el.onclick = e => {
      const nav = e.target.closest('[data-nav]')?.dataset.nav;
      if (nav === 'next') return next();
      if (nav === 'back') { const list = steps(); step = list[list.findIndex(s => s[0] === step) - 1][0]; return draw(); }
      if (nav === 'cancel') { el.classList.add('hidden'); return OS.enterDesktop(true); }
      const s = e.target.closest('[data-shell]'); if (s) { st.shell = s.dataset.shell; return draw(); }
      const m = e.target.closest('[data-mode]'); if (m) { st.mode = m.dataset.mode; return draw(); }
      const th = e.target.closest('[data-theme]'); if (th) { st.themeName = th.dataset.theme || null; return draw(); }
    };
    el.oninput = e => {
      const f = e.target.dataset.f; if (f) { st[f] = e.target.value; if (f === 'name') el.querySelector('.su-user').value = e.target.value ? Users.slug(e.target.value) : ''; msg(''); }
    };
    el.onchange = e => {
      const d = e.target.dataset;
      if (d.part) { st.custom[d.part] = e.target.value; draw(); }
      if (d.opt) st[d.opt] = e.target.checked;
      if ('cloak' in d) st.cloak = e.target.value;
    };
    el.onkeydown = e => { if (e.key === 'Enter' && step !== 'install' && !e.target.closest('button, select')) { e.preventDefault(); next(); } };

    const install = async () => {
      const log = el.querySelector('.su-log'), bar = el.querySelector('.su-bar i'), p = preset();
      const tasks = [
        ['Preparing the file system', () => FS.ready],
        [rerun ? 'Updating your account' : `Creating the account "${Users.slug(st.name)}"`, async () => { if (!rerun) st.user = await Users.create(st.name, st.pw); }],
        [`Setting up the ${st.shell === 'custom' ? 'hybrid' : p.name} ${p.cli ? 'console' : 'desktop'}`, () => OS.set({
          shell: st.shell, ...(st.shell === 'custom' ? { shellCustom: { top: p.top, bottom: p.bottom, launcher: p.launcher, chrome: p.chrome, theme: p.theme } } : {}),
          themeName: st.themeName, theme: st.mode, accent: null, wall: null, ...(p.cli ? {} : { lastGui: st.shell }) })],
        ['Configuring the proxy', () => OS.set({ proxy: st.proxy })],
        ['Applying privacy settings', () => OS.set({ cloak: st.cloak === 'None' ? null : st.cloak, fastBoot: !st.boot, desktopIcons: st.icons })],
        [`Registering ${Object.keys(ALL_APPS).length} apps and ${WEB_CATALOG.length + Object.keys(GAME_APPS).length + Object.keys(DOS_APPS).length} games`, () => {}],
        ['Finishing up', () => OS.set({ setupDone: true })],
      ];
      for (let i = 0; i < tasks.length; i++) {
        log.textContent += `${tasks[i][0]}…\n`; await tasks[i][1](); await sleep(rerun ? 180 : 420);
        bar.style.width = ((i + 1) / tasks.length * 100) + '%';
      }
      el.querySelector('.su-status').textContent = 'All done.';
      el.querySelector('footer').innerHTML = `<span class="grow"></span><button class="primary" data-a="go">${p.cli ? 'Start the command line' : 'Start using HitBoy Web-OS'}</button>`;
      el.querySelector('[data-a=go]').onclick = () => {
        el.classList.add('hidden'); el.innerHTML = '';
        if (rerun) OS.enterDesktop(); else Greeter.done(st.user);
      };
      el.querySelector('[data-a=go]').focus();
    };
    draw();
  },
};
