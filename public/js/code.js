// Code Studio: write and run code in the browser. JavaScript and TypeScript run in a Web Worker, Python in
// Pyodide (CPython compiled to WebAssembly), Lua in wasmoon (Lua 5.4), SQL in sql.js (SQLite), and HTML/CSS/JS
// renders in a sandboxed preview. Workers can be stopped, so infinite loops don't freeze the OS.
const CODE_LIBS = {
  pyodide: 'https://cdn.jsdelivr.net/npm/pyodide@0.29.5/',
  sucrase: 'https://cdn.jsdelivr.net/npm/sucrase@3.35.0/+esm',
  wasmoon: 'https://cdn.jsdelivr.net/npm/wasmoon@1.16.0/+esm',
  sqljs: 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/',
};
const CODE_LANGS = {
  python: { name: 'Python', ext: 'py', mode: 'python' },
  javascript: { name: 'JavaScript', ext: 'js', mode: 'javascript' },
  typescript: { name: 'TypeScript', ext: 'ts', mode: 'text/typescript' },
  lua: { name: 'Lua', ext: 'lua', mode: 'lua' },
  sql: { name: 'SQL (SQLite)', ext: 'sql', mode: 'text/x-sqlite' },
  html: { name: 'HTML / CSS / JS', ext: 'html', mode: 'htmlmixed' },
};
const CODE_EXAMPLES = {
  python: [
    ['Hello', 'name = "HitBoy"\nprint(f"Hello from Python, {name}!")\nprint("2 ** 100 =", 2 ** 100)\n'],
    ['FizzBuzz', 'for i in range(1, 31):\n    print("FizzBuzz" if i % 15 == 0 else "Fizz" if i % 3 == 0 else "Buzz" if i % 5 == 0 else i)\n'],
    ['Primes', 'def primes(n):\n    sieve = [True] * (n + 1)\n    for i in range(2, int(n ** 0.5) + 1):\n        if sieve[i]:\n            sieve[i*i::i] = [False] * len(sieve[i*i::i])\n    return [i for i in range(2, n + 1) if sieve[i]]\n\nprint(primes(100))\n'],
    ['NumPy', 'import numpy as np  # downloaded automatically the first time\n\na = np.arange(12).reshape(3, 4)\nprint(a)\nprint("sum of each column:", a.sum(axis=0))\nprint("mean:", a.mean())\n'],
  ],
  javascript: [
    ['Hello', 'const name = "HitBoy";\nconsole.log(`Hello from JavaScript, ${name}!`);\nconsole.log([1, 2, 3].map(n => n * n));\n'],
    ['Fibonacci', 'function* fib() { let [a, b] = [0n, 1n]; while (true) { yield a; [a, b] = [b, a + b]; } }\nconst out = [];\nfor (const n of fib()) { if (out.length === 30) break; out.push(n); }\nconsole.log(out.join(", "));\n'],
    ['Fetch JSON', '// top-level await works\nconst r = await fetch("https://api.github.com/repos/MercuryWorkshop/scramjet");\nconst repo = await r.json();\nconsole.log(repo.full_name, "has", repo.stargazers_count, "stars");\n'],
  ],
  typescript: [
    ['Hello', 'interface Player { name: string; score: number }\n\nconst players: Player[] = [{ name: "Alex", score: 42 }, { name: "Sam", score: 99 }];\nconst best = players.reduce((a, b) => (b.score > a.score ? b : a));\nconsole.log(`Top player: ${best.name} (${best.score})`);\n'],
    ['Generics', 'function first<T>(items: T[]): T | undefined { return items[0]; }\nclass Stack<T> {\n  private items: T[] = [];\n  push(x: T) { this.items.push(x); return this; }\n  pop(): T | undefined { return this.items.pop(); }\n}\nconsole.log(first([3, 1, 2]));\nconsole.log(new Stack<string>().push("a").push("b").pop());\n'],
  ],
  lua: [
    ['Hello', 'local name = "HitBoy"\nprint("Hello from Lua, " .. name .. "!")\nfor i = 1, 5 do print(i, i * i) end\n'],
    ['Tables', 'local scores = { alex = 42, sam = 99, kim = 77 }\nlocal names = {}\nfor name in pairs(scores) do table.insert(names, name) end\ntable.sort(names, function(a, b) return scores[a] > scores[b] end)\nfor rank, name in ipairs(names) do print(rank, name, scores[name]) end\n'],
  ],
  sql: [
    ['Hello', "CREATE TABLE games (id INTEGER PRIMARY KEY, name TEXT, players INTEGER, rating REAL);\nINSERT INTO games (name, players, rating) VALUES\n  ('Scrap Shift', 8, 4.8), ('Doodle Duel', 10, 4.6), ('Doom', 1, 4.9), ('Snake', 1, 4.1);\nSELECT name, players, rating FROM games ORDER BY rating DESC;\n"],
    ['Join', "CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE IF NOT EXISTS scores (player_id INTEGER, game TEXT, points INTEGER);\nINSERT INTO players (name) VALUES ('Alex'), ('Sam'), ('Kim');\nINSERT INTO scores VALUES (1, 'Snake', 120), (2, 'Snake', 300), (1, '2048', 2048), (3, 'Snake', 90);\nSELECT p.name, SUM(s.points) AS total, COUNT(*) AS games\nFROM players p JOIN scores s ON s.player_id = p.id\nGROUP BY p.name ORDER BY total DESC;\n"],
  ],
  html: [
    ['Bouncing ball', '<!doctype html>\n<style>\n  body { margin: 0; background: #0f172a; display: grid; place-items: center; height: 100vh; }\n  canvas { background: #111827; border-radius: 12px; }\n</style>\n<canvas id="c" width="400" height="300"></canvas>\n<script>\n  const c = document.getElementById("c"), x = c.getContext("2d");\n  let px = 50, py = 50, vx = 3, vy = 2;\n  (function loop() {\n    x.clearRect(0, 0, 400, 300);\n    px += vx; py += vy;\n    if (px < 15 || px > 385) vx *= -1;\n    if (py < 15 || py > 285) vy *= -1;\n    x.fillStyle = "#38bdf8"; x.beginPath(); x.arc(px, py, 15, 0, 7); x.fill();\n    requestAnimationFrame(loop);\n  })();\n</script>\n'],
    ['Button', '<!doctype html>\n<style>\n  body { font-family: system-ui; display: grid; place-items: center; height: 100vh; margin: 0; }\n  button { font-size: 20px; padding: 12px 24px; border-radius: 10px; border: 0; background: #6366f1; color: white; }\n</style>\n<button onclick="this.textContent = \'Clicked \' + (++n) + \' times\'">Click me</button>\n<script>let n = 0;</script>\n'],
  ],
};

