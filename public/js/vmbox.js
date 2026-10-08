// VMBox: a VirtualBox-style manager for x86 virtual machines running in the v86 emulator.
// Machines are kept in OS.cfg.vms; saved states live in the virtual filesystem under /.vmbox/.
const COPYSH = 'https://i.copy.sh/'; // public image host of the v86 project
const MB = 1048576;
const parts = (url, size, chunk) => ({ url, size, async: true, use_parts: true, fixed_chunk_size: chunk });

// Each template: what the machine boots from, and sensible defaults. `fixedMemory` = the snapshot needs exactly this.
const VM_TEMPLATES = [
  { id: 'ubuntu18', name: 'Ubuntu 18.04 LTS', group: 'Linux', icon: 'distributor-logo-ubuntu', desc: "Ubuntu's own 4.15 kernel · apt works · boots in seconds",
    memory: 256, fixedMemory: true, net: 'virtio', after: 'sudo dhclient -nw enp0s10 >/dev/null 2>&1; clear\n',
    disk: () => ({ initial_state: { url: BASE + 'vm/ubuntu18/state.bin.zst' }, hda: parts(BASE + 'vm/ubuntu18/disk.img.zst', 1024 * MB, MB) }) },
  { id: 'ubuntu24', name: 'Ubuntu 24.04 LTS', group: 'Linux', icon: 'distributor-logo-ubuntu', desc: 'Real x86-64 Ubuntu (slower) · opens in its own tab', external: 'vm/ubuntu24/' },
  { id: 'arch', name: 'Arch Linux', group: 'Linux', icon: 'distributor-logo-archlinux', desc: 'Arch Linux 32 · pacman · boots in seconds · run ./networking.sh for internet',
    memory: 512, fixedMemory: true, vram: 8, net: 'virtio',
    disk: () => ({ initial_state: { url: COPYSH + 'arch_state-v3.bin.zst' }, filesystem: { baseurl: COPYSH + 'arch/' } }) },
  { id: 'buildroot', name: 'Tiny Linux', group: 'Linux', icon: 'tux', desc: 'Buildroot, kernel 6.8 · 10 MB', memory: 128, net: 'ne2k',
    disk: () => ({ bzimage: { url: BASE + 'v86/buildroot-bzimage68.bin', size: 10068480, async: false }, filesystem: {}, cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on' }) },
  { id: 'tinycore', name: 'Tiny Core Linux 11', group: 'Linux', icon: 'tux', desc: 'Small graphical Linux · 19 MB', memory: 256,
    disk: () => ({ cdrom: { url: COPYSH + 'TinyCore-11.0.iso', size: 19922944, async: false } }) },
  { id: 'dsl', name: 'Damn Small Linux', group: 'Linux', icon: 'tux', desc: 'Classic tiny desktop Linux · 50 MB', memory: 256,
    disk: () => ({ cdrom: { url: COPYSH + 'dsl-4.11.rc2.iso', size: 52824064, async: false } }) },
  { id: 'android', name: 'Android 1.6', group: 'Linux', icon: 'distributor-logo-android', desc: 'Android-x86 Donut', memory: 512,
    disk: () => ({ cdrom: parts(COPYSH + 'android-x86-1.6-r2/.iso', 54661120, MB) }) },
  { id: 'win98', name: 'Windows 98', group: 'Windows', icon: 'windows95', desc: 'Second Edition · boots in seconds', memory: 128, fixedMemory: true,
    disk: () => ({ initial_state: { url: COPYSH + 'windows98_state-v2.bin.zst' }, hda: parts(COPYSH + 'windows98/.img', 300 * MB, 256 * 1024), mac_address_translation: true }) },
  { id: 'win95', name: 'Windows 95', group: 'Windows', icon: 'windows95', desc: 'The first Start menu', memory: 64,
    disk: () => ({ hda: parts(COPYSH + 'windows95-v3/.img', 471859200, 256 * 1024) }) },
  { id: 'win2000', name: 'Windows 2000', group: 'Windows', icon: 'distributor-logo-windows', desc: 'NT 5.0 · slower to boot', memory: 512,
    disk: () => ({ hda: parts(COPYSH + 'windows2k-v2/.img', 2048 * MB, 256 * 1024) }) },
  { id: 'winnt4', name: 'Windows NT 4.0', group: 'Windows', icon: 'distributor-logo-windows', desc: 'Workstation', memory: 512,
    disk: () => ({ hda: parts(COPYSH + 'winnt4_noacpi/.img', 523837440, 256 * 1024), cpuid_level: 2 }) },
  { id: 'win30', name: 'Windows 3.0', group: 'Windows', icon: 'distributor-logo-windows', desc: 'Program Manager', memory: 128,
    disk: () => ({ hda: { url: COPYSH + 'windows30.img', size: 25165824, async: false } }) },
  { id: 'win1', name: 'Windows 1.01', group: 'Windows', icon: 'distributor-logo-windows', desc: 'Where it began (1985)', memory: 16,
    disk: () => ({ fda: { url: COPYSH + 'windows101.img', size: 1474560 } }) },
  { id: 'freebsd', name: 'FreeBSD', group: 'BSD', icon: 'distributor-logo-freebsd', memory: 256, desc: 'Text console',
    disk: () => ({ hda: parts(COPYSH + 'freebsd/.img', 2048 * MB, MB) }) },
  { id: 'openbsd', name: 'OpenBSD', group: 'BSD', icon: 'distributor-logo-openbsd', memory: 256, desc: 'Text console',
    disk: () => ({ hda: parts(COPYSH + 'openbsd/.img', 1024 * MB, MB) }) },
  { id: 'netbsd', name: 'NetBSD', group: 'BSD', icon: 'distributor-logo-netbsd', memory: 256, desc: 'Text console',
    disk: () => ({ hda: parts(COPYSH + 'netbsd/.img', 511000064, MB) }) },
  { id: 'reactos', name: 'ReactOS', group: 'Other', mono: 'Ro', bg: '#2563eb', memory: 512, desc: 'Open-source Windows clone',
    disk: () => ({ hda: parts(COPYSH + 'reactos-v2/.img', 681574400, MB), acpi: true }) },
  { id: 'haiku', name: 'Haiku', group: 'Other', mono: 'Hk', bg: '#ca8a04', memory: 512, desc: 'BeOS successor',
    disk: () => ({ hda: parts(COPYSH + 'haiku-v5/.img', 1342177280, MB), acpi: true }) },
  { id: 'serenity', name: 'SerenityOS', group: 'Other', mono: 'Se', bg: '#7c3aed', memory: 512, desc: 'A love letter to 90s UIs',
    disk: () => ({ hda: parts(COPYSH + 'serenity-v3/.img.zst', 734003200, MB) }) },
  { id: 'beos', name: 'BeOS 5', group: 'Other', mono: 'Be', bg: '#1d4ed8', memory: 512, desc: 'Personal Edition',
    disk: () => ({ hda: parts(COPYSH + 'beos5/.img', 536870912, MB) }) },
  { id: 'kolibri', name: 'KolibriOS', group: 'Other', mono: 'K', bg: '#16a34a', memory: 128, desc: 'Tiny assembly GUI OS',
    disk: () => ({ fda: { url: COPYSH + 'kolibri.img', size: 1474560 } }) },
  { id: '9front', name: '9front', group: 'Other', mono: '9', bg: '#52525b', memory: 128, desc: 'Plan 9 fork',
    disk: () => ({ hda: parts(COPYSH + '9front-10931.386/.iso', 489453568, MB), acpi: true }) },
  { id: 'msdos', name: 'MS-DOS 6.22', group: 'DOS', icon: 'dosbox', memory: 32, desc: 'With games preinstalled',
    disk: () => ({ hda: parts(COPYSH + 'msdos622/.img', 64 * MB, 256 * 1024) }) },
  { id: 'freedos', name: 'FreeDOS', group: 'DOS', icon: 'dosbox', memory: 32, desc: 'Open-source DOS',
    disk: () => ({ fda: { url: COPYSH + 'freedos722.img', size: 737280 } }) },
  { id: 'custom', name: 'Other (my own image)', group: 'Custom', icon: 'virtualbox', memory: 256, desc: 'Boot an ISO, hard-disk or floppy image' },
];
const tpl = id => VM_TEMPLATES.find(t => t.id === id) || VM_TEMPLATES.find(t => t.id === 'custom');
const vmIconOf = t => t.icon ? realIcon(t.icon) : { mono: t.mono, bg: t.bg };
const fmtMB = b => b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : (b / MB).toFixed(b < 10 * MB ? 1 : 0) + ' MB';
const STATE_DIR = '/.vmbox';
const statePath = vm => `${STATE_DIR}/${vm.id}.state`;

const VMBox = {
  list() { return OS.cfg.vms || []; },
  save(vms) { OS.set({ vms }); dispatchEvent(new Event('vmbox-change')); },
  get(id) { return this.list().find(v => v.id === id); },
  update(id, patch) { this.save(this.list().map(v => v.id === id ? { ...v, ...patch } : v)); },
  running: new Map(), // vm id → window
  create(fields) {
    const vm = { id: 'vm' + Date.now().toString(36), created: Date.now(), ...fields };
    this.save([...this.list(), vm]); return vm;
  },
  remove(id) { FS.rm(statePath({ id })); this.save(this.list().filter(v => v.id !== id)); },

  // Builds the v86 config for a machine.
  config(vm) {
    const t = tpl(vm.template), c = { memory_size: (t.fixedMemory ? t.memory : vm.memory) * MB, vga_memory_size: (vm.vram || t.vram || 8) * MB };
    if (vm.template === 'custom') {
      const src = vm.source.kind === 'file' ? { buffer: FS.bytes(vm.source.path).buffer } : { url: vm.source.url, async: true, size: vm.source.size || undefined };
      const k = vm.source.type || 'cdrom'; c[k] = src;
      if (vm.source.type === 'hda' && vm.source.kind === 'url' && !vm.source.size) delete c.hda.async;
    } else Object.assign(c, t.disk());
    if (vm.network !== false && t.net !== 'none') {
      try { c.net_device = { type: t.net || 'ne2k', relay_url: WebProxy.wispUrl().replace(/^ws(s?):/, 'wisp$1:') }; } catch (e) {}
    }
    if (FS.exists(statePath(vm))) c.initial_state = { buffer: FS.bytes(statePath(vm)).buffer }; // your saved state wins
    if (vm.fresh) delete c.initial_state; // boot from disk, e.g. so Windows sees an extra drive
    return Object.assign(c, vm.extra);
  },

  // A one-off machine that isn't saved in the list (used by Run to boot Windows with your files on D:).
  startTemp(vm) {
    const t = tpl(vm.template); vm = { id: 'tmp' + Date.now().toString(36), memory: t.memory, network: true, ...vm };
    WM.open({ title: `${vm.name} [Running]`, icon: vmIconOf(t), w: 900, h: 640, content: (body, w) => VMWindow(body, w, vm) });
    if (vm.note) OS.toast(vm.note);
  },
  start(id) {
    const vm = this.get(id), t = tpl(vm.template);
    if (t.external) { open(BASE + t.external, '_blank'); return; }
    if (this.running.has(id)) return WM.focus(this.running.get(id).id);
    if (vm.template === 'custom' && vm.source.kind === 'file' && !FS.exists(vm.source.path)) return OS.toast(`The image ${vm.source.path} is missing.`);
    const win = WM.open({ title: `${vm.name} [Running] — VMBox`, icon: vmIconOf(t), w: 900, h: 640, appId: 'vm:' + id, content: (body, w) => VMWindow(body, w, vm) });
    this.running.set(id, win); dispatchEvent(new Event('vmbox-change'));
    win.cleanup.push(() => { this.running.delete(id); setTimeout(() => dispatchEvent(new Event('vmbox-change'))); });
  },
};

// A running machine: toolbar + screen (an iframe running run.html) + status bar.
function VMWindow(body, win, vm) {
  const t = tpl(vm.template);
  body.style.overflow = 'hidden';
  body.innerHTML = `<div class="vmw"><div class="toolbar">
      <button class="ghost small" data-a="pause">${glyph('min', 14)}<span>Pause</span></button>
      <button class="ghost small" data-a="reset">${glyph('reload', 14)}Reset</button>
      <button class="ghost small" data-a="cad" title="Send Ctrl+Alt+Del">Ctrl+Alt+Del</button>
      <div class="sep"></div>
      <button class="ghost small" data-a="save" title="Save the machine state and close">${glyph('download', 14)}Save State</button>
      <button class="ghost small" data-a="shot">${glyph('paint', 14)}Screenshot</button>
      <span class="grow"></span>
      <button class="ghost small" data-a="full">${glyph('max', 12)}Full Screen</button>
      <button class="ghost small danger" data-a="off">${glyph('power', 14)}Power Off</button></div>
    <iframe class="vm-screen" src="vm/run.html" allow="fullscreen; pointer-lock"></iframe>
    <div class="vm-status"><span class="dot" id="vm-led"></span><span class="vm-st">Starting…</span><span class="grow"></span>
      <span>${(t.fixedMemory ? t.memory : vm.memory)} MB</span><span>${vm.network === false || t.net === 'none' ? 'No network' : 'Network: NAT (Wisp)'}</span><span class="vm-hint">Click the screen to type · Esc releases the mouse</span></div></div>`;
  const f = body.querySelector('iframe'), st = s => body.querySelector('.vm-st').textContent = s, led = body.querySelector('#vm-led');
  let emu = null, paused = false, ledT;
  f.onload = async () => {
    let cfg;
    try { await WebProxy.ready().catch(() => {}); cfg = VMBox.config(vm); } catch (e) { return st('Could not start: ' + e.message); }
    emu = f.contentWindow.boot(cfg);
    emu.add_listener('download-progress', x => {
      led.className = 'dot ok'; clearTimeout(ledT); ledT = setTimeout(() => led.className = 'dot', 300);
      if (x.total && x.file_count === 1 && x.loaded < x.total) st(`Loading ${fmtMB(x.loaded)} / ${fmtMB(x.total)}`);
    });
    emu.add_listener('download-error', () => st('A disk image could not be downloaded. Check your connection.'));
    emu.add_listener('emulator-started', () => {
      st('Running');
      if (t.after && !vm.fresh) setTimeout(() => emu.serial0_send(t.after), 1500); // e.g. renew the DHCP lease after a snapshot restore
    });
    win.cleanup.push(() => { try { emu.destroy(); } catch (e) {} });
  };
  body.querySelector('.toolbar').onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a || !emu) return;
    if (a === 'pause') { paused ? emu.run() : emu.stop(); paused = !paused; e.target.closest('button').querySelector('span').textContent = paused ? 'Resume' : 'Pause'; st(paused ? 'Paused' : 'Running'); WM.setTitle(win, `${vm.name} [${paused ? 'Paused' : 'Running'}] — VMBox`); }
    if (a === 'reset') emu.restart();
    if (a === 'cad') emu.keyboard_send_scancodes([0x1D, 0x38, 0x53, 0x53 | 0x80, 0x38 | 0x80, 0x1D | 0x80]);
    if (a === 'full') f.requestFullscreen?.();
    if (a === 'shot') {
      const img = emu.screen_make_screenshot?.(); if (!img) return OS.toast('Screenshots work in graphical mode.');
      const c = document.createElement('canvas'); await img.decode?.(); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(async b => { const p = FS.freeName('/Pictures', `${vm.name} screenshot.png`); FS.writeBytes(p, new Uint8Array(await b.arrayBuffer()), 'image/png'); OS.toast('Saved ' + p); });
    }
    if (a === 'save') {
      st('Saving state…'); await emu.stop();
      const s = new Uint8Array(await emu.save_state());
      if (vm.id.startsWith('tmp')) { OS.toast('This one-off machine can’t save its state.'); return st('Running'); }
      try { FS.writeBytes(statePath(vm), s, 'application/octet-stream'); VMBox.update(vm.id, { savedAt: Date.now() }); OS.toast(`Saved the state of ${vm.name} (${fmtMB(s.length)})`); }
      catch (err) { OS.toast('Could not save the state: ' + err.message); }
      WM.close(win.id);
    }
    if (a === 'off') WM.close(win.id);
  };
}

// Takes over the id of the old "Virtual PC" app so docks, desktops and boot entries keep working.
APPS.vm = ALL_APPS.vm = { name: 'VMBox', icon: realIcon('virtualbox'), cat: 'System', w: 920, h: 600, run(body, win, startTemplate) {
  let sel = VMBox.list()[0]?.id || null;
  const draw = () => {
    const vms = VMBox.list(), vm = VMBox.get(sel) || vms[0]; sel = vm?.id || null;
    const t = vm && tpl(vm.template), running = vm && VMBox.running.has(vm.id), hasState = vm && FS.exists(statePath(vm));
    const stateOf = v => VMBox.running.has(v.id) ? '<span class="vm-run">Running</span>' : FS.exists(statePath(v)) ? 'Saved' : 'Powered Off';
    const sec = (title, rows) => `<div class="vm-sec"><h4>${title}</h4>${rows.map(([k, v]) => `<div><span>${k}:</span><b>${v}</b></div>`).join('')}</div>`;
    const storage = !t ? '' : vm.template === 'custom' ? `${{ cdrom: 'Optical drive', hda: 'Hard disk', fda: 'Floppy' }[vm.source.type]}: ${esc(vm.source.kind === 'file' ? vm.source.path : vm.source.url)}`
      : t.external ? 'Container image (x86-64)' : (() => { const d = t.disk(); return d.hda ? `Hard disk: ${fmtMB(d.hda.size)}` : d.cdrom ? `Optical drive: ${fmtMB(d.cdrom.size)}` : d.fda ? 'Floppy disk' : d.filesystem ? 'Shared filesystem (9p)' : 'Kernel image'; })();
    body.innerHTML = `<div class="vmbox"><aside><div class="toolbar">
        <button class="ghost small" data-a="new">${glyph('plus', 14)}New</button>
        <button class="ghost small" data-a="settings" ${vm ? '' : 'disabled'}>${glyph('settings', 14)}Settings</button>
        <button class="ghost small" data-a="discard" ${hasState && !running ? '' : 'disabled'}>Discard</button>
        <button class="primary small" data-a="start" ${vm ? '' : 'disabled'}>${glyph('forward', 14)}${running ? 'Show' : 'Start'}</button></div>
      <ul class="vm-list">${vms.map(v => `<li class="${v.id === sel ? 'on' : ''}" data-id="${v.id}">${tile(vmIconOf(tpl(v.template)), 36)}<div><b>${esc(v.name)}</b><small>${stateOf(v)}</small></div></li>`).join('') ||
        '<li class="empty-li">No machines yet.<br>Click <b>New</b> to create one.</li>'}</ul></aside>
      <section>${vm ? `<div class="vm-head">${tile(vmIconOf(t), 56)}<div><h3>${esc(vm.name)}</h3><p class="muted">${esc(t.name)}${t.desc ? ' · ' + esc(t.desc) : ''}</p></div></div>
        <div class="vm-grid">
          ${sec('General', [['Name', esc(vm.name)], ['Operating System', esc(t.name)]])}
          ${sec('System', [['Base Memory', t.external ? 'Managed by the emulator' : `${t.fixedMemory ? t.memory : vm.memory} MB`], ['Processor', t.external ? 'x86-64 (Bochs)' : 'x86 (v86)']])}
          ${sec('Display', [['Video Memory', t.external ? 'Terminal' : `${vm.vram || t.vram || 8} MB`]])}
          ${sec('Storage', [['Controller', esc(storage)]])}
          ${sec('Network', [['Adapter 1', t.external || vm.network === false ? 'Not attached' : `${t.net === 'virtio' ? 'Virtio-net' : 'NE2000'} (NAT via Wisp)`]])}
          ${sec('Saved State', [['State', running ? 'Running' : hasState ? `Saved ${new Date(vm.savedAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · ${fmtMB(FS.size(statePath(vm)))}` : 'None']])}
        </div>
        <div class="row" style="padding:0 20px 20px"><button class="danger" data-a="delete">${glyph('trash', 14)}Remove…</button></div>`
        : `<div class="empty" style="margin-top:80px">${tile(realIcon('virtualbox'), 72)}<h3 style="margin-top:16px">Welcome to VMBox</h3>
           <p class="muted" style="max-width:420px;margin:8px auto 16px">Run Ubuntu, Arch Linux, Windows, BSD and more in virtual machines, right in your browser.</p>
           <button class="primary" data-a="new">${glyph('plus', 14)}New Machine</button></div>`}</section></div>`;
  };
  body.onclick = e => {
    const li = e.target.closest('li[data-id]'); if (li) { sel = li.dataset.id; return draw(); }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'new') return wizard();
    if (a === 'start') return VMBox.start(sel);
    if (a === 'settings') return wizard(VMBox.get(sel));
    if (a === 'discard' && confirm('Discard the saved state? The machine will boot fresh next time.')) { FS.rm(statePath({ id: sel })); VMBox.update(sel, { savedAt: null }); }
    if (a === 'delete' && confirm(`Remove “${VMBox.get(sel).name}” and its saved state?`)) { VMBox.remove(sel); sel = null; }
  };
  body.ondblclick = e => { const li = e.target.closest('li[data-id]'); if (li) VMBox.start(li.dataset.id); };

  // New / Settings dialog.
  const wizard = (edit, preset) => {
    const m = document.createElement('div'); m.className = 'modal';
    const groups = [...new Set(VM_TEMPLATES.map(t => t.group))];
    let tid = edit ? edit.template : preset || 'ubuntu18';
    const render = () => {
      const t = tpl(tid), src = edit?.source || {};
      m.innerHTML = `<form class="modal-card vm-wiz"><h3>${edit ? 'Settings — ' + esc(edit.name) : 'Create Virtual Machine'}</h3>
        <label class="field">Name<input name="name" required value="${esc(edit ? edit.name : t.name)}" maxlength="40"></label>
        <label class="field">Operating System<select name="tpl" ${edit ? 'disabled' : ''}>${groups.map(g => `<optgroup label="${g}">${VM_TEMPLATES.filter(x => x.group === g).map(x => `<option value="${x.id}" ${x.id === tid ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>
        <p class="muted small">${esc(t.desc || '')}</p>
        ${t.external ? '' : `
        <label class="field">Base Memory <span class="muted">${t.fixedMemory ? `(fixed at ${t.memory} MB by its snapshot)` : ''}</span>
          <div class="row"><input type="range" name="memory" min="16" max="1024" step="16" value="${edit?.memory || t.memory}" ${t.fixedMemory ? 'disabled' : ''} class="grow"><b class="mem-v">${edit?.memory || t.memory} MB</b></div></label>
        <label class="row small"><input type="checkbox" name="network" ${edit?.network === false ? '' : 'checked'} ${t.net === 'none' ? 'disabled' : ''}> Enable network (NAT through the proxy server)</label>`}
        ${tid === 'custom' ? `<div class="field">Boot image
          <div class="seg"><button type="button" data-k="file" class="${src.kind !== 'url' ? 'on' : ''}">From Files</button><button type="button" data-k="url" class="${src.kind === 'url' ? 'on' : ''}">From URL</button></div>
          <div class="row k-file ${src.kind === 'url' ? 'hidden' : ''}"><input name="path" class="grow" placeholder="/VMs/my.iso" value="${esc(src.path || '')}"><button type="button" data-a="pick">Choose…</button><button type="button" data-a="upload">Upload…</button><input type="file" hidden accept=".iso,.img,.ima,.flp,.vfd,.bin"></div>
          <input name="url" class="k-url ${src.kind === 'url' ? '' : 'hidden'}" placeholder="https://…/image.iso (must allow cross-site downloads)" value="${esc(src.url || '')}">
          <select name="type"><option value="cdrom" ${src.type === 'cdrom' ? 'selected' : ''}>CD/DVD (ISO)</option><option value="hda" ${src.type === 'hda' ? 'selected' : ''}>Hard disk image</option><option value="fda" ${src.type === 'fda' ? 'selected' : ''}>Floppy image</option></select></div>` : ''}
        <div class="row" style="justify-content:flex-end"><button type="button" class="ghost" data-a="cancel">Cancel</button><button class="primary">${edit ? 'Save' : t.external ? 'Add' : 'Create'}</button></div></form>`;
      const f = m.querySelector('form');
      f.tpl.onchange = () => { tid = f.tpl.value; render(); };
      if (f.memory) f.memory.oninput = () => m.querySelector('.mem-v').textContent = f.memory.value + ' MB';
      m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { m.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === b)); m.querySelector('.k-file').classList.toggle('hidden', b.dataset.k !== 'file'); m.querySelector('.k-url').classList.toggle('hidden', b.dataset.k !== 'url'); });
      const fileIn = m.querySelector('input[type=file]');
      const guessType = n => /\.iso$/i.test(n) ? 'cdrom' : /\.(ima|flp|vfd)$/i.test(n) ? 'fda' : 'hda';
      m.querySelector('[data-a=pick]')?.addEventListener('click', async () => { const p = await FilePicker(win, { mode: 'open', start: FS.isDir('/VMs') ? '/VMs' : '/' }); if (p) { f.path.value = p; f.type.value = guessType(p); } });
      m.querySelector('[data-a=upload]')?.addEventListener('click', () => fileIn.click());
      if (fileIn) fileIn.onchange = async () => {
        const file = fileIn.files[0]; if (!file) return;
        if (file.size > 700 * MB) return OS.toast('That image is too large to store in the browser (700 MB max).');
        const p = FS.freeName('/VMs', file.name); OS.toast(`Copying ${file.name} into Files…`);
        FS.writeBytes(p, new Uint8Array(await file.arrayBuffer())); f.path.value = p; f.type.value = guessType(file.name);
      };
      f.onsubmit = e => {
        e.preventDefault();
        const fields = { name: f.name.value.trim() || t.name, memory: f.memory ? +f.memory.value : t.memory, network: f.network ? f.network.checked : false };
        if (tid === 'custom') {
          const kind = m.querySelector('[data-k].on').dataset.k;
          fields.source = kind === 'url' ? { kind, url: f.url.value.trim(), type: f.type.value } : { kind, path: f.path.value.trim(), type: f.type.value };
          if (kind === 'file' ? !FS.exists(fields.source.path) : !/^https?:\/\//.test(fields.source.url)) return OS.toast(kind === 'file' ? 'Choose or upload an image first.' : 'Enter a full http(s) address.');
        }
        if (edit) VMBox.update(edit.id, fields); else sel = VMBox.create({ template: tid, ...fields }).id;
        m.remove(); draw();
      };
      m.querySelector('[data-a=cancel]').onclick = () => m.remove();
    };
    m.onclick = e => { if (e.target === m) m.remove(); };
    render(); body.appendChild(m); m.querySelector('input[name=name]').select();
  };

  const onChange = () => { if (!body.querySelector('.modal')) draw(); };
  addEventListener('vmbox-change', onChange); win.cleanup.push(() => removeEventListener('vmbox-change', onChange));
  // Started from elsewhere (boot menu, launcher): start that template, creating a machine for it if needed.
  if (startTemplate) {
    let vm = VMBox.list().find(v => v.template === startTemplate);
    if (!vm) vm = VMBox.create({ template: startTemplate, name: tpl(startTemplate).name, memory: tpl(startTemplate).memory, network: true });
    sel = vm.id; setTimeout(() => VMBox.start(vm.id));
  }
  draw();
} };
