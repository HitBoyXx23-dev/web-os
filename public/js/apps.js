// App registry. Each app: { name, icon, cat, w, h, run(body, win, arg) }.
const frame = url => `<iframe src="${esc(url)}" allow="autoplay; fullscreen; gamepad; keyboard-map" allowfullscreen></iframe>`;
const card = (icon, name, sub, attrs = '', extra = '') => `<div class="card" ${attrs}>${tile(icon, 40)}<div class="meta"><div class="name">${esc(name)}</div><div class="sub">${esc(sub)}</div></div>${extra}</div>`;



const CM = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';
// ext → [label, CodeMirror mode]
const EDITOR_MODES = { js: ['JavaScript', 'javascript'], mjs: ['JavaScript', 'javascript'], json: ['JSON', { name: 'javascript', json: true }], ts: ['TypeScript', 'text/typescript'],
  html: ['HTML', 'htmlmixed'], htm: ['HTML', 'htmlmixed'], css: ['CSS', 'css'], xml: ['XML', 'xml'], svg: ['SVG', 'xml'], md: ['Markdown', 'markdown'],
  py: ['Python', 'python'], sh: ['Shell', 'shell'], txt: ['Plain Text', null] };
const loadCodeMirror = async () => {
  await loadOnce(CM + 'codemirror.min.js', CM + 'codemirror.min.css');
  if (!document.querySelector('link[data-cm-theme]')) document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" data-cm-theme href="${CM}theme/material-darker.min.css">`);
  for (const m of ['xml', 'javascript', 'css', 'htmlmixed', 'markdown', 'python', 'shell']) await loadOnce(`${CM}mode/${m}/${m}.min.js`);
};

// In-window Open/Save dialog. Resolves to a path, or null if cancelled.
function FilePicker(win, { mode = 'open', start = '/', name = '' } = {}) {
  return new Promise(resolve => {
    let cwd = FS.isDir(start) ? start : '/';
    const m = document.createElement('div'); m.className = 'modal';
    const close = v => { m.remove(); resolve(v); };
    const draw = () => {
      m.innerHTML = `<div class="modal-card"><div class="row" style="justify-content:space-between"><h3>${mode === 'open' ? 'Open File' : 'Save As'}</h3><span class="crumbs">${esc(cwd === '/' ? 'Home' : 'Home' + cwd.split('/').join(' / '))}</span></div>
        <ul class="list pick">${cwd !== '/' ? `<li data-go="${esc(FS.parent(cwd))}">${glyph('up', 16)}<span>..</span></li>` : ''}${FS.list(cwd).map(f => `<li class="${f.type}" ${f.type === 'dir' ? `data-go="${esc(f.path)}"` : `data-file="${esc(f.path)}"`}>${glyph(f.type === 'dir' ? 'folder' : 'file', 16)}<span>${esc(f.name)}</span></li>`).join('')}</ul>
        ${mode === 'save' ? `<input class="pick-name" value="${esc(name)}" placeholder="File name">` : ''}
        <div class="row" style="justify-content:flex-end"><button class="ghost pick-cancel">Cancel</button><button class="primary pick-ok">${mode === 'open' ? 'Open' : 'Save'}</button></div></div>`;
      const inp = m.querySelector('.pick-name'); if (inp) { inp.focus(); inp.setSelectionRange(0, inp.value.replace(/\.[^.]*$/, '').length); inp.oninput = () => name = inp.value; inp.onkeydown = e => e.key === 'Enter' && m.querySelector('.pick-ok').click(); }
    };
    m.onclick = e => {
      const go = e.target.closest('[data-go]'), f = e.target.closest('[data-file]');
      if (go) { cwd = go.dataset.go; return draw(); }
      if (f) { if (mode === 'open') return close(f.dataset.file); name = FS.base(f.dataset.file); return draw(); }
      if (e.target.closest('.pick-cancel') || e.target === m) return close(null);
      if (e.target.closest('.pick-ok')) {
        if (mode === 'open') { const s = m.querySelector('li.sel'); return s ? close(s.dataset.file) : null; }
        const n = (m.querySelector('.pick-name').value || '').trim(); if (!n || n.includes('/')) return;
        const p = FS.join(cwd, n); if (FS.exists(p) && !confirm(`Replace “${n}”?`)) return; close(p);
      }
    };
    m.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
    draw(); win.body.appendChild(m);
  });
}