// Worker sources (run as blob URLs).
const CODE_WORKERS = {
  js: `const fmt = v => { if (typeof v === 'string') return v; try { const s = JSON.stringify(v, (k, x) => typeof x === 'bigint' ? x.toString() + 'n' : x, 2); return s === undefined ? String(v) : s; } catch (e) { return String(v); } };
for (const k of ['log', 'info', 'debug']) console[k] = (...a) => postMessage({ out: a.map(fmt).join(' ') });
for (const k of ['warn', 'error']) console[k] = (...a) => postMessage({ err: a.map(fmt).join(' ') });
onmessage = async e => {
  try { const AsyncFunction = (async () => {}).constructor; const r = await new AsyncFunction(e.data)(); if (r !== undefined) postMessage({ out: '← ' + fmt(r) }); }
  catch (err) { postMessage({ err: String(err && err.stack || err).split('\\n').filter(l => !/blob:|AsyncFunction/.test(l)).join('\\n') }); }
  postMessage({ done: 1 });
};`,
  python: `importScripts('${CODE_LIBS.pyodide}pyodide.js');
let py;
const ready = loadPyodide({ indexURL: '${CODE_LIBS.pyodide}' }).then(p => { py = p; py.setStdout({ batched: s => postMessage({ out: s }) }); py.setStderr({ batched: s => postMessage({ err: s }) }); postMessage({ ready: 'Python ' + py.runPython('import sys; sys.version.split()[0]') }); });
onmessage = async e => {
  try { await ready; await py.loadPackagesFromImports(e.data, { messageCallback: m => postMessage({ info: m }) }); const r = await py.runPythonAsync(e.data); if (r !== undefined && r !== null) postMessage({ out: String(r) }); }
  catch (err) { postMessage({ err: String(err.message || err) }); }
  postMessage({ done: 1 });
};`,
  lua: `let lua;
const ready = import('${CODE_LIBS.wasmoon}').then(async ({ LuaFactory }) => { lua = await new LuaFactory().createEngine(); lua.global.set('print', (...a) => postMessage({ out: a.map(v => v === undefined || v === null ? 'nil' : String(v)).join('\\t') })); postMessage({ ready: 'Lua 5.4' }); });
onmessage = async e => {
  try { await ready; await lua.doString(e.data); } catch (err) { postMessage({ err: String(err.message || err) }); }
  postMessage({ done: 1 });
};`,
};

