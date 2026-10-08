// HitBoy Proxy transport: carries proxied traffic over Wisp with end-to-end encrypted TLS, using two TLS
// stacks. Requests go through libcurl.js first; if a site's connection fails there (for example
// "SSL connect error"), the request is retried with Epoxy (rustls), and that site keeps using Epoxy.
// WebSockets use libcurl.js. Loaded by bare-mux: setTransport('/hitboy/transport.mjs', [{ wisp }]).
import LibcurlClient from '../libcurl/index.mjs';
import EpoxyTransport from '../epoxy/index.mjs';

// Bodies we can send a second time (streams can only be read once).
const replayable = body => body == null || typeof body === 'string' || body instanceof ArrayBuffer || ArrayBuffer.isView(body) || body instanceof Blob || body instanceof URLSearchParams || body instanceof FormData;

export default class HitBoyTransport {
  ready = false;
  constructor(opts) {
    this.wisp = opts.wisp;
    this.primary = new LibcurlClient({ websocket: opts.wisp });
    this.backup = new EpoxyTransport({ wisp: opts.wisp });
    this.useBackup = new Set(); // hosts that only work over Epoxy
  }
  async init() { await this.primary.init(); this.ready = true; }
  backupReady() { return this._backup ||= this.backup.init(); }
  async meta() {}
  async request(remote, method, body, headers, signal) {
    if (!this.useBackup.has(remote.host)) {
      try { return await this.primary.request(remote, method, body, headers, signal); }
      catch (err) {
        if (signal?.aborted || !replayable(body)) throw err;
        console.warn(`[HitBoy Proxy] ${remote.host}: ${err.message} — retrying with Epoxy`);
      }
    }
    await this.backupReady();
    const res = await this.backup.request(remote, method, body, headers, signal);
    this.useBackup.add(remote.host);
    return res;
  }
  connect(...args) { return this.primary.connect(...args); }
}
