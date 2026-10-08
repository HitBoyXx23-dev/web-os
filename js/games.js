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

const GAMES = {
  snake(body, win) {
    body.innerHTML = '<div class="pad"><div class="row"><b>Snake</b><span class="s"></span><button class="r">Restart</button></div><canvas width="400" height="400"></canvas><p style="text-align:center;color:var(--muted)">Arrow keys / WASD</p></div>';
    const c = body.querySelector('canvas'), x = c.getContext('2d'), N = 20, S = 20;
    let snake, dir, nd, food, score, dead;
    const reset = () => { snake = [{ x: 10, y: 10 }]; dir = nd = { x: 1, y: 0 }; score = 0; dead = false; place(); };
    const place = () => { do food = { x: Math.random() * N | 0, y: Math.random() * N | 0 }; while (snake.some(p => p.x === food.x && p.y === food.y)); };
    body.querySelector('.r').onclick = reset; reset();
    onKeys(win, e => {
      const m = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
      if (m && (m[0] !== -dir.x || m[1] !== -dir.y)) { nd = { x: m[0], y: m[1] }; e.preventDefault(); }
    });
    loop(win, () => {
      if (!dead) {
        dir = nd; const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || snake.some(p => p.x === h.x && p.y === h.y)) dead = true;
        else { snake.unshift(h); if (h.x === food.x && h.y === food.y) { score++; place(); } else snake.pop(); }
      }
      x.fillStyle = '#0d1117'; x.fillRect(0, 0, 400, 400);
      x.fillStyle = '#f55'; x.fillRect(food.x * S + 2, food.y * S + 2, S - 4, S - 4);
      snake.forEach((p, i) => { x.fillStyle = i ? '#4c4' : '#8f8'; x.fillRect(p.x * S + 1, p.y * S + 1, S - 2, S - 2); });
      if (dead) { x.fillStyle = '#fff'; x.font = '28px sans-serif'; x.textAlign = 'center'; x.fillText('Game Over', 200, 200); }
      body.querySelector('.s').textContent = `Score: ${score} · Best: ${best('snake', score)}`;
    }, 110);
  },

  g2048(body, win) {
    body.innerHTML = '<div class="pad"><div class="row" style="justify-content:center"><b>2048</b><span class="s"></span><button class="r">New</button></div><br><div class="g2048"></div><p style="text-align:center;color:var(--muted)">Arrow keys</p></div>';
    const g = body.querySelector('.g2048'); let b, score;
    const colors = { 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
    const add = () => { const e = []; b.forEach((v, i) => !v && e.push(i)); if (e.length) b[e[Math.random() * e.length | 0]] = Math.random() < .9 ? 2 : 4; };
    const draw = () => { g.innerHTML = b.map(v => `<div style="background:${v ? colors[v] || '#3c3a32' : ''};color:${v > 4 ? '#fff' : '#776e65'}">${v || ''}</div>`).join(''); body.querySelector('.s').textContent = `Score: ${score} · Best: ${best('2048', score)}`; };
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
    body.innerHTML = '<div class="pad"><div class="row" style="justify-content:center"><b>Minesweeper</b><span class="s"></span><button class="r">New</button></div><br><div class="mines"></div><p style="text-align:center;color:var(--muted)">Right-click to flag</p></div>';
    const W = 12, H = 12, M = 20, m = body.querySelector('.mines'); m.style.gridTemplateColumns = `repeat(${W},26px)`;
    let cells, over, opened;
    const nb = i => { const x = i % W, y = i / W | 0, r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < W && ny < H) r.push(ny * W + nx); } return r; };
    const status = t => body.querySelector('.s').textContent = t;
    const reset = () => {
      over = false; opened = 0; cells = Array.from({ length: W * H }, () => ({ mine: false, open: false, flag: false }));
      for (let k = 0; k < M;) { const i = Math.random() * W * H | 0; if (!cells[i].mine) { cells[i].mine = true; k++; } }
      cells.forEach((c, i) => c.n = nb(i).filter(j => cells[j].mine).length);
      m.innerHTML = ''; cells.forEach((c, i) => { const d = document.createElement('div'); c.el = d; d.onclick = () => open(i); d.oncontextmenu = e => { e.preventDefault(); if (!c.open && !over) { c.flag = !c.flag; d.textContent = c.flag ? '🚩' : ''; } }; m.appendChild(d); });
      status(`💣 ${M}`);
    };
    const open = i => {
      const c = cells[i]; if (over || c.open || c.flag) return;
      if (c.mine) { over = true; cells.forEach(k => k.mine && (k.el.textContent = '💣')); c.el.style.background = '#a33'; return status('💥 Boom!'); }
      c.open = true; opened++; c.el.className = 'o'; c.el.textContent = c.n || '';
      c.el.style.color = ['', '#59f', '#5c5', '#f55', '#a5f', '#f90', '#0cc', '#fff', '#999'][c.n];
      if (!c.n) nb(i).forEach(open);
      if (opened === W * H - M) { over = true; status('🎉 You win!'); }
    };
    body.querySelector('.r').onclick = reset; reset();
  },

  tictactoe(body, win) {
    body.innerHTML = '<div class="pad" style="text-align:center"><b>Tic-Tac-Toe</b> vs CPU<p class="s"></p><div class="ttt"></div><br><button class="r">New game</button></div>';
    const t = body.querySelector('.ttt'); let b, over;
    const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const win_ = (bb, p) => L.some(l => l.every(i => bb[i] === p));
    const mm = (bb, p) => { // minimax
      if (win_(bb, 'O')) return { s: 1 }; if (win_(bb, 'X')) return { s: -1 }; if (bb.every(v => v)) return { s: 0 };
      let bestM = { s: p === 'O' ? -2 : 2 };
      bb.forEach((v, i) => { if (v) return; bb[i] = p; const r = mm(bb, p === 'O' ? 'X' : 'O'); bb[i] = ''; if (p === 'O' ? r.s > bestM.s : r.s < bestM.s) bestM = { s: r.s, i }; });
      return bestM;
    };
    const draw = () => { t.innerHTML = ''; b.forEach((v, i) => { const btn = document.createElement('button'); btn.textContent = v; btn.onclick = () => play(i); t.appendChild(btn); }); };
    const check = () => { const s = body.querySelector('.s'); if (win_(b, 'X')) s.textContent = 'You win!'; else if (win_(b, 'O')) s.textContent = 'CPU wins!'; else if (b.every(v => v)) s.textContent = 'Draw.'; else return false; over = true; return true; };
    const play = i => { if (over || b[i]) return; b[i] = 'X'; if (!check()) { b[mm(b, 'O').i] = 'O'; check(); } draw(); };
    const reset = () => { b = Array(9).fill(''); over = false; body.querySelector('.s').textContent = 'You are X'; draw(); };
    body.querySelector('.r').onclick = reset; reset();
  },

  breakout(body, win) {
    body.innerHTML = '<div class="pad"><div class="row"><b>Breakout</b><span class="s"></span><button class="r">Restart</button></div><canvas width="480" height="360"></canvas><p style="text-align:center;color:var(--muted)">Mouse or ←/→ · Space to launch</p></div>';
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
      x.fillStyle = '#0d1117'; x.fillRect(0, 0, 480, 360);
      bricks.forEach(b => { if (b.a) { x.fillStyle = b.c; x.fillRect(b.x, b.y, 44, 14); } });
      x.fillStyle = '#4f8cff'; x.fillRect(px, 340, 80, 10);
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ball.x, ball.y, 6, 0, 7); x.fill();
      x.textAlign = 'center'; x.font = '26px sans-serif';
      if (lives <= 0) x.fillText('Game Over', 240, 220); else if (!bricks.some(b => b.a)) x.fillText('You win!', 240, 220);
      body.querySelector('.s').textContent = `Score: ${score} · Lives: ${lives} · Best: ${best('breakout', score)}`;
    }, 16);
  },

  flappy(body, win) {
    body.innerHTML = '<div class="pad"><div class="row"><b>Flappy Square</b><span class="s"></span></div><canvas width="360" height="480"></canvas><p style="text-align:center;color:var(--muted)">Space / click to flap</p></div>';
    const c = body.querySelector('canvas'), x = c.getContext('2d');
    let y, v, pipes, score, dead, t;
    const reset = () => { y = 240; v = 0; pipes = []; score = 0; dead = false; t = 0; };
    const flap = () => { if (dead) reset(); else v = -7; };
    reset(); c.onclick = flap; onKeys(win, e => { if (e.key === ' ' || e.key === 'ArrowUp') { flap(); e.preventDefault(); } });
    loop(win, () => {
      if (!dead) {
        v += .4; y += v; t++;
        if (t % 90 === 0) pipes.push({ x: 360, g: 80 + Math.random() * 260 });
        pipes.forEach(p => { p.x -= 2.5; if (!p.s && p.x < 60) { p.s = 1; score++; } if (p.x < 80 && p.x > 20 && (y < p.g - 70 || y + 24 > p.g + 70)) dead = true; });
        pipes = pipes.filter(p => p.x > -60); if (y > 456 || y < 0) dead = true;
      }
      x.fillStyle = '#4ec0ca'; x.fillRect(0, 0, 360, 480);
      x.fillStyle = '#5c3'; pipes.forEach(p => { x.fillRect(p.x, 0, 60, p.g - 70); x.fillRect(p.x, p.g + 70, 60, 480); });
      x.fillStyle = '#fd3'; x.fillRect(56, y, 24, 24);
      x.fillStyle = '#fff'; x.font = 'bold 32px sans-serif'; x.textAlign = 'center'; x.fillText(score, 180, 50);
      if (dead) { x.font = '22px sans-serif'; x.fillText('Click to retry', 180, 240); }
      body.querySelector('.s').textContent = `Best: ${best('flappy', score)}`;
    }, 16);
  },
};

// Web games embedded by URL (open-source projects hosted on GitHub Pages).
const WEB_GAMES = [
  { name: 'Hextris', icon: '⬡', url: 'https://hextris.github.io/hextris/' },
  { name: 'Tetris', icon: '🧱', url: 'https://chvin.github.io/react-tetris/?lan=en' },
  { name: 'Clumsy Bird', icon: '🐦', url: 'https://ellisonleao.github.io/clumsy-bird/' },
  { name: 'Pac-Man', icon: '🟡', url: 'https://masonicgit.github.io/pacman/' },
];
