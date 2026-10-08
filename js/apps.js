// App registry. Each app: { name, icon, cat, w, h, run(body, win, arg) }.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const frame = url => `<iframe src="${esc(url)}" allow="autoplay; fullscreen; gamepad; keyboard-map" allowfullscreen></iframe>`;

// Operating systems the Virtual PC can boot, via the open-source v86 x86 emulator (copy.sh/v86).
const VM_PROFILES = [
  { id: 'windows98', name: 'Windows 98', icon: '🪟', note: 'Classic desktop, Paint, Minesweeper' },
  { id: 'windows95', name: 'Windows 95', icon: '🪟', note: 'The original Start button' },
  { id: 'windowsme', name: 'Windows ME', icon: '🪟', note: 'Millennium Edition' },
  { id: 'windows2000', name: 'Windows 2000', icon: '🪟', note: 'NT-based, heavier — be patient' },
  { id: 'windows30', name: 'Windows 3.0', icon: '🪟', note: 'Program Manager era' },
  { id: 'windows1', name: 'Windows 1.01', icon: '🪟', note: 'Where it all began (1985)' },
  { id: 'reactos', name: 'ReactOS', icon: '🔷', note: 'Open-source Windows clone' },
  { id: 'freedos', name: 'FreeDOS', icon: '💾', note: 'DOS prompt' },
  { id: 'linux26', name: 'Linux', icon: '🐧', note: 'Tiny Linux 2.6' },
  { id: 'kolibrios', name: 'KolibriOS', icon: '🦅', note: 'Ultra-tiny GUI OS' },
];