const APPS = {
  games: { name: 'Games', icon: realIcon('applications-games'), cat: 'System', w: 760, h: 560, run(body) {
    const custom = JSON.parse(localStorage.getItem('novaos.customGames') || '[]');
    const draw = () => {
      body.innerHTML = `<div class="app-head"><h3>Games</h3><p>Built-in games run offline. Web games load from their own sites.</p></div>
        <div class="section-label">Built-in</div>
        <div class="cards">${Object.entries(GAME_APPS).map(([id, g]) => card(g.icon, g.name, g.desc, `data-app="${id}"`)).join('')}</div>
        <div class="section-label">Classics</div>
        <div class="cards">${Object.entries(DOS_APPS).map(([id, g]) => card(g.icon, g.name, g.desc, `data-app="${id}"`)).join('')}</div>
        <div class="section-label">Web games</div>
        <div class="cards">${[...WEB_GAMES, ...custom].map((g, i) => card(g.img ? realIcon(g.img) : { mono: g.mono || g.name.slice(0, 2), bg: g.bg || '#52525b' }, g.name, g.custom ? 'Added by you' : new URL(g.url).hostname,
          `data-url="${esc(g.url)}" data-name="${esc(g.name)}" data-img="${esc(g.img || '')}"`, g.custom ? `<button class="icon-btn" data-rm="${i - WEB_GAMES.length}" title="Remove">${glyph('trash', 15)}</button>` : '')).join('')}</div>
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
      else WM.open({ title: c.dataset.name, icon: c.dataset.img ? realIcon(c.dataset.img) : { mono: c.dataset.name.slice(0, 2), bg: '#52525b' }, w: 900, h: 640, content: frame(c.dataset.url) });
    };
    draw();
  } },

  notepad: { name: 'Text Editor', icon: realIcon('org.gnome.TextEditor'), cat: 'Apps', w: 760, h: 520, run(body, win, path) {
    body.innerHTML = `<div class="fill editor"><div class="toolbar">
        <button class="ghost ed-open">${glyph('open')}Open</button><button class="ghost ed-save">${glyph('download')}Save</button><button class="ghost ed-saveas">Save As…</button>
        <div class="sep"></div><span class="small ed-name"></span><span class="small muted ed-dirty"></span><span class="grow"></span>
        <span class="small muted ed-mode"></span><button class="ghost ed-preview hidden">${glyph('external', 14)}Preview</button></div>
      <div class="grow ed-host"><textarea spellcheck="false"></textarea></div></div>`;
    const $e = s => body.querySelector(s);
    let file = path || null, saved = '', cm = null;
    const get = () => cm ? cm.getValue() : $e('textarea').value;
    const set = v => cm ? (cm.setValue(v), cm.clearHistory()) : ($e('textarea').value = v);
    const label = () => {
      const name = file ? FS.base(file) : 'Untitled', dirty = get() !== saved;
      $e('.ed-name').textContent = name; $e('.ed-dirty').textContent = dirty ? '· Edited' : '';
      WM.setTitle(win, (dirty ? '• ' : '') + name + ' — Text Editor');
      const ext = extOf(file || ''); $e('.ed-mode').textContent = (EDITOR_MODES[ext] || ['Plain Text'])[0];
      $e('.ed-preview').classList.toggle('hidden', !/^html?$/.test(ext));
      if (cm) cm.setOption('mode', (EDITOR_MODES[ext] || [0, null])[1]);
    };
    const load = p => { const c = FS.read(p); if (c === null) return OS.toast('Could not open ' + p); file = p; saved = c; set(c); label(); };
    const save = async as => {
      if (as || !file) { const p = await FilePicker(win, { mode: 'save', start: file ? FS.parent(file) : '/Documents', name: file ? FS.base(file) : 'untitled.txt' }); if (!p) return; file = p; }
      FS.write(file, get()); saved = get(); label(); OS.toast('Saved ' + file);
    };
    $e('.ed-open').onclick = async () => { const p = await FilePicker(win, { mode: 'open', start: file ? FS.parent(file) : '/Documents' }); if (p) load(p); };
    $e('.ed-save').onclick = () => save(false); $e('.ed-saveas').onclick = () => save(true);
    $e('.ed-preview').onclick = () => WM.open({ title: 'Preview — ' + FS.base(file), icon: realIcon('firefox'), w: 800, h: 560, content: b => { const f = document.createElement('iframe'); f.srcdoc = get(); f.sandbox = 'allow-scripts allow-modals'; b.appendChild(f); } });
    body.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(e.shiftKey); } });
    $e('textarea').oninput = label;
    if (file && FS.exists(file)) load(file); else label(); // a path that doesn't exist yet becomes a new file there
    // Upgrade the textarea to CodeMirror (syntax highlighting, line numbers) when the CDN is reachable.
    loadCodeMirror().then(() => {
      if (!WM.wins.has(win.id)) return;
      cm = CodeMirror.fromTextArea($e('textarea'), { lineNumbers: true, theme: document.documentElement.dataset.theme === 'light' ? 'default' : 'material-darker',
        indentUnit: 2, tabSize: 2, lineWrapping: false, autofocus: true, extraKeys: { Tab: c => c.replaceSelection('  ') } });
      cm.on('change', label); label();
    }).catch(() => $e('textarea').focus());
  } },

  viewer: { name: 'Image Viewer', icon: realIcon('gimp'), cat: 'Apps', w: 760, h: 540, hidden: true, run(body, win, path) {
    if (!path || !FS.exists(path)) { body.innerHTML = '<div class="empty">Open an image or PDF from Files.</div>'; return; }
    const url = URL.createObjectURL(FS.blob(path)); win.cleanup.push(() => URL.revokeObjectURL(url));
    WM.setTitle(win, FS.base(path) + ' — Image Viewer');
    body.innerHTML = kindOf(path) === 'pdf' ? `<iframe src="${url}"></iframe>` : `<div class="viewer"><img src="${url}" alt=""></div>`;
  } },

  files: { name: 'Files', icon: realIcon('org.gnome.Nautilus'), cat: 'Apps', w: 820, h: 520, run(body, win, start) {
    let cwd = start && FS.isDir(start) ? start : '/', sel = null;
    const places = [['home', 'Home', '/'], ['notepad', 'Documents', '/Documents'], ['paint', 'Pictures', '/Pictures'], ['download', 'Downloads', '/Downloads']];
    const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
    const fileIcon = f => f.type === 'dir' ? glyph('folder', 18) : glyph({ image: 'paint', media: 'media', text: 'file', pdf: 'file' }[kindOf(f.path)] || 'file', 18);
    const draw = () => {
      const items = FS.list(cwd).filter(f => !f.name.startsWith('.')), crumbs = cwd.split('/').filter(Boolean); // dot-folders (VM states) stay hidden
      body.innerHTML = `<div class="files-app"><nav>${places.map(([g, n, p]) => `<button data-go="${p}" class="${cwd === p ? 'on' : ''}">${glyph(g)}${n}</button>`).join('')}</nav>
        <div class="fill" style="flex:1;min-width:0"><div class="toolbar"><button class="icon-btn up" title="Up" ${cwd === '/' ? 'disabled' : ''}>${glyph('up')}</button>
          <span class="crumbs grow"><a data-go="/">Home</a>${crumbs.map((c, i) => ` / <a data-go="/${crumbs.slice(0, i + 1).join('/')}">${esc(c)}</a>`).join('')}</span>
          <button class="ghost nd">${glyph('folder')}New Folder</button><button class="ghost nf">${glyph('file')}New File</button><button class="primary up-btn">${glyph('download')}Upload</button>
          <input type="file" multiple hidden></div>
        <div class="grow drop" style="overflow:auto">${items.length ? `<table class="ftable"><thead><tr><th>Name</th><th>Size</th><th>Modified</th><th></th></tr></thead><tbody>${items.map(f => {
          const n = FS.stat(f.path);
          return `<tr data-p="${esc(f.path)}" class="${f.type}${sel === f.path ? ' sel' : ''}"><td><span class="fname">${fileIcon(f)}<span>${esc(f.name)}</span></span></td>
            <td class="muted">${f.type === 'dir' ? FS.list(f.path).length + ' items' : fmtSize(FS.size(f.path))}</td><td class="muted">${n.mtime ? new Date(n.mtime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
            <td class="acts">${f.type === 'file' ? `<button class="icon-btn" data-act="download" title="Download">${glyph('download', 15)}</button>` : ''}<button class="icon-btn" data-act="menu" title="More">${glyph('grid', 15)}</button></td></tr>`;
        }).join('')}</tbody></table>` : '<div class="empty">This folder is empty.<br><span class="small">Drag files here from your computer to upload them.</span></div>'}</div></div></div>`;
    };
    const open = (p, withApp) => {
      if (FS.isDir(p)) { cwd = p; sel = null; return draw(); }
      const runnable = runnersFor(p).length && (!['text', 'image', 'media', 'pdf'].includes(kindOf(p)) || /\.(py|swf)$/i.test(p));
      const app = withApp || (runnable ? 'run' : { text: 'notepad', image: 'viewer', pdf: 'viewer', media: 'media' }[kindOf(p)]);
      if (app) OS.launch(app, p); else download(p);
    };
    const download = p => { const a = document.createElement('a'); a.href = URL.createObjectURL(FS.blob(p)); a.download = FS.base(p); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
    const rename = p => { const n = prompt('Rename to', FS.base(p)); if (n && n !== FS.base(p) && !n.includes('/')) { if (!FS.mv(p, FS.join(FS.parent(p), n))) OS.toast('A file with that name already exists.'); } };
    const remove = p => { if (confirm(`Delete “${FS.base(p)}”?`)) FS.rm(p); };
    const upload = async files => {
      for (const f of files) FS.writeBytes(FS.freeName(cwd, f.name), new Uint8Array(await f.arrayBuffer()), f.type || undefined);
      OS.toast(`Uploaded ${files.length} file${files.length === 1 ? '' : 's'} to ${cwd === '/' ? 'Home' : FS.base(cwd)}`);
    };
    const menu = (p, x, y) => {
      const isDir = FS.isDir(p), items = [['open', 'Open', () => open(p)]];
      if (!isDir && runnersFor(p).length) items.push(['forward', 'Run…', () => open(p, 'run')]);
      if (!isDir) items.push(['notepad', 'Open with Text Editor', () => open(p, 'notepad')], ['paint', 'Open with Image Viewer', () => open(p, 'viewer')], ['media', 'Open with Videos', () => open(p, 'media')], ['download', 'Download', () => download(p)]);
      items.push('-', ['notepad', 'Rename…', () => rename(p)], ['trash', 'Delete', () => remove(p)]);
      OS.menu($('#ctx-menu'), items, x, y);
    };
    body.onclick = e => {
      const go = e.target.closest('[data-go]'); if (go) { cwd = go.dataset.go; sel = null; return draw(); }
      const row = e.target.closest('tr[data-p]'), act = e.target.closest('[data-act]');
      if (act && row) { e.stopPropagation(); if (act.dataset.act === 'download') return download(row.dataset.p); const r = act.getBoundingClientRect(); return menu(row.dataset.p, r.left - 160, r.bottom + 4); }
      if (row) { sel = row.dataset.p; body.querySelectorAll('tr.sel').forEach(r => r.classList.remove('sel')); row.classList.add('sel'); return; }
      if (e.target.closest('.up')) { cwd = FS.parent(cwd); return draw(); }
      if (e.target.closest('.nd')) { const n = prompt('Folder name', 'New Folder'); if (n) FS.mkdir(FS.freeName(cwd, n)); }
      if (e.target.closest('.nf')) { const n = prompt('File name', 'untitled.txt'); if (n) { const p = FS.freeName(cwd, n); FS.write(p, ''); OS.launch('notepad', p); } }
      if (e.target.closest('.up-btn')) body.querySelector('input[type=file]').click();
    };
    body.ondblclick = e => { const row = e.target.closest('tr[data-p]'); if (row) open(row.dataset.p); };
    body.oncontextmenu = e => { const row = e.target.closest('tr[data-p]'); if (row) { e.preventDefault(); menu(row.dataset.p, e.clientX, e.clientY); } };
    body.onchange = e => { if (e.target.type === 'file' && e.target.files.length) upload([...e.target.files]); };
    body.onkeydown = e => { if (!sel || e.target.tagName === 'INPUT') return; if (e.key === 'Delete') remove(sel); if (e.key === 'F2') rename(sel); if (e.key === 'Enter') open(sel); };
    body.tabIndex = 0;
    // Drag and drop from the real desktop
    body.ondragover = e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); body.querySelector('.drop')?.classList.add('over'); } };
    body.ondragleave = e => { if (!body.contains(e.relatedTarget)) body.querySelector('.drop')?.classList.remove('over'); };
    body.ondrop = e => { e.preventDefault(); body.querySelector('.drop')?.classList.remove('over'); if (e.dataTransfer.files.length) upload([...e.dataTransfer.files]); };
    // Stay in sync with changes made by other apps (Text Editor, Linux, Paint…)
    const onFs = () => { if (!FS.isDir(cwd)) cwd = '/'; draw(); };
    addEventListener('fs-change', onFs); win.cleanup.push(() => removeEventListener('fs-change', onFs));
    draw();
  } },

  terminal: { name: 'Terminal', icon: realIcon('org.gnome.Console'), cat: 'Apps', w: 680, h: 420, run(body) {
    body.innerHTML = '<div class="term"><div class="out"></div><span class="ps"></span><input spellcheck="false" autocomplete="off"></div>';
    const out = body.querySelector('.out'), inp = body.querySelector('input'), ps = body.querySelector('.ps'); let cwd = '/', hist = [], hi = 0;
    const print = s => { out.textContent += s + '\n'; body.firstChild.scrollTop = 1e9; };
    const prompt_ = () => ps.textContent = `${OS.user}@hitboy ${cwd === '/' ? '~' : '~' + cwd} $ `;
    const cmds = {
      help: () => 'ls [dir]   cd <dir>   pwd   cat <file>   echo <text> [> file]\nmkdir <dir>   touch <file>   rm <path>   clear   date   whoami\nopen <app>   apps   neofetch   history\ndesktops   startx [style]   theme [name]',
      ls: a => FS.list(FS.join(cwd, a[0] || '.')).map(f => f.name + (f.type === 'dir' ? '/' : '')).join('   '),
      cd: a => { const p = FS.join(cwd, a[0] || '/'); if (!FS.isDir(p)) return 'cd: no such directory: ' + a[0]; cwd = p; },
      pwd: () => cwd, cat: a => FS.read(FS.join(cwd, a[0] || '')) ?? 'cat: no such file: ' + a[0],
      echo: a => { const i = a.indexOf('>'); if (i >= 0) { FS.write(FS.join(cwd, a[i + 1]), a.slice(0, i).join(' ')); return; } return a.join(' '); },
      mkdir: a => { FS.mkdir(FS.join(cwd, a[0])); }, touch: a => { const p = FS.join(cwd, a[0]); if (!FS.exists(p)) FS.write(p, ''); },
      rm: a => { FS.rm(FS.join(cwd, a[0])); }, clear: () => { out.textContent = ''; }, date: () => new Date().toString(), whoami: () => OS.user,
      history: () => hist.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n'),
      apps: () => Object.keys(ALL_APPS).join('   '), open: a => ALL_APPS[a[0]] ? (OS.launch(a[0]), '') : 'open: unknown app (see "apps")',
      neofetch: () => `${OS.user}@hitboy\n${'-'.repeat(OS.user.length + 5)}\nOS       HitBoy Web-OS 3.0\nShell    nsh\nBrowser  ${navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[0] || 'unknown'}\nScreen   ${screen.width}x${screen.height}\nApps     ${Object.keys(ALL_APPS).length}\nWindows  ${WM.wins.size}`,
    };
    inp.onkeydown = e => {
      if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); inp.value = hist[hi] ?? ''; return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] ?? ''; return; }
      if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.textContent = ''; return; }
      if (e.key !== 'Enter') return;
      const line = inp.value.trim(); inp.value = ''; print(ps.textContent + line); if (!line) return;
      hist.push(line); hi = hist.length;
      const [c, ...a] = line.split(/\s+/);
      const fn = cmds[c] || (window.TERM_EXTRA || {})[c];
      const r = fn ? fn(a) : `nsh: command not found: ${c}`; if (r) print(r); prompt_();
    };
    body.onclick = () => getSelection().isCollapsed && inp.focus(); print('HitBoy Web-OS shell. Type "help" for commands.\n'); prompt_(); setTimeout(() => inp.focus());
  } },

  calc: { name: 'Calculator', icon: realIcon('accessories-calculator'), cat: 'Apps', w: 320, h: 460, run(body, win) {
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

  linux: { name: 'Linux', icon: realIcon('tux'), cat: 'System', w: 860, h: 560, run: LinuxApp },

  browser: { name: 'Browser', icon: realIcon('firefox'), cat: 'Apps', w: 1040, h: 700, run: (body, win, url) => BrowserApp(body, win, { url }) },

  store: { name: 'App Store', icon: realIcon('org.gnome.Software'), cat: 'System', w: 780, h: 560, run(body) {
    let q = '';
    const draw = () => {
      const inst = OS.cfg.installed || [], cats = [...new Set(STORE.map(s => s.cat))];
      const match = s => !q || (s.name + s.desc).toLowerCase().includes(q);
      body.innerHTML = `<div class="app-head row" style="justify-content:space-between"><div><h3>App Store</h3><p>Install web apps to your desktop. They open through the proxy browser.</p></div>
        <input class="sq" placeholder="Search" style="width:200px" value="${esc(q)}"></div>` +
        cats.map(c => { const list = STORE.filter(s => s.cat === c && match(s)); return list.length ? `<div class="section-label">${c}</div><div class="cards">${list.map(s => card(s.img ? realIcon(s.img) : { mono: s.mono, bg: s.bg }, s.name, s.desc, `data-id="${s.id}"`,
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

  media: { name: 'Videos', icon: realIcon('org.gnome.Totem'), cat: 'Apps', w: 780, h: 500, run(body, win, path) {
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
    if (path && FS.exists(path)) { const src = URL.createObjectURL(FS.blob(path)); urls.push(src); list.push({ name: FS.base(path), src }); play(0); }
  } },

  paint: { name: 'Paint', icon: realIcon('kolourpaint'), cat: 'Apps', w: 760, h: 540, run(body) {
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
    body.querySelector('.s').onclick = async () => {
      const p = await FilePicker(win, { mode: 'save', start: '/Pictures', name: 'drawing.png' }); if (!p) return;
      cv.toBlob(async b => { FS.writeBytes(p, new Uint8Array(await b.arrayBuffer()), 'image/png'); OS.toast('Saved ' + p); }, 'image/png');
    };
  } },

  taskmgr: { name: 'System Monitor', icon: realIcon('gnome-system-monitor'), cat: 'System', w: 480, h: 400, run(body, win) {
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

  settings: { name: 'Settings', icon: realIcon('org.gnome.Settings'), cat: 'System', w: 760, h: 540, run(body, win, page = 'desktop') {
    const pages = { desktop: ['grid', 'Desktop'], appearance: ['paint', 'Appearance'], users: ['user', 'Users'], proxy: ['shield', 'Proxy'], privacy: ['lock', 'Privacy'], system: ['settings', 'System'] };
    const row = (l, s, ctl) => `<div class="set-row"><div class="l"><span>${l}</span>${s ? `<small>${s}</small>` : ''}</div>${ctl}</div>`;
    const draw = () => {
      const c = OS.cfg; let html = '';
      if (page === 'desktop') {
        const cur = Shell.current(), fams = [...new Set(Object.values(SHELL_PRESETS).map(p => p.family))];
        const sel = (part, label) => row(label, '', `<select data-part="${part}">${Object.entries(SHELL_PARTS[part]).map(([k, n]) => `<option value="${k}" ${cur[part] === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`);
        html = `<h3>Desktop</h3>
        ${fams.map(f => `<div class="small muted">${f}</div><div class="style-grid">${Object.entries(SHELL_PRESETS).filter(([, p]) => p.family === f).map(([id, p]) =>
          `<button class="style-card ${cur.id === id ? 'on' : ''}" data-shell="${id}">${shellPreview(p)}<b>${esc(p.name)}</b></button>`).join('')}</div>`).join('')}
        <div class="small muted">Theme</div><div class="style-grid">${Object.entries(THEMES).map(([id, t]) => `<button class="style-card ${Shell.theme() === t ? 'on' : ''}" data-themename="${id}"><span class="sp" style="background:${t.wall}"></span><b>${esc(t.name)}</b></button>`).join('')}</div>
        <h3>Customize${cur.id === 'custom' ? '' : ' <span class="muted small">(changing anything here makes a hybrid of your current style)</span>'}</h3>
        ${sel('top', 'Top panel')}${sel('bottom', 'Taskbar / dock')}${sel('launcher', 'App launcher')}${sel('chrome', 'Window buttons')}
        ${row('Window corners', '', `<input type="range" min="0" max="18" value="${OS.cfg.radius ?? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--win-radius'))}" data-radius style="width:160px">`)}
        ${row('Transparency and blur', '', `<input type="checkbox" class="switch" data-toggle="transparency" ${OS.cfg.transparency === false ? '' : 'checked'}>`)}
        ${row('Desktop icons', '', `<input type="checkbox" class="switch" data-toggle="desktopIcons" ${OS.cfg.desktopIcons === false ? '' : 'checked'}>`)}`;
      }
      if (page === 'appearance') html = `<h3>Appearance</h3>
        ${row('Theme', 'Applies to windows, menus and the taskbar', `<div class="seg">${['dark', 'light'].map(t => `<button data-theme="${t}" class="${(c.theme || 'dark') === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>`)}
        ${row('Accent color', '', `<div class="swatches">${ACCENTS.map(a => `<button data-accent="${a}" style="background:${a}" class="${(c.accent || ACCENTS[0]) === a ? 'on' : ''}"></button>`).join('')}</div>`)}
        <div><div class="small muted" style="margin-bottom:8px">Wallpaper</div><div class="walls">${Object.entries(WALLPAPERS).map(([n, w]) => `<button data-wall="${n}" title="${n}" style="background:${w}" class="${(c.wall || WALLPAPERS.Graphite) === w ? 'on' : ''}"></button>`).join('')}</div></div>
        <div class="row"><input class="iu grow" placeholder="Or paste an image URL"><button class="ib">Use image</button></div>`;
      if (page === 'proxy') html = `<h3>Proxy</h3>
        ${row('Engine', 'Scramjet handles modern sites like YouTube and Discord. Ultraviolet is the older fallback.', `<div class="seg">${Object.entries(WebProxy.ENGINES).map(([k, n]) => `<button data-engine="${k}" class="${WebProxy.engine() === k ? 'on' : ''}">${n}</button>`).join('')}</div>`)}
        ${row('Transport', 'How traffic reaches the Wisp server. Both are end-to-end encrypted.', `<div class="seg">${Object.entries(WebProxy.TRANSPORTS).map(([k, n]) => `<button data-transport="${k}" class="${WebProxy.transport() === k ? 'on' : ''}">${n}</button>`).join('')}</div>`)}
        ${row('Use proxy in Browser', 'Routes pages through the proxy so blocked sites can load', `<div class="seg">${['on', 'off'].map(v => `<button data-proxy="${v}" class="${(c.proxy !== false) === (v === 'on') ? 'on' : ''}">${v === 'on' ? 'On' : 'Off'}</button>`).join('')}</div>`)}
        <div class="set-row" style="flex-direction:column;align-items:stretch"><div class="l"><span>Wisp server</span><small>Leave blank to pick automatically: this site's own server if it has one (<code>npm start</code>), otherwise a public server.</small></div>
        <div class="row"><input class="ws grow" placeholder="Automatic" value="${esc(c.wisp || '')}"><button class="primary wb">Save</button></div></div>
        <div class="status-line"><span class="dot" id="st-dot"></span><span id="st-px">Checking…</span></div>`;
      if (page === 'privacy') html = `<h3>Privacy</h3>
        ${row('Tab disguise', 'Changes the browser tab title and icon', `<select class="ck">${Object.keys(CLOAKS).map(k => `<option ${(c.cloak || 'None') === k ? 'selected' : ''}>${k}</option>`).join('')}</select>`)}
        ${row('Open in about:blank', 'Runs HitBoy Web-OS inside a blank tab that stays out of your history', `<button class="blank">${glyph('external', 14)}Open</button>`)}
        <div class="set-row" style="flex-direction:column;align-items:stretch"><div class="l"><span>Panic key</span><small>Press this key anywhere to jump straight to another site.</small></div>
        <div class="row"><input class="pk" style="width:110px" placeholder="Press a key" value="${esc(c.panicKey || '')}" readonly><input class="pu grow" placeholder="https://classroom.google.com" value="${esc(c.panicUrl || '')}"><button class="primary pb">Save</button></div></div>`;
      if (page === 'users') { const me = OS.account; html = `<h3>Users</h3>
        <div class="set-row"><div class="row">${avatar(me, 48)}<div class="l"><span style="font-weight:600">${esc(me.name)}</span><small>${esc(me.user)} · ${me.hash ? 'Password set' : 'No password'}</small></div></div></div>
        <div class="set-row" style="flex-direction:column;align-items:stretch"><div class="l"><span>Password</span><small>Asked at sign-in and on the lock screen. Leave blank to remove it.</small></div>
          <div class="row"><input type="password" class="np grow" placeholder="New password" autocomplete="new-password"><input type="password" class="np2 grow" placeholder="Confirm" autocomplete="new-password"><button class="primary setpw">Change</button></div></div>
        <div class="small muted" style="margin-bottom:-8px">Other users</div>
        ${Users.list().filter(u => u.user !== me.user).map(u => row(`<span class="row">${avatar(u, 28)}${esc(u.name)}</span>`, '', `<button class="danger" data-rmuser="${esc(u.user)}">Remove</button>`)).join('') || '<div class="small muted">No other users. Add one from the login screen with “Not listed?”.</div>'}`; }
      if (page === 'system') html = `<h3>System</h3>
        ${row('HitBoy Web-OS', 'Version 3.0', `<button class="about">About</button>`)}
        ${row('Boot menu', 'Show the GRUB menu and boot messages at startup', `<div class="seg">${['show', 'skip'].map(v => `<button data-fast="${v}" class="${!!c.fastBoot === (v === 'skip') ? 'on' : ''}">${v === 'show' ? 'Show' : 'Skip'}</button>`).join('')}</div>`)}
        ${row('Keyboard shortcuts', 'Ctrl+Space apps · Alt+` switch windows · Alt+W close · Alt+T terminal · Alt+L lock', '')}
        ${row('Storage', Object.keys(localStorage).filter(k => k.startsWith('novaos.')).reduce((n, k) => n + localStorage.getItem(k).length, 0).toLocaleString() + ' bytes used in this browser', '')}
        ${row('Reset', 'Erase files, settings, installed apps and scores', `<button class="danger rs">Reset…</button>`)}`;
      body.innerHTML = `<div class="settings"><nav>${Object.entries(pages).map(([k, [g, n]]) => `<button data-page="${k}" class="${k === page ? 'on' : ''}">${glyph(g)}${n}</button>`).join('')}</nav><section>${html}</section></div>`;
      if (page === 'proxy') OS.proxyStatus().then(([ok, m]) => { const d = body.querySelector('#st-dot'); if (d) { d.className = 'dot ' + (ok ? 'ok' : 'bad'); body.querySelector('#st-px').textContent = m; } });
      const pk = body.querySelector('.pk'); if (pk) pk.onkeydown = e => { e.preventDefault(); if (e.key !== 'Tab') pk.value = e.key; };
    };
    body.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.page) { page = d.page; return draw(); }
      if (d.shell) Shell.choose(d.shell);
      if (d.themename) { OS.set({ themeName: d.themename, accent: null, wall: null }); Shell.apply(); }
      if (d.theme) OS.set({ theme: d.theme }); if (d.accent) OS.set({ accent: d.accent }); if (d.wall) OS.set({ wall: WALLPAPERS[d.wall] });
      if (d.proxy) OS.set({ proxy: d.proxy === 'on' });
      if (d.engine) OS.set({ engine: d.engine });
      if (d.transport) { OS.set({ transport: d.transport }); try { await WebProxy.ready(); await WebProxy.setTransport(); } catch (err) { OS.toast(err.message); } }
      if (d.fast) OS.set({ fastBoot: d.fast === 'skip' });
      if (d.rmuser && confirm('Remove this user? Their files stay on this computer.')) Users.remove(d.rmuser);
      if (b.classList.contains('setpw')) {
        const a = body.querySelector('.np').value, b2 = body.querySelector('.np2').value;
        if (a !== b2) return OS.toast("Passwords don't match.");
        await Users.setPassword(OS.user, a); OS.account = Users.get(OS.user); OS.toast(a ? 'Password changed' : 'Password removed');
      }
      if (b.classList.contains('ib')) { const u = body.querySelector('.iu').value.trim(); if (u) OS.set({ wall: `url("${u.replace(/["\\]/g, '')}") center/cover` }); }
      if (b.classList.contains('wb')) { OS.set({ wisp: body.querySelector('.ws').value.trim() }); try { await WebProxy.ready(); await WebProxy.setTransport(); OS.toast('Proxy server saved'); } catch (err) { OS.toast(err.message); } }
      if (b.classList.contains('blank')) OS.openBlank(location.href);
      if (b.classList.contains('pb')) { OS.set({ panicKey: body.querySelector('.pk').value, panicUrl: body.querySelector('.pu').value.trim() }); OS.toast('Panic key saved'); }
      if (b.classList.contains('about')) OS.launch('about');
      if (b.classList.contains('rs') && confirm('Erase everything stored by HitBoy Web-OS in this browser?')) { Object.keys(localStorage).filter(k => k.startsWith('novaos.')).forEach(k => localStorage.removeItem(k)); location.reload(); }
      draw();
    };
    body.onchange = e => {
      if (e.target.classList.contains('ck')) OS.set({ cloak: e.target.value });
      if (e.target.dataset.part) { Shell.customize({ [e.target.dataset.part]: e.target.value }); draw(); }
      if (e.target.dataset.toggle) { OS.set({ [e.target.dataset.toggle]: e.target.checked }); Shell.apply(); }
    };
    body.oninput = e => { if (e.target.dataset.radius !== undefined) { OS.set({ radius: +e.target.value }); Shell.apply(); } };
    draw();
  } },

  about: { name: 'About', icon: 'about', cat: 'System', w: 400, h: 300, run(body) {
    body.innerHTML = `<div class="pad" style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding-top:32px">
      <div style="color:var(--accent)">${document.getElementById('mark-tpl').innerHTML}</div><h3 style="font-size:18px">HitBoy Web-OS</h3>
      <p class="muted">Version 3.0</p><p class="muted small" style="max-width:300px">A desktop in your browser with games, a proxy browser, Linux, and VMBox for running Ubuntu, Arch, Windows and more.</p></div>`;
  } },
};

const GAME_APPS = {
  snake: { name: 'Snake', icon: realIcon('org.gnome.Nibbles'), cat: 'Games', desc: 'Classic arcade', w: 460, h: 560, run: GAMES.snake },
  g2048: { name: '2048', icon: realIcon('gnome-2048'), cat: 'Games', desc: 'Slide and merge tiles', w: 420, h: 520, run: GAMES.g2048 },
  mines: { name: 'Minesweeper', icon: realIcon('org.gnome.Mines'), cat: 'Games', desc: '12 × 12, 20 mines', w: 420, h: 520, run: GAMES.minesweeper },
  ttt: { name: 'Tic-Tac-Toe', icon: realIcon('gnome-tali'), cat: 'Games', desc: 'Against an unbeatable CPU', w: 340, h: 460, run: GAMES.tictactoe },
  breakout: { name: 'Breakout', icon: realIcon('lbreakout2'), cat: 'Games', desc: 'Break every brick', w: 540, h: 520, run: GAMES.breakout },
  flappy: { name: 'Flappy', icon: 'flappy', cat: 'Games', desc: 'Tap to fly', w: 400, h: 620, run: GAMES.flappy },
};
const ALL_APPS = { ...APPS, ...GAME_APPS, ...DOS_APPS };

// Tab disguises: page title + favicon.
const CLOAKS = {
  None: null,
  'Google Classroom': { title: 'Home', icon: 'https://ssl.gstatic.com/classroom/favicon.png' },
  'Google Docs': { title: 'Untitled document - Google Docs', icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
  'Google Drive': { title: 'My Drive - Google Drive', icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
  Google: { title: 'Google', icon: 'https://www.google.com/favicon.ico' },
};
