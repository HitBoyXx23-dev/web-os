// Classic DOS games (shareware releases) running in js-dos / DOSBox compiled to WebAssembly.
const DOS_GAMES = {
  doom: { name: 'Doom', icon: realIcon('chocolate-doom'), desc: 'Episode 1 · Knee-Deep in the Dead', w: 860, h: 620,
    keys: 'WASD move · ←/→ turn · Space or right-click fire · E open doors · Shift run · 1–7 weapons · Esc menu' },
  wolf3d: { name: 'Wolfenstein 3D', icon: { mono: 'W3', bg: '#991b1b' }, desc: 'Episode 1 · Escape from Wolfenstein', w: 860, h: 620,
    keys: 'Arrows move · Ctrl fire · Space open · Alt strafe · Esc menu' },
  keen1: { name: 'Commander Keen', icon: { mono: 'CK', bg: '#15803d' }, desc: 'Episode 1 · Marooned on Mars', w: 820, h: 600,
    keys: 'Arrows move · Ctrl jump · Alt pogo · Ctrl+Alt fire · Esc menu' },
};

// js-dos declares many globals, so each game runs in its own page (dos/player.html) inside the window.
function DosGame(body, win, id) {
  const g = DOS_GAMES[id];
  body.style.overflow = 'hidden';
  body.innerHTML = `<div class="dos"><iframe class="dos-host" src="dos/player.html?game=${id}" allow="autoplay; fullscreen; gamepad; keyboard-map" allowfullscreen></iframe><div class="dos-keys">${esc(g.keys)}</div></div>`;
  const f = body.querySelector('iframe');
  f.onload = () => f.focus();
  win.el.addEventListener('pointerdown', () => setTimeout(() => f.focus()), true);
}

const DOS_APPS = Object.fromEntries(Object.entries(DOS_GAMES).map(([id, g]) =>
  ['dos:' + id, { name: g.name, icon: g.icon, cat: 'Games', desc: g.desc, w: g.w, h: g.h, classic: true, run: (body, win) => DosGame(body, win, id) }]));
