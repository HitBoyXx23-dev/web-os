// Built-in games. Each is (body, win) => void and registers cleanup on win.cleanup.
function onKeys(win, fn) {
  const h = e => { if (win.el.classList.contains('focused') && !win.el.classList.contains('min')) fn(e); };
  addEventListener('keydown', h); win.cleanup.push(() => removeEventListener('keydown', h));
}
function loop(win, fn, ms) { const t = setInterval(fn, ms); win.cleanup.push(() => clearInterval(t)); return t; }
function best(key, v) {
  const k = 'novaos.best.' + key, cur = +localStorage.getItem(k) || 0;
  if (v > cur) { try { localStorage.setItem(k, v); } catch (e) {} return v; } return cur;
}

const bar = (label = 'Restart') => `<div class="game"><div class="game-bar"><span class="s"></span><span class="sp"></span><button class="r">${label}</button></div>`;
const stats = (body, score, hi, extra = '') => { body.querySelector('.s').innerHTML = `Score <b>${score}</b>&nbsp;&nbsp;&nbsp;Best <b>${hi}</b>${extra ? '&nbsp;&nbsp;&nbsp;' + extra : ''}`; };
function overlay(x, w, h, title, sub) {
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '600 26px Inter, sans-serif'; x.fillText(title, w / 2, h / 2 - 4);
  x.font = '13px Inter, sans-serif'; x.fillStyle = 'rgba(255,255,255,.7)'; x.fillText(sub, w / 2, h / 2 + 22);
}
const MINE = '<svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" stroke="currentColor" stroke-width="2"/></svg>';
const FLAG = '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M6 21V4" stroke="currentColor" stroke-width="2"/><path d="M6 4h11l-3 4 3 4H6z" fill="#ef4444"/></svg>';

