// App registry. Each app: { name, icon, cat, w, h, run(body, win, arg) }.
const frame = url => `<iframe src="${esc(url)}" allow="autoplay; fullscreen; gamepad; keyboard-map" allowfullscreen></iframe>`;
const card = (icon, name, sub, attrs = '', extra = '') => `<div class="card" ${attrs}>${tile(icon, 40)}<div class="meta"><div class="name">${esc(name)}</div><div class="sub">${esc(sub)}</div></div>${extra}</div>`;

// Operating systems the Virtual PC can boot, via the open-source v86 x86 emulator (copy.sh/v86).
const VM_PROFILES = [
  { id: 'windows98', name: 'Windows 98', mono: '98', bg: '#0f766e', note: 'Second Edition · 1998' },
  { id: 'windows95', name: 'Windows 95', mono: '95', bg: '#0e7490', note: 'The first Start menu · 1995' },
  { id: 'windowsme', name: 'Windows ME', mono: 'ME', bg: '#1d4ed8', note: 'Millennium Edition · 2000' },
  { id: 'windows2000', name: 'Windows 2000', mono: '2K', bg: '#4338ca', note: 'NT 5.0 · slower to boot' },
  { id: 'windows30', name: 'Windows 3.0', mono: '3.0', bg: '#475569', note: 'Program Manager · 1990' },
  { id: 'windows1', name: 'Windows 1.01', mono: '1.0', bg: '#334155', note: 'The original · 1985' },
  { id: 'reactos', name: 'ReactOS', mono: 'Ro', bg: '#2563eb', note: 'Open-source Windows clone' },
  { id: 'freedos', name: 'FreeDOS', mono: 'DOS', bg: '#27272a', note: 'Command line' },
  { id: 'linux26', name: 'Linux', mono: 'Lx', bg: '#ca8a04', note: 'Minimal 2.6 kernel' },
  { id: 'kolibrios', name: 'KolibriOS', mono: 'K', bg: '#16a34a', note: 'Tiny assembly GUI OS' },
];

