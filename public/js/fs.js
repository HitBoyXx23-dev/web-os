// Tiny persistent virtual filesystem backed by localStorage.
const FS = {
  KEY: 'novaos.fs',
  data: null,
  load() {
    try { this.data = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
    if (!this.data) this.data = { '/': { type: 'dir' }, '/Documents': { type: 'dir' }, '/Pictures': { type: 'dir' },
      '/Documents/readme.txt': { type: 'file', content: 'Welcome to NovaOS!\n\nOpen the Games hub for games, or Virtual PC to boot a real Windows in your browser.' } };
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {} },
  norm(p) {
    const out = [];
    for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') out.pop(); else out.push(s); }
    return '/' + out.join('/');
  },
  join(a, b) { return this.norm(b.startsWith('/') ? b : a + '/' + b); },
  exists(p) { return !!this.data[this.norm(p)]; },
  isDir(p) { const n = this.data[this.norm(p)]; return n && n.type === 'dir'; },
  list(p) {
    p = this.norm(p); const pre = p === '/' ? '/' : p + '/';
    return Object.keys(this.data).filter(k => k !== p && k.startsWith(pre) && !k.slice(pre.length).includes('/'))
      .map(k => ({ path: k, name: k.slice(pre.length), type: this.data[k].type })).sort((a, b) => (a.type > b.type ? 1 : -1) || a.name.localeCompare(b.name));
  },
  read(p) { const n = this.data[this.norm(p)]; return n && n.type === 'file' ? n.content : null; },
  write(p, content) { this.data[this.norm(p)] = { type: 'file', content }; this.save(); },
  mkdir(p) { this.data[this.norm(p)] = { type: 'dir' }; this.save(); },
  rm(p) { p = this.norm(p); if (p === '/') return; for (const k of Object.keys(this.data)) if (k === p || k.startsWith(p + '/')) delete this.data[k]; this.save(); },
};
FS.load();
