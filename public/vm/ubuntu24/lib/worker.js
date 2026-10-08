// Runs a container2wasm (WASI) image and connects its stdio to xterm-pty.
// Adapted from container2wasm's examples/wasi-browser (Apache-2.0). Networking is not wired up.
importScripts('./workerTools.js', './browser_wasi_shim/index.js', './browser_wasi_shim/wasi_defs.js', './wasi-util.js');

let wasm = null;
onmessage = msg => {
  if (msg.data && msg.data.type === 'init') { wasm = msg.data.wasm; return; } // image arrives from the page
  const ttyClient = new TtyClient(msg.data);
  const wasi = new WASI([], [], []);
  hookStdio(wasi, ttyClient);
  WebAssembly.compile(wasm).then(mod => {
    wasm = null;
    // Images built with networking support import socket calls the shim doesn't have: answer ENOSYS.
    for (const imp of WebAssembly.Module.imports(mod))
      if (imp.module === 'wasi_snapshot_preview1' && imp.kind === 'function' && !wasi.wasiImport[imp.name]) wasi.wasiImport[imp.name] = () => 52;
    return WebAssembly.instantiate(mod, { wasi_snapshot_preview1: wasi.wasiImport });
  }).then(inst => wasi.start(inst));
};

function hookStdio(wasi, tty) {
  const ERRNO_INVAL = 28;
  const mem = () => wasi.inst.exports.memory.buffer;
  const _read = wasi.wasiImport.fd_read, _write = wasi.wasiImport.fd_write;
  wasi.wasiImport.fd_read = (fd, iovs, iovsLen, nreadPtr) => {
    if (fd !== 0) return _read.apply(wasi.wasiImport, [fd, iovs, iovsLen, nreadPtr]);
    const view = new DataView(mem()), bytes = new Uint8Array(mem());
    let n = 0;
    for (const v of Iovec.read_bytes_array(view, iovs, iovsLen)) {
      if (!v.buf_len) continue;
      const data = tty.onRead(v.buf_len); bytes.set(data, v.buf); n += data.length;
    }
    view.setUint32(nreadPtr, n, true); return 0;
  };
  wasi.wasiImport.fd_write = (fd, iovs, iovsLen, nwrittenPtr) => {
    if (fd !== 1 && fd !== 2) return _write.apply(wasi.wasiImport, [fd, iovs, iovsLen, nwrittenPtr]);
    const view = new DataView(mem()), bytes = new Uint8Array(mem());
    let n = 0;
    for (const v of Ciovec.read_bytes_array(view, iovs, iovsLen)) {
      if (!v.buf_len) continue;
      tty.onWrite(Array.from(bytes.slice(v.buf, v.buf + v.buf_len))); n += v.buf_len;
    }
    view.setUint32(nwrittenPtr, n, true); return 0;
  };
  wasi.wasiImport.poll_oneoff = (inPtr, outPtr, nsubs, neventsPtr) => {
    if (!nsubs) return ERRNO_INVAL;
    const view = new DataView(mem());
    let stdinSub = null, clockSub = null, timeout = Number.MAX_VALUE;
    for (const sub of Subscription.read_bytes_array(view, inPtr, nsubs)) {
      if (sub.u.tag.variant === 'fd_read') { if (sub.u.data.fd !== 0) return ERRNO_INVAL; stdinSub = sub; }
      else if (sub.u.tag.variant === 'clock') { if (sub.u.data.timeout < timeout) { timeout = sub.u.data.timeout; clockSub = sub; } }
      else return ERRNO_INVAL;
    }
    const events = [];
    const readable = (stdinSub || (clockSub && timeout > 0)) ? tty.onWaitForReadable(timeout / 1e9) : false;
    if (readable && stdinSub) { const e = new Event(); e.userdata = stdinSub.userdata; e.error = 0; e.type = new EventType('fd_read'); events.push(e); }
    if (clockSub) { const e = new Event(); e.userdata = clockSub.userdata; e.error = 0; e.type = new EventType('clock'); events.push(e); }
    Event.write_bytes_array(view, outPtr, events);
    view.setUint32(neventsPtr, events.length, true); return 0;
  };
}
