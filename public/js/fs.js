// Virtual filesystem. Lives in memory for a synchronous API and is persisted to IndexedDB
// (no 5 MB localStorage cap, binary files allowed). Falls back to localStorage if IndexedDB is unavailable.
// Node: { type: 'dir' } | { type: 'file', content?: string, data?: Uint8Array, mime?: string, mtime: number }
const FS = {
  DB: 'novaos-fs', STORE: 'nodes', LEGACY: 'novaos.fs',
  data: {}, db: null,
  ready: null,
  defaults() {
    return { '/': { type: 'dir' }, '/Documents': { type: 'dir' }, '/Pictures': { type: 'dir' }, '/Downloads': { type: 'dir' },
      '/Documents/readme.txt': { type: 'file', mtime: Date.now(), content: 'Welcome to NovaOS!\n\n- Games has Doom, Wolfenstein 3D and Commander Keen.\n- Linux runs a real x86 Linux; this folder is shared at /mnt/home.\n- Drag files from your computer into Files to upload them.\n' },
      '/Documents/hello.html': { type: 'file', mtime: Date.now(), content: '<!doctype html>\n<h1 style="font-family:sans-serif">Hello from NovaOS</h1>\n<p>Edit me in Text Editor and press Preview.</p>\n' } };
  },
  async load() {
    let legacy = null;
    try { legacy = JSON.parse(localStorage.getItem(this.LEGACY)); } catch (e) {}
    try {
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open(this.DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(this.STORE);
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      const tx = this.db.transaction(this.STORE), st = tx.objectStore(this.STORE);
      const [keys, vals] = await Promise.all([this.req(st.getAllKeys()), this.req(st.getAll())]);
      keys.forEach((k, i) => this.data[k] = vals[i]);
      if (!keys.length) { // first run: migrate files from older versions (localStorage) or create defaults
        this.data = legacy || this.defaults();
        for (const n of Object.values(this.data)) if (n.type === 'file' && !n.mtime) n.mtime = Date.now();
        await this.flushAll();
        if (legacy) localStorage.removeItem(this.LEGACY);
      }
    } catch (e) {
      this.db = null; this.data = legacy || this.defaults(); // private mode etc.
    }
    // Standard folders (older versions didn't have all of them)
    const missing = Object.entries(this.defaults()).filter(([k, v]) => v.type === 'dir' && !this.data[k]).map(([k, v]) => (this.data[k] = v, k));
    if (missing.length) this.persist(missing);
  },
  req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  flushAll() {
    const tx = this.db.transaction(this.STORE, 'readwrite'), st = tx.objectStore(this.STORE);
    st.clear(); for (const [k, v] of Object.entries(this.data)) st.put(v, k);
    return new Promise(r => tx.oncomplete = tx.onerror = r);
  },
  persist(put = [], del = []) {
    if (!this.db) { try { localStorage.setItem(this.LEGACY, JSON.stringify(this.data, (k, v) => v instanceof Uint8Array ? undefined : v)); } catch (e) {} dispatchEvent(new Event('fs-change')); return; }
    const st = this.db.transaction(this.STORE, 'readwrite').objectStore(this.STORE);
    for (const p of put) st.put(this.data[p], p);
    for (const p of del) st.delete(p);
    dispatchEvent(new Event('fs-change'));
  },
  norm(p) {
    const out = [];
    for (const s of String(p).split('/')) { if (!s || s === '.') continue; if (s === '..') out.pop(); else out.push(s); }
    return '/' + out.join('/');
  },
  join(a, b) { return this.norm(String(b).startsWith('/') ? b : a + '/' + b); },
  parent(p) { return this.norm(p + '/..'); },
  base(p) { return this.norm(p).split('/').pop(); },
  exists(p) { return !!this.data[this.norm(p)]; },
  isDir(p) { const n = this.data[this.norm(p)]; return !!n && n.type === 'dir'; },
  stat(p) { return this.data[this.norm(p)] || null; },
  size(p) { const n = this.stat(p); return !n || n.type !== 'file' ? 0 : n.data ? n.data.length : new Blob([n.content || '']).size; },
  list(p) {
    p = this.norm(p); const pre = p === '/' ? '/' : p + '/';
    return Object.keys(this.data).filter(k => k !== p && k.startsWith(pre) && !k.slice(pre.length).includes('/'))
      .map(k => ({ path: k, name: k.slice(pre.length), type: this.data[k].type }))
      .sort((a, b) => (a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1) || a.name.localeCompare(b.name));
  },
  // Make sure every parent folder of p exists.
  mkdirp(p) { const put = []; let cur = ''; for (const s of this.parent(p).split('/').filter(Boolean)) { cur += '/' + s; if (!this.data[cur]) { this.data[cur] = { type: 'dir' }; put.push(cur); } } return put; },
  read(p) { const n = this.stat(p); if (!n || n.type !== 'file') return null; return n.data ? new TextDecoder().decode(n.data) : n.content ?? ''; },
  bytes(p) { const n = this.stat(p); if (!n || n.type !== 'file') return null; return n.data || new TextEncoder().encode(n.content || ''); },
  blob(p) { const b = this.bytes(p); return b && new Blob([b], { type: this.stat(p).mime || mimeOf(p) }); },
  write(p, content) { p = this.norm(p); const put = this.mkdirp(p); this.data[p] = { type: 'file', content: String(content), mtime: Date.now() }; this.persist([...put, p]); },
  writeBytes(p, data, mime) { p = this.norm(p); const put = this.mkdirp(p); this.data[p] = { type: 'file', data: new Uint8Array(data), mime: mime || mimeOf(p), mtime: Date.now() }; this.persist([...put, p]); },
  mkdir(p) { p = this.norm(p); const put = this.mkdirp(p); this.data[p] = { type: 'dir' }; this.persist([...put, p]); },
  rm(p) {
    p = this.norm(p); if (p === '/') return; const del = [];
    for (const k of Object.keys(this.data)) if (k === p || k.startsWith(p + '/')) { delete this.data[k]; del.push(k); }
    this.persist([], del);
  },
  mv(from, to) {
    from = this.norm(from); to = this.norm(to); if (from === to || to.startsWith(from + '/') || this.exists(to)) return false;
    const put = this.mkdirp(to), del = [];
    for (const k of Object.keys(this.data)) if (k === from || k.startsWith(from + '/')) { const nk = to + k.slice(from.length); this.data[nk] = this.data[k]; delete this.data[k]; put.push(nk); del.push(k); }
    this.persist(put, del); return true;
  },
  // A free name in dir for `name` (adds " (2)" etc. when taken).
  freeName(dir, name) {
    if (!this.exists(this.join(dir, name))) return this.join(dir, name);
    const m = name.match(/^(.*?)(\.[^.]*)?$/); let i = 2;
    while (this.exists(this.join(dir, `${m[1]} (${i})${m[2] || ''}`))) i++;
    return this.join(dir, `${m[1]} (${i})${m[2] || ''}`);
  },
};

const MIME = { txt: 'text/plain', md: 'text/markdown', html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', json: 'application/json', py: 'text/x-python', sh: 'text/x-sh',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', pdf: 'application/pdf', zip: 'application/zip' };
const extOf = p => (String(p).match(/\.([^./]+)$/) || [])[1]?.toLowerCase() || '';
const mimeOf = p => MIME[extOf(p)] || 'application/octet-stream';
const kindOf = p => { const m = mimeOf(p); return m.startsWith('image/') ? 'image' : /^(video|audio)\//.test(m) ? 'media' : m === 'application/pdf' ? 'pdf' : /^text\/|json|svg/.test(m) || !extOf(p) ? 'text' : 'binary'; };

FS.ready = FS.load();
