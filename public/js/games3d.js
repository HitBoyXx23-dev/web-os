// 3D built-in games (three.js): Arena Strike (first-person shooter) and Lost Isles (third-person adventure).
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.min.js';
// Sets up a renderer that fills the window and resizes with it; returns { THREE, renderer, camera, scene, hud }.
async function three3d(body, win, fov = 75) {
  body.style.overflow = 'hidden';
  body.innerHTML = '<div class="g3d"><div class="g3d-load">Loading 3D engine…</div></div>';
  const THREE = await import(THREE_URL);
  const box = body.querySelector('.g3d'); box.innerHTML = '<canvas tabindex="0"></canvas><div class="g3d-hud"></div>';
  const canvas = box.querySelector('canvas'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(fov, 1, .1, 600);
  const fit = () => { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  fit(); const ro = new ResizeObserver(fit); ro.observe(box);
  win.cleanup.push(() => { ro.disconnect(); renderer.dispose(); if (document.pointerLockElement === canvas) document.exitPointerLock(); });
  return { THREE, renderer, scene, camera, canvas, hud: box.querySelector('.g3d-hud') };
}

// ---------------- Arena Strike: first-person shooter ----------------
GAME_APPS.arena = ALL_APPS.arena = { name: 'Arena Strike', icon: { mono: 'AS', bg: '#b91c1c' }, cat: 'Games', desc: '3D first-person shooter', w: 1000, h: 640, async run(body, win) {
  let g; try { g = await three3d(body, win, 78); } catch (e) { body.innerHTML = `<div class="empty">Couldn't load the 3D engine. Check your connection.</div>`; return; }
  const { THREE, renderer, scene, camera, canvas, hud } = g, keys = gameKeys(win, body);
  scene.background = new THREE.Color('#5b6b8c'); scene.fog = new THREE.Fog('#5b6b8c', 35, 100);
  scene.add(new THREE.HemisphereLight('#c7d2fe', '#1e1b4b', 1.1));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(20, 40, 10); scene.add(sun);
  // floor with a grid texture
  const tc = document.createElement('canvas'); tc.width = tc.height = 128; const t2 = tc.getContext('2d');
  t2.fillStyle = '#6b7280'; t2.fillRect(0, 0, 128, 128); t2.strokeStyle = '#9ca3af'; t2.lineWidth = 4; t2.strokeRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(tc); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(30, 30);
  const ARENA = 30;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2, ARENA * 2), new THREE.MeshStandardMaterial({ map: tex })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const solids = []; // { minX, maxX, minZ, maxZ, h }
  const addBox = (x, z, sx, sy, sz, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshStandardMaterial({ color, roughness: .8 }));
    m.position.set(x, sy / 2, z); scene.add(m); solids.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2, h: sy, mesh: m }); return m;
  };
  for (const [x, z, sx, sz] of [[0, -ARENA, ARENA * 2, 1], [0, ARENA, ARENA * 2, 1], [-ARENA, 0, 1, ARENA * 2], [ARENA, 0, 1, ARENA * 2]]) addBox(x, z, sx, 4, sz, '#94a3b8');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) { const x = (rnd() - .5) * 48, z = (rnd() - .5) * 48; if (Math.hypot(x, z) < 6) continue; const big = rnd() < .3; addBox(x, z, big ? 1.6 : 2, big ? 5 : 1.4 + rnd(), big ? 1.6 : 2, big ? '#64748b' : ['#a16207', '#92400e', '#78716c'][i % 3]); }
  // gun
  const gun = new THREE.Group(); const gm = new THREE.MeshStandardMaterial({ color: '#111827', metalness: .6, roughness: .4 });
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .5), gm); barrel.position.set(0, 0, -.25); gun.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(.12, .14, .22), gm); grip.position.set(0, -.06, 0); gun.add(grip);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(.13, .02, .2), new THREE.MeshBasicMaterial({ color: '#38bdf8' })); glow.position.set(0, .03, -.05); gun.add(glow);
  const flash = new THREE.PointLight('#fde68a', 0, 6); flash.position.set(0, 0, -.6); gun.add(flash);
  gun.position.set(.28, -.25, -.5); camera.add(gun); scene.add(camera);
  hud.innerHTML = `<div class="as-cross"></div><div class="as-hit"></div><div class="as-vig"></div><div class="as-top"><span class="as-wave"></span><span class="as-score"></span></div>
    <div class="as-bot"><div class="as-hp"><i></i></div><span class="as-ammo"></span></div><div class="as-msg"></div>`;
  const $h = s => hud.querySelector(s);
  // state
  const P = { pos: new THREE.Vector3(0, 1.6, 0), vy: 0, yaw: 0, pitch: 0, hp: 100, clip: 12, ammo: 60, reload: 0, cd: 0, ground: true };
  let enemies = [], bolts = [], drops = [], wave = 0, score = 0, state = 'menu', toSpawn = 0, spawnT = 0, kick = 0, hurtT = 0, hitT = 0;
  const droneGeo = new THREE.SphereGeometry(.55, 16, 12), eyeGeo = new THREE.SphereGeometry(.18, 10, 8), boltGeo = new THREE.SphereGeometry(.12, 8, 6);
  const spawn = () => {
    const a = Math.random() * Math.PI * 2, r = ARENA - 3, d = new THREE.Group();
    const body_ = new THREE.Mesh(droneGeo, new THREE.MeshStandardMaterial({ color: '#7f1d1d', metalness: .4, roughness: .5, emissive: '#3f0d0d' }));
    const eye = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: '#f87171' })); eye.position.z = -.45; d.add(body_, eye);
    d.position.set(Math.cos(a) * r, 1.6 + Math.random(), Math.sin(a) * r); scene.add(d);
    enemies.push({ m: d, hp: 3 + Math.floor(wave / 2), fire: 1 + Math.random() * 2, bob: Math.random() * 6, speed: 2.4 + wave * .25 + Math.random() });
  };
  const nextWave = () => { wave++; toSpawn = 3 + wave * 2; spawnT = 1; msg(`Wave ${wave}`, 1.6); };
  const start = () => { enemies.forEach(e => scene.remove(e.m)); bolts.forEach(b => scene.remove(b.m)); drops.forEach(d => scene.remove(d.m)); enemies = []; bolts = []; drops = []; Object.assign(P, { hp: 100, clip: 12, ammo: 60, reload: 0, vy: 0 }); P.pos.set(0, 1.6, 0); wave = 0; score = 0; state = 'play'; nextWave(); canvas.requestPointerLock?.(); };
  let msgT = 0; const msg = (t, d = 2) => { $h('.as-msg').textContent = t; msgT = d; };
  const collide = (x, z, r = .4) => solids.some(s => x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ);
  const ray = new THREE.Raycaster();
  const shoot = () => {
    if (state !== 'play' || P.reload > 0 || P.cd > 0) return;
    if (!P.clip) { sfx(140, .05, 'square', .03); return reload(); }
    P.clip--; P.cd = .14; kick = 1; flash.intensity = 6; sfx(180, .12, 'sawtooth', .07, -120);
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = ray.intersectObjects([...enemies.map(e => e.m), ...solids.map(s => s.mesh)], true);
    const hitE = hits[0] && enemies.find(e => e.m === hits[0].object.parent || e.m === hits[0].object);
    if (hitE) { hitE.hp--; hitT = .15; sfx(900, .05, 'square', .04); hitE.m.children[0].material.emissive.set('#ffffff'); setTimeout(() => hitE.m.children[0]?.material.emissive.set('#3f0d0d'), 60);
      if (hitE.hp <= 0) { score += 100; scene.remove(hitE.m); enemies = enemies.filter(e => e !== hitE); sfx(90, .4, 'sawtooth', .07, -50);
        if (Math.random() < .35) { const hp = Math.random() < .5, m = new THREE.Mesh(new THREE.BoxGeometry(.4, .4, .4), new THREE.MeshStandardMaterial({ color: hp ? '#22c55e' : '#eab308', emissive: hp ? '#14532d' : '#713f12' })); m.position.copy(hitE.m.position).setY(.5); scene.add(m); drops.push({ m, hp }); } } }
  };
  const reload = () => { if (P.reload > 0 || P.clip === 12 || !P.ammo) return; P.reload = 1.2; sfx(400, .1, 'square', .03); };
  canvas.addEventListener('mousedown', e => { if (state !== 'play') return start(); if (document.pointerLockElement !== canvas) return canvas.requestPointerLock?.(); if (e.button === 0) shoot(); });
  const look = e => { if (document.pointerLockElement !== canvas) return; P.yaw -= e.movementX * .0022; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - e.movementY * .0022)); };
  document.addEventListener('mousemove', look); win.cleanup.push(() => document.removeEventListener('mousemove', look));
  let raf, last = performance.now();
  const frame = now => {
    const dt = Math.min(.033, (now - last) / 1000); last = now; raf = requestAnimationFrame(frame);
    const locked = document.pointerLockElement === canvas;
    if (state === 'play' && locked) {
      if (keys.has('r')) reload();
      if (keys.has('f') || keys.tap('enter')) shoot();
      // movement
      const sp = keys.has('shift') ? 10 : 6.5, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
      const mf = (keys.has('w') || keys.has('arrowup')) - (keys.has('s') || keys.has('arrowdown')), ms = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft'));
      let dx = (fx * mf - fz * ms), dz = (fz * mf + fx * ms); const l = Math.hypot(dx, dz) || 1; dx = dx / l * sp * dt; dz = dz / l * sp * dt;
      if (!collide(P.pos.x + dx, P.pos.z)) P.pos.x += dx; if (!collide(P.pos.x, P.pos.z + dz)) P.pos.z += dz;
      if (keys.has(' ') && P.ground) { P.vy = 6; P.ground = false; }
      P.vy -= 18 * dt; P.pos.y += P.vy * dt; if (P.pos.y <= 1.6) { P.pos.y = 1.6; P.vy = 0; P.ground = true; }
      P.cd -= dt; if (P.reload > 0 && (P.reload -= dt) <= 0) { const n = Math.min(12 - P.clip, P.ammo); P.clip += n; P.ammo -= n; }
      // waves
      if (toSpawn > 0 && (spawnT -= dt) <= 0) { toSpawn--; spawnT = Math.max(.4, 1.6 - wave * .1); spawn(); }
      if (!toSpawn && !enemies.length) nextWave();
      for (const e of enemies) {
        const to = P.pos.clone().sub(e.m.position), d = to.length(); e.bob += dt * 3;
        e.m.lookAt(P.pos.x, e.m.position.y, P.pos.z);
        if (d > 7) { to.y = 0; to.normalize().multiplyScalar(e.speed * dt); const nx = e.m.position.x + to.x, nz = e.m.position.z + to.z; if (!collide(nx, e.m.position.z, .6)) e.m.position.x = nx; if (!collide(e.m.position.x, nz, .6)) e.m.position.z = nz; }
        for (const o of enemies) if (o !== e) { const sep = e.m.position.clone().sub(o.m.position); sep.y = 0; const sd = sep.length(); if (sd < 1.4 && sd > 0) e.m.position.add(sep.multiplyScalar((1.4 - sd) * .5 / sd)); }
        e.m.position.y = 1.6 + Math.sin(e.bob) * .3;
        if ((e.fire -= dt) <= 0 && d < 28) { e.fire = Math.max(.8, 2.6 - wave * .12) + Math.random(); const m = new THREE.Mesh(boltGeo, new THREE.MeshBasicMaterial({ color: '#fb7185' })); m.position.copy(e.m.position); scene.add(m); bolts.push({ m, v: P.pos.clone().add(new THREE.Vector3(0, -.2, 0)).sub(e.m.position).normalize().multiplyScalar(13 + wave * .4), t: 4 }); }
      }
      for (const b of bolts) { b.m.position.addScaledVector(b.v, dt); b.t -= dt;
        if (b.m.position.distanceTo(P.pos) < .7) { b.t = 0; P.hp -= 10; hurtT = .35; sfx(110, .2, 'sawtooth', .07, -40); if (P.hp <= 0) { state = 'dead'; document.exitPointerLock?.(); best('arena', score); } }
        else if (collide(b.m.position.x, b.m.position.z, .05) && b.m.position.y < 5) b.t = 0; }
      bolts = bolts.filter(b => { if (b.t <= 0) scene.remove(b.m); return b.t > 0; });
      for (const d of drops) { d.m.rotation.y += dt * 2; d.m.position.y = .5 + Math.sin(now / 300) * .1; if (d.m.position.distanceTo(P.pos) < 1.6) { d.got = 1; scene.remove(d.m); sfx(1200, .15, 'triangle', .05, 300); if (d.hp) P.hp = Math.min(100, P.hp + 30); else P.ammo += 24; } }
      drops = drops.filter(d => !d.got);
    }
    camera.position.copy(P.pos); camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    kick = Math.max(0, kick - dt * 8); gun.position.z = -.5 + kick * .08; gun.rotation.x = kick * .15; flash.intensity = Math.max(0, flash.intensity - dt * 60);
    gun.position.y = -.25 + (P.reload > 0 ? -.15 : 0) + Math.sin(now / 160) * (state === 'play' && (keys.has('w') || keys.has('s')) ? .01 : 0);
    renderer.render(scene, camera);
    // HUD
    hurtT = Math.max(0, hurtT - dt); hitT = Math.max(0, hitT - dt); msgT = Math.max(0, msgT - dt);
    $h('.as-vig').style.opacity = hurtT * 2; $h('.as-hit').style.opacity = hitT ? 1 : 0;
    $h('.as-hp i').style.width = Math.max(0, P.hp) + '%'; $h('.as-ammo').textContent = P.reload > 0 ? 'Reloading…' : `${P.clip} / ${P.ammo}`;
    $h('.as-wave').textContent = state === 'menu' ? '' : `Wave ${wave} · ${enemies.length + toSpawn} left`; $h('.as-score').textContent = `★ ${score}`;
    const m = $h('.as-msg');
    if (state === 'menu') m.innerHTML = '<b>ARENA STRIKE</b><br>Click to play<br><small>WASD move · mouse aim · click shoot · R reload · Shift sprint · Space jump · Esc pause</small>';
    else if (state === 'dead') m.innerHTML = `<b>YOU DIED</b><br>Wave ${wave} · ★ ${score} · best ${best('arena', score)}<br><small>Click to play again</small>`;
    else if (!locked) m.innerHTML = '<b>Paused</b><br><small>Click to continue</small>';
    else if (!msgT) m.textContent = '';
    m.style.opacity = state !== 'play' || !locked || msgT ? 1 : 0;
  };
  win.game = { P, enemies: () => enemies }; // for tests
  raf = requestAnimationFrame(frame); win.cleanup.push(() => cancelAnimationFrame(raf));
} };

