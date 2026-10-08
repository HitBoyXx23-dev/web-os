// More built-in games (2D): Pixel Quest (platformer) and Star Blaster (shoot-'em-up).
// Shared helper: keyboard state that only reacts while the game's window is focused.
function gameKeys(win, body) {
  const keys = new Set(), taps = new Set(), active = () => win.el.classList.contains('focused') && !win.el.classList.contains('min');
  keys.tap = k => taps.delete(k); // true once per press, even for presses shorter than a frame
  const down = e => { if (!active() || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; keys.add(e.key.toLowerCase()); if (!e.repeat) taps.add(e.key.toLowerCase()); if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault(); };
  const up = e => keys.delete(e.key.toLowerCase());
  addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', () => keys.clear());
  win.cleanup.push(() => { removeEventListener('keydown', down); removeEventListener('keyup', up); });
  return keys;
}
// A canvas that fills the window body at device resolution; draw in CSS pixels.
function gameCanvas(body) {
  body.style.overflow = 'hidden';
  body.innerHTML = '<canvas style="display:block;width:100%;height:100%;outline:none" tabindex="0"></canvas>';
  const cv = body.querySelector('canvas'), cx = cv.getContext('2d');
  const fit = () => { const d = devicePixelRatio || 1; cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); cx.imageSmoothingEnabled = false; };
  fit(); new ResizeObserver(fit).observe(cv);
  return { cv, cx, w: () => cv.clientWidth, h: () => cv.clientHeight };
}
function gameLoop(win, fn) {
  let raf, last = performance.now();
  const step = now => { const dt = Math.min(.033, (now - last) / 1000); last = now; fn(dt, now); raf = requestAnimationFrame(step); };
  raf = requestAnimationFrame(step); win.cleanup.push(() => cancelAnimationFrame(raf));
}
let gameAudio; const sfx = (f, d = .1, type = 'square', v = .05, slide = 0) => { try { gameAudio ||= new AudioContext(); const o = gameAudio.createOscillator(), g = gameAudio.createGain(); o.type = type; o.frequency.value = f; if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), gameAudio.currentTime + d); g.gain.value = v; g.gain.exponentialRampToValueAtTime(.0001, gameAudio.currentTime + d); o.connect(g).connect(gameAudio.destination); o.start(); o.stop(gameAudio.currentTime + d); } catch (e) {} };

