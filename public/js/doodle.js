// Doodle Duel — a multiplayer draw-and-guess party game (2-10 players) over the party server.
// The room's host (longest-connected player) runs the game: turns, words, timer and scores. The drawer's strokes
// go to everyone; guesses go only to the host, which announces correct ones without revealing the word.
const DD_WORDS = ('apple banana pizza burger donut cookie cake ice-cream sandwich taco popcorn cheese egg carrot pumpkin strawberry watermelon grapes lemon cherry ' +
  'cat dog fish bird horse cow pig sheep duck frog snake turtle rabbit mouse lion tiger bear panda monkey giraffe elephant zebra penguin owl shark whale octopus crab ' +
  'spider bee butterfly snail dinosaur dragon unicorn robot alien ghost zombie vampire wizard pirate ninja knight princess king queen clown astronaut ' +
  'house castle tent igloo bridge tower lighthouse windmill school hospital church pyramid volcano island mountain river waterfall beach desert forest cave ' +
  'sun moon star cloud rain snow rainbow lightning tornado fire tree flower cactus mushroom leaf grass rock ' +
  'car bus truck train plane helicopter rocket boat submarine bicycle skateboard tractor ambulance motorcycle ' +
  'phone laptop computer television camera headphones guitar piano drum trumpet violin microphone ' +
  'chair table bed sofa lamp door window clock mirror toothbrush umbrella backpack glasses hat shoe sock crown ring ' +
  'ball kite balloon gift candle key lock map compass sword shield bow arrow hammer saw ladder bucket broom ' +
  'snowman scarecrow mermaid skeleton treasure bomb magnet battery lightbulb tooth heart brain eye nose hand foot ' +
  'football basketball soccer tennis bowling skiing surfing fishing camping swimming dancing sleeping ' +
  'minecraft controller joystick dice puzzle chess trophy medal flag ticket envelope book pencil scissors paint').split(' ');