APPS.code = ALL_APPS.code = { name: 'Code Studio', icon: realIcon('visual-studio-code'), cat: 'Apps', w: 1080, h: 700, run(body, win, path) {
  let lang = localStorage.getItem('novaos.codeLang') || 'python', file = null, cm = null, worker = null, workerLang = null, running = false, sqlDb = null;
  body.innerHTML = `<div class="code"><div class="toolbar">
      <select class="cs-lang">${Object.entries(CODE_LANGS).map(([k, l]) => `<option value="${k}">${l.name}</option>`).join('')}</select>
      <select class="cs-ex"><option value="">Examples…</option></select><div class="sep"></div>
      <button class="ghost small" data-a="open">${glyph('open', 14)}Open</button><button class="ghost small" data-a="save">${glyph('download', 14)}Save</button>
      <span class="grow cs-file small muted"></span>
      <button class="ghost small" data-a="clear">Clear output</button><button class="ghost small" data-a="stop" disabled>Stop</button>
      <button class="primary" data-a="run" title="Run (Ctrl+Enter)">▶ Run</button></div>
    <div class="cs-main"><div class="cs-editor"><textarea spellcheck="false"></textarea></div>
      <div class="cs-out"><div class="cs-out-head"><b>Output</b><span class="cs-status small muted"></span></div><pre class="cs-console"></pre><iframe class="cs-preview hidden" sandbox="allow-scripts allow-modals allow-forms"></iframe><div class="cs-tables hidden"></div></div></div></div>`;
  const $c = s => body.querySelector(s), con = $c('.cs-console'), ta = $c('textarea');
  const getCode = () => cm ? cm.getValue() : ta.value;
  const setCode = v => { if (cm) cm.setValue(v); else ta.value = v; };
  const print = (text, cls) => { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text.endsWith('\n') ? text : text + '\n'; con.appendChild(s); con.scrollTop = 1e9; };
  const status = t => { $c('.cs-status').textContent = t; };
  const setRunning = on => { running = on; $c('[data-a=stop]').disabled = !on; $c('[data-a=run]').disabled = on; if (!on) status(''); };
  const showPane = which => { con.classList.toggle('hidden', which !== 'console'); $c('.cs-preview').classList.toggle('hidden', which !== 'preview'); $c('.cs-tables').classList.toggle('hidden', which !== 'tables'); };

  const pickLang = (k, keepCode) => {
    lang = k; localStorage.setItem('novaos.codeLang', k); $c('.cs-lang').value = k;
    $c('.cs-ex').innerHTML = '<option value="">Examples…</option>' + CODE_EXAMPLES[k].map(([n], i) => `<option value="${i}">${n}</option>`).join('');
    cm?.setOption('mode', CODE_LANGS[k].mode);
    if (!keepCode) { setCode(localStorage.getItem('novaos.code.' + k) ?? CODE_EXAMPLES[k][0][1]); file = null; $c('.cs-file').textContent = ''; }
    showPane(k === 'html' ? 'preview' : 'console');
  };
  const getWorker = kind => {
    if (worker && workerLang === kind) return worker;
    worker?.terminate();
    const url = URL.createObjectURL(new Blob([CODE_WORKERS[kind]], { type: 'text/javascript' }));
    worker = new Worker(url, kind === 'lua' ? { type: 'module' } : undefined); workerLang = kind;
    worker.onmessage = e => { const m = e.data; if (m.out !== undefined) print(m.out); if (m.err) print(m.err, 'err'); if (m.info) print(m.info, 'info'); if (m.ready) status(m.ready); if (m.done) setRunning(false); };
    worker.onerror = e => { print(e.message || 'Worker error', 'err'); setRunning(false); };
    return worker;
  };
  const run = async () => {
    if (running) return;
    const code = getCode(); localStorage.setItem('novaos.code.' + lang, code);
    if (lang === 'html') { showPane('preview'); $c('.cs-preview').srcdoc = code; return; }
    if (lang === 'sql') return runSql(code);
    showPane('console'); setRunning(true); print(`▶ ${CODE_LANGS[lang].name}`, 'info');
    try {
      if (lang === 'javascript') getWorker('js').postMessage(code);
      else if (lang === 'typescript') { status('Compiling…'); const { transform } = await import(CODE_LIBS.sucrase); const js = transform(code, { transforms: ['typescript'] }).code; status(''); getWorker('js').postMessage(js); }
      else if (lang === 'python') { if (workerLang !== 'python') status('Loading Python (first run takes a few seconds)…'); getWorker('python').postMessage(code); }
      else if (lang === 'lua') getWorker('lua').postMessage(code);
    } catch (err) { print(String(err.message || err), 'err'); setRunning(false); }
  };
  const runSql = async code => {
    showPane('tables'); const box = $c('.cs-tables');
    try {
      if (!sqlDb) { status('Loading SQLite…'); await loadOnce(CODE_LIBS.sqljs + 'sql-wasm.js'); const SQL = await initSqlJs({ locateFile: f => CODE_LIBS.sqljs + f }); sqlDb = new SQL.Database(); status('SQLite in memory — tables last until you close Code Studio'); }
      const results = sqlDb.exec(code);
      box.innerHTML = results.length ? results.map(r => `<table><thead><tr>${r.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.values.map(row => `<tr>${row.map(v => `<td>${esc(v === null ? 'NULL' : String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="small muted">${r.values.length} row${r.values.length === 1 ? '' : 's'}</p>`).join('')
        : `<p class="muted">Done. ${sqlDb.getRowsModified()} row(s) changed. (Statements that return rows show tables here.)</p>`;
    } catch (err) { box.innerHTML = `<pre class="cs-console"><span class="err">${esc(err.message)}</span></pre>`; }
  };
  const stop = () => { if (!running) return; worker?.terminate(); worker = null; workerLang = null; print('■ Stopped', 'info'); setRunning(false); };

  const openFile = p => {
    const ext = extOf(p), k = Object.keys(CODE_LANGS).find(k => CODE_LANGS[k].ext === ext || (k === 'javascript' && ext === 'mjs') || (k === 'html' && ext === 'htm'));
    if (k) pickLang(k, true);
    setCode(FS.read(p) ?? ''); file = p; $c('.cs-file').textContent = p; WM.setTitle(win, FS.base(p) + ' — Code Studio');
  };
  body.onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'run') run();
    if (a === 'stop') stop();
    if (a === 'clear') { con.innerHTML = ''; $c('.cs-tables').innerHTML = ''; }
    if (a === 'open') { const p = await FilePicker(win, { mode: 'open', start: FS.isDir('/Documents/code') ? '/Documents/code' : '/Documents' }); if (p) openFile(p); }
    if (a === 'save') {
      let p = file;
      if (!p) { if (!FS.isDir('/Documents/code')) FS.mkdir('/Documents/code'); p = await FilePicker(win, { mode: 'save', start: '/Documents/code', name: 'main.' + CODE_LANGS[lang].ext }); }
      if (p) { FS.write(p, getCode()); file = p; $c('.cs-file').textContent = p; OS.toast('Saved ' + p); }
    }
  };
  body.onchange = e => {
    if (e.target.classList.contains('cs-lang')) pickLang(e.target.value);
    if (e.target.classList.contains('cs-ex') && e.target.value !== '') { setCode(CODE_EXAMPLES[lang][+e.target.value][1]); e.target.value = ''; }
  };
  body.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $c('[data-a=save]').click(); } });

  pickLang(lang);
  loadCodeMirror().then(async () => {
    for (const m of ['lua', 'sql']) await loadOnce(`${CM}mode/${m}/${m}.min.js`).catch(() => {});
    if (!body.isConnected) return;
    cm = CodeMirror.fromTextArea(ta, { lineNumbers: true, mode: CODE_LANGS[lang].mode, indentUnit: 4, tabSize: 4, theme: document.documentElement.dataset.theme === 'light' ? 'default' : 'material-darker', autofocus: true });
    cm.setSize('100%', '100%');
  }).catch(() => {});
  if (path && FS.exists(path)) openFile(path);
  win.cleanup.push(() => { worker?.terminate(); sqlDb?.close(); });
} };