// ---------------- Pixel Quest: platformer ----------------
// Level legend: # ground  = brick  ^ spikes  o coin  E slime  F flag  P start  ? bonus block  ~ water
const PQ_LEVELS = [
  { name: 'Green Hills', sky: ['#7dd3fc', '#bae6fd'], map: [
    '                                                                                                   ',
    '                                                                                                   ',
    '                                    o o o                                                          ',
    '                                   =======                       o o                               ',
    '                      ?                              o          =====          o o o            F  ',
    '               o o                         E        ===                       =======           #  ',
    '   P          =====          o   o                         E                              ===  ##  ',
    '#########################  ######### ######### ############### ###^^^#####  ########################',
    '#########################  ######### ######### ############### ###########  ########################'] },
  { name: 'Spike Caves', sky: ['#312e81', '#1e1b4b'], map: [
    '                                                                                                    ',
    '                       o o o                          o o o o                                       ',
    '                      =======              ?         =========             o   o                    ',
    '            o                     E                                  ====  ====  ====          F    ',
    '   P      =====          ===   =======        o o o           E                               ##    ',
    '                  E                          =======        =====                     ===    ###    ',
    '######  #######^^^######  ####  ###   ####            ####          ###^^^###^^^###         ######  ',
    '######  ###################################^^^^^^^^^^####################################^^^######  '] },
  { name: 'Sky Fortress', sky: ['#fb923c', '#fde68a'], map: [
    '                                                                                                       ',
    '                                    o o                          o o o                                 ',
    '                  o o             =====          ?             =======               o                 ',
    '                 =====                     E                                 E      ===           F    ',
    '   P      ===              ===           =====         ===                 ======          ===    #    ',
    '        E                       o o                         ===    o o                            #    ',
    '  ======    ====    ===       ======        ===   E                ====       ====      =====   ####   ',
    '                                                   =====    ===                                         '] },
];
GAME_APPS.pixelquest = ALL_APPS.pixelquest = { name: 'Pixel Quest', icon: { mono: 'PQ', bg: '#16a34a' }, cat: 'Games', desc: 'Platformer · 3 worlds', w: 900, h: 560, run(body, win) {
  const { cx, w, h } = gameCanvas(body), keys = gameKeys(win, body), T = 32;
  let lvl = 0, map, coins, enemies, player, lives = 3, score = 0, time = 0, state = 'title', msgAt = 0, camX = 0, parts = [], clicked = false;
  body.addEventListener('mousedown', () => { if (state !== 'play') clicked = true; });
  const load = i => {
    lvl = i; const L = PQ_LEVELS[i]; map = L.map.map(r => r.split('')); coins = []; enemies = []; time = 0; parts = [];
    map.forEach((row, y) => row.forEach((c, x) => {
      if (c === 'o') { coins.push({ x: x * T + 16, y: y * T + 16 }); row[x] = ' '; }
      if (c === 'E') { enemies.push({ x: x * T, y: y * T, vx: -40, dead: 0 }); row[x] = ' '; }
      if (c === 'P') { player = { x: x * T + 4, y: y * T, vx: 0, vy: 0, ground: false, face: 1, inv: 0 }; row[x] = ' '; }
    }));
    state = 'play';
  };
  const tile = (x, y) => (map[Math.floor(y / T)] || [])[Math.floor(x / T)] || (y > map.length * T ? ' ' : ' ');
  const solid = c => c === '#' || c === '=' || c === '?' || c === 'B';
  const hit = (x, y, ww, hh) => { for (const [px, py] of [[x, y], [x + ww, y], [x, y + hh], [x + ww, y + hh], [x + ww / 2, y], [x + ww / 2, y + hh]]) if (solid(tile(px, py))) return true; return false; };
  const burst = (x, y, col, n = 10) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 240, vy: -Math.random() * 260, t: .6, col }); };
  const die = () => { lives--; sfx(160, .4, 'sawtooth', .06, -120); burst(player.x + 12, player.y + 14, '#ef4444', 18); if (lives < 0) { state = 'over'; best('pixelquest', score); } else { const keep = score; load(lvl); score = keep; player.inv = 1.5; } };
  gameLoop(win, dt => {
    const W = w(), H = h(), L = PQ_LEVELS[lvl];
    if (state === 'title' || state === 'over' || state === 'won') {
      const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0f172a'); g.addColorStop(1, '#14532d'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.font = '700 44px Inter, sans-serif'; cx.fillText(state === 'over' ? 'GAME OVER' : state === 'won' ? 'YOU WIN!' : 'PIXEL QUEST', W / 2, H / 2 - 50);
      cx.font = '16px Inter, sans-serif'; cx.fillStyle = '#d1fae5';
      cx.fillText(state === 'title' ? 'Arrows / WASD to move · Space or W to jump · stomp slimes · grab coins · reach the flag' : `Score ${score} · best ${best('pixelquest', score)}`, W / 2, H / 2);
      cx.fillText('Press Enter to ' + (state === 'title' ? 'start' : 'play again'), W / 2, H / 2 + 34);
      if (keys.tap('enter') || clicked) { clicked = false; lives = 3; score = 0; load(0); }
      return;
    }
    // ---- update ----
    time += dt; const p = player;
    const left = keys.has('arrowleft') || keys.has('a'), right = keys.has('arrowright') || keys.has('d'), jump = keys.has(' ') || keys.has('arrowup') || keys.has('w') || keys.tap(' ') || keys.tap('arrowup') || keys.tap('w');
    p.vx += ((right - left) * 1600 - p.vx * 8) * dt; if (left !== right) p.face = right ? 1 : -1;
    if (jump && p.ground) { p.vy = -560; p.ground = false; sfx(520, .12, 'square', .04, 300); }
    if (!jump && p.vy < -200) p.vy += 1600 * dt; // short hop when the key is released
    p.vy = Math.min(900, p.vy + 1500 * dt);
    p.x += p.vx * dt; if (hit(p.x, p.y, 24, 28)) { p.x -= p.vx * dt; p.vx = 0; }
    p.y += p.vy * dt; p.ground = false;
    if (hit(p.x, p.y, 24, 28)) {
      if (p.vy < 0) { const tx = Math.floor((p.x + 12) / T), ty = Math.floor(p.y / T); if (map[ty]?.[tx] === '?') { map[ty][tx] = 'B'; score += 100; coins.push({ x: tx * T + 16, y: (ty - 1) * T + 16, pop: 1 }); sfx(880, .1, 'triangle'); } }
      else p.ground = true;
      p.y -= p.vy * dt; p.vy = 0;
    }
    p.x = Math.max(0, p.x); p.inv = Math.max(0, p.inv - dt);
    if (p.y > map.length * T + 60 || tile(p.x + 12, p.y + 26) === '^') return die();
    for (const c of coins) if (!c.got && Math.abs(c.x - p.x - 12) < 20 && Math.abs(c.y - p.y - 14) < 22) { c.got = 1; score += 50; sfx(1320, .08, 'triangle', .04); burst(c.x, c.y, '#facc15', 6); }
    for (const e of enemies) {
      if (e.dead) { e.dead -= dt; continue; }
      e.vy = Math.min(900, (e.vy || 0) + 1500 * dt); e.y += e.vy * dt; if (hit(e.x, e.y + 4, 28, 28)) { e.y -= e.vy * dt; e.vy = 0; e.ground = 1; }
      if (e.y > map.length * T + 60) { e.dead = -1; continue; }
      e.x += e.vx * dt; if (hit(e.x, e.y + 4, 28, 24) || (e.ground && !solid(tile(e.x + (e.vx > 0 ? 30 : -2), e.y + 34)))) { e.x -= e.vx * dt; e.vx *= -1; }
      if (Math.abs(e.x + 14 - p.x - 12) < 24 && Math.abs(e.y + 16 - p.y - 14) < 26) {
        if (p.vy > 0 && p.y + 20 < e.y + 12) { e.dead = .4; p.vy = -380; score += 200; sfx(300, .15, 'square', .05, -200); burst(e.x + 14, e.y + 16, '#a3e635'); }
        else if (!p.inv) return die();
      }
    }
    enemies = enemies.filter(e => !e.dead || e.dead > 0); // squashed slimes linger briefly
    const fx = map.findIndex(r => r.includes('F')), fl = fx >= 0 ? map[fx].indexOf('F') : -1;
    if (fl >= 0 && Math.abs(fl * T + 16 - p.x - 12) < 26 && Math.abs(fx * T + 16 - p.y - 14) < 60) {
      score += Math.max(0, 1000 - Math.floor(time) * 10); sfx(660, .5, 'triangle', .05, 600);
      const k = 'novaos.pq.time' + lvl, prev = +localStorage.getItem(k) || 0; if (!prev || time < prev) try { localStorage.setItem(k, time.toFixed(1)); } catch (e) {}
      if (lvl + 1 < PQ_LEVELS.length) { const keep = score; load(lvl + 1); score = keep; } else { state = 'won'; best('pixelquest', score); }
      return;
    }
    parts.forEach(q => { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 900 * dt; }); parts = parts.filter(q => q.t > 0);
    // ---- draw ----
    camX += (Math.max(0, Math.min(map[0].length * T - W, p.x - W * .4)) - camX) * Math.min(1, dt * 8);
    const oy = Math.max(0, H - map.length * T - 40);
    const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, L.sky[0]); g.addColorStop(1, L.sky[1]); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    cx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 8; i++) { const x = ((i * 260 - camX * .3) % (W + 200) + W + 200) % (W + 200) - 100; cx.beginPath(); cx.ellipse(x, 60 + (i % 3) * 30, 50, 16, 0, 0, 7); cx.fill(); }
    cx.save(); cx.translate(-Math.round(camX), oy);
    const x0 = Math.floor(camX / T), x1 = x0 + Math.ceil(W / T) + 1;
    map.forEach((row, y) => { for (let x = x0; x <= x1; x++) { const c = row[x]; if (!c || c === ' ') continue; const X = x * T, Y = y * T;
      if (c === '#') { cx.fillStyle = (map[y - 1]?.[x] === '#') ? '#92400e' : '#16a34a'; cx.fillRect(X, Y, T, T); if (map[y - 1]?.[x] !== '#') { cx.fillStyle = '#92400e'; cx.fillRect(X, Y + 10, T, T - 10); } cx.fillStyle = 'rgba(0,0,0,.12)'; cx.fillRect(X, Y + T - 3, T, 3); }
      else if (c === '=') { cx.fillStyle = '#b45309'; cx.fillRect(X, Y, T, T); cx.fillStyle = '#78350f'; cx.fillRect(X, Y + 15, T, 2); cx.fillRect(X + 15, Y, 2, 15); cx.fillRect(X + 7, Y + 17, 2, 15); }
      else if (c === '?' || c === 'B') { cx.fillStyle = c === '?' ? '#f59e0b' : '#a16207'; cx.fillRect(X + 1, Y + 1, T - 2, T - 2); cx.fillStyle = '#fff'; cx.font = '700 20px Inter'; cx.textAlign = 'center'; if (c === '?') cx.fillText('?', X + 16, Y + 23); }
      else if (c === '^') { cx.fillStyle = '#cbd5e1'; for (let k = 0; k < 4; k++) { cx.beginPath(); cx.moveTo(X + k * 8, Y + T); cx.lineTo(X + k * 8 + 4, Y + 10); cx.lineTo(X + k * 8 + 8, Y + T); cx.fill(); } }
      else if (c === 'F') { cx.fillStyle = '#e5e7eb'; cx.fillRect(X + 14, Y - 64, 4, 96); cx.fillStyle = '#ef4444'; cx.beginPath(); cx.moveTo(X + 18, Y - 64); cx.lineTo(X + 44, Y - 52); cx.lineTo(X + 18, Y - 40); cx.fill(); } } });
    for (const c of coins) if (!c.got) { const s = Math.abs(Math.sin(performance.now() / 200 + c.x)); cx.fillStyle = '#facc15'; cx.beginPath(); cx.ellipse(c.x, c.y, 8 * s + 2, 9, 0, 0, 7); cx.fill(); }
    for (const e of enemies) { if (e.dead > 0) { cx.fillStyle = '#65a30d'; cx.fillRect(e.x, e.y + 24, 28, 8); continue; } if (e.dead) continue; const b = Math.sin(performance.now() / 120) * 2; cx.fillStyle = '#84cc16'; cx.beginPath(); cx.ellipse(e.x + 14, e.y + 20 - b, 14, 12 + b, 0, Math.PI, 0); cx.fillRect(e.x, e.y + 20 - b, 28, 12 + b); cx.fill(); cx.fillStyle = '#000'; cx.fillRect(e.x + 7, e.y + 14, 4, 5); cx.fillRect(e.x + 17, e.y + 14, 4, 5); }
    if (!(p.inv && Math.floor(p.inv * 10) % 2)) {
      cx.fillStyle = '#ef4444'; cx.fillRect(p.x + 2, p.y, 20, 8); cx.fillStyle = '#fcd34d'; cx.fillRect(p.x + 4, p.y + 8, 16, 8);
      cx.fillStyle = '#1d4ed8'; cx.fillRect(p.x + 2, p.y + 16, 20, 8); cx.fillStyle = '#000'; cx.fillRect(p.x + (p.face > 0 ? 14 : 6), p.y + 10, 3, 3);
      const run = p.ground && Math.abs(p.vx) > 20 ? Math.sin(performance.now() / 60) * 3 : 0; cx.fillStyle = '#78350f'; cx.fillRect(p.x + 3, p.y + 24 + run, 7, 4); cx.fillRect(p.x + 14, p.y + 24 - run, 7, 4);
    }
    for (const q of parts) { cx.fillStyle = q.col; cx.globalAlpha = Math.max(0, q.t / .6); cx.fillRect(q.x, q.y, 4, 4); } cx.globalAlpha = 1;
    cx.restore();
    cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(0, 0, W, 34); cx.fillStyle = '#fff'; cx.font = '600 15px Inter, sans-serif'; cx.textAlign = 'left';
    cx.fillText(`${L.name}  ·  ♥ ${Math.max(0, lives)}  ·  ★ ${score}  ·  ${time.toFixed(1)}s`, 12, 22);
    const bt = +localStorage.getItem('novaos.pq.time' + lvl); if (bt) { cx.textAlign = 'right'; cx.fillText(`Best ${bt}s`, W - 12, 22); }
  });
} };

