// Builds a FAT16 hard-disk image (MBR + one partition) holding the given files, with long file names.
// Used to hand programs to Windows/DOS virtual machines as drive D:.
// files: [{ path: 'Folder/Setup.exe', data: Uint8Array }]
function makeFat16Image(files, label = 'HITBOY') {
  const SECTOR = 512, HIDDEN = 63, HEADS = 16, SPT = 63;
  const need = files.reduce((n, f) => n + f.data.length + 4096, 0);
  let sizeMB = Math.max(32, Math.ceil(need * 1.15 / 1048576) + 8);
  sizeMB = Math.min(2000, Math.ceil(sizeMB / 8) * 8);
  const spc = sizeMB <= 120 ? 4 : sizeMB <= 250 ? 8 : sizeMB <= 500 ? 16 : sizeMB <= 1000 ? 32 : 64; // keep 4085..65524 clusters
  const totalSectors = sizeMB * 2048, partSectors = totalSectors - HIDDEN;
  const rootEntries = 512, rootSectors = rootEntries * 32 / SECTOR, reserved = 1;
  let fatSectors = 1;
  for (;;) { // smallest FAT that covers every data cluster
    const clusters = Math.floor((partSectors - reserved - 2 * fatSectors - rootSectors) / spc);
    if ((clusters + 2) * 2 <= fatSectors * SECTOR) break; fatSectors++;
  }
  const dataStart = reserved + 2 * fatSectors + rootSectors;
  const clusterCount = Math.floor((partSectors - dataStart) / spc), clusterBytes = spc * SECTOR;
  const img = new Uint8Array(totalSectors * SECTOR), dv = new DataView(img.buffer);
  const P = HIDDEN * SECTOR; // partition start (bytes)

  // MBR with one FAT16 (LBA) partition
  const chs = lba => { const c = Math.floor(lba / (HEADS * SPT)), h = Math.floor(lba / SPT) % HEADS, s = lba % SPT + 1; return [h, ((c >> 2) & 0xC0) | s, c & 0xFF]; };
  img.set([0x80, ...chs(HIDDEN), 0x0E, ...chs(Math.min(totalSectors - 1, 1023 * HEADS * SPT))], 446);
  dv.setUint32(446 + 8, HIDDEN, true); dv.setUint32(446 + 12, partSectors, true);
  img[510] = 0x55; img[511] = 0xAA;

  // Boot sector / BPB
  img.set([0xEB, 0x3C, 0x90], P); img.set(new TextEncoder().encode('MSWIN4.1'), P + 3);
  dv.setUint16(P + 11, SECTOR, true); img[P + 13] = spc; dv.setUint16(P + 14, reserved, true); img[P + 16] = 2;
  dv.setUint16(P + 17, rootEntries, true); dv.setUint16(P + 19, partSectors < 65536 ? partSectors : 0, true); img[P + 21] = 0xF8;
  dv.setUint16(P + 22, fatSectors, true); dv.setUint16(P + 24, SPT, true); dv.setUint16(P + 26, HEADS, true);
  dv.setUint32(P + 28, HIDDEN, true); dv.setUint32(P + 32, partSectors >= 65536 ? partSectors : 0, true);
  img[P + 36] = 0x80; img[P + 38] = 0x29; dv.setUint32(P + 39, (Math.random() * 2 ** 32) >>> 0, true);
  img.set(new TextEncoder().encode(label.toUpperCase().padEnd(11).slice(0, 11)), P + 43); img.set(new TextEncoder().encode('FAT16   '), P + 54);
  img[P + 510] = 0x55; img[P + 511] = 0xAA;

  const fatOff = P + reserved * SECTOR, rootOff = fatOff + 2 * fatSectors * SECTOR, dataOff = P + dataStart * SECTOR;
  const fat = new Uint16Array(clusterCount + 2); fat[0] = 0xFFF8; fat[1] = 0xFFFF;
  let next = 2;
  const alloc = n => { // contiguous chain of n clusters, returns first
    if (!n) return 0;
    if (next + n > clusterCount + 2) throw new Error('Disk image is full');
    const first = next; for (let i = 0; i < n; i++) fat[next + i] = i === n - 1 ? 0xFFFF : next + i + 1; next += n; return first;
  };
  const clusterOff = c => dataOff + (c - 2) * clusterBytes;

  // Directory tree
  const root = { dirs: new Map(), files: [] };
  for (const f of files) {
    const parts = f.path.split('/').filter(Boolean); let d = root;
    for (const p of parts.slice(0, -1)) { if (!d.dirs.has(p)) d.dirs.set(p, { dirs: new Map(), files: [] }); d = d.dirs.get(p); }
    d.files.push({ name: parts[parts.length - 1], data: f.data });
  }
  const now = new Date(), fdate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), ftime = (now.getHours() << 11) | (now.getMinutes() << 5);
  // 8.3 short names (unique per directory) + long-name entries
  const shortName = (name, used) => {
    const clean = s => s.toUpperCase().replace(/[^A-Z0-9!#$%&'()\-@^_`{}~]/g, '_');
    const dot = name.lastIndexOf('.'), base = clean(dot > 0 ? name.slice(0, dot) : name).replace(/^\.+/, ''), ext = dot > 0 ? clean(name.slice(dot + 1)).slice(0, 3) : '';
    const exact = base.length <= 8 && (dot < 0 || name.slice(dot + 1).length <= 3) && name === (base + (ext ? '.' + ext : '')); // otherwise keep the real name in a long-name entry
    let b = base.slice(0, 8), n = 1;
    const key = () => b.padEnd(8) + ext.padEnd(3);
    if (!exact || used.has(key())) do { const t = '~' + n++; b = base.slice(0, 8 - t.length) + t; } while (used.has(key()));
    used.add(key()); return { raw: key(), lossy: !exact };
  };
  const entry = (raw, attr, cluster, size) => {
    const e = new Uint8Array(32), v = new DataView(e.buffer);
    e.set(new TextEncoder().encode(raw)); e[11] = attr;
    v.setUint16(14, ftime, true); v.setUint16(16, fdate, true); v.setUint16(18, fdate, true); v.setUint16(22, ftime, true); v.setUint16(24, fdate, true);
    v.setUint16(26, cluster, true); v.setUint32(28, size, true); return e;
  };
  const lfnEntries = (name, raw) => {
    let sum = 0; for (let i = 0; i < 11; i++) sum = (((sum & 1) << 7) + (sum >> 1) + raw.charCodeAt(i)) & 0xFF;
    const chars = [...name].map(c => c.charCodeAt(0)), count = Math.ceil((chars.length + 1) / 13), out = [];
    for (let k = count; k >= 1; k--) {
      const e = new Uint8Array(32), v = new DataView(e.buffer); e[0] = k | (k === count ? 0x40 : 0); e[11] = 0x0F; e[13] = sum;
      const slots = [1, 3, 5, 7, 9, 14, 16, 18, 20, 22, 24, 28, 30];
      for (let j = 0; j < 13; j++) { const idx = (k - 1) * 13 + j; v.setUint16(slots[j], idx < chars.length ? chars[idx] : idx === chars.length ? 0 : 0xFFFF, true); }
      out.push(e);
    }
    return out;
  };
  // Writes a directory's entries into the root region or its cluster chain, then its subdirectories.
  const writeDir = (d, isRoot, selfCluster, parentCluster) => {
    const used = new Set(), entries = [];
    if (isRoot) entries.push(entry(label.toUpperCase().padEnd(11).slice(0, 11), 0x08, 0, 0)); // volume label
    else entries.push(entry('.          ', 0x10, selfCluster, 0), entry('..         ', 0x10, parentCluster, 0));
    const children = [];
    for (const [name] of d.dirs) children.push({ name, dir: d.dirs.get(name) });
    for (const f of d.files) children.push({ name: f.name, file: f });
    // allocate first so entries can point at their clusters
    for (const c of children) {
      const sn = shortName(c.name, used);
      if (sn.lossy) entries.push(...lfnEntries(c.name, sn.raw));
      if (c.file) {
        const first = alloc(Math.ceil(c.file.data.length / clusterBytes));
        if (first) img.set(c.file.data, clusterOff(first));
        entries.push(entry(sn.raw, 0x20, first, c.file.data.length));
      }
      else { c.slot = entries.length; entries.push(null); c.raw = sn.raw; }
    }
    // subdirectories: size their entry tables, allocate, recurse
    const subs = children.filter(c => c.dir);
    for (const c of subs) {
      const n = 2 + c.dir.files.length * 4 + c.dir.dirs.size * 4; // generous room for long names
      c.cluster = alloc(Math.max(1, Math.ceil(n * 32 / clusterBytes)));
      entries[c.slot] = entry(c.raw, 0x10, c.cluster, 0);
    }
    const bytes = new Uint8Array(entries.length * 32); entries.forEach((e, i) => bytes.set(e, i * 32));
    if (isRoot) { if (entries.length > rootEntries) throw new Error('Too many files in the top folder'); img.set(bytes, rootOff); }
    else img.set(bytes, clusterOff(selfCluster));
    for (const c of subs) writeDir(c.dir, false, c.cluster, isRoot ? 0 : selfCluster);
  };
  writeDir(root, true, 0, 0);
  // both FAT copies
  const fatBytes = new Uint8Array(fat.buffer);
  img.set(fatBytes, fatOff); img.set(fatBytes, fatOff + fatSectors * SECTOR);
  return img;
}