const GAMES = {
  snake(body, win) {
    body.innerHTML = bar() + '<canvas width="400" height="400"></canvas><div class="hint">Arrow keys or WASD</div></div>';
    const c = body.querySelector('canvas'), x = c.getContext('2d'), N = 20, S = 20;
    let snake, dir, nd, food, score, dead, go;
    const reset = () => { snake = [{ x: 10, y: 10 }]; dir = nd = { x: 1, y: 0 }; score = 0; dead = false; go = false; place(); };
    const place = () => { do food = { x: Math.random() * N | 0, y: Math.random() * N | 0 }; while (snake.some(p => p.x === food.x && p.y === food.y)); };
    body.querySelector('.r').onclick = reset; reset();
    onKeys(win, e => {
      const m = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
      if (m && (m[0] !== -dir.x || m[1] !== -dir.y)) { nd = { x: m[0], y: m[1] }; go = true; e.preventDefault(); }
    });
    loop(win, () => {
      if (!dead && go) {
        dir = nd; const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || snake.some(p => p.x === h.x && p.y === h.y)) dead = true;
        else { snake.unshift(h); if (h.x === food.x && h.y === food.y) { score++; place(); } else snake.pop(); }
      }
      x.fillStyle = '#111214'; x.fillRect(0, 0, 400, 400);
      x.fillStyle = 'rgba(255,255,255,.03)'; for (let i = 0; i < N; i++) for (let j = (i % 2); j < N; j += 2) x.fillRect(i * S, j * S, S, S);
      x.fillStyle = '#ef4444'; x.beginPath(); x.arc(food.x * S + S / 2, food.y * S + S / 2, S / 2 - 4, 0, 7); x.fill();
      snake.forEach((p, i) => { x.fillStyle = i ? '#22c55e' : '#4ade80'; x.beginPath(); x.roundRect(p.x * S + 1.5, p.y * S + 1.5, S - 3, S - 3, 4); x.fill(); });
      if (dead) overlay(x, 400, 400, 'Game over', 'Press Restart to play again');
      else if (!go) overlay(x, 400, 400, 'Snake', 'Press an arrow key to start');
      stats(body, score, best('snake', score));
    }, 110);
  },

  g2048(body, win) {
    body.innerHTML = bar('New game') + '<div class="g2048"></div><div class="hint">Arrow keys to slide</div></div>';
    const g = body.querySelector('.g2048'); let b, score;
    const colors = { 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
    const add = () => { const e = []; b.forEach((v, i) => !v && e.push(i)); if (e.length) b[e[Math.random() * e.length | 0]] = Math.random() < .9 ? 2 : 4; };
    const draw = () => { g.innerHTML = b.map(v => `<div style="background:${v ? colors[v] || '#3c3a32' : ''};color:${v > 4 ? '#fff' : '#776e65'};font-size:${v > 512 ? 20 : 24}px">${v || ''}</div>`).join(''); stats(body, score, best('2048', score)); };
    const reset = () => { b = Array(16).fill(0); score = 0; add(); add(); draw(); };
    const slide = row => { const r = row.filter(v => v); for (let i = 0; i < r.length - 1; i++) if (r[i] === r[i + 1]) { r[i] *= 2; score += r[i]; r.splice(i + 1, 1); } while (r.length < 4) r.push(0); return r; };
    body.querySelector('.r').onclick = reset; reset();
    onKeys(win, e => {
      const d = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 }[e.key]; if (d === undefined) return; e.preventDefault();
      const before = b.join();
      for (let i = 0; i < 4; i++) {
        let idx = d < 2 ? [0, 1, 2, 3].map(j => i * 4 + j) : [0, 1, 2, 3].map(j => j * 4 + i);
        if (d % 2) idx = idx.reverse();
        slide(idx.map(k => b[k])).forEach((v, j) => b[idx[j]] = v);
      }
      if (b.join() !== before) add(); draw();
    });
  },

  minesweeper(body, win) {
    body.innerHTML = '<div class="game"><div class="game-bar"><span class="s"></span><span class="sp"></span><button class="r">New game</button></div><div class="mines"></div><div class="hint">Click to reveal · right-click to flag</div></div>';
    const W = 12, H = 12, M = 20, m = body.querySelector('.mines'); m.style.gridTemplateColumns = `repeat(${W},26px)`;
    let cells, over, opened;
    const nb = i => { const x = i % W, y = i / W | 0, r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < W && ny < H) r.push(ny * W + nx); } return r; };
    const status = t => body.querySelector('.s').textContent = t;
    const reset = () => {
      over = false; opened = 0; cells = Array.from({ length: W * H }, () => ({ mine: false, open: false, flag: false }));
      for (let k = 0; k < M;) { const i = Math.random() * W * H | 0; if (!cells[i].mine) { cells[i].mine = true; k++; } }
      cells.forEach((c, i) => c.n = nb(i).filter(j => cells[j].mine).length);
      m.innerHTML = ''; cells.forEach((c, i) => { const d = document.createElement('div'); c.el = d; d.onclick = () => open(i); d.oncontextmenu = e => { e.preventDefault(); if (!c.open && !over) { c.flag = !c.flag; d.innerHTML = c.flag ? FLAG : ''; } }; m.appendChild(d); });
      status(`${M} mines`);
    };
    const open = i => {
      const c = cells[i]; if (over || c.open || c.flag) return;
      if (c.mine) { over = true; cells.forEach(k => k.mine && (k.el.innerHTML = MINE)); c.el.style.background = '#dc2626'; return status('You hit a mine'); }
      c.open = true; opened++; c.el.className = 'o'; c.el.textContent = c.n || '';
      c.el.style.color = ['', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#f59e0b', '#06b6d4', '#a1a1aa', '#71717a'][c.n];
      if (!c.n) nb(i).forEach(open);
      if (opened === W * H - M) { over = true; status('Cleared!'); }
    };
    body.querySelector('.r').onclick = reset; reset();
  },

  tictactoe(body, win) {
    body.innerHTML = '<div class="game"><div class="game-bar"><span class="s"></span><span class="sp"></span><button class="r">New game</button></div><div class="ttt"></div></div>';
    const t = body.querySelector('.ttt'); let b, over;
    const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const win_ = (bb, p) => L.some(l => l.every(i => bb[i] === p));
    const mm = (bb, p) => { // minimax
      if (win_(bb, 'O')) return { s: 1 }; if (win_(bb, 'X')) return { s: -1 }; if (bb.every(v => v)) return { s: 0 };
      let bestM = { s: p === 'O' ? -2 : 2 };
      bb.forEach((v, i) => { if (v) return; bb[i] = p; const r = mm(bb, p === 'O' ? 'X' : 'O'); bb[i] = ''; if (p === 'O' ? r.s > bestM.s : r.s < bestM.s) bestM = { s: r.s, i }; });
      return bestM;
    };
    const draw = () => { t.innerHTML = ''; b.forEach((v, i) => { const btn = document.createElement('button'); btn.textContent = v; btn.style.color = v === 'X' ? 'var(--accent)' : '#ef4444'; btn.onclick = () => play(i); t.appendChild(btn); }); };
    const check = () => { const s = body.querySelector('.s'); if (win_(b, 'X')) s.textContent = 'You win!'; else if (win_(b, 'O')) s.textContent = 'CPU wins!'; else if (b.every(v => v)) s.textContent = 'Draw.'; else return false; over = true; return true; };
    const play = i => { if (over || b[i]) return; b[i] = 'X'; if (!check()) { b[mm(b, 'O').i] = 'O'; check(); } draw(); };
    const reset = () => { b = Array(9).fill(''); over = false; body.querySelector('.s').textContent = 'You play X'; draw(); };
    body.querySelector('.r').onclick = reset; reset();
  },

  breakout(body, win) {
    body.innerHTML = bar() + '<canvas width="480" height="360"></canvas><div class="hint">Mouse or arrow keys · click or Space to launch</div></div>';
    const c = body.querySelector('canvas'), x = c.getContext('2d');
    let px, ball, bricks, score, lives, stuck, keys = {};
    const reset = () => { px = 200; score = 0; lives = 3; stuck = true; ball = { x: 240, y: 320, vx: 3, vy: -3 }; bricks = []; for (let r = 0; r < 5; r++) for (let k = 0; k < 10; k++) bricks.push({ x: k * 48 + 2, y: r * 18 + 30, a: 1, c: `hsl(${r * 50},70%,55%)` }); };
    body.querySelector('.r').onclick = reset; reset();
    c.onmousemove = e => { const r = c.getBoundingClientRect(); px = (e.clientX - r.left) * 480 / r.width - 40; };
    c.onclick = () => stuck = false;
    onKeys(win, e => { if (e.key === ' ') { stuck = false; e.preventDefault(); } keys[e.key] = 1; });
    const ku = e => keys[e.key] = 0; addEventListener('keyup', ku); win.cleanup.push(() => removeEventListener('keyup', ku));
    loop(win, () => {
      if (keys.ArrowLeft) px -= 7; if (keys.ArrowRight) px += 7; px = Math.max(0, Math.min(400, px));
      if (stuck) { ball.x = px + 40; ball.y = 330; } else if (lives > 0 && bricks.some(b => b.a)) {
        ball.x += ball.vx; ball.y += ball.vy;
        if (ball.x < 5 || ball.x > 475) ball.vx *= -1; if (ball.y < 5) ball.vy *= -1;
        if (ball.y > 335 && ball.y < 345 && ball.x > px && ball.x < px + 80) { ball.vy = -Math.abs(ball.vy); ball.vx = (ball.x - px - 40) / 8; }
        if (ball.y > 360) { lives--; stuck = true; ball.vx = 3; ball.vy = -3; }
        for (const b of bricks) if (b.a && ball.x > b.x && ball.x < b.x + 44 && ball.y > b.y && ball.y < b.y + 14) { b.a = 0; ball.vy *= -1; score += 10; break; }
      }
      x.fillStyle = '#111214'; x.fillRect(0, 0, 480, 360);
      bricks.forEach(b => { if (b.a) { x.fillStyle = b.c; x.beginPath(); x.roundRect(b.x, b.y, 44, 14, 3); x.fill(); } });
      x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent'); x.beginPath(); x.roundRect(px, 340, 80, 8, 4); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ball.x, ball.y, 6, 0, 7); x.fill();
      if (lives <= 0) overlay(x, 480, 360, 'Game over', 'Press Restart to play again'); else if (!bricks.some(b => b.a)) overlay(x, 480, 360, 'You win', 'Every brick cleared');
      stats(body, score, best('breakout', score), `Lives <b>${lives}</b>`);
    }, 16);
  },

  flappy(body, win) {
    body.innerHTML = '<div class="game"><div class="game-bar"><span class="s"></span></div><canvas width="360" height="480"></canvas><div class="hint">Click or Space to flap</div></div>';
    const c = body.querySelector('canvas'), x = c.getContext('2d');
    let y, v, pipes, score, dead, t, go;
    const reset = () => { y = 240; v = 0; pipes = []; score = 0; dead = false; t = 0; go = false; };
    const flap = () => { if (dead) reset(); else { go = true; v = -7; } };
    reset(); c.onclick = flap; onKeys(win, e => { if (e.key === ' ' || e.key === 'ArrowUp') { flap(); e.preventDefault(); } });
    loop(win, () => {
      if (!dead && go) {
        v += .4; y += v; t++;
        if (t % 90 === 0) pipes.push({ x: 360, g: 80 + Math.random() * 260 });
        pipes.forEach(p => { p.x -= 2.5; if (!p.s && p.x < 60) { p.s = 1; score++; } if (p.x < 80 && p.x > 20 && (y < p.g - 70 || y + 24 > p.g + 70)) dead = true; });
        pipes = pipes.filter(p => p.x > -60); if (y > 456 || y < 0) dead = true;
      }
      const sky = x.createLinearGradient(0, 0, 0, 480); sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(1, '#e0f2fe'); x.fillStyle = sky; x.fillRect(0, 0, 360, 480);
      x.fillStyle = '#16a34a'; pipes.forEach(p => { x.beginPath(); x.roundRect(p.x, -8, 60, p.g - 62, 6); x.roundRect(p.x, p.g + 70, 60, 500, 6); x.fill(); });
      x.fillStyle = '#facc15'; x.beginPath(); x.roundRect(56, y, 24, 24, 6); x.fill(); x.fillStyle = '#18181b'; x.fillRect(72, y + 7, 3, 3);
      x.fillStyle = '#fff'; x.font = '600 36px Inter, sans-serif'; x.textAlign = 'center'; x.fillText(score, 180, 60);
      if (dead) overlay(x, 360, 480, 'Game over', 'Click to try again');
      else if (!go) overlay(x, 360, 480, 'Flappy', 'Click or press Space to start');
      stats(body, score, best('flappy', score));
    }, 16);
  },
};

// Web games embedded by URL (open-source projects hosted on GitHub Pages).
const WEB_GAMES = [
  { name: 'Hextris', mono: 'Hx', bg: '#e11d48', url: 'https://hextris.github.io/hextris/' },
  { name: 'Tetris', img: 'kblocks', mono: 'Te', bg: '#0891b2', url: 'https://chvin.github.io/react-tetris/?lan=en' },
  { name: 'Clumsy Bird', mono: 'CB', bg: '#65a30d', url: 'https://ellisonleao.github.io/clumsy-bird/' },
  { name: 'Pac-Man', img: 'pacman', mono: 'PM', bg: '#ca8a04', url: 'https://masonicgit.github.io/pacman/' },
];
