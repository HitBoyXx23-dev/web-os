// Linux: a real x86 Linux (Buildroot, kernel 6.8) running in the v86 emulator, shown in an xterm.js terminal.
// Networking goes through the same Wisp server as the proxy; your HitBoy Web-OS Home folder is shared at /mnt (9p).
const XTERM = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/';
const LINUX_IMAGE = { url: BASE + 'v86/buildroot-bzimage68.bin', size: 10068480, async: false };

// ws(s)://host/wisp/ → wisp(s)://host/wisp/ (the scheme v86 expects for a Wisp relay)
const wispRelay = () => WebProxy.wispUrl().replace(/^ws(s?):/, 'wisp$1:');

function LinuxApp(body, win) {
  body.style.overflow = 'hidden';
  body.innerHTML = `<div class="linux"><div class="toolbar"><span class="dot" id="lx-dot"></span><span class="small lx-status">Starting…</span><span class="grow"></span>
      <button class="ghost small lx-sync" disabled title="Copy files from /mnt back to your HitBoy Web-OS Home folder">${glyph('download', 14)}Save /mnt to Home</button>
      <button class="ghost small lx-restart">${glyph('reload', 14)}Restart</button></div>
    <div class="lx-term"></div></div>`;
  const $l = s => body.querySelector(s), status = (t, ok) => { $l('.lx-status').textContent = t; $l('#lx-dot').className = 'dot ' + (ok === true ? 'ok' : ok === false ? 'bad' : ''); };
  let emu = null, booted = false, out = '';

  const boot = async () => {
    try {
      status('Loading emulator…');
      await Promise.all([loadOnce(BASE + 'v86/libv86.js'), loadOnce(XTERM + 'lib/xterm.js', XTERM + 'css/xterm.css')]);
      let relay = null;
      try { await WebProxy.ready(); relay = wispRelay(); } catch (e) {} // no proxy server → Linux still boots, just offline
      if (!WM.wins.has(win.id)) return;
      $l('.lx-term').innerHTML = '';
      status('Booting Linux… (downloads a 10 MB kernel the first time)');
      emu = new V86({
        wasm_path: BASE + 'v86/v86.wasm',
        bios: { url: BASE + 'v86/seabios.bin' }, vga_bios: { url: BASE + 'v86/vgabios.bin' },
        bzimage: LINUX_IMAGE,
        cmdline: 'console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on',
        filesystem: {},
        memory_size: 128 * 1024 * 1024, vga_memory_size: 2 * 1024 * 1024,
        serial_container_xtermjs: $l('.lx-term'),
        net_device: relay ? { type: 'ne2k', relay_url: relay } : undefined,
        disable_keyboard: true, disable_mouse: true, autostart: true,
      });
      emu.add_listener('emulator-ready', () => shareHome());
      emu.add_listener('serial0-output-byte', b => {
        if (booted) return;
        out = (out + String.fromCharCode(b)).slice(-200);
        if (/[#$%] $/.test(out)) { // first shell prompt: bring up the network and go to the shared folder
          booted = true;
          status(relay ? 'Running · online via ' + new URL(WebProxy.wispUrl()).host : 'Running · offline (no proxy server)', true);
          $l('.lx-sync').disabled = false;
          emu.serial0_send((relay ? '(udhcpc -q >/dev/null 2>&1 &); ' : '') + 'cd /mnt; clear; echo "HitBoy Web-OS Linux - your Home folder is shared at /mnt. Try: ls, uname -a, vi, wget"\n');
        }
      });
      win.cleanup.push(() => { try { emu.destroy(); } catch (e) {} });
    } catch (e) { status(e.message, false); }
  };

  // Copy HitBoy Web-OS Home into the 9p share, and back on request.
  const enc = new TextEncoder();
  const shareHome = async () => {
    const fs9 = emu.fs9p; if (!fs9) return;
    // Folders first, shallowest first: create_file needs the parent folder to exist.
    for (const dir of Object.keys(FS.data).filter(p => p !== '/' && FS.isDir(p) && !p.includes('/.')).sort((a, b) => a.split('/').length - b.split('/').length)) {
      const r = fs9.SearchPath(dir.slice(1)); if (r.id === -1 && r.parentid !== -1) fs9.CreateDirectory(r.name, r.parentid);
    }
    for (const [path, node] of Object.entries(FS.data)) {
      if (node.type !== 'file' || path === '/' || path.includes('/.')) continue;
      try { await emu.create_file(path.slice(1), FS.bytes(path)); } catch (e) {}
    }
  };
  $l('.lx-sync').onclick = async () => {
    // List files in the guest share via a marker-delimited `find`, then read each one through 9p.
    let buf = '', listening = true;
    const done = new Promise(res => emu.add_listener('serial0-output-byte', b => {
      if (!listening) return; buf += String.fromCharCode(b);
      const m = buf.match(/<<NOVA\r?\n([\s\S]*?)NOVA>>/); if (m) { listening = false; res(m[1]); }
    }));
    emu.serial0_send('echo "<<NOVA"; (cd /mnt && find . -type f); echo "NOVA>>"\n');
    const list = (await done).split(/\r?\n/).map(s => s.trim().replace(/^\.\//, '')).filter(Boolean);
    let n = 0;
    for (const rel of list) { try { FS.writeBytes('/' + rel, await emu.read_file(rel)); n++; } catch (e) {} }
    OS.toast(`Saved ${n} file${n === 1 ? '' : 's'} from /mnt to your Home folder`);
  };
  $l('.lx-restart').onclick = async () => { booted = false; out = ''; $l('.lx-sync').disabled = true; try { await emu?.destroy(); } catch (e) {} boot(); };
  boot();
}