const DD_COLORS = ['#111111', '#ffffff', '#9ca3af', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#92400e'];
const ddNorm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const ddClose = (a, b) => { // one edit away
  if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false;
  let i = 0, j = 0, d = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++d > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
  return d + (a.length - i) + (b.length - j) <= 1;
};

GAME_APPS.doodle = ALL_APPS.doodle = { name: 'Doodle Duel', icon: { mono: 'DD', bg: '#7c3aed' }, cat: 'Games', desc: 'Draw and guess with friends', w: 1060, h: 700, run(body, win) {
  const me = { name: (OS.account?.name || OS.user).split(' ')[0] };
  let conn = null, myId = 0, owner = 0, code = '', peers = new Map(), S = null; // S: latest game state from the host
  let H = null; // host-only state
  const strokes = []; // current drawing: [{ c, w, p: [x0, y0, x1, y1, …] }] in 0..1000 × 0..750
  const $d = s => body.querySelector(s);
  const isHost = () => myId === owner;
  const nameOf = id => id === myId ? me.name : peers.get(id)?.name || 'Player';
  const send = m => conn?.send(m);
  const toHost = m => isHost() ? hostMsg({ ...m, from: myId }) : send({ ...m, to: owner });
  const toOne = (id, m) => id === myId ? onMsg({ ...m, from: myId }) : send({ ...m, to: id });
  const toAll = m => { send(m); onMsg({ ...m, from: myId }); };

  // ---- host: the game itself ----
  const players = () => [myId, ...peers.keys()];
  const publish = () => {
    const st = { t: 'st', phase: H.phase, drawer: H.drawer, mask: H.word ? H.word.split('').map((ch, i) => /[a-z0-9]/i.test(ch) && !H.shown.has(i) ? '_' : ch).join('') : '', tl: Math.ceil(H.tl), round: H.round, rounds: H.rounds,
      scores: players().map(id => [id, nameOf(id), H.scores[id] || 0, H.guessed.has(id)]), reveal: H.phase === 'reveal' || H.phase === 'over' ? H.word : '' };
    toAll(st);
    send({ t: 'meta', meta: { title: `${me.name}'s Doodle Duel`, kind: 'doodle', name: me.name, public: !!H.public, state: H.phase === 'lobby' ? 'waiting' : 'playing' } });
  };
  const newGame = () => { H = { phase: 'lobby', public: H?.public ?? true, rounds: 3, round: 0, order: [], turn: -1, drawer: 0, word: '', choices: [], tl: 0, scores: {}, guessed: new Set(), shown: new Set() }; publish(); };
  const startGame = () => {
    if (players().length < 2) return sys('You need at least 2 players.');
    Object.assign(H, { round: 1, order: players(), turn: -1, scores: {} }); nextTurn();
  };
  const nextTurn = () => {
    H.order = H.order.filter(id => players().includes(id)); players().forEach(id => H.order.includes(id) || H.order.push(id));
    if (++H.turn >= H.order.length) { H.turn = 0; H.round++; }
    if (H.round > H.rounds || H.order.length < 2) return gameOver();
    H.drawer = H.order[H.turn]; H.word = ''; H.guessed = new Set(); H.shown = new Set(); H.phase = 'pick'; H.tl = 12;
    const pool = [...DD_WORDS].sort(() => Math.random() - .5); H.choices = pool.slice(0, 3);
    toAll({ t: 'clr' }); toOne(H.drawer, { t: 'choose', words: H.choices }); publish();
  };
  const pick = w => { H.word = w; H.phase = 'draw'; H.tl = H.total = 80; toOne(H.drawer, { t: 'word', word: w }); toAll({ t: 'sys', text: `${nameOf(H.drawer)} is drawing!` }); publish(); };
  const endTurn = () => { if (H.phase !== 'draw') return; H.phase = 'reveal'; H.tl = 5; toAll({ t: 'sys', text: `The word was “${H.word}”.`, kind: 'ok' }); publish(); };
  const gameOver = () => { H.phase = 'over'; H.tl = 12; H.word = ''; publish(); };
  const hostMsg = m => {
    if (!H) return;
    if (m.t === 'start' && m.from === myId) startGame();
    if (m.t === 'pick' && m.from === H.drawer && H.phase === 'pick') pick(H.choices[m.i] || H.choices[0]);
    if (m.t === 'guess') {
      const text = String(m.text || '').slice(0, 100).trim(); if (!text) return;
      const g = ddNorm(text), w = ddNorm(H.word), who = nameOf(m.from);
      if (H.phase === 'draw' && m.from !== H.drawer && !H.guessed.has(m.from)) {
        if (g === w) {
          H.guessed.add(m.from); H.scores[m.from] = (H.scores[m.from] || 0) + 50 + Math.round(250 * H.tl / H.total); H.scores[H.drawer] = (H.scores[H.drawer] || 0) + 40;
          toAll({ t: 'sys', text: `${who} guessed the word!`, kind: 'ok' }); publish();
          if (players().every(id => id === H.drawer || H.guessed.has(id))) endTurn();
          return;
        }
        if (ddClose(g, w)) toOne(m.from, { t: 'sys', text: `“${text}” is close!`, kind: 'close' });
      }
      // people who already know the word only chat with each other (and the drawer)
      const knows = id => H.phase === 'draw' && (id === H.drawer || H.guessed.has(id));
      if (knows(m.from)) players().filter(knows).forEach(id => toOne(id, { t: 'chat', name: who, text, secret: true }));
      else toAll({ t: 'chat', name: who, text });
    }
  };
  // host timer
  const tick = setInterval(() => {
    if (!isHost() || !H || H.phase === 'lobby') return;
    H.tl -= 1;
    if (H.phase === 'draw' && H.word) { // reveal letters as hints at half and three quarters of the time
      const idx = H.word.split('').map((c, i) => /[a-z0-9]/i.test(c) && !H.shown.has(i) ? i : -1).filter(i => i >= 0);
      const want = Math.floor(H.word.length * (H.tl < H.total / 4 ? .4 : H.tl < H.total / 2 ? .2 : 0));
      if (H.shown.size < want && idx.length > 1) H.shown.add(idx[Math.random() * idx.length | 0]);
    }
    if (H.tl <= 0) { if (H.phase === 'pick') pick(H.choices[0]); else if (H.phase === 'draw') endTurn(); else if (H.phase === 'reveal') nextTurn(); else if (H.phase === 'over') newGame(); return; }
    publish();
  }, 1000);

  // ---- everyone ----
  const onMsg = m => {
    if (m.t === 'st') { const was = S?.phase; S = m; if (m.phase !== 'draw' && m.phase !== 'pick') me.word = ''; if (m.phase !== 'pick') me.choices = null; if (was !== S.phase || !$d('.dd-head')) render(); else update(); return; }
    if (m.t === 'ln') { strokes.push({ c: m.c, w: m.w, p: m.p }); drawStroke(strokes[strokes.length - 1]); return; }
    if (m.t === 'clr') { strokes.length = 0; redraw(); return; }
    if (m.t === 'strokes') { strokes.length = 0; strokes.push(...(m.list || [])); redraw(); return; }
    if (m.t === 'choose') { me.choices = m.words; update(); return; }
    if (m.t === 'word') { me.word = m.word; update(); return; }
    if (m.t === 'sys') return sys(m.text, m.kind);
    if (m.t === 'chat') return chat(m.name, m.text, m.secret);
    if (isHost()) hostMsg(m);
  };
  const sys = (text, kind) => { const l = $d('.dd-log'); if (!l) return; const d = document.createElement('div'); d.className = 'dd-sys ' + (kind || ''); d.textContent = text; l.appendChild(d); l.scrollTop = 1e9; };
  const chat = (name, text, secret) => { const l = $d('.dd-log'); if (!l) return; const d = document.createElement('div'); d.className = 'dd-chat' + (secret ? ' secret' : ''); d.innerHTML = '<b></b> <span></span>'; d.querySelector('b').textContent = name + ':'; d.querySelector('span').textContent = text; l.appendChild(d); l.scrollTop = 1e9; };

  // ---- drawing ----
  let cv, cx, color = DD_COLORS[0], size = 6, drawing = null, pending = [], flushAt = 0;
  const drawStroke = s => { if (!cx) return; cx.strokeStyle = s.c; cx.lineWidth = s.w; cx.lineCap = cx.lineJoin = 'round'; cx.beginPath(); cx.moveTo(s.p[0], s.p[1]); for (let i = 2; i < s.p.length; i += 2) cx.lineTo(s.p[i], s.p[i + 1]); if (s.p.length === 2) cx.lineTo(s.p[0] + .1, s.p[1]); cx.stroke(); };
  const redraw = () => { if (!cx) return; cx.fillStyle = '#fff'; cx.fillRect(0, 0, 1000, 750); strokes.forEach(drawStroke); };
  const canDraw = () => S?.phase === 'draw' && S.drawer === myId;
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 1000), Math.round((e.clientY - r.top) / r.height * 750)]; };
  const flush = () => { if (!drawing || drawing.p.length < 2) return; const s = { c: drawing.c, w: drawing.w, p: drawing.p.slice() }; send({ t: 'ln', ...s }); strokes.push(s); drawing.p = drawing.p.slice(-2); };
  const wireCanvas = () => {
    cv = $d('canvas'); cx = cv.getContext('2d'); redraw();
    cv.onpointerdown = e => { if (!canDraw()) return; cv.setPointerCapture(e.pointerId); drawing = { c: color, w: size, p: pos(e) }; drawStroke(drawing); };
    cv.onpointermove = e => { if (!drawing) return; const [x, y] = pos(e); const s = { c: drawing.c, w: drawing.w, p: [...drawing.p.slice(-2), x, y] }; drawStroke(s); drawing.p.push(x, y); if (performance.now() - flushAt > 50) { flushAt = performance.now(); flush(); } };
    cv.onpointerup = cv.onpointercancel = () => { flush(); drawing = null; };
  };

  // ---- screens ----
  const lobby = async (note = '') => {
    conn?.close(); conn = null; peers.clear(); S = H = null; myId = owner = 0; strokes.length = 0;
    body.innerHTML = `<div class="dd dd-center"><div class="dd-card"><h2>Doodle Duel</h2><p class="muted">One player draws, everyone else races to guess the word. 2–10 players.</p>
      <label class="field">Your name<input class="dd-name" maxlength="16" value="${esc(me.name)}"></label>
      <div class="row"><input class="dd-code grow" maxlength="8" placeholder="Room code"><button data-a="join">Join</button></div>
      <div class="row"><button class="primary grow" data-a="create">Create a room</button><label class="row small"><input type="checkbox" class="switch dd-public" checked> Public</label></div>
      ${note ? `<p class="dd-note">${esc(note)}</p>` : ''}
      <div class="section-label" style="padding:8px 0 0">Open rooms</div><div class="dd-rooms"><div class="spinner"></div></div></div></div>`;
    const list = await Party.rooms('game'), box = $d('.dd-rooms'); if (!box) return;
    if (list === null) { box.innerHTML = `<p class="muted small">${esc(NO_PARTY)}</p>`; return; }
    const rooms = list.filter(r => r.kind === 'doodle');
    box.innerHTML = rooms.length ? rooms.map(r => `<button class="dd-room" data-room="${esc(r.room)}"><b>${esc(r.title)}</b><small>${r.people}/${r.max} · ${esc(r.state || '')}</small></button>`).join('') : '<p class="muted small">No open rooms right now — create one!</p>';
  };
  const join = (room, pub) => {
    me.name = ($d('.dd-name')?.value.trim() || me.name).slice(0, 16); code = room.replace(/^dd-/, '');
    conn = Party.connect('game', room, me.name, {
      welcome: m => { myId = m.id; owner = m.owner; m.peers.forEach(p => peers.set(p.id, p)); if (isHost()) { H = { public: pub }; newGame(); } render(); },
      join: p => { peers.set(p.id, p); sys(`${p.name} joined`); if (isHost()) { publish(); if (strokes.length) toOne(p.id, { t: 'strokes', list: strokes }); } },
      leave: id => { const n = nameOf(id); peers.delete(id); sys(`${n} left`); if (isHost() && H) { if (H.drawer === id && H.phase === 'pick') nextTurn(); else if (H.drawer === id && H.phase === 'draw') endTurn(); publish(); } },
      message: m => {
        if (m.t === 'owner') { owner = m.id; if (isHost()) { H = { public: true }; newGame(); sys('You are the host now.'); } return; }
        onMsg(m);
      },
      close: reason => lobby(reason),
    });
  };
  const render = () => {
    if (!conn) return;
    const keep = $d('.dd-log')?.innerHTML || ''; // the chat log survives screen changes
    const drawer = S?.drawer === myId, phase = S?.phase || 'lobby';
    body.innerHTML = `<div class="dd"><header class="dd-head"><span class="dd-round">${phase === 'lobby' ? `Room ${esc(code.toUpperCase())}` : `Round ${Math.min(S.round, S.rounds)} of ${S.rounds}`}</span>
        <span class="dd-word grow"></span><span class="dd-time"></span><button class="ghost small" data-a="leave">Leave</button></header>
      <div class="dd-main"><aside class="dd-players"></aside>
        <section class="dd-stage"><canvas width="1000" height="750"></canvas><div class="dd-overlay"></div>
          ${drawer && phase === 'draw' ? `<div class="dd-tools">${DD_COLORS.map(c => `<button data-color="${c}" style="background:${c}" class="${c === color ? 'on' : ''}"></button>`).join('')}<span class="sep"></span>${[3, 6, 14, 28].map(w => `<button data-size="${w}" class="dd-size ${w === size ? 'on' : ''}"><i style="width:${Math.min(20, w)}px;height:${Math.min(20, w)}px"></i></button>`).join('')}<span class="sep"></span><button data-a="clear">Clear</button></div>` : ''}</section>
        <aside class="dd-side"><div class="dd-log"></div><form class="dd-guess"><input maxlength="100" placeholder="${drawer && phase === 'draw' ? 'You are drawing — chat here' : 'Type your guess'}" autocomplete="off"></form></aside></div></div>`;
    $d('.dd-log').innerHTML = keep; $d('.dd-log').scrollTop = 1e9;
    wireCanvas(); update();
    $d('.dd-guess').onsubmit = e => { e.preventDefault(); const i = $d('.dd-guess input'), text = i.value.trim(); i.value = ''; if (text) toHost({ t: 'guess', text }); };
  };
  const update = () => {
    if (!S || !$d('.dd-head')) return;
    const drawer = S.drawer === myId, ov = $d('.dd-overlay');
    $d('.dd-word').textContent = S.phase === 'draw' ? (drawer ? (me.word || '') : S.mask.split('').join(' ')) : S.phase === 'reveal' ? S.reveal : '';
    $d('.dd-time').textContent = ['pick', 'draw', 'reveal'].includes(S.phase) ? `⏱ ${S.tl}` : '';
    $d('.dd-players').innerHTML = (S.scores || []).slice().sort((a, b) => b[2] - a[2]).map(([id, n, sc, ok]) => `<div class="dd-p${ok ? ' ok' : ''}${id === S.drawer && S.phase !== 'lobby' ? ' drawing' : ''}"><b>${esc(n)}${id === myId ? ' (you)' : ''}</b><span>${sc}</span>${id === S.drawer && S.phase !== 'lobby' && S.phase !== 'over' ? '✏️' : ok ? '✓' : ''}</div>`).join('');
    let o = '';
    if (S.phase === 'lobby') o = `<div class="dd-panel"><h3>Waiting for players</h3><p>${(S.scores || []).length} in the room · share the code <b>${esc(code.toUpperCase())}</b></p>${isHost() ? `<button class="primary" data-a="start" ${(S.scores || []).length < 2 ? 'disabled' : ''}>Start game</button>` : '<p class="muted">The host will start the game.</p>'}</div>`;
    else if (S.phase === 'pick') o = drawer && me.choices ? `<div class="dd-panel"><h3>Choose a word to draw</h3><div class="row">${me.choices.map((w, i) => `<button class="primary" data-pick="${i}">${esc(w)}</button>`).join('')}</div></div>` : `<div class="dd-panel"><h3>${esc((S.scores.find(s => s[0] === S.drawer) || [])[1] || '')} is choosing a word…</h3></div>`;
    else if (S.phase === 'reveal') o = `<div class="dd-panel"><h3>The word was “${esc(S.reveal)}”</h3></div>`;
    else if (S.phase === 'over') { const top = S.scores.slice().sort((a, b) => b[2] - a[2]); o = `<div class="dd-panel"><h3>🏆 ${esc(top[0]?.[1] || '')} wins!</h3>${top.map((s, i) => `<p>${['🥇', '🥈', '🥉'][i] || ''} ${esc(s[1])} — ${s[2]}</p>`).join('')}<p class="muted small">New game in a few seconds…</p></div>`; }
    ov.innerHTML = o; ov.classList.toggle('hidden', !o);
  };

  body.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'create') return join('dd-' + Math.random().toString(36).slice(2, 6), $d('.dd-public').checked);
    if (a === 'join') { const c = $d('.dd-code').value.trim().toLowerCase(); if (c) join('dd-' + c.replace(/^dd-/, ''), false); return; }
    if (a === 'leave') return lobby();
    if (a === 'start') return toHost({ t: 'start' });
    if (a === 'clear' && canDraw()) { strokes.length = 0; redraw(); send({ t: 'clr' }); return; }
    const r = e.target.closest('[data-room]'); if (r) return join(r.dataset.room, false);
    const p = e.target.closest('[data-pick]'); if (p) return toHost({ t: 'pick', i: +p.dataset.pick });
    const c = e.target.closest('[data-color]'); if (c) { color = c.dataset.color; body.querySelectorAll('[data-color]').forEach(b => b.classList.toggle('on', b === c)); }
    const s = e.target.closest('[data-size]'); if (s) { size = +s.dataset.size; body.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', b === s)); }
  };
  win.game = { state: () => S, host: () => H, strokes }; // for tests
  win.cleanup.push(() => { clearInterval(tick); conn?.close(); });
  lobby();
} };