const APPS = {
  games: { name: 'Games', icon: 'games', cat: 'System', w: 760, h: 560, run(body) {
    const custom = JSON.parse(localStorage.getItem('novaos.customGames') || '[]');
    const draw = () => {
      body.innerHTML = `<div class="app-head"><h3>Games</h3><p>Built-in games run offline. Web games load from their own sites.</p></div>
        <div class="section-label">Built-in</div>
        <div class="cards">${Object.entries(GAME_APPS).map(([id, g]) => card(g.icon, g.name, g.desc, `data-app="${id}"`)).join('')}</div>
        <div class="section-label">Web games</div>
        <div class="cards">${[...WEB_GAMES, ...custom].map((g, i) => card({ mono: g.mono || g.name.slice(0, 2), bg: g.bg || '#52525b' }, g.name, g.custom ? 'Added by you' : new URL(g.url).hostname,
          `data-url="${esc(g.url)}" data-name="${esc(g.name)}"`, g.custom ? `<button class="icon-btn" data-rm="${i - WEB_GAMES.length}" title="Remove">${glyph('trash', 15)}</button>` : '')).join('')}</div>
        <div class="section-label">Add a game</div>
        <div class="row" style="padding:0 20px 20px"><input class="gn" placeholder="Name" style="width:160px"><input class="gu grow" placeholder="https://…"><button class="primary ga">Add</button></div>`;
    };
    body.onclick = e => {
      if (e.target.closest('[data-rm]')) { custom.splice(+e.target.closest('[data-rm]').dataset.rm, 1); localStorage.setItem('novaos.customGames', JSON.stringify(custom)); return draw(); }
      if (e.target.closest('.ga')) {
        const name = body.querySelector('.gn').value.trim(), url = body.querySelector('.gu').value.trim();
        if (!name || !/^https?:\/\//.test(url)) return OS.toast('Enter a name and a full http(s) address.');
        custom.push({ name, url, custom: true }); localStorage.setItem('novaos.customGames', JSON.stringify(custom)); return draw();
      }
      const c = e.target.closest('.card'); if (!c) return;
      if (c.dataset.app) OS.launch(c.dataset.app);
      else WM.open({ title: c.dataset.name, icon: { mono: c.dataset.name.slice(0, 2), bg: '#52525b' }, w: 900, h: 640, content: frame(c.dataset.url) });
    };
    draw();
  } },

  vm: { name: 'Virtual PC', icon: 'vm', cat: 'System', w: 760, h: 540, run(body) {
    body.innerHTML = `<div class="app-head"><h3>Virtual PC</h3><p>Boot a real operating system inside an emulated x86 PC, powered by the open-source v86 emulator. The first boot downloads the disk image and can take a minute.</p></div>
      <div class="section-label">Choose a system</div>
      <div class="cards" style="padding-bottom:20px">${VM_PROFILES.map(p => card({ mono: p.mono, bg: p.bg }, p.name, p.note, `data-id="${p.id}"`)).join('')}</div>`;
    body.onclick = e => {
      const c = e.target.closest('.card'); if (!c) return;
      const p = VM_PROFILES.find(v => v.id === c.dataset.id);
      const w = WM.open({ title: p.name, icon: { mono: p.mono, bg: p.bg }, w: 1060, h: 820, content: frame('https://copy.sh/v86/?profile=' + p.id) });
      WM.toggleMax(w, true);
    };
  } },

  notepad: { name: 'Notepad', icon: 'notepad', cat: 'Apps', w: 620, h: 460, run(body, win, path) {
    body.innerHTML = `<div class="fill"><div class="toolbar"><button class="ghost o">${glyph('open')}Open</button><button class="ghost s">${glyph('download')}Save</button><div class="sep"></div>
      <input class="p grow" spellcheck="false" style="border-color:transparent;background:none"><span class="small muted st"></span></div>
      <textarea class="grow" spellcheck="false" style="resize:none;border:0;border-radius:0;padding:14px 16px;font:13px/1.6 var(--mono);background:var(--surface)"></textarea></div>`;
    const p = body.querySelector('.p'), ta = body.querySelector('textarea'), st = body.querySelector('.st');
    let saved = '';
    const status = () => { st.textContent = ta.value === saved ? '' : 'Edited'; WM.setTitle(win, p.value.split('/').pop() + (ta.value === saved ? '' : ' •') + ' — Notepad'); };
    const load = f => { const c = FS.read(f); if (c === null) return OS.toast('File not found: ' + f); p.value = f; ta.value = saved = c; status(); };
    p.value = path || '/Documents/untitled.txt'; if (path) load(path); else status();
    body.querySelector('.o').onclick = () => load(p.value);
    const save = () => { FS.write(p.value, ta.value); saved = ta.value; status(); OS.toast('Saved to ' + p.value); };
    body.querySelector('.s').onclick = save;
    ta.oninput = status;
    ta.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); } };
    setTimeout(() => ta.focus());
  } },

  files: { name: 'Files', icon: 'files', cat: 'Apps', w: 640, h: 440, run(body) {
    let cwd = '/';
    const draw = () => {
      const items = FS.list(cwd);
      body.innerHTML = `<div class="fill"><div class="toolbar"><button class="icon-btn up" title="Up">${glyph('up')}</button>
        <span class="crumbs grow">${cwd === '/' ? 'Home' : 'Home' + esc(cwd).split('/').join(' / ')}</span>
        <button class="ghost nf">${glyph('file')}New file</button><button class="ghost nd">${glyph('folder')}New folder</button></div>
        <div class="grow" style="overflow:auto">${items.length ? `<ul class="list">${items.map(f => `<li class="${f.type}" data-p="${esc(f.path)}" data-t="${f.type}">${glyph(f.type === 'dir' ? 'folder' : 'file', 18)}<span>${esc(f.name)}</span>
          <button class="icon-btn act" data-del title="Delete">${glyph('trash', 15)}</button></li>`).join('')}</ul>` : '<div class="empty">This folder is empty</div>'}</div></div>`;
      body.querySelector('.up').onclick = () => { cwd = FS.join(cwd, '..'); draw(); };
      body.querySelector('.nf').onclick = () => { const n = prompt('File name', 'untitled.txt'); if (n) { FS.write(FS.join(cwd, n), ''); draw(); } };
      body.querySelector('.nd').onclick = () => { const n = prompt('Folder name', 'New folder'); if (n) { FS.mkdir(FS.join(cwd, n)); draw(); } };
      body.querySelectorAll('li[data-p]').forEach(li => li.ondblclick = li.onclick = e => {
        if (e.target.closest('[data-del]')) { if (confirm('Delete ' + li.dataset.p + '?')) { FS.rm(li.dataset.p); draw(); } return; }
        if (e.type === 'click' && li.dataset.t !== 'dir') return;
        if (li.dataset.t === 'dir') { cwd = li.dataset.p; draw(); } else OS.launch('notepad', li.dataset.p);
      });
    };
    draw();
  } },

  terminal: { name: 'Terminal', icon: 'terminal', cat: 'Apps', w: 680, h: 420, run(body) {
    body.innerHTML = '<div class="term"><div class="out"></div><span class="ps"></span><input spellcheck="false" autocomplete="off"></div>';
    const out = body.querySelector('.out'), inp = body.querySelector('input'), ps = body.querySelector('.ps'); let cwd = '/', hist = [], hi = 0;
    const print = s => { out.textContent += s + '\n'; body.firstChild.scrollTop = 1e9; };
    const prompt_ = () => ps.textContent = `${OS.user}@nova ${cwd === '/' ? '~' : '~' + cwd} $ `;
    const cmds = {
      help: () => 'ls [dir]   cd <dir>   pwd   cat <file>   echo <text> [> file]\nmkdir <dir>   touch <file>   rm <path>   clear   date   whoami\nopen <app>   apps   neofetch   history',
      ls: a => FS.list(FS.join(cwd, a[0] || '.')).map(f => f.name + (f.type === 'dir' ? '/' : '')).join('   '),
      cd: a => { const p = FS.join(cwd, a[0] || '/'); if (!FS.isDir(p)) return 'cd: no such directory: ' + a[0]; cwd = p; },
      pwd: () => cwd, cat: a => FS.read(FS.join(cwd, a[0] || '')) ?? 'cat: no such file: ' + a[0],
      echo: a => { const i = a.indexOf('>'); if (i >= 0) { FS.write(FS.join(cwd, a[i + 1]), a.slice(0, i).join(' ')); return; } return a.join(' '); },
      mkdir: a => { FS.mkdir(FS.join(cwd, a[0])); }, touch: a => { const p = FS.join(cwd, a[0]); if (!FS.exists(p)) FS.write(p, ''); },
      rm: a => { FS.rm(FS.join(cwd, a[0])); }, clear: () => { out.textContent = ''; }, date: () => new Date().toString(), whoami: () => OS.user,
      history: () => hist.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n'),
      apps: () => Object.keys(ALL_APPS).join('   '), open: a => ALL_APPS[a[0]] ? (OS.launch(a[0]), '') : 'open: unknown app (see "apps")',
      neofetch: () => `${OS.user}@nova\n${'-'.repeat(OS.user.length + 5)}\nOS       NovaOS 1.2\nShell    nsh\nBrowser  ${navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[0] || 'unknown'}\nScreen   ${screen.width}x${screen.height}\nApps     ${Object.keys(ALL_APPS).length}\nWindows  ${WM.wins.size}`,
    };
    inp.onkeydown = e => {
      if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); inp.value = hist[hi] ?? ''; return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] ?? ''; return; }
      if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.textContent = ''; return; }
      if (e.key !== 'Enter') return;
      const line = inp.value.trim(); inp.value = ''; print(ps.textContent + line); if (!line) return;
      hist.push(line); hi = hist.length;
      const [c, ...a] = line.split(/\s+/);
      const r = cmds[c] ? cmds[c](a) : `nsh: command not found: ${c}`; if (r) print(r); prompt_();
    };
    body.onclick = () => getSelection().isCollapsed && inp.focus(); print('NovaOS shell. Type "help" for commands.\n'); prompt_(); setTimeout(() => inp.focus());
  } },

  calc: { name: 'Calculator', icon: 'calc', cat: 'Apps', w: 320, h: 460, run(body, win) {
    let expr = '', last = '';
    const keys = [['C', 'op'], ['(', 'op'], [')', 'op'], ['÷', 'op'], ['7'], ['8'], ['9'], ['×', 'op'], ['4'], ['5'], ['6'], ['−', 'op'], ['1'], ['2'], ['3'], ['+', 'op'], ['0'], ['.'], ['⌫', 'op'], ['=', 'eq']];
    body.innerHTML = `<div class="calc"><div class="disp"><small></small><div>0</div></div>${keys.map(([k, c]) => `<button class="${c || ''}">${k}</button>`).join('')}</div>`;
    const d = body.querySelector('.disp div'), h = body.querySelector('.disp small');
    const press = k => {
      if (k === 'C') { expr = ''; last = ''; }
      else if (k === '⌫') expr = expr.slice(0, -1);
      else if (k === '=') {
        const js = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        try { const v = /^[\d+\-*/(). ]+$/.test(js) ? Function('return ' + js)() : NaN; last = expr + ' ='; expr = isFinite(v) ? String(+v.toFixed(10)) : 'Error'; } catch (e) { expr = 'Error'; }
      } else expr = (expr === 'Error' ? '' : expr) + k;
      d.textContent = expr || '0'; h.textContent = last;
    };
    body.querySelectorAll('button').forEach(b => b.onclick = () => press(b.textContent));
    onKeys(win, e => {
      const map = { '*': '×', '/': '÷', '-': '−', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'C', c: 'C' };
      const k = map[e.key] || (/^[\d.+()]$/.test(e.key) ? e.key : null); if (k) { e.preventDefault(); press(k); }
    });
  } },

  browser: { name: 'Browser', icon: 'browser', cat: 'Apps', w: 1040, h: 700, run: (body, win, url) => BrowserApp(body, win, { url }) },

  store: { name: 'App Store', icon: 'store', cat: 'System', w: 780, h: 560, run(body) {
    let q = '';
    const draw = () => {
      const inst = OS.cfg.installed || [], cats = [...new Set(STORE.map(s => s.cat))];
      const match = s => !q || (s.name + s.desc).toLowerCase().includes(q);
      body.innerHTML = `<div class="app-head row" style="justify-content:space-between"><div><h3>App Store</h3><p>Install web apps to your desktop. They open through the proxy browser.</p></div>
        <input class="sq" placeholder="Search" style="width:200px" value="${esc(q)}"></div>` +
        cats.map(c => { const list = STORE.filter(s => s.cat === c && match(s)); return list.length ? `<div class="section-label">${c}</div><div class="cards">${list.map(s => card({ mono: s.mono, bg: s.bg }, s.name, s.desc, `data-id="${s.id}"`,
          inst.includes(s.id) ? `<button data-open="${s.id}">Open</button><button class="icon-btn" data-rm="${s.id}" title="Uninstall">${glyph('trash', 15)}</button>` : `<button class="primary" data-add="${s.id}">Get</button>`)).join('')}</div>` : ''; }).join('') +
        '<div style="height:20px"></div>';
      const sq = body.querySelector('.sq'); sq.oninput = () => { q = sq.value.toLowerCase(); draw(); const n = body.querySelector('.sq'); n.focus(); n.setSelectionRange(99, 99); };
    };
    body.onclick = e => {
      const d = (e.target.closest('button') || {}).dataset || {}, inst = OS.cfg.installed || [];
      if (d.add) { OS.set({ installed: [...inst, d.add] }); OS.syncApps(); OS.toast(STORE.find(s => s.id === d.add).name + ' was added to your desktop'); draw(); }
      if (d.rm) { OS.set({ installed: inst.filter(i => i !== d.rm) }); OS.syncApps(); draw(); }
      if (d.open) OS.launch('web:' + d.open);
    };
    draw();
  } },

  media: { name: 'Media Player', icon: 'media', cat: 'Apps', w: 780, h: 500, run(body, win) {
    body.innerHTML = `<div class="fill"><div class="toolbar"><button class="ghost of">${glyph('open')}Open files</button><input type="file" accept="audio/*,video/*" multiple hidden>
      <div class="sep"></div><input class="mu grow" placeholder="Paste a direct link to an .mp4, .webm or .mp3 file"><button class="mg">Play</button></div>
      <div class="grow" style="display:flex;min-height:0"><video controls style="flex:1;min-width:0;background:#000"></video>
      <div style="width:220px;border-left:1px solid var(--line);overflow:auto"><div class="section-label" style="padding:12px 12px 4px">Playlist</div><ul class="list pl"></ul><div class="empty small pe">Nothing queued</div></div></div></div>`;
    const v = body.querySelector('video'), pl = body.querySelector('.pl'), fi = body.querySelector('input[type=file]'); let list = [], idx = 0; const urls = [];
    const play = i => { idx = i; v.src = list[i].src; v.play().catch(() => {}); render(); };
    const render = () => { body.querySelector('.pe').style.display = list.length ? 'none' : ''; pl.innerHTML = list.map((m, i) => `<li data-i="${i}" style="${i === idx ? 'color:var(--accent);font-weight:500' : ''}">${glyph('media', 15)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span></li>`).join(''); };
    body.querySelector('.of').onclick = () => fi.click();
    fi.onchange = () => { const start = list.length; for (const f of fi.files) { const src = URL.createObjectURL(f); urls.push(src); list.push({ name: f.name, src }); } if (fi.files.length) play(start); };
    body.querySelector('.mg').onclick = () => { const u = body.querySelector('.mu').value.trim(); if (u) { list.push({ name: decodeURIComponent(u.split('/').pop()) || u, src: u }); play(list.length - 1); } };
    pl.onclick = e => { const li = e.target.closest('li'); if (li) play(+li.dataset.i); };
    v.onended = () => idx + 1 < list.length && play(idx + 1);
    win.cleanup.push(() => urls.forEach(u => URL.revokeObjectURL(u)));
  } },

  paint: { name: 'Paint', icon: 'paint', cat: 'Apps', w: 760, h: 540, run(body) {
    const colors = ['#18181b', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ffffff'];
    body.innerHTML = `<div class="fill"><div class="toolbar"><div class="swatches">${colors.map((c, i) => `<button data-c="${c}" style="background:${c}" class="${i ? '' : 'on'}"></button>`).join('')}</div>
      <input type="color" value="#18181b" title="Custom color"><div class="sep"></div><span class="small muted">Size</span><input type="range" min="1" max="40" value="4" style="width:100px">
      <div class="sep"></div><button class="icon-btn e" title="Eraser">${glyph('eraser')}</button><button class="ghost c">Clear</button><span class="grow"></span><button class="ghost s">${glyph('download')}Save</button></div>
      <div class="grow" style="background:#fff;position:relative"><canvas style="cursor:crosshair;position:absolute;inset:0"></canvas></div></div>`;
    const cv = body.querySelector('canvas'), x = cv.getContext('2d'), host = cv.parentElement; let drawing = false, erase = false, color = colors[0];
    const fit = () => { const img = cv.width ? x.getImageData(0, 0, cv.width, cv.height) : null; cv.width = host.clientWidth; cv.height = host.clientHeight; x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); if (img) x.putImageData(img, 0, 0); };
    setTimeout(fit); new ResizeObserver(fit).observe(host);
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.onpointerdown = e => { drawing = true; cv.setPointerCapture(e.pointerId); x.beginPath(); x.moveTo(...pos(e)); x.lineTo(...pos(e)); stroke(); };
    const stroke = () => { x.lineCap = x.lineJoin = 'round'; x.lineWidth = body.querySelector('[type=range]').value * (erase ? 3 : 1); x.strokeStyle = erase ? '#fff' : color; x.stroke(); };
    cv.onpointermove = e => { if (drawing) { x.lineTo(...pos(e)); stroke(); } };
    cv.onpointerup = () => drawing = false;
    body.querySelector('.swatches').onclick = e => { const b = e.target.closest('button'); if (!b) return; color = b.dataset.c; erase = false; body.querySelector('.e').classList.remove('on'); body.querySelectorAll('.swatches button').forEach(s => s.classList.toggle('on', s === b)); };
    body.querySelector('[type=color]').oninput = e => { color = e.target.value; erase = false; body.querySelectorAll('.swatches button').forEach(s => s.classList.remove('on')); };
    body.querySelector('.e').onclick = e => { erase = !erase; e.currentTarget.classList.toggle('on', erase); };
    body.querySelector('.c').onclick = () => { x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); };
    body.querySelector('.s').onclick = () => { const a = document.createElement('a'); a.download = 'drawing.png'; a.href = cv.toDataURL(); a.click(); };
  } },

  taskmgr: { name: 'Task Manager', icon: 'taskmgr', cat: 'System', w: 480, h: 400, run(body, win) {
    const draw = () => {
      const mem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : '—';
      const others = [...WM.wins.values()].filter(w => w !== win);
      body.innerHTML = `<div class="pad row" style="gap:24px"><div><div class="small muted">Memory</div><div style="font-size:20px;font-weight:600">${mem}</div></div>
        <div><div class="small muted">Windows</div><div style="font-size:20px;font-weight:600">${others.length}</div></div></div>
        ${others.length ? `<ul class="list" style="padding:0 8px">${others.map(w => `<li>${tile(w.icon, 22)}<span>${esc(w.el.querySelector('.t').textContent)}</span><button class="danger" data-k="${w.id}" style="margin-left:auto">End task</button></li>`).join('')}</ul>` : '<div class="empty">No other apps are running</div>'}`;
    };
    body.onclick = e => { const b = e.target.closest('[data-k]'); if (b) { WM.close(b.dataset.k); draw(); } };
    draw(); loop(win, draw, 2000);
  } },

  settings: { name: 'Settings', icon: 'settings', cat: 'System', w: 760, h: 540, run(body, win, page = 'appearance') {
    const pages = { appearance: ['paint', 'Appearance'], proxy: ['shield', 'Proxy'], privacy: ['lock', 'Privacy'], system: ['about', 'System'] };
    const row = (l, s, ctl) => `<div class="set-row"><div class="l"><span>${l}</span>${s ? `<small>${s}</small>` : ''}</div>${ctl}</div>`;
    const draw = () => {
      const c = OS.cfg; let html = '';
      if (page === 'appearance') html = `<h3>Appearance</h3>
        ${row('Theme', 'Applies to windows, menus and the taskbar', `<div class="seg">${['dark', 'light'].map(t => `<button data-theme="${t}" class="${(c.theme || 'dark') === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>`)}
        ${row('Accent color', '', `<div class="swatches">${ACCENTS.map(a => `<button data-accent="${a}" style="background:${a}" class="${(c.accent || ACCENTS[0]) === a ? 'on' : ''}"></button>`).join('')}</div>`)}
        <div><div class="small muted" style="margin-bottom:8px">Wallpaper</div><div class="walls">${Object.entries(WALLPAPERS).map(([n, w]) => `<button data-wall="${n}" title="${n}" style="background:${w}" class="${(c.wall || WALLPAPERS.Graphite) === w ? 'on' : ''}"></button>`).join('')}</div></div>
        <div class="row"><input class="iu grow" placeholder="Or paste an image URL"><button class="ib">Use image</button></div>`;
      if (page === 'proxy') html = `<h3>Proxy</h3>
        ${row('Use proxy in Browser', 'Routes pages through Ultraviolet so blocked sites can load', `<div class="seg">${['on', 'off'].map(v => `<button data-proxy="${v}" class="${(c.proxy !== false) === (v === 'on') ? 'on' : ''}">${v === 'on' ? 'On' : 'Off'}</button>`).join('')}</div>`)}
        <div class="set-row" style="flex-direction:column;align-items:stretch"><div class="l"><span>Wisp server</span><small>Leave blank to pick automatically: this site's own server if it has one (<code>npm start</code>), otherwise a public server.</small></div>
        <div class="row"><input class="ws grow" placeholder="Automatic" value="${esc(c.wisp || '')}"><button class="primary wb">Save</button></div></div>
        <div class="status-line"><span class="dot" id="st-dot"></span><span id="st-px">Checking…</span></div>`;
      if (page === 'privacy') html = `<h3>Privacy</h3>
        ${row('Tab disguise', 'Changes the browser tab title and icon', `<select class="ck">${Object.keys(CLOAKS).map(k => `<option ${(c.cloak || 'None') === k ? 'selected' : ''}>${k}</option>`).join('')}</select>`)}
        ${row('Open in about:blank', 'Runs NovaOS inside a blank tab that stays out of your history', `<button class="blank">${glyph('external', 14)}Open</button>`)}
        <div class="set-row" style="flex-direction:column;align-items:stretch"><div class="l"><span>Panic key</span><small>Press this key anywhere to jump straight to another site.</small></div>
        <div class="row"><input class="pk" style="width:110px" placeholder="Press a key" value="${esc(c.panicKey || '')}" readonly><input class="pu grow" placeholder="https://classroom.google.com" value="${esc(c.panicUrl || '')}"><button class="primary pb">Save</button></div></div>`;
      if (page === 'system') html = `<h3>System</h3>
        ${row('NovaOS', 'Version 1.2', `<button class="about">About</button>`)}
        ${row('Keyboard shortcuts', 'Ctrl+Space Start · Alt+` switch windows · Alt+W close · Alt+T terminal', '')}
        ${row('Storage', Object.keys(localStorage).filter(k => k.startsWith('novaos.')).reduce((n, k) => n + localStorage.getItem(k).length, 0).toLocaleString() + ' bytes used in this browser', '')}
        ${row('Reset', 'Erase files, settings, installed apps and scores', `<button class="danger rs">Reset…</button>`)}`;
      body.innerHTML = `<div class="settings"><nav>${Object.entries(pages).map(([k, [g, n]]) => `<button data-page="${k}" class="${k === page ? 'on' : ''}">${glyph(g)}${n}</button>`).join('')}</nav><section>${html}</section></div>`;
      if (page === 'proxy') OS.proxyStatus().then(([ok, m]) => { const d = body.querySelector('#st-dot'); if (d) { d.className = 'dot ' + (ok ? 'ok' : 'bad'); body.querySelector('#st-px').textContent = m; } });
      const pk = body.querySelector('.pk'); if (pk) pk.onkeydown = e => { e.preventDefault(); if (e.key !== 'Tab') pk.value = e.key; };
    };
    body.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.page) { page = d.page; return draw(); }
      if (d.theme) OS.set({ theme: d.theme }); if (d.accent) OS.set({ accent: d.accent }); if (d.wall) OS.set({ wall: WALLPAPERS[d.wall] });
      if (d.proxy) OS.set({ proxy: d.proxy === 'on' });
      if (b.classList.contains('ib')) { const u = body.querySelector('.iu').value.trim(); if (u) OS.set({ wall: `url("${u.replace(/["\\]/g, '')}") center/cover` }); }
      if (b.classList.contains('wb')) { OS.set({ wisp: body.querySelector('.ws').value.trim() }); try { await Proxy.ready(); await Proxy.setTransport(); OS.toast('Proxy server saved'); } catch (err) { OS.toast(err.message); } }
      if (b.classList.contains('blank')) OS.openBlank(location.href);
      if (b.classList.contains('pb')) { OS.set({ panicKey: body.querySelector('.pk').value, panicUrl: body.querySelector('.pu').value.trim() }); OS.toast('Panic key saved'); }
      if (b.classList.contains('about')) OS.launch('about');
      if (b.classList.contains('rs') && confirm('Erase everything stored by NovaOS in this browser?')) { Object.keys(localStorage).filter(k => k.startsWith('novaos.')).forEach(k => localStorage.removeItem(k)); location.reload(); }
      draw();
    };
    body.onchange = e => { if (e.target.classList.contains('ck')) OS.set({ cloak: e.target.value }); };
    draw();
  } },

  about: { name: 'About', icon: 'about', cat: 'System', w: 400, h: 300, run(body) {
    body.innerHTML = `<div class="pad" style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding-top:32px">
      <div style="color:var(--accent)">${document.getElementById('mark-tpl').innerHTML}</div><h3 style="font-size:18px">NovaOS</h3>
      <p class="muted">Version 1.2</p><p class="muted small" style="max-width:300px">A desktop in your browser with games, a proxy browser, and a Virtual PC that boots real operating systems.</p></div>`;
  } },
};