// ---------------- Lost Isles: third-person adventure ----------------
GAME_APPS.lostisles = ALL_APPS.lostisles = { name: 'Lost Isles', icon: { mono: 'LI', bg: '#0d9488' }, cat: 'Games', desc: '3D island adventure', w: 1000, h: 640, async run(body, win) {
  let g; try { g = await three3d(body, win, 60); } catch (e) { body.innerHTML = `<div class="empty">Couldn't load the 3D engine. Check your connection.</div>`; return; }
  const { THREE, renderer, scene, camera, canvas, hud } = g, keys = gameKeys(win, body);
  // --- terrain: island-shaped fractal noise ---
  const SIZE = 220, SEG = 140;
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const heightAt = (x, z) => {
    let h = 0, amp = 1, f = .018; for (let o = 0; o < 5; o++) { h += noise(x * f + 50, z * f + 50) * amp; amp *= .5; f *= 2; }
    const d = Math.hypot(x, z) / (SIZE * .42); return (h - .55) * 22 + 10 - Math.pow(Math.max(0, d), 2.4) * 26;
  };
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colors = [], col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = heightAt(x, z); pos.setY(i, y);
    col.set(y < 1.2 ? '#e8d5a3' : y < 9 ? '#4d9a3a' : y < 15 ? '#3f7d33' : y < 20 ? '#7c7c74' : '#f1f5f9'); col.offsetHSL(0, 0, (hash(x, z) - .5) * .05); colors.push(col.r, col.g, col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: '#1d74b8', transparent: true, opacity: .82, roughness: .2, metalness: .1 }));
  water.rotation.x = -Math.PI / 2; water.position.y = .2; scene.add(water);
  // lights, sky, fog (day/night)
  const hemi = new THREE.HemisphereLight('#bae6fd', '#3f6212', .9), sun = new THREE.DirectionalLight('#fff7e6', 1.8); scene.add(hemi, sun);
  scene.fog = new THREE.Fog('#a5d8ff', 60, 260); scene.background = new THREE.Color('#a5d8ff');
  // trees and rocks (instanced)
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.25, .35, 2, 6), new THREE.MeshStandardMaterial({ color: '#6b4423' }), 260);
  const leaves = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 4, 7), new THREE.MeshStandardMaterial({ color: '#2f6b2b', flatShading: true }), 260);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#8a8a82', flatShading: true }), 90);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), AX = new THREE.Vector3(); const blockers = [];
  let nt = 0, nr = 0;
  for (let i = 0; i < 1200 && (nt < 260 || nr < 90); i++) {
    const x = (rnd() - .5) * SIZE * .8, z = (rnd() - .5) * SIZE * .8, y = heightAt(x, z);
    if (y < 1.5 || Math.hypot(x, z - 6) < 8) continue;
    if (y < 15 && nt < 260 && rnd() < .7) { const s = .8 + rnd() * .7; M.compose(V.set(x, y + 1 * s, z), Q.identity(), S.set(s, s, s)); trunks.setMatrixAt(nt, M); M.compose(V.set(x, y + 3.6 * s, z), Q, S); leaves.setMatrixAt(nt++, M); blockers.push([x, z, .6]); }
    else if (nr < 90) { const s = .5 + rnd() * 1.4; M.compose(V.set(x, y + s * .4, z), Q.setFromAxisAngle(AX.set(rnd(), rnd(), rnd()).normalize(), rnd() * 3), S.set(s, s * .8, s)); rocks.setMatrixAt(nr++, M); blockers.push([x, z, s * .9]); }
  }
  trunks.count = leaves.count = nt; rocks.count = nr; scene.add(trunks, leaves, rocks);
  // shrine, keeper, crystals
  const shrineP = new THREE.Vector3(0, heightAt(0, 0), 0);
  const shrine = new THREE.Group(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, st = new THREE.Mesh(new THREE.BoxGeometry(.8, 3.4, .8), new THREE.MeshStandardMaterial({ color: '#9ca3af', flatShading: true })); st.position.set(Math.cos(a) * 4, 1.7, Math.sin(a) * 4); shrine.add(st); }
  const altar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 1, 8), new THREE.MeshStandardMaterial({ color: '#6b7280' })); altar.position.y = .5; shrine.add(altar);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 80, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#a5f3fc', transparent: true, opacity: 0 })); beam.position.y = 40; shrine.add(beam);
  shrine.position.copy(shrineP); scene.add(shrine); blockers.push([0, 0, 1.6]);
  const keeperP = new THREE.Vector3(5, 0, 12); keeperP.y = heightAt(keeperP.x, keeperP.z);
  const keeper = new THREE.Group(); const robe = new THREE.Mesh(new THREE.ConeGeometry(.7, 2, 8), new THREE.MeshStandardMaterial({ color: '#7c3aed' })); robe.position.y = 1; const head = new THREE.Mesh(new THREE.SphereGeometry(.35, 12, 10), new THREE.MeshStandardMaterial({ color: '#fcd34d' })); head.position.y = 2.25; keeper.add(robe, head); keeper.position.copy(keeperP); scene.add(keeper);
  const crystals = []; const cGeo = new THREE.OctahedronGeometry(.7);
  for (let i = 0; crystals.length < 5 && i < 2000; i++) {
    const a = rnd() * Math.PI * 2, r = 30 + rnd() * 55, x = Math.cos(a) * r, z = Math.sin(a) * r, y = heightAt(x, z);
    if (y < 2 || crystals.some(c => Math.hypot(c.p.x - x, c.p.z - z) < 30)) continue;
    const m = new THREE.Mesh(cGeo, new THREE.MeshStandardMaterial({ color: ['#22d3ee', '#a78bfa', '#f472b6', '#facc15', '#4ade80'][crystals.length], emissive: ['#0e7490', '#5b21b6', '#9d174d', '#a16207', '#15803d'][crystals.length], emissiveIntensity: 1.2 }));
    const light = new THREE.PointLight(m.material.color, 4, 12); m.add(light); m.position.set(x, y + 1.6, z); scene.add(m); crystals.push({ m, p: m.position, got: false });
  }
  // player
  const player = new THREE.Group(); const pb = new THREE.Mesh(new THREE.CapsuleGeometry(.45, .9, 4, 10), new THREE.MeshStandardMaterial({ color: '#f97316' })); pb.position.y = .9;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(.5, .6, .3), new THREE.MeshStandardMaterial({ color: '#78350f' })); pack.position.set(0, 1.1, .4);
  const face = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#111' })); face.position.set(0, 1.45, -.42); player.add(pb, pack, face); scene.add(player);
  const P = { pos: new THREE.Vector3(0, 0, 18), vy: 0, yaw: Math.PI, camYaw: Math.PI, camPitch: .35, ground: true };
  P.pos.y = heightAt(P.pos.x, P.pos.z);
  hud.innerHTML = `<div class="li-top"><span class="li-count"></span><span class="li-compass"><i>▲</i><span></span></span><span class="li-time"></span></div><div class="li-prompt"></div><div class="li-dialog hidden"></div>`;
  const $h = s => hud.querySelector(s);
  let talked = false, delivered = false, dialog = null, tod = .3; // time of day 0..1
  const say = lines => { dialog = { lines, i: 0 }; $h('.li-dialog').classList.remove('hidden'); $h('.li-dialog').innerHTML = `<b>Old Keeper</b><p>${lines[0]}</p><small>Press E</small>`; };
  // controls: drag or pointer lock to orbit the camera
  let drag = false;
  canvas.addEventListener('mousedown', () => { drag = true; canvas.focus(); canvas.requestPointerLock?.(); });
  const mm = e => { if (document.pointerLockElement !== canvas) return; P.camYaw -= e.movementX * .003; P.camPitch = Math.max(-.1, Math.min(1.2, P.camPitch + e.movementY * .003)); };
  document.addEventListener('mousemove', mm); win.cleanup.push(() => document.removeEventListener('mousemove', mm));
  canvas.addEventListener('wheel', e => { camDist = Math.max(4, Math.min(18, camDist + Math.sign(e.deltaY))); e.preventDefault(); }, { passive: false });
  let camDist = 9, eWas = false;
  let raf, last = performance.now();
  const frame = now => {
    const dt = Math.min(.033, (now - last) / 1000); last = now; raf = requestAnimationFrame(frame);
    // day / night
    tod = (tod + dt / 240) % 1; const sunA = tod * Math.PI * 2, day = Math.max(0, Math.sin(sunA));
    sun.position.set(Math.cos(sunA) * 100, Math.sin(sunA) * 120, 40); sun.intensity = .2 + day * 1.8; hemi.intensity = .25 + day * .8;
    const sky = new THREE.Color('#0b1026').lerp(new THREE.Color(day < .25 ? '#fb923c' : '#a5d8ff'), Math.min(1, day * 2.2)); scene.background.copy(sky); scene.fog.color.copy(sky);
    // movement relative to camera
    const mf = (keys.has('w') || keys.has('arrowup')) - (keys.has('s') || keys.has('arrowdown')), ms = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft'));
    if (!dialog && (mf || ms)) {
      const ang = P.camYaw + Math.atan2(-ms, mf); P.yaw = ang; // forward = away from the camera
      const inWater = P.pos.y < .3, sp = (keys.has('shift') ? 11 : 6.5) * (inWater ? .5 : 1);
      const nx = P.pos.x - Math.sin(ang) * sp * dt, nz = P.pos.z - Math.cos(ang) * sp * dt;
      const blocked = blockers.some(([bx, bz, r]) => Math.hypot(nx - bx, nz - bz) < r + .45);
      const slope = heightAt(nx, nz) - heightAt(P.pos.x, P.pos.z);
      if (!blocked && slope < .5 && Math.hypot(nx, nz) < SIZE * .48) { P.pos.x = nx; P.pos.z = nz; }
    }
    const gh = Math.max(heightAt(P.pos.x, P.pos.z), -.4);
    if (keys.has(' ') && P.ground && !dialog) { P.vy = 7; P.ground = false; }
    P.vy -= 20 * dt; P.pos.y += P.vy * dt; if (P.pos.y <= gh) { P.pos.y = gh; P.vy = 0; P.ground = true; }
    player.position.copy(P.pos); player.rotation.y += ((P.yaw - player.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 10);
    pb.position.y = .9 + (P.ground && (mf || ms) ? Math.abs(Math.sin(now / 110)) * .12 : 0);
    // camera
    const cx_ = P.pos.x + Math.sin(P.camYaw) * Math.cos(P.camPitch) * camDist, cz = P.pos.z + Math.cos(P.camYaw) * Math.cos(P.camPitch) * camDist;
    const cy = Math.max(heightAt(cx_, cz) + .8, P.pos.y + 1.5 + Math.sin(P.camPitch) * camDist);
    camera.position.lerp(new THREE.Vector3(cx_, cy, cz), Math.min(1, dt * 8)); camera.lookAt(P.pos.x, P.pos.y + 1.5, P.pos.z);
    // world
    water.position.y = .2 + Math.sin(now / 1500) * .08;
    let left = 0; for (const c of crystals) { if (c.got) continue; left++; c.m.rotation.y += dt * 1.5; c.m.position.y = heightAt(c.p.x, c.p.z) + 1.6 + Math.sin(now / 400) * .25;
      if (c.m.position.distanceTo(P.pos.clone().setY(P.pos.y + 1)) < 1.8) { c.got = true; scene.remove(c.m); sfx(880, .25, 'triangle', .06, 600); } }
    keeper.lookAt(P.pos.x, keeper.position.y, P.pos.z);
    // interactions
    const e = keys.has('e'), ePressed = e && !eWas; eWas = e;
    const nearKeeper = P.pos.distanceTo(keeperP) < 4, nearShrine = Math.hypot(P.pos.x, P.pos.z) < 6;
    if (dialog && ePressed) { if (++dialog.i < dialog.lines.length) $h('.li-dialog p').innerHTML = dialog.lines[dialog.i]; else { dialog = null; $h('.li-dialog').classList.add('hidden'); } }
    else if (ePressed && nearKeeper) { talked = true; say(left === 0 && !delivered ? ['You found them all! Bring the crystals to the stone circle at the island\'s heart.'] : delivered ? ['The light has returned to the isles. Thank you, traveler.'] : ['Welcome, traveler. The Lost Isles have gone dark.', 'Five crystals were scattered across the island. Their glow can be seen at night.', `Find them — follow the compass at the top — and bring them to the stone circle. ${5 - left} found so far.`]); }
    else if (ePressed && nearShrine && left === 0 && !delivered) { delivered = true; sfx(440, 1.2, 'triangle', .06, 880); best('lostisles', 1); }
    beam.material.opacity += ((delivered ? .5 : 0) - beam.material.opacity) * dt;
    // HUD
    $h('.li-count').textContent = delivered ? '✦ The isles are restored!' : `✦ Crystals ${5 - left} / 5`;
    const target = left ? crystals.filter(c => !c.got).sort((a, b) => a.p.distanceTo(P.pos) - b.p.distanceTo(P.pos))[0].p : shrineP;
    const ta = Math.atan2(target.x - P.pos.x, target.z - P.pos.z), rel = ta - P.camYaw + Math.PI;
    $h('.li-compass i').style.transform = `rotate(${-rel}rad)`; $h('.li-compass span').textContent = `${Math.round(target.distanceTo(P.pos))} m ${left ? 'to a crystal' : delivered ? '' : 'to the shrine'}`;
    const hh = Math.floor(tod * 24 + 6) % 24; $h('.li-time').textContent = `${String(hh).padStart(2, '0')}:00 ${day > .05 ? '☀' : '☾'}`;
    $h('.li-prompt').textContent = dialog ? '' : nearKeeper ? '[E] Talk' : nearShrine && left === 0 && !delivered ? '[E] Place the crystals' : !talked ? 'WASD walk · mouse look (click) · Space jump · Shift run · talk to the Keeper' : '';
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame); win.cleanup.push(() => cancelAnimationFrame(raf));
} };
