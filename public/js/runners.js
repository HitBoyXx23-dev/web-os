// "Run": opens programs and game files with the right emulator.
//   DOS .exe/.com/.bat or a .zip of a DOS program → DOSBox (js-dos)
//   Windows .exe/.msi or a .zip                    → a Windows 98 virtual machine with the files on drive D:
//   .swf → Ruffle (Flash) · .py → Pyodide (Python) · console game files → EmulatorJS · .iso/.img → VMBox
const FFLATE = 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js';
const RETRO_CORES = { nes: 'nes', fds: 'nes', sfc: 'snes', smc: 'snes', gb: 'gb', gbc: 'gb', gba: 'gba', md: 'segaMD', gen: 'segaMD', smd: 'segaMD', sms: 'segaMS', gg: 'segaGG',
  n64: 'n64', z64: 'n64', v64: 'n64', pce: 'pce', a26: 'atari2600', a78: 'atari7800', lnx: 'lynx', nds: 'nds', ws: 'ws', wsc: 'ws', vb: 'vb', col: 'coleco' };
const RETRO_NAMES = { nes: 'Nintendo (NES)', snes: 'Super Nintendo', gb: 'Game Boy / Color', gba: 'Game Boy Advance', segaMD: 'Sega Genesis', segaMS: 'Sega Master System', segaGG: 'Game Gear',
  n64: 'Nintendo 64', pce: 'TurboGrafx-16', atari2600: 'Atari 2600', atari7800: 'Atari 7800', lynx: 'Atari Lynx', nds: 'Nintendo DS', ws: 'WonderSwan', vb: 'Virtual Boy', coleco: 'ColecoVision' };
const isProgram = n => /\.(exe|com|bat)$/i.test(n);

// Which runners can open a file (first = default).
function runnersFor(name) {
  const e = extOf(name);
  if (['exe', 'com', 'bat'].includes(e)) return e === 'exe' ? ['dos', 'win98'] : ['dos'];
  if (e === 'msi') return ['win98'];
  if (e === 'zip') return ['dos', 'win98'];
  if (e === 'swf') return ['flash'];
  if (e === 'py') return ['python'];
  if (RETRO_CORES[e]) return ['retro'];
  if (['iso', 'img', 'ima', 'flp'].includes(e)) return ['vmbox'];
  if (['html', 'htm'].includes(e)) return ['web'];
  return [];
}
const RUNNER_INFO = {
  dos: ['DOS (DOSBox)', 'Instant. For DOS programs and games.'],
  win98: ['Windows 98', 'Boots a Windows 98 virtual machine with your files on drive D: (about 1–2 minutes). For older Windows programs.'],
  flash: ['Flash Player (Ruffle)', 'Plays .swf Flash games and animations.'],
  python: ['Python (Pyodide)', 'Runs the script with Python 3.'],
  retro: ['Retro console (EmulatorJS)', 'Plays console game files you own.'],
  vmbox: ['VMBox', 'Boots the disk image in a new virtual machine.'],
  web: ['Web page', 'Opens the page in a sandboxed window.'],
};

// Collect { path, data } for a file, expanding .zip archives.
async function gatherFiles(name, bytes) {
  if (extOf(name) !== 'zip') return [{ path: name, data: bytes }];
  await loadOnce(FFLATE);
  return Object.entries(fflate.unzipSync(bytes)).filter(([p, d]) => !p.endsWith('/') && d.length).map(([path, data]) => ({ path, data }));
}

