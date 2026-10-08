// Scrap Shift — a co-op "friendslop" game. Up to 8 friends search a dark, randomly built facility with
// flashlights, haul scrap back to the ship and meet the quota before the shift ends, while monsters hunt them.
// Multiplayer runs over the party server (party.js): the longest-connected player is the host and simulates
// monsters and scrap; everyone sends their own position. Solo mode runs the same game offline.
const SS = { T: 32, W: 64, H: 64 };
const SS_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#a855f7', '#14b8a6', '#ef4444'];
const SS_SCRAP = [['Rubber Duck', 12, 1], ['Old Phone', 28, 1], ['Big Bolt', 18, 2], ['Air Horn', 30, 1], ['Cursed Teddy', 46, 2], ['Brass Bell', 40, 3],
  ['Golden Cup', 70, 3], ['Laser Pointer', 24, 1], ['Toy Robot', 38, 2], ['Fancy Lamp', 52, 4], ['Engine Part', 60, 5], ['Toilet Seat', 22, 2], ['Gift Box', 34, 2], ['Comedy Mask', 44, 1]];
const SS_EMOTES = { 1: '👋', 2: '🕺', 3: '😱', 4: '👍' };
// Each shift takes place in a different kind of facility.
const SS_THEMES = [{ name: 'Factory', a: '#2a2b31', b: '#26272c', wall: '#3a3b43' }, { name: 'Old Mansion', a: '#3a2a22', b: '#33251e', wall: '#5a3e2b' },
  { name: 'Ice Lab', a: '#22303a', b: '#1e2a33', wall: '#3c5566' }, { name: 'Swamp Works', a: '#24301f', b: '#202a1b', wall: '#3d4a2e' }];
const ssTheme = lv => SS_THEMES[(lv - 1) % SS_THEMES.length];