const APPS = {
  games: { name: 'Games', icon: '🎮', cat: 'System', w: 640, h: 480, run(body) {
    const custom = JSON.parse(localStorage.getItem('novaos.customGames') || '[]');
    const local = Object.entries(GAME_APPS).map(([id, g]) => `<div class="card" data-app="${id}"><div class="em">${g.icon}</div>${g.name}<small>Offline</small></div>`).join('');
    const web = [...WEB_GAMES, ...custom].map(g => `<div class="card" data-url="${esc(g.url)}" data-name="${esc(g.name)}" data-icon="${esc(g.icon || '🌐')}"><div class="em">${esc(g.icon || '🌐')}</div>${esc(g.name)}<small>Online</small></div>`).join('');
    body.innerHTML = `<div class="pad"><h3 style="margin:0">🎮 Game Hub</h3></div><div class="grid-cards">${local}${web}</div>
      <div class="pad row"><input class="gn" placeholder="Game name"><input class="gu" placeholder="https://… game URL" style="flex:1"><button class="ga">+ Add game</button></div>`;
    body.onclick = e => {
      const c = e.target.closest('.card'); if (!c) return;
      if (c.dataset.app) OS.launch(c.dataset.app);
      else WM.open({ title: c.dataset.name, icon: c.dataset.icon, w: 800, h: 600, content: frame(c.dataset.url) });
    };
    body.querySelector('.ga').onclick = () => {
      const name = body.querySelector('.gn').value.trim(), url = body.querySelector('.gu').value.trim();
      if (!name || !/^https?:\/\//.test(url)) return alert('Enter a name and a full http(s) URL.');
      custom.push({ name, url, icon: '🌐' }); localStorage.setItem('novaos.customGames', JSON.stringify(custom)); this.run(body);
    };
  } },

  vm: { name: 'Virtual PC', icon: '🖥️', cat: 'System', w: 680, h: 500, run(body) {
    body.innerHTML = `<div class="pad"><h3 style="margin:0">🖥️ Virtual PC</h3><p style="color:var(--muted);margin:6px 0 0">Boots a real operating system inside an emulated x86 PC (powered by the open-source v86 emulator). First boot downloads the disk image — give it a minute.</p></div>
      <div class="grid-cards">${VM_PROFILES.map(p => `<div class="card" data-id="${p.id}"><div class="em">${p.icon}</div>${p.name}<small>${p.note}</small></div>`).join('')}</div>`;
    body.onclick = e => {
      const c = e.target.closest('.card'); if (!c) return;
      const p = VM_PROFILES.find(v => v.id === c.dataset.id);
      const w = WM.open({ title: p.name + ' — Virtual PC', icon: p.icon, w: 1060, h: 820, content: frame('https://copy.sh/v86/?profile=' + p.id) });
      w.el.classList.add('max');
    };
  } },

  notepad: { name: 'Notepad', icon: '📝', cat: 'Apps', w: 560, h: 420, run(body, win, path) {
    body.innerHTML = '<div class="fill"><div class="toolbar"><input class="p" style="flex:1"><button class="o">Open</button><button class="s">Save</button></div><textarea class="grow" style="resize:none;border:0;border-radius:0;background:#0d1117;padding:10px"></textarea></div>';
    const p = body.querySelector('.p'), ta = body.querySelector('textarea');
    const load = f => { const c = FS.read(f); if (c === null) return alert('No such file: ' + f); p.value = f; ta.value = c; };
    p.value = path || '/Documents/untitled.txt'; if (path) load(path);
    body.querySelector('.o').onclick = () => load(p.value);
    body.querySelector('.s').onclick = () => { FS.write(p.value, ta.value); OS.toast('Saved ' + p.value); };
  } },

  files: { name: 'Files', icon: '📁', cat: 'Apps', w: 560, h: 400, run(body) {
    let cwd = '/';
    const draw = () => {
      body.innerHTML = `<div class="fill"><div class="toolbar"><button class="up">⬆</button><b class="grow">${esc(cwd)}</b><button class="nf">+ File</button><button class="nd">+ Folder</button></div>
        <div class="grow files" style="overflow:auto"><ul>${FS.list(cwd).map(f => `<li data-p="${esc(f.path)}" data-t="${f.type}">${f.type === 'dir' ? '📁' : '📄'} ${esc(f.name)} <button class="del" style="float:right;padding:0 6px">🗑</button></li>`).join('') || '<li style="color:var(--muted)">Empty folder</li>'}</ul></div></div>`;
      body.querySelector('.up').onclick = () => { cwd = FS.join(cwd, '..'); draw(); };
      body.querySelector('.nf').onclick = () => { const n = prompt('File name', 'new.txt'); if (n) { FS.write(FS.join(cwd, n), ''); draw(); } };
      body.querySelector('.nd').onclick = () => { const n = prompt('Folder name'); if (n) { FS.mkdir(FS.join(cwd, n)); draw(); } };
      body.querySelectorAll('li[data-p]').forEach(li => li.onclick = e => {
        if (e.target.classList.contains('del')) { if (confirm('Delete ' + li.dataset.p + '?')) { FS.rm(li.dataset.p); draw(); } return; }
        if (li.dataset.t === 'dir') { cwd = li.dataset.p; draw(); } else OS.launch('notepad', li.dataset.p);
      });
    };
    draw();
  } },

  terminal: { name: 'Terminal', icon: '⌨️', cat: 'Apps', w: 620, h: 380, run(body) {
    body.innerHTML = '<div class="term"><div class="out"></div><span class="ps"></span><input spellcheck="false"></div>';
    const out = body.querySelector('.out'), inp = body.querySelector('input'), ps = body.querySelector('.ps'); let cwd = '/', hist = [], hi = 0;
    const print = s => { out.textContent += s + '\n'; body.firstChild.scrollTop = 1e9; };
    const prompt_ = () => ps.textContent = `${OS.user}@novaos:${cwd}$ `;
    const cmds = {
      help: () => 'Commands: help ls cd pwd cat echo mkdir touch rm clear date whoami open neofetch apps',
      ls: a => FS.list(FS.join(cwd, a[0] || '.')).map(f => f.name + (f.type === 'dir' ? '/' : '')).join('  '),
      cd: a => { const p = FS.join(cwd, a[0] || '/'); if (!FS.isDir(p)) return 'cd: no such directory'; cwd = p; },
      pwd: () => cwd, cat: a => FS.read(FS.join(cwd, a[0] || '')) ?? 'cat: no such file',
      echo: a => { const i = a.indexOf('>'); if (i >= 0) { FS.write(FS.join(cwd, a[i + 1]), a.slice(0, i).join(' ')); return; } return a.join(' '); },
      mkdir: a => { FS.mkdir(FS.join(cwd, a[0])); }, touch: a => { const p = FS.join(cwd, a[0]); if (!FS.exists(p)) FS.write(p, ''); },
      rm: a => { FS.rm(FS.join(cwd, a[0])); }, clear: () => { out.textContent = ''; }, date: () => new Date().toString(), whoami: () => OS.user,
      apps: () => Object.keys(ALL_APPS).join('  '), open: a => ALL_APPS[a[0]] ? (OS.launch(a[0]), '') : 'open: unknown app (try "apps")',
      neofetch: () => `   ◆◆◆     ${OS.user}@novaos\n  ◆◆◆◆◆    OS: NovaOS 1.0 (web)\n ◆◆◆◆◆◆◆   Browser: ${navigator.userAgent.split(' ').pop()}\n  ◆◆◆◆◆    Screen: ${screen.width}x${screen.height}\n   ◆◆◆     Apps: ${Object.keys(ALL_APPS).length}`,
    };
    inp.onkeydown = e => {
      if (e.key === 'ArrowUp') { inp.value = hist[--hi] ?? inp.value; hi = Math.max(0, hi); return; }
      if (e.key !== 'Enter') return;
      const line = inp.value.trim(); inp.value = ''; print(ps.textContent + line); if (!line) return;
      hist.push(line); hi = hist.length;
      const [c, ...a] = line.split(/\s+/);
      const r = cmds[c] ? cmds[c](a) : `${c}: command not found`; if (r) print(r); prompt_();
    };
    body.onclick = () => inp.focus(); print('NovaOS Terminal — type "help"'); prompt_(); setTimeout(() => inp.focus());
  } },

  calc: { name: 'Calculator', icon: '🧮', cat: 'Apps', w: 300, h: 420, run(body) {
    let expr = '';
    const keys = ['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '⌫', '='];
    body.innerHTML = `<div class="calc"><div class="disp">0</div>${keys.map(k => `<button>${k}</button>`).join('')}</div>`;
    const d = body.querySelector('.disp');
    body.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = b.textContent;
      if (k === 'C') expr = ''; else if (k === '⌫') expr = expr.slice(0, -1);
      else if (k === '=') { try { expr = /^[\d+\-*/(). ]+$/.test(expr) ? String(+Function('return ' + expr)().toFixed(10)) : ''; } catch (e) { expr = 'Error'; } }
      else expr = (expr === 'Error' ? '' : expr) + k;
      d.textContent = expr || '0';
    });
  } },

  browser: { name: 'Browser', icon: '🌐', cat: 'Apps', w: 900, h: 600, run(body) {
    body.innerHTML = `<div class="fill"><div class="toolbar"><button class="b">←</button><input class="u grow" value="https://en.wikipedia.org/wiki/Main_Page"><button class="g">Go</button></div>
      <div class="grow">${frame('https://en.wikipedia.org/wiki/Main_Page')}</div>
      <div style="font-size:11px;color:var(--muted);padding:2px 6px">Some sites refuse to load inside frames — that's their choice, not a bug.</div></div>`;
    const u = body.querySelector('.u'), f = body.querySelector('iframe');
    const go = () => { let v = u.value.trim(); if (!/^https?:\/\//.test(v)) v = v.includes('.') && !v.includes(' ') ? 'https://' + v : 'https://duckduckgo.com/html/?q=' + encodeURIComponent(v); u.value = v; f.src = v; };
    body.querySelector('.g').onclick = go; u.onkeydown = e => e.key === 'Enter' && go();
    body.querySelector('.b').onclick = () => { try { f.contentWindow.history.back(); } catch (e) {} };
  } },

  paint: { name: 'Paint', icon: '🎨', cat: 'Apps', w: 700, h: 520, run(body) {
    body.innerHTML = '<div class="fill"><div class="toolbar"><input type="color" value="#4f8cff"><input type="range" min="1" max="40" value="6"><button class="e">Eraser</button><button class="c">Clear</button><button class="s">Save to Pictures</button></div><div class="grow" style="background:#fff"><canvas style="cursor:crosshair;margin:0"></canvas></div></div>';
    const cv = body.querySelector('canvas'), x = cv.getContext('2d'), host = cv.parentElement; let drawing = false, erase = false;
    const fit = () => { const img = cv.width ? x.getImageData(0, 0, cv.width, cv.height) : null; cv.width = host.clientWidth; cv.height = host.clientHeight; x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); if (img) x.putImageData(img, 0, 0); };
    setTimeout(fit); const ro = new ResizeObserver(fit); ro.observe(host);
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.onpointerdown = e => { drawing = true; x.beginPath(); x.moveTo(...pos(e)); };
    cv.onpointermove = e => { if (!drawing) return; x.lineCap = 'round'; x.lineWidth = body.querySelector('[type=range]').value; x.strokeStyle = erase ? '#fff' : body.querySelector('[type=color]').value; x.lineTo(...pos(e)); x.stroke(); };
    cv.onpointerup = cv.onpointerleave = () => drawing = false;
    body.querySelector('.e').onclick = e => { erase = !erase; e.target.style.background = erase ? 'var(--accent)' : ''; };
    body.querySelector('.c').onclick = () => { x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); };
    body.querySelector('.s').onclick = () => { const n = prompt('Name', 'drawing'); if (n) { FS.write('/Pictures/' + n + '.png.txt', cv.toDataURL()); OS.toast('Saved to /Pictures'); } };
  } },

  settings: { name: 'Settings', icon: '⚙️', cat: 'System', w: 460, h: 380, run(body) {
    const walls = { Aurora: 'radial-gradient(circle at 20% 20%,#3a2b8f,transparent 50%),radial-gradient(circle at 80% 70%,#0e6b8a,transparent 50%),#0b0f1a',
      Sunset: 'linear-gradient(160deg,#ff7e5f,#6a3093)', Forest: 'linear-gradient(160deg,#134e5e,#71b280)', Midnight: '#0b0f1a', Classic: '#008080' };
    body.innerHTML = `<div class="pad"><h3>Personalize</h3><p>Wallpaper</p><div class="row w">${Object.keys(walls).map(k => `<button style="background:${walls[k]};width:70px;height:46px" title="${k}"></button>`).join('')}</div>
      <p>Or image URL</p><div class="row"><input class="iu grow" placeholder="https://…jpg"><button class="ib">Set</button></div>
      <p>Accent color</p><input type="color" class="ac" value="${OS.cfg.accent || '#4f8cff'}">
      <h3>System</h3><button class="rs">Reset NovaOS (erase files &amp; settings)</button></div>`;
    body.querySelectorAll('.w button').forEach(b => b.onclick = () => OS.set({ wall: walls[b.title] }));
    body.querySelector('.ib').onclick = () => { const u = body.querySelector('.iu').value.trim(); if (u) OS.set({ wall: `url("${u.replace(/"/g, '')}") center/cover` }); };
    body.querySelector('.ac').oninput = e => OS.set({ accent: e.target.value });
    body.querySelector('.rs').onclick = () => { if (confirm('Erase everything?')) { Object.keys(localStorage).filter(k => k.startsWith('novaos.')).forEach(k => localStorage.removeItem(k)); location.reload(); } };
  } },

  about: { name: 'About', icon: 'ℹ️', cat: 'System', w: 380, h: 260, run(body) {
    body.innerHTML = '<div class="pad" style="text-align:center"><div style="font-size:48px;color:var(--accent)">◆</div><h2>NovaOS 1.0</h2><p>A desktop in your browser with games, apps, and a Virtual PC that boots real Windows.</p></div>';
  } },
};

const GAME_APPS = {
  snake: { name: 'Snake', icon: '🐍', cat: 'Games', w: 440, h: 540, run: GAMES.snake },
  g2048: { name: '2048', icon: '🔢', cat: 'Games', w: 420, h: 500, run: GAMES.g2048 },
  mines: { name: 'Minesweeper', icon: '💣', cat: 'Games', w: 420, h: 500, run: GAMES.minesweeper },
  ttt: { name: 'Tic-Tac-Toe', icon: '⭕', cat: 'Games', w: 340, h: 460, run: GAMES.tictactoe },
  breakout: { name: 'Breakout', icon: '🧱', cat: 'Games', w: 520, h: 500, run: GAMES.breakout },
  flappy: { name: 'Flappy Square', icon: '🐤', cat: 'Games', w: 400, h: 600, run: GAMES.flappy },
};
const ALL_APPS = { ...APPS, ...GAME_APPS };