// ---------------- Star Blaster: shoot-'em-up ----------------
GAME_APPS.starblaster = ALL_APPS.starblaster = { name: 'Star Blaster', icon: { mono: 'SB', bg: '#1d4ed8' }, cat: 'Games', desc: "Shoot-'em-up · boss waves", w: 520, h: 720, run(body, win) {
  const { cv, cx, w, h } = gameCanvas(body), keys = gameKeys(win, body);
  let state = 'title', ship, bullets, foes, shots, items, parts, stars = [], wave, score, spawnLeft, spawnT, banner, mouse = null;
  for (let i = 0; i < 120; i++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random() * .8 + .2 });
  const reset = () => { ship = { x: w() / 2, y: h() - 90, hp: 5, fire: 0, power: 1, rapid: 0, shield: 0, inv: 0 }; bullets = []; foes = []; shots = []; items = []; parts = []; wave = 0; score = 0; nextWave(); state = 'play'; };
  const nextWave = () => { wave++; spawnLeft = wave % 5 === 0 ? 0 : 6 + wave * 2; spawnT = 1.5; banner = { text: wave % 5 === 0 ? `WAVE ${wave} — BOSS` : `WAVE ${wave}`, t: 2 }; if (wave % 5 === 0) foes.push({ boss: 1, x: w() / 2, y: -80, hp: 60 + wave * 12, max: 60 + wave * 12, r: 46, t: 0, fire: 1 }); };
  const boom = (x, y, col, n = 14) => { for (let i = 0; i < n; i++) { const a = Math.random() * 7, s = 40 + Math.random() * 220; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: .5 + Math.random() * .4, col }); } };
  cv.onmousemove = e => { const r = cv.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; };
  cv.onmouseleave = () => { mouse = null; };
  cv.onmousedown = () => { if (state !== 'play') reset(); };
  gameLoop(win, (dt, now) => {
    const W = w(), H = h();
    cx.fillStyle = '#030712'; cx.fillRect(0, 0, W, H);
    for (const s of stars) { s.y += s.z * dt * (state === 'play' ? .35 : .1); if (s.y > 1) { s.y = 0; s.x = Math.random(); } cx.fillStyle = `rgba(255,255,255,${s.z})`; cx.fillRect(s.x * W, s.y * H, s.z * 2, s.z * 2); }
    if (state !== 'play') {
      cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.font = '800 40px Inter, sans-serif'; cx.fillText(state === 'over' ? 'GAME OVER' : 'STAR BLASTER', W / 2, H / 2 - 40);
      cx.font = '15px Inter, sans-serif'; cx.fillStyle = '#bfdbfe'; cx.fillText(state === 'over' ? `Score ${score} · best ${best('starblaster', score)}` : 'Mouse or arrows/WASD to fly · auto-fire', W / 2, H / 2);
      cx.fillText('Click or press Enter to ' + (state === 'over' ? 'play again' : 'start'), W / 2, H / 2 + 30);
      if (keys.tap('enter')) reset();
      return;
    }
    // player
    const s = ship, sp = 380;
    if (mouse) { s.x += (mouse[0] - s.x) * Math.min(1, dt * 12); s.y += (mouse[1] - s.y) * Math.min(1, dt * 12); }
    s.x += ((keys.has('arrowright') || keys.has('d')) - (keys.has('arrowleft') || keys.has('a'))) * sp * dt; s.y += ((keys.has('arrowdown') || keys.has('s')) - (keys.has('arrowup') || keys.has('w'))) * sp * dt;
    s.x = Math.max(16, Math.min(W - 16, s.x)); s.y = Math.max(40, Math.min(H - 24, s.y));
    s.fire -= dt; s.rapid = Math.max(0, s.rapid - dt); s.shield = Math.max(0, s.shield - dt); s.inv = Math.max(0, s.inv - dt);
    if (s.fire <= 0) { s.fire = s.rapid ? .07 : .15; const n = Math.min(5, s.power); for (let i = 0; i < n; i++) bullets.push({ x: s.x + (i - (n - 1) / 2) * 8, y: s.y - 16, vx: (i - (n - 1) / 2) * 60, vy: -620 }); sfx(900, .03, 'square', .015); }
    // spawning
    if (spawnLeft > 0 && (spawnT -= dt) <= 0) { spawnLeft--; spawnT = Math.max(.25, 1 - wave * .06); const kind = Math.random() < .25 + wave * .02 ? 'diver' : Math.random() < .5 ? 'wave' : 'tank'; foes.push({ kind, x: 30 + Math.random() * (W - 60), y: -20, hp: kind === 'tank' ? 4 + wave : 1 + (wave >> 2), r: kind === 'tank' ? 18 : 13, t: Math.random() * 6, fire: 1 + Math.random() * 2 }); }
    if (!spawnLeft && !foes.length) nextWave();
    // enemies
    for (const f of foes) {
      f.t += dt;
      if (f.boss) { f.y += (90 - f.y) * dt; f.x = W / 2 + Math.sin(f.t * .7) * (W / 2 - 70); if ((f.fire -= dt) <= 0) { f.fire = Math.max(.35, 1 - wave * .03); for (let i = -3; i <= 3; i++) shots.push({ x: f.x, y: f.y + 30, vx: i * 60, vy: 220 }); sfx(200, .08, 'sawtooth', .02); } }
      else { f.y += (f.kind === 'diver' ? 200 + wave * 8 : f.kind === 'tank' ? 60 : 110) * dt; if (f.kind === 'wave') f.x += Math.cos(f.t * 3) * 120 * dt; if (f.kind === 'diver') f.x += Math.sign(s.x - f.x) * 70 * dt;
        if ((f.fire -= dt) <= 0 && f.y > 0) { f.fire = 2.2 - Math.min(1.2, wave * .08); const a = Math.atan2(s.y - f.y, s.x - f.x); shots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 }); } }
      if (Math.hypot(f.x - s.x, f.y - s.y) < f.r + 10) hurt(f.boss ? 2 : 1), f.hp -= f.boss ? 0 : 99;
    }
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; for (const f of foes) if (f.hp > 0 && Math.hypot(b.x - f.x, b.y - f.y) < f.r) { f.hp--; b.y = -99; boom(b.x, b.y + 99, '#fde047', 3); } }
    for (const f of foes) if (f.hp <= 0 && !f.gone) { f.gone = 1; score += f.boss ? 2000 : f.kind === 'tank' ? 150 : 50; boom(f.x, f.y, f.boss ? '#f472b6' : '#fb923c', f.boss ? 80 : 18); sfx(f.boss ? 80 : 140, f.boss ? .8 : .25, 'sawtooth', .06, -60);
      if (f.boss || Math.random() < .12) items.push({ x: f.x, y: f.y, kind: f.boss ? 'heal' : ['power', 'rapid', 'shield', 'heal'][Math.random() * 4 | 0] }); }
    for (const q of shots) { q.x += q.vx * dt; q.y += q.vy * dt; if (Math.hypot(q.x - s.x, q.y - s.y) < 12) { q.y = H + 99; hurt(1); } }
    for (const it of items) { it.y += 90 * dt; if (Math.hypot(it.x - s.x, it.y - s.y) < 22) { it.y = H + 99; sfx(1200, .15, 'triangle', .05, 400); if (it.kind === 'power') s.power++; if (it.kind === 'rapid') s.rapid = 8; if (it.kind === 'shield') s.shield = 8; if (it.kind === 'heal') s.hp = Math.min(5, s.hp + 1); } }
    bullets = bullets.filter(b => b.y > -20 && b.x > -20 && b.x < W + 20); foes = foes.filter(f => !f.gone && f.y < H + 60); shots = shots.filter(q => q.y < H + 20 && q.y > -20 && q.x > -20 && q.x < W + 20); items = items.filter(i => i.y < H + 20);
    parts.forEach(p => { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }); parts = parts.filter(p => p.t > 0);
    function hurt(n) { if (s.inv || s.shield) return; s.hp -= n; s.inv = 1.2; s.power = Math.max(1, s.power - 1); boom(s.x, s.y, '#60a5fa', 20); sfx(120, .3, 'sawtooth', .07, -60); if (s.hp <= 0) { state = 'over'; best('starblaster', score); } }
    // draw
    for (const b of bullets) { cx.fillStyle = s.rapid ? '#f0abfc' : '#fde047'; cx.fillRect(b.x - 1.5, b.y - 7, 3, 12); }
    for (const q of shots) { cx.fillStyle = '#fb7185'; cx.beginPath(); cx.arc(q.x, q.y, 4, 0, 7); cx.fill(); }
    for (const f of foes) {
      cx.save(); cx.translate(f.x, f.y);
      if (f.boss) { cx.fillStyle = '#831843'; cx.beginPath(); cx.moveTo(-50, -20); cx.lineTo(50, -20); cx.lineTo(36, 26); cx.lineTo(0, 40); cx.lineTo(-36, 26); cx.fill(); cx.fillStyle = '#f472b6'; cx.fillRect(-20, -6, 40, 12);
        cx.restore(); cx.fillStyle = 'rgba(255,255,255,.2)'; cx.fillRect(W / 2 - 120, 46, 240, 6); cx.fillStyle = '#f472b6'; cx.fillRect(W / 2 - 120, 46, 240 * f.hp / f.max, 6); continue; }
      cx.fillStyle = f.kind === 'tank' ? '#a16207' : f.kind === 'diver' ? '#dc2626' : '#7c3aed';
      cx.beginPath(); cx.moveTo(0, f.r); cx.lineTo(f.r, -f.r * .6); cx.lineTo(0, -f.r * .2); cx.lineTo(-f.r, -f.r * .6); cx.fill(); cx.fillStyle = '#fef08a'; cx.fillRect(-2, 0, 4, 4); cx.restore();
    }
    for (const it of items) { cx.fillStyle = { power: '#f59e0b', rapid: '#e879f9', shield: '#38bdf8', heal: '#4ade80' }[it.kind]; cx.beginPath(); cx.arc(it.x, it.y, 10, 0, 7); cx.fill(); cx.fillStyle = '#000'; cx.font = '700 11px Inter'; cx.textAlign = 'center'; cx.fillText({ power: 'P', rapid: 'R', shield: 'S', heal: '+' }[it.kind], it.x, it.y + 4); }
    if (!(s.inv && Math.floor(now / 80) % 2)) {
      cx.save(); cx.translate(s.x, s.y); cx.fillStyle = '#e0f2fe'; cx.beginPath(); cx.moveTo(0, -18); cx.lineTo(13, 14); cx.lineTo(0, 7); cx.lineTo(-13, 14); cx.fill();
      cx.fillStyle = '#38bdf8'; cx.fillRect(-3, -6, 6, 8); cx.fillStyle = `rgba(251,146,60,${.6 + Math.random() * .4})`; cx.beginPath(); cx.moveTo(-5, 10); cx.lineTo(0, 22 + Math.random() * 8); cx.lineTo(5, 10); cx.fill();
      if (s.shield) { cx.strokeStyle = 'rgba(56,189,248,.7)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(0, 0, 24, 0, 7); cx.stroke(); }
      cx.restore();
    }
    for (const p of parts) { cx.globalAlpha = Math.max(0, p.t); cx.fillStyle = p.col; cx.fillRect(p.x, p.y, 3, 3); } cx.globalAlpha = 1;
    cx.textAlign = 'left'; cx.font = '600 15px Inter, sans-serif'; cx.fillStyle = '#fff'; cx.fillText(`★ ${score}`, 12, 24); cx.fillText('♥'.repeat(Math.max(0, s.hp)), 12, 46);
    cx.textAlign = 'right'; cx.fillText(`Wave ${wave}`, W - 12, 24);
    if (banner.t > 0) { banner.t -= dt; cx.globalAlpha = Math.min(1, banner.t); cx.textAlign = 'center'; cx.font = '800 30px Inter, sans-serif'; cx.fillText(banner.text, W / 2, H / 2); cx.globalAlpha = 1; }
  });
} };