function ssRng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Facility: rooms joined by 2-wide corridors. Room 0 is the ship.
function ssMap(seed, level) {
  const r = ssRng(seed), W = SS.W, H = SS.H, tiles = new Uint8Array(W * H), rooms = [];
  for (let i = 0; i < 120 && rooms.length < 13; i++) {
    const w = 5 + (r() * 7 | 0), h = 5 + (r() * 6 | 0), x = 2 + (r() * (W - w - 4) | 0), y = 2 + (r() * (H - h - 4) | 0);
    if (rooms.every(o => x + w + 2 < o.x || o.x + o.w + 2 < x || y + h + 2 < o.y || o.y + o.h + 2 < y)) rooms.push({ x, y, w, h });
  }
  const carve = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) tiles[y * W + x] = 1; };
  for (const o of rooms) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) carve(x, y);
  const mid = o => [o.x + (o.w >> 1), o.y + (o.h >> 1)];
  for (let i = 1; i < rooms.length; i++) { // join each room to the nearest earlier one
    const [ax, ay] = mid(rooms[i]); let best = rooms[0], bd = 1e9;
    for (let j = 0; j < i; j++) { const [bx, by] = mid(rooms[j]), d = Math.abs(ax - bx) + Math.abs(ay - by); if (d < bd) { bd = d; best = rooms[j]; } }
    const [bx, by] = mid(best), flip = r() < .5;
    const hline = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { carve(x, y); carve(x, y + 1); } };
    const vline = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { carve(x, y); carve(x + 1, y); } };
    if (flip) { hline(ax, bx, ay); vline(ay, by, bx); } else { vline(ay, by, ax); hline(ax, bx, by); }
  }
  // scrap in every room but the ship; monsters in the far half
  const scrap = [], monsters = [], T = SS.T, far = rooms.slice(1).sort((a, b) => dist2(mid(b), mid(rooms[0])) - dist2(mid(a), mid(rooms[0])));
  rooms.slice(1).forEach(o => { const n = 2 + (r() * 3 | 0); for (let k = 0; k < n; k++) { const [name, v, wt] = SS_SCRAP[r() * SS_SCRAP.length | 0];
    scrap.push({ id: scrap.length, name, v: Math.round(v * (1 + level * .15) * (.8 + r() * .5)), wt, x: (o.x + .5 + r() * (o.w - 1)) * T, y: (o.y + .5 + r() * (o.h - 1)) * T, own: 0 }); } });
  const nm = Math.min(far.length, 2 + level);
  for (let k = 0; k < nm; k++) { const o = far[k % Math.ceil(far.length / 2)]; const x = (o.x + o.w / 2) * T + k * 6, y = (o.y + o.h / 2) * T;
    monsters.push({ kind: ['lurker', 'statue', 'hoarder'][k % 3], x, y, nx: x, ny: y, a: 0, st: 'wander', tx: 0, ty: 0, tt: 0, stun: 0, mad: 0 }); }
  return { tiles, rooms, ship: rooms[0], scrap, monsters };
}
function dist2(a, b) { return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; }
const ssWall = (map, x, y) => { const tx = Math.floor(x / SS.T), ty = Math.floor(y / SS.T); return tx < 0 || ty < 0 || tx >= SS.W || ty >= SS.H || !map.tiles[ty * SS.W + tx]; };
function ssMove(map, e, dx, dy, rad = 11) {
  const free = (x, y) => !ssWall(map, x - rad, y - rad) && !ssWall(map, x + rad, y - rad) && !ssWall(map, x - rad, y + rad) && !ssWall(map, x + rad, y + rad);
  if (free(e.x + dx, e.y)) e.x += dx; if (free(e.x, e.y + dy)) e.y += dy;
}
function ssSees(map, a, b, max = 1e9) { // line of sight between two points
  const d = Math.hypot(b.x - a.x, b.y - a.y); if (d > max) return false;
  const n = Math.ceil(d / 12); for (let i = 1; i < n; i++) if (ssWall(map, a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)) return false; return true;
}
const inShip = (map, p) => { const s = map.ship, T = SS.T; return p.x > s.x * T && p.x < (s.x + s.w) * T && p.y > s.y * T && p.y < (s.y + s.h) * T; };
const lit = (p, q, map) => p.fl && !p.dead && Math.hypot(q.x - p.x, q.y - p.y) < 270 && Math.abs(((Math.atan2(q.y - p.y, q.x - p.x) - p.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < .5 && ssSees(map, p, q);

GAME_APPS.scrapshift = ALL_APPS.scrapshift = { name: 'Scrap Shift', icon: { mono: 'SS', bg: '#c2410c' }, cat: 'Games', desc: 'Co-op scavenging with friends', w: 1040, h: 700, run(body, win) {
  body.style.overflow = 'hidden'; body.tabIndex = 0;
  body.innerHTML = `<div class="ss"><canvas></canvas><div class="ss-ui"></div><form class="ss-say hidden"><input maxlength="120" placeholder="Say something (only people near you hear it)"></form></div>`;
  const cv = body.querySelector('canvas'), cx = cv.getContext('2d'), ui = body.querySelector('.ss-ui'), sayF = body.querySelector('.ss-say'), sayI = sayF.querySelector('input');
  const dark = document.createElement('canvas'), dx = dark.getContext('2d');
  let conn = null, myId = 1, hostId = 1, solo = true, peers = new Map(), running = true;
  const me = { name: (OS.account?.name || OS.user).split(' ')[0], color: SS_COLORS[(localStorage.getItem('novaos.ssColor') ?? (Math.random() * SS_COLORS.length | 0)) % SS_COLORS.length], x: 0, y: 0, a: 0, fl: true, dead: false, stam: 1, e: 0, eAt: 0 };
  let W = null; // world: { seed, lv, q, b, tl, ph, map, msg }
  const players = () => [{ id: myId, ...me }, ...[...peers.values()].filter(p => p.x !== undefined)];
  const isHost = () => myId === hostId;
  const pickHost = () => { hostId = Math.min(myId, ...peers.keys()); };
  const log = []; const say = (text, from) => { log.push({ text, at: Date.now(), from }); if (log.length > 6) log.shift(); };

  // ---- sound ----
  let ac; const beep = (f, d = .12, type = 'square', v = .05) => { try { ac ||= new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (e) {} };

  // ---- networking ----
  const send = m => conn?.send(m);
  const toHost = m => { if (isHost()) hostMsg({ ...m, from: myId }); else send({ ...m, to: hostId }); };
  const newShift = (lv, q, keepSeed) => {
    const seed = keepSeed || (Math.random() * 1e9 | 0), map = ssMap(seed, lv);
    W = { seed, lv, q, b: 0, tl: 150 + lv * 20, ph: 'play', map, msg: null, msgAt: 0, stats: {} };
    spawn();
  };
  const spawn = () => { const s = W.map.ship, i = myId % 6; me.x = (s.x + 1.5 + i % 3) * SS.T; me.y = (s.y + 1.5 + (i / 3 | 0)) * SS.T; me.dead = false; me.stam = 1; };
  const snapshot = () => ({ t: 'w', seed: W.seed, lv: W.lv, q: W.q, b: W.b, tl: Math.round(W.tl), ph: W.ph, msg: W.msg, bd: W.ph === 'end' ? W.board : undefined,
    m: W.map.monsters.map(m => [Math.round(m.x), Math.round(m.y), m.kind, m.st, +m.a.toFixed(2)]), s: W.map.scrap.map(s => [s.own, Math.round(s.x), Math.round(s.y)]) });
  const applySnap = m => {
    if (!W || W.seed !== m.seed) { const fresh = !W || W.lv !== m.lv || W.ph !== m.ph; W = { seed: m.seed, lv: m.lv, map: ssMap(m.seed, m.lv) }; if (fresh) spawn(); }
    Object.assign(W, { q: m.q, b: m.b, tl: m.tl, ph: m.ph, msg: m.msg, board: m.bd });
    m.m.forEach((v, i) => { const o = W.map.monsters[i]; if (o) { o.x = v[0]; o.y = v[1]; o.st = v[3]; o.a = v[4]; } });
    m.s.forEach((v, i) => { const o = W.map.scrap[i]; if (o) { o.own = v[0]; o.x = v[1]; o.y = v[2]; } });
  };
  // messages every client handles
  const onMsg = m => {
    if (m.t === 'p') { const p = peers.get(m.from); if (p) Object.assign(p, { tx: m.x, ty: m.y, x: p.x ?? m.x, y: p.y ?? m.y, a: m.a, fl: m.fl, dead: m.dead, e: m.e, eAt: m.e && m.e !== p.e ? Date.now() : p.eAt, color: m.c, name: m.n, swingAt: m.sw ? Date.now() : p.swingAt }); return; }
    if (m.t === 'w') { if (!isHost()) applySnap(m); return; }
    if (m.t === 'say') { const p = peers.get(m.from); if (p && (me.dead || Math.hypot(p.x - me.x, p.y - me.y) < 420)) { p.say = m.text; p.sayAt = Date.now(); say(`${p.name}: ${m.text}`); beep(660, .05, 'sine', .03); } return; }
    if (m.t === 'kill') { if (m.id === myId) { me.dead = true; beep(90, .6, 'sawtooth', .08); say('You died. Watch your friends until the shift ends.'); } else { const p = peers.get(m.id); if (p) say(`${p.name} was caught!`); } return; }
    if (m.t === 'scream') { const p = peers.get(m.from); if (p && Math.hypot(p.x - me.x, p.y - me.y) < 600) beep(880, .25, 'sawtooth', .04); }
    if (m.t === 'shove') { if (m.id === myId) { me.push = { a: m.a, t: .22 }; beep(200, .1, 'square', .04); } return; }
    if (isHost()) hostMsg(m);
  };
  // requests only the host acts on
  const hostMsg = m => {
    if (!W || W.ph !== 'play') return;
    const p = m.from === myId ? me : peers.get(m.from); if (!p || p.dead) return;
    if (m.t === 'pick') { const s = W.map.scrap[m.sid]; if (s && !s.own && Math.hypot(s.x - p.x, s.y - p.y) < 90 && W.map.scrap.filter(x => x.own === m.from).length < 4) s.own = m.from; }
    if (m.t === 'drop') W.map.scrap.filter(s => s.own === m.from).forEach((s, i) => { s.own = 0; s.x = p.x + (i % 2) * 14 - 7; s.y = p.y + (i >> 1) * 14; });
    if (m.t === 'bank' && inShip(W.map, p)) W.map.scrap.filter(s => s.own === m.from).forEach(s => { s.own = -1; W.b += s.v; stat(m.from).v += s.v; });
    if (m.t === 'hit') { // shovel: stuns lurkers and hoarders in front of you (statues don't care), shoves friends
      for (const [i, mo] of W.map.monsters.entries()) {
        const d = Math.hypot(mo.x - p.x, mo.y - p.y), da = Math.abs(((Math.atan2(mo.y - p.y, mo.x - p.x) - m.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d > 58 || da > 1 || mo.kind === 'statue') continue;
        mo.stun = 2.5; stat(m.from).hits++;
        if (mo.kind === 'hoarder') { dropHoard(i, mo); mo.mad = 6; mo.foe = m.from; }
      }
      for (const q of players()) if (q.id !== m.from && !q.dead && Math.hypot(q.x - p.x, q.y - p.y) < 40) { const msg = { t: 'shove', id: q.id, a: m.a }; send(msg); if (q.id === myId) onMsg(msg); }
    }
    if (m.t === 'leave' && inShip(W.map, p)) endShift();
    if (m.t === 'scream') W.noise = { x: p.x, y: p.y, at: Date.now() };
  };
  const stat = id => { const p = id === myId ? me : peers.get(id); return W.stats[id] ||= { name: p?.name || 'Player', color: p?.color || '#999', v: 0, deaths: 0, hits: 0 }; };
  const dropHoard = (i, mo) => W.map.scrap.filter(s => s.own === -10 - i).forEach((s, k) => { s.own = 0; s.x = mo.x + k * 9; s.y = mo.y + 8; });
  const endShift = () => {
    players().forEach(p => stat(p.id));
    W.board = Object.values(W.stats).sort((a, b) => b.v - a.v).map(x => [x.name, x.color, x.v, x.deaths, x.hits]);
    const ok = W.b >= W.q; W.ph = 'end'; W.msg = ok ? `Quota met! $${W.b} / $${W.q} — next shift starting…` : `FIRED. You brought back $${W.b} of $${W.q}. Starting over…`;
    setTimeout(() => { if (!running || !isHost()) return; ok ? newShift(W.lv + 1, Math.round(W.q * 1.45 + 60)) : newShift(1, 150); }, 8000);
  };

  // ---- host simulation ----
  let flow = null, flowAt = 0;
  const hostTick = dt => {
    if (!W || W.ph !== 'play') return;
    W.tl -= dt;
    const alive = players().filter(p => !p.dead && p.x !== undefined);
    if (W.tl <= 0 || !alive.length) { if (!alive.length) W.b = W.map.scrap.filter(s => s.own === -1).reduce((n, s) => n + s.v, 0); return endShift(); }
    const map = W.map, T = SS.T;
    for (const [mi, m] of W.map.monsters.entries()) {
      const hoard = W.map.scrap.filter(s => s.own === -10 - mi);
      hoard.forEach((s, k) => { s.x = m.x + (k - hoard.length / 2) * 7; s.y = m.y - 14; });
      if (m.stun > 0) { m.stun -= dt; m.st = 'stunned'; continue; }
      if (m.kind === 'hoarder') { hoarderTick(m, mi, hoard, alive, dt); continue; }
      const seen = alive.filter(p => ssSees(map, m, p, m.kind === 'statue' ? 620 : 300)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
      const watched = m.kind === 'statue' && alive.some(p => lit(p, m, map));
      let speed = 60, tx = m.tx, ty = m.ty;
      if (m.kind === 'statue' && watched) { m.st = 'frozen'; continue; }
      if (seen) { m.st = 'chase'; tx = seen.x; ty = seen.y; speed = m.kind === 'statue' ? 210 : 128; }
      else if (W.noise && Date.now() - W.noise.at < 6000 && m.kind === 'lurker') { m.st = 'hunt'; tx = W.noise.x; ty = W.noise.y; speed = 100; }
      else { m.st = 'wander'; if ((m.tt -= dt) <= 0 || Math.hypot(tx - m.x, ty - m.y) < 20) { const o = map.rooms[1 + (Math.random() * (map.rooms.length - 1) | 0)]; m.tx = (o.x + o.w / 2) * T; m.ty = (o.y + o.h / 2) * T; m.tt = 8; } tx = m.tx; ty = m.ty; }
      steer(m, tx, ty, speed, dt);
      for (const p of alive) if (Math.hypot(p.x - m.x, p.y - m.y) < 22) kill(p.id === undefined ? myId : p.id);
    }
  };
  // Move toward (tx, ty), following a breadth-first "flow" around walls when there's no straight line.
  const steer = (m, tx, ty, speed, dt) => {
    const map = W.map, T = SS.T; let gx = tx, gy = ty;
    if (!ssSees(map, m, { x: tx, y: ty })) {
      const key = (tx / T | 0) + ',' + (ty / T | 0);
      if (!flow || flow.key !== key || Date.now() - flowAt > 700) { flow = bfs(map, tx / T | 0, ty / T | 0); flow.key = key; flowAt = Date.now(); }
      const cx0 = m.x / T | 0, cy0 = m.y / T | 0; let best = flow.d[cy0 * SS.W + cx0], bx = cx0, by = cy0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = flow.d[(cy0 + oy) * SS.W + cx0 + ox]; if (v >= 0 && v < best) { best = v; bx = cx0 + ox; by = cy0 + oy; } }
      gx = (bx + .5) * T; gy = (by + .5) * T;
    }
    const a = Math.atan2(gy - m.y, gx - m.x); m.a = a;
    ssMove(map, m, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt, 10);
  };
  // Hoarder: collects loose scrap and carries it back to its nest. Harmless — until you hit it or get near its nest.
  const hoarderTick = (m, mi, hoard, alive, dt) => {
    const map = W.map, T = SS.T;
    const intruder = alive.find(p => Math.hypot(p.x - m.nx, p.y - m.ny) < 110 && ssSees(map, m, p, 260));
    if (intruder && m.mad <= 0) { m.mad = 4; m.foe = intruder.id; }
    if (m.mad > 0) {
      m.mad -= dt; m.st = 'angry';
      const foe = alive.find(p => p.id === m.foe) || alive[0];
      if (foe) { steer(m, foe.x, foe.y, 150, dt); if (Math.hypot(foe.x - m.x, foe.y - m.y) < 22) { kill(foe.id); m.mad = 0; } }
      return;
    }
    if (hoard.length >= 2 || (hoard.length && !map.scrap.some(s => s.own === 0))) { // home with the loot
      m.st = 'home'; steer(m, m.nx, m.ny, 95, dt);
      if (Math.hypot(m.nx - m.x, m.ny - m.y) < 14) hoard.forEach((s, k) => { s.own = 0; s.x = m.nx + (k % 3) * 12 - 12; s.y = m.ny + 16 + (k / 3 | 0) * 10; });
      return;
    }
    const loot = map.scrap.filter(s => s.own === 0 && Math.hypot(s.x - m.nx, s.y - m.ny) > 60 && Math.hypot(s.x - m.x, s.y - m.y) < 520).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
    if (loot) { m.st = 'seek'; steer(m, loot.x, loot.y, 95, dt); if (Math.hypot(loot.x - m.x, loot.y - m.y) < 16) loot.own = -10 - mi; return; }
    m.st = 'wander'; if ((m.tt -= dt) <= 0) { const o = map.rooms[1 + (Math.random() * (map.rooms.length - 1) | 0)]; m.tx = (o.x + o.w / 2) * T; m.ty = (o.y + o.h / 2) * T; m.tt = 8; }
    steer(m, m.tx, m.ty, 70, dt);
  };
  const kill = id => {
    const p = id === myId ? me : peers.get(id); if (!p || p.dead) return;
    p.dead = true; stat(id).deaths++; W.map.scrap.filter(s => s.own === id).forEach((s, i) => { s.own = 0; s.x = p.x + i * 10; s.y = p.y; });
    send({ t: 'kill', id }); onMsg({ t: 'kill', id, from: myId });
  };
  function bfs(map, sx, sy) {
    const d = new Int16Array(SS.W * SS.H).fill(-1), q = [sy * SS.W + sx]; d[q[0]] = 0;
    for (let i = 0; i < q.length; i++) { const c = q[i], x = c % SS.W, y = c / SS.W | 0;
      for (const n of [c + 1, c - 1, c + SS.W, c - SS.W]) if (d[n] === -1 && map.tiles[n] && Math.abs((n % SS.W) - x) + Math.abs((n / SS.W | 0) - y) === 1) { d[n] = d[c] + 1; q.push(n); } }
    return { d };
  }

  // ---- input ----
  const keys = new Set(); let mouse = null;
  body.onkeydown = e => {
    if (e.target === sayI) { if (e.key === 'Escape') { sayF.classList.add('hidden'); body.focus(); } return; }
    if (e.target.tagName === 'INPUT') return; // lobby fields
    const k = e.key.toLowerCase(); keys.add(k);
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!W || W.ph !== 'play' || me.dead) return;
    if (k === 'e') { const near = W.map.scrap.filter(s => !s.own).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
      if (near && Math.hypot(near.x - me.x, near.y - me.y) < 46) { toHost({ t: 'pick', sid: near.id }); beep(990, .08, 'triangle'); } }
    if (k === 'q') toHost({ t: 'drop' });
    if (k === ' ' && performance.now() - (me.swingAt || 0) > 700) { me.swingAt = performance.now(); toHost({ t: 'hit', a: me.a }); beep(320, .08, 'triangle', .04); }
    if (k === 'f') { me.fl = !me.fl; beep(me.fl ? 1200 : 500, .04, 'square', .03); }
    if (k === 'l') toHost({ t: 'leave' });
    if (k === 't' || k === 'enter') { e.preventDefault(); sayF.classList.remove('hidden'); sayI.focus(); }
    if (SS_EMOTES[k]) { me.e = +k; me.eAt = Date.now(); if (k === '3') { toHost({ t: 'scream' }); send({ t: 'scream' }); beep(880, .3, 'sawtooth', .05); } }
  };
  body.onkeyup = e => keys.delete(e.key.toLowerCase());
  body.addEventListener('blur', () => keys.clear(), true);
  cv.onmousemove = e => { const r = cv.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; };
  cv.onmousedown = () => body.focus();
  sayF.onsubmit = e => { e.preventDefault(); const text = sayI.value.trim(); sayI.value = ''; sayF.classList.add('hidden'); body.focus();
    if (!text) return; send({ t: 'say', text }); me.say = text; me.sayAt = Date.now(); say(`${me.name}: ${text}`); };

  // ---- loop ----
  let last = performance.now(), sendAt = 0, worldAt = 0, raf;
  const frame = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (W && W.ph === 'play' && !me.dead) {
      let mx = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft')), my = (keys.has('s') || keys.has('arrowdown')) - (keys.has('w') || keys.has('arrowup'));
      const carry = W.map.scrap.filter(s => s.own === myId), wt = carry.reduce((n, s) => n + s.wt, 0);
      const sprint = keys.has('shift') && me.stam > .05 && (mx || my);
      me.stam = Math.max(0, Math.min(1, me.stam + (sprint ? -.35 : .18) * dt));
      const sp = (sprint ? 215 : 135) * Math.max(.5, 1 - wt * .05);
      if (mx || my) { const l = Math.hypot(mx, my); ssMove(W.map, me, mx / l * sp * dt, my / l * sp * dt); if (!mouse) me.a = Math.atan2(my, mx); }
      if (mouse) me.a = Math.atan2(mouse[1] - cv.clientHeight / 2, mouse[0] - cv.clientWidth / 2);
      if (carry.length && inShip(W.map, me) && now - (me.bankAt || 0) > 400) { me.bankAt = now; toHost({ t: 'bank' }); beep(1320, .1, 'triangle'); }
      if (me.push && me.push.t > 0) { me.push.t -= dt; ssMove(W.map, me, Math.cos(me.push.a) * 320 * dt, Math.sin(me.push.a) * 320 * dt); }
      // heartbeat when something is coming for you
      const threat = W.map.monsters.filter(m => (m.st === 'chase' || m.st === 'angry') && !m.stun).map(m => Math.hypot(m.x - me.x, m.y - me.y)).sort((a, b) => a - b)[0];
      if (threat < 340 && now - (me.beatAt || 0) > 350 + threat * 2) { me.beatAt = now; beep(55, .12, 'sine', .12); setTimeout(() => beep(48, .1, 'sine', .09), 140); }
    }
    for (const p of peers.values()) if (p.tx !== undefined) { p.x += (p.tx - p.x) * Math.min(1, dt * 12); p.y += (p.ty - p.y) * Math.min(1, dt * 12); }
    if (isHost()) { hostTick(dt); if (W && now - worldAt > 100) { worldAt = now; send(snapshot()); } }
    if (W && now - sendAt > 66) { sendAt = now; send({ t: 'p', x: Math.round(me.x), y: Math.round(me.y), a: +me.a.toFixed(2), fl: me.fl, dead: me.dead, e: me.e, c: me.color, n: me.name, sw: now - (me.swingAt || 0) < 200 ? 1 : 0 }); }
    draw(now);
    raf = requestAnimationFrame(frame);
  };

  // ---- drawing ----
  const draw = now => {
    const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = dark.width = w * dpr; cv.height = dark.height = h * dpr; }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = '#07070a'; cx.fillRect(0, 0, w, h);
    if (!W) return;
    const map = W.map, T = SS.T, th = ssTheme(W.lv);
    const alivePeers = [...peers.values()].filter(p => !p.dead && p.x !== undefined);
    const cam = me.dead && alivePeers.length ? alivePeers[0] : me;
    const ox = Math.round(w / 2 - cam.x), oy = Math.round(h / 2 - cam.y);
    cx.save(); cx.translate(ox, oy);
    const x0 = Math.max(0, (-ox / T | 0) - 1), y0 = Math.max(0, (-oy / T | 0) - 1), x1 = Math.min(SS.W, x0 + (w / T | 0) + 3), y1 = Math.min(SS.H, y0 + (h / T | 0) + 3);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const f = map.tiles[y * SS.W + x], s = map.ship, ship = x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
      if (f) { cx.fillStyle = ship ? ((x + y) % 2 ? '#1f3a2c' : '#1c3528') : ((x + y) % 2 ? th.a : th.b); cx.fillRect(x * T, y * T, T, T); }
      else if (map.tiles[(y + 1) * SS.W + x]) { cx.fillStyle = th.wall; cx.fillRect(x * T, y * T + T - 8, T, 8); }
    }
    const s = map.ship; cx.fillStyle = 'rgba(74,222,128,.5)'; cx.font = '700 22px Inter, sans-serif'; cx.textAlign = 'center'; cx.fillText('SHIP', (s.x + s.w / 2) * T, (s.y + s.h / 2) * T + 8);
    for (const it of map.scrap) if (!it.own || it.own <= -10) { cx.fillStyle = '#facc15'; cx.beginPath(); cx.arc(it.x, it.y, 5 + it.wt, 0, 7); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.7)'; cx.fillRect(it.x - 2, it.y - 5 - it.wt, 2, 2); }
    for (const m of map.monsters) {
      if (!ssSees(map, cam, m, 700)) continue;
      if (m.kind === 'lurker') { cx.fillStyle = '#5b0f14'; cx.beginPath(); cx.arc(m.x, m.y, 15, 0, 7); cx.fill(); cx.fillStyle = m.st === 'chase' ? '#ff3b3b' : '#fca5a5'; for (const k of [-1, 1]) { cx.beginPath(); cx.arc(m.x + Math.cos(m.a + k * .5) * 8, m.y + Math.sin(m.a + k * .5) * 8, 2.5, 0, 7); cx.fill(); } }
      else if (m.kind === 'hoarder') { // bug-like scrap thief: green, turns red when angry
        cx.fillStyle = m.st === 'angry' ? '#b91c1c' : '#4d7c0f'; cx.beginPath(); cx.ellipse(m.x, m.y, 14, 10, m.a, 0, 7); cx.fill();
        cx.strokeStyle = cx.fillStyle; cx.lineWidth = 2; for (const k of [-1, 0, 1]) for (const sd of [-1, 1]) { cx.beginPath(); cx.moveTo(m.x + k * 6, m.y); cx.lineTo(m.x + k * 8 + Math.cos(m.a + sd * 1.6) * 14, m.y + Math.sin(m.a + sd * 1.6) * 14); cx.stroke(); }
        cx.fillStyle = '#fef08a'; cx.beginPath(); cx.arc(m.x + Math.cos(m.a) * 10, m.y + Math.sin(m.a) * 10, 2.5, 0, 7); cx.fill(); }
      else { cx.fillStyle = '#d6d3d1'; cx.fillRect(m.x - 8, m.y - 16, 16, 30); cx.beginPath(); cx.arc(m.x, m.y - 20, 8, 0, 7); cx.fill(); cx.fillStyle = '#18181b'; cx.fillRect(m.x - 4, m.y - 22, 2, 2); cx.fillRect(m.x + 2, m.y - 22, 2, 2); }
    }
    for (const m of map.monsters) if (m.st === 'stunned' && ssSees(map, cam, m, 700)) { cx.fillStyle = '#fde047'; cx.font = '12px sans-serif'; cx.textAlign = 'center'; cx.fillText('✦ ✧ ✦', m.x, m.y - 22 - Math.sin(now / 120) * 2); }
    const all = players();
    for (const p of all) if (p.x !== undefined) drawPlayer(p, now);
    cx.restore();
    // darkness with flashlight cones
    dx.setTransform(dpr, 0, 0, dpr, 0, 0); dx.globalCompositeOperation = 'source-over'; dx.clearRect(0, 0, w, h); dx.fillStyle = 'rgba(2,2,6,.96)'; dx.fillRect(0, 0, w, h);
    dx.globalCompositeOperation = 'destination-out';
    dx.fillRect(s.x * T + ox, s.y * T + oy, s.w * T, s.h * T);
    for (const p of all) {
      if (p.x === undefined || p.dead) continue;
      const px = p.x + ox, py = p.y + oy;
      let g = dx.createRadialGradient(px, py, 0, px, py, 70); g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); dx.fillStyle = g; dx.beginPath(); dx.arc(px, py, 70, 0, 7); dx.fill();
      if (p.fl) { g = dx.createRadialGradient(px, py, 10, px, py, 290); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.7, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); dx.fillStyle = g; dx.beginPath(); dx.moveTo(px, py); dx.arc(px, py, 290, p.a - .5, p.a + .5); dx.closePath(); dx.fill(); }
    }
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(dark, 0, 0); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // labels on top of the dark
    for (const p of all) if (p.x !== undefined && (p === all[0] || Math.hypot(p.x - cam.x, p.y - cam.y) < 420)) {
      const px = p.x + ox, py = p.y + oy; cx.textAlign = 'center'; cx.font = '600 12px Inter, sans-serif'; cx.fillStyle = p.dead ? '#71717a' : '#fff'; cx.fillText(p.name + (p.dead ? ' ☠' : ''), px, py - 24);
      if (p.e && now - p.eAt < 2500) { cx.font = '22px sans-serif'; cx.fillText(SS_EMOTES[p.e], px, py - 40); }
      if (p.say && now - p.sayAt < 6000) bubble(p.say, px, py - (p.e && now - p.eAt < 2500 ? 66 : 42));
    }
    hud(now, w, h);
  };
  const drawPlayer = (p, now) => {
    cx.save(); cx.translate(p.x, p.y);
    if (p.dead) { cx.globalAlpha = .5; cx.rotate(1.2); }
    cx.fillStyle = p.color || '#999'; cx.beginPath(); cx.arc(0, 0, 12, 0, 7); cx.fill();
    cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(-12, -3, 24, 4); // suit belt
    const a = p.a || 0; cx.fillStyle = '#dbeafe'; cx.beginPath(); cx.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 6, 4, a, 0, 7); cx.fill(); // visor
    const sw = p.swingAt && now - p.swingAt < 220; // shovel swing
    if (sw && !p.dead) { cx.strokeStyle = '#d4d4d8'; cx.lineWidth = 4; cx.lineCap = 'round'; const t = (now - p.swingAt) / 220, ang = a - .9 + t * 1.8; cx.beginPath(); cx.moveTo(Math.cos(ang) * 10, Math.sin(ang) * 10); cx.lineTo(Math.cos(ang) * 34, Math.sin(ang) * 34); cx.stroke(); }
    const carry = W.map.scrap.filter(s => s.own === p.id || (p === me && s.own === myId)).length;
    for (let i = 0; i < carry; i++) { cx.fillStyle = '#facc15'; cx.fillRect(-10 + i * 6, 13, 5, 5); }
    cx.restore();
  };
  const bubble = (t, x, y) => {
    cx.font = '13px Inter, sans-serif'; const tw = Math.min(260, cx.measureText(t).width) + 16;
    cx.fillStyle = 'rgba(255,255,255,.92)'; cx.beginPath(); cx.roundRect(x - tw / 2, y - 26, tw, 24, 8); cx.fill();
    cx.fillStyle = '#111'; cx.fillText(t.length > 40 ? t.slice(0, 38) + '…' : t, x, y - 9);
  };
  const hud = (now, w, h) => {
    const T = SS.T;
    cx.textAlign = 'left'; cx.font = '600 14px Inter, sans-serif';
    cx.fillStyle = 'rgba(0,0,0,.55)'; cx.beginPath(); cx.roundRect(12, 12, 300, 70, 10); cx.fill();
    cx.fillStyle = '#fff'; cx.fillText(`Shift ${W.lv} · ${ssTheme(W.lv).name} · ${Math.floor(Math.max(0, W.tl) / 60)}:${String(Math.max(0, W.tl | 0) % 60).padStart(2, '0')} left`, 24, 34);
    cx.fillStyle = 'rgba(255,255,255,.15)'; cx.fillRect(24, 46, 226, 8); cx.fillStyle = W.b >= W.q ? '#4ade80' : '#facc15'; cx.fillRect(24, 46, 226 * Math.min(1, W.b / W.q), 8);
    cx.fillStyle = '#d4d4d8'; cx.font = '12px Inter, sans-serif'; cx.fillText(`Quota $${W.b} / $${W.q}`, 24, 72);
    const carry = W.map.scrap.filter(s => s.own === myId);
    if (carry.length) { cx.fillStyle = 'rgba(0,0,0,.55)'; cx.beginPath(); cx.roundRect(12, 90, 250, 22 + carry.length * 18, 10); cx.fill(); cx.fillStyle = '#facc15'; carry.forEach((s, i) => cx.fillText(`${s.name} — $${s.v}`, 24, 108 + i * 18)); }
    if (!me.dead) { cx.fillStyle = 'rgba(255,255,255,.15)'; cx.fillRect(w / 2 - 60, h - 22, 120, 6); cx.fillStyle = '#60a5fa'; cx.fillRect(w / 2 - 60, h - 22, 120 * me.stam, 6); }
    // ship direction
    if (!inShip(W.map, me) && !me.dead) { const s = W.map.ship, a = Math.atan2((s.y + s.h / 2) * T - me.y, (s.x + s.w / 2) * T - me.x); cx.save(); cx.translate(w / 2 + Math.cos(a) * 60, h / 2 + Math.sin(a) * 60); cx.rotate(a); cx.fillStyle = 'rgba(74,222,128,.7)'; cx.beginPath(); cx.moveTo(8, 0); cx.lineTo(-5, -5); cx.lineTo(-5, 5); cx.fill(); cx.restore(); }
    const near = !me.dead && W.map.scrap.find(s => !s.own && Math.hypot(s.x - me.x, s.y - me.y) < 46);
    cx.textAlign = 'center'; cx.font = '13px Inter, sans-serif';
    if (near) { cx.fillStyle = '#fff'; cx.fillText(`[E] Pick up ${near.name} ($${near.v})`, w / 2, h / 2 + 44); }
    else if (inShip(W.map, me) && W.ph === 'play' && !me.dead) { cx.fillStyle = 'rgba(255,255,255,.7)'; cx.fillText('In the ship: scrap is banked automatically · [L] leave early', w / 2, h - 34); }
    cx.textAlign = 'right'; cx.fillStyle = 'rgba(255,255,255,.55)'; cx.font = '12px Inter, sans-serif';
    cx.fillText('WASD move · Shift sprint · mouse aim · Space swing', w - 14, 26); cx.fillText('E pick up · Q drop · F light · T talk · 1-4 emotes', w - 14, 44);
    cx.textAlign = 'left'; log.filter(l => now - l.at < 9000).forEach((l, i, arr) => { cx.fillStyle = 'rgba(255,255,255,.85)'; cx.fillText(l.text, 14, h - 16 - (arr.length - 1 - i) * 18); });
    if (W.msg && W.ph === 'end') {
      const rows = W.board || [], bh = 90 + rows.length * 26;
      cx.fillStyle = 'rgba(0,0,0,.78)'; cx.fillRect(0, h / 2 - bh / 2, w, bh);
      cx.fillStyle = W.msg.startsWith('FIRED') ? '#f87171' : '#4ade80'; cx.font = '700 22px Inter, sans-serif'; cx.textAlign = 'center'; cx.fillText(W.msg, w / 2, h / 2 - bh / 2 + 38);
      cx.font = '13px Inter, sans-serif';
      rows.forEach(([name, color, v, deaths, hits], i) => {
        const y = h / 2 - bh / 2 + 72 + i * 26;
        cx.textAlign = 'left'; cx.fillStyle = color; cx.beginPath(); cx.arc(w / 2 - 170, y - 4, 6, 0, 7); cx.fill();
        cx.fillStyle = '#fff'; cx.fillText(`${i === 0 && v ? '🏆 ' : ''}${name}`, w / 2 - 156, y);
        cx.textAlign = 'right'; cx.fillStyle = '#d4d4d8'; cx.fillText(`$${v} banked · ${hits} bonk${hits === 1 ? '' : 's'} · ${deaths ? deaths + ' death' + (deaths > 1 ? 's' : '') : 'survived'}`, w / 2 + 190, y);
      });
    }
  };

  // ---- lobby ----
  const lobby = (note = '') => {
    ui.innerHTML = `<div class="ss-lobby"><h2>Scrap Shift</h2><p class="muted">Grab scrap, bring it back to the ship, meet the quota. Stay in the light — and stay together.</p>
      <label class="field">Name<input class="ss-name" maxlength="16" value="${esc(me.name)}"></label>
      <div class="ss-colors">${SS_COLORS.map((c, i) => `<button data-color="${i}" style="background:${c}" class="${me.color === c ? 'on' : ''}"></button>`).join('')}</div>
      <div class="row"><input class="ss-code grow" maxlength="8" placeholder="Room code"><button data-a="join">Join</button></div>
      <div class="row"><button class="primary grow" data-a="create">Create a room</button><button class="grow" data-a="solo">Play solo</button></div>
      <label class="row small"><input type="checkbox" class="switch ss-public" checked> List my room publicly</label>
      ${note ? `<p class="ss-note">${esc(note)}</p>` : ''}
      <div class="section-label" style="padding:4px 0 0">Open rooms</div><div class="ss-rooms"><div class="spinner"></div></div></div>`;
    Party.rooms('game').then(list => {
      const box = ui.querySelector('.ss-rooms'); if (!box) return;
      if (list === null) { box.innerHTML = '<p class="muted small">Online play needs the HitBoy server (see Settings → Proxy → Live server).</p>'; return; }
      const rooms = list.filter(r => r.kind === 'scrapshift');
      box.innerHTML = rooms.length ? rooms.map(r => `<button class="dd-room" data-room="${esc(r.room)}"><b>${esc(r.title)}</b><small>${r.people}/${r.max} · ${esc(r.state || '')}</small></button>`).join('') : '<p class="muted small">No open rooms — create one!</p>';
    });
  };
  const announce = state => { if (conn && isHost()) send({ t: 'meta', meta: { title: `${me.name}'s Scrap Shift`, kind: 'scrapshift', name: me.name, public: !!conn.pub, state } }); };
  const room = code => {
    ui.innerHTML = `<div class="ss-lobby"><h2>Room ${esc(code.toUpperCase())}</h2><p class="muted">Share the room code with friends. Up to 8 players.</p><div class="ss-players"></div>
      <div class="row ss-start"></div><button class="ghost" data-a="back">Leave</button></div>`;
    drawRoom();
  };
  const drawRoom = () => {
    const box = ui.querySelector('.ss-players'); if (!box) return;
    box.innerHTML = [{ id: myId, name: me.name + ' (you)', color: me.color }, ...peers.values()].map(p => `<div><i style="background:${p.color || '#999'}"></i>${esc(p.name || 'Player')}${p.id === hostId ? ' <span class="muted">host</span>' : ''}</div>`).join('');
    ui.querySelector('.ss-start').innerHTML = isHost() ? '<button class="primary grow" data-a="start">Start shift</button>' : '<p class="muted">Waiting for the host to start…</p>';
  };
  const begin = () => { ui.innerHTML = ''; body.focus(); };
  const connect = (code, pub) => {
    solo = false; peers.clear();
    conn = Party.connect('game', 'ss-' + code.toLowerCase(), me.name, {
      welcome: m => { myId = m.id; conn.pub = pub; m.peers.forEach(p => peers.set(p.id, { id: p.id, name: p.name })); pickHost(); room(code); announce('waiting'); send({ t: 'p', x: 0, y: 0, a: 0, fl: true, dead: false, e: 0, c: me.color, n: me.name }); },
      join: p => { peers.set(p.id, { id: p.id, name: p.name }); pickHost(); drawRoom(); say(`${p.name} joined`); },
      leave: id => { const p = peers.get(id); peers.delete(id); pickHost(); drawRoom(); if (p) say(`${p.name} left`); announce(W ? 'playing' : 'waiting'); },
      message: m => { if (m.t === 'w' && ui.querySelector('.ss-lobby')) begin(); onMsg(m); drawRoom(); },
      close: reason => { conn = null; solo = true; myId = hostId = 1; peers.clear(); W = null; lobby(reason); },
    });
  };
  ui.onclick = e => {
    const c = e.target.closest('[data-color]'); if (c) { me.color = SS_COLORS[+c.dataset.color]; localStorage.setItem('novaos.ssColor', c.dataset.color); ui.querySelectorAll('[data-color]').forEach(b => b.classList.toggle('on', b === c)); return; }
    const rm = e.target.closest('[data-room]'); if (rm) return connect(rm.dataset.room.replace(/^ss-/, ''));
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    const nm = ui.querySelector('.ss-name'); if (nm) me.name = nm.value.trim().slice(0, 16) || me.name;
    if (a === 'solo') { solo = true; myId = hostId = 1; newShift(1, 150); begin(); }
    if (a === 'create') connect(Math.random().toString(36).slice(2, 6), ui.querySelector('.ss-public').checked);
    if (a === 'join') { const code = ui.querySelector('.ss-code').value.trim(); if (code) connect(code); }
    if (a === 'start') { newShift(1, 150); begin(); announce('playing'); }
    if (a === 'back') { conn?.close(); conn = null; peers.clear(); myId = hostId = 1; lobby(); }
  };
  win.game = { me, world: () => W }; // for tests and the curious
  lobby();
  raf = requestAnimationFrame(frame);
  win.cleanup.push(() => { running = false; cancelAnimationFrame(raf); conn?.close(); ac?.close(); });
} };