const GAME_APPS = {
  snake: { name: 'Snake', icon: 'snake', cat: 'Games', desc: 'Classic arcade', w: 460, h: 560, run: GAMES.snake },
  g2048: { name: '2048', icon: 'g2048', cat: 'Games', desc: 'Slide and merge tiles', w: 420, h: 520, run: GAMES.g2048 },
  mines: { name: 'Minesweeper', icon: 'mines', cat: 'Games', desc: '12 × 12, 20 mines', w: 420, h: 520, run: GAMES.minesweeper },
  ttt: { name: 'Tic-Tac-Toe', icon: 'ttt', cat: 'Games', desc: 'Against an unbeatable CPU', w: 340, h: 460, run: GAMES.tictactoe },
  breakout: { name: 'Breakout', icon: 'breakout', cat: 'Games', desc: 'Break every brick', w: 540, h: 520, run: GAMES.breakout },
  flappy: { name: 'Flappy', icon: 'flappy', cat: 'Games', desc: 'Tap to fly', w: 400, h: 620, run: GAMES.flappy },
};
const ALL_APPS = { ...APPS, ...GAME_APPS };

// Tab disguises: page title + favicon.
const CLOAKS = {
  None: null,
  'Google Classroom': { title: 'Home', icon: 'https://ssl.gstatic.com/classroom/favicon.png' },
  'Google Docs': { title: 'Untitled document - Google Docs', icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
  'Google Drive': { title: 'My Drive - Google Drive', icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
  Google: { title: 'Google', icon: 'https://www.google.com/favicon.ico' },
};