const Runner = {
  async run(kind, name, bytes, opts = {}) {
    const blobUrl = (data, type) => URL.createObjectURL(new Blob([data], { type: type || 'application/octet-stream' }));
    const frame = (title, icon, src, w = 860, h = 620, url) => WM.open({ title, icon, w, h, content: (body, win) => {
      body.style.overflow = 'hidden';
      body.innerHTML = `<iframe src="${src}" allow="autoplay; fullscreen; gamepad; keyboard-map" allowfullscreen style="background:#000"></iframe>`;
      const f = body.querySelector('iframe'); f.onload = () => f.focus();
      if (url) win.cleanup.push(() => setTimeout(() => URL.revokeObjectURL(url), 1000));
    } });
    const base = name.split('/').pop();
    if (kind === 'dos') {
      const files = await gatherFiles(name, bytes), progs = files.filter(f => isProgram(f.path));
      if (!progs.length) return OS.toast('No .exe, .com or .bat program found in ' + base);
      const main = opts.main || progs.sort((a, b) => /setup|install/i.test(a.path) - /setup|install/i.test(b.path))[0].path;
      await loadOnce(FFLATE);
      const dir = main.includes('/') ? main.slice(0, main.lastIndexOf('/')).replace(/\//g, '\\') : '';
      const conf = `[dosbox]\nmachine=svga_s3\nmemsize=16\n[cpu]\ncore=auto\ncycles=max\n[sblaster]\nsbtype=sb16\n[autoexec]\n@echo off\nmount c .\nc:\n${dir ? `cd \\${dir}\n` : ''}${main.split('/').pop()}\n`;
      const zip = fflate.zipSync({ ...Object.fromEntries(files.map(f => [f.path, f.data])), '.jsdos/dosbox.conf': fflate.strToU8(conf) });
      const url = blobUrl(zip, 'application/zip');
      return frame(base + ' — DOS', realIcon('dosbox'), `dos/player.html?bundle=${encodeURIComponent(url)}`, 820, 600, url);
    }
    if (kind === 'win98') {
      const files = await gatherFiles(name, bytes);
      const disk = makeFat16Image(files.map(f => ({ path: f.path, data: f.data })), 'PROGRAMS');
      VMBox.startTemp({ template: 'win98', name: 'Windows 98 — ' + base, extra: { hdb: { buffer: disk.buffer } }, fresh: true,
        note: `Windows is starting (about 2 minutes). If it asks about new hardware, press Cancel. Your files are on drive Programs (D:) in My Computer.` });
      return;
    }
    if (kind === 'flash') { const url = blobUrl(bytes, 'application/x-shockwave-flash'); return frame(base + ' — Flash', realIcon('applications-games'), `run/flash.html?src=${encodeURIComponent(url)}`, 820, 620, url); }
    if (kind === 'python') { const url = blobUrl(bytes, 'text/x-python'); return frame(base + ' — Python', { mono: 'Py', bg: '#3776ab' }, `run/python.html?src=${encodeURIComponent(url)}`, 720, 480, url); }
    if (kind === 'retro') {
      const core = RETRO_CORES[extOf(name)], url = blobUrl(bytes);
      return frame(base + ' — ' + RETRO_NAMES[core], realIcon('applications-games'), `run/retro.html?core=${core}&name=${encodeURIComponent(base)}&src=${encodeURIComponent(url)}`, 820, 640, url);
    }
    if (kind === 'vmbox') {
      const type = extOf(name) === 'iso' ? 'cdrom' : bytes.length <= 2949120 ? 'fda' : 'hda';
      const p = opts.path || FS.freeName('/VMs', base); if (!opts.path) FS.writeBytes(p, bytes);
      const vm = VMBox.create({ template: 'custom', name: base, memory: 256, network: true, source: { kind: 'file', path: p, type } });
      return VMBox.start(vm.id);
    }
    if (kind === 'web') return WM.open({ title: base, icon: realIcon('firefox'), w: 860, h: 600, content: b => { const f = document.createElement('iframe'); f.srcdoc = new TextDecoder().decode(bytes); f.sandbox = 'allow-scripts allow-modals allow-forms'; b.appendChild(f); } });
  },
};

APPS.run = { name: 'Run', icon: realIcon('utilities-terminal'), cat: 'System', w: 640, h: 520, run(body, win, path) {
  let file = null; // { name, bytes, path? }
  const draw = async () => {
    if (!file) {
      body.innerHTML = `<div class="runapp"><div class="run-drop">${tile(realIcon('utilities-terminal'), 56)}<h3>Run a program or game</h3>
        <p class="muted">Drop a file here, or choose one. DOS and Windows programs (.exe, .zip), Flash (.swf), Python (.py), console games you own (.nes, .sfc, .gba, .md…) and disk images (.iso, .img).</p>
        <div class="row" style="justify-content:center"><button class="primary" data-a="files">${glyph('open', 14)}Choose from Files</button><button data-a="upload">${glyph('download', 14)}Upload…</button><input type="file" hidden></div></div></div>`;
      return;
    }
    const kinds = runnersFor(file.name);
    let progs = [];
    if (kinds.includes('dos') && extOf(file.name) === 'zip') { try { progs = (await gatherFiles(file.name, file.bytes)).filter(f => isProgram(f.path)).map(f => f.path); } catch (e) {} }
    body.innerHTML = `<div class="runapp pad"><div class="row">${glyph('file', 22)}<div class="grow"><b>${esc(file.name)}</b><div class="small muted">${(file.bytes.length / 1048576).toFixed(2)} MB</div></div><button class="ghost" data-a="back">Choose another</button></div>
      ${kinds.length ? `<div class="section-label" style="padding-left:0">Open with</div>
      ${progs.length > 1 ? `<label class="field">Program to start (DOS)<select data-main>${progs.map(p => `<option>${esc(p)}</option>`).join('')}</select></label>` : ''}
      <div class="cards" style="padding:0">${kinds.map((k, i) => `<div class="card" data-run="${k}">${tile(k === 'win98' ? realIcon('windows95') : k === 'dos' ? realIcon('dosbox') : k === 'vmbox' ? realIcon('virtualbox') : k === 'python' ? { mono: 'Py', bg: '#3776ab' } : realIcon('applications-games'), 36)}
        <div class="meta"><div class="name">${RUNNER_INFO[k][0]}${i === 0 ? ' <span class="muted small">(default)</span>' : ''}</div><div class="sub" style="white-space:normal">${RUNNER_INFO[k][1]}</div></div></div>`).join('')}</div>`
      : `<p class="muted">There's no runner for .${esc(extOf(file.name) || '?')} files yet.</p>`}
      <p class="small muted" style="margin-top:16px">Modern 64-bit Windows programs (most apps from the last ~15 years) can't run in the browser; older 32-bit programs and games usually can in Windows 98.</p></div>`;
  };
  const pick = (name, bytes, p) => { file = { name, bytes, path: p }; WM.setTitle(win, 'Run — ' + name.split('/').pop()); draw(); };
  body.onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'files') { const p = await FilePicker(win, { mode: 'open', start: '/Downloads' }); if (p) pick(FS.base(p), FS.bytes(p), p); }
    if (a === 'upload') body.querySelector('input[type=file]').click();
    if (a === 'back') { file = null; draw(); }
    const r = e.target.closest('[data-run]');
    if (r) { try { await Runner.run(r.dataset.run, file.name, file.bytes, { main: body.querySelector('[data-main]')?.value, path: file.path }); } catch (err) { OS.toast('Could not run it: ' + err.message); } }
  };
  body.onchange = async e => { const f = e.target.files?.[0]; if (f) pick(f.name, new Uint8Array(await f.arrayBuffer())); };
  body.ondragover = e => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); };
  body.ondrop = async e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pick(f.name, new Uint8Array(await f.arrayBuffer())); };
  if (path && FS.exists(path)) pick(FS.base(path), FS.bytes(path), path); else draw();
} };
ALL_APPS.run = APPS.run;
