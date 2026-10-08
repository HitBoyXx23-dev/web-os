// Moving apps around:
//  - drag desktop icons anywhere; they snap to a grid and stay where you put them (swap if the spot is taken)
//  - drag apps along the dock or taskbar to reorder them
//  - drag an app from the app grid, Start menu or dock onto the desktop to add a shortcut, or onto the dock to pin it
const CELL = { w: 92, h: 104, x: 8, y: 10 };
const BASE_DESKTOP = ['browser', 'games', 'vm', 'linux', 'store', 'files', 'terminal'];

OS.desktopApps = function () {
  const removed = this.cfg.desktopRemoved || [];
  return [...new Set([...BASE_DESKTOP, ...Object.keys(ALL_APPS).filter(id => id.startsWith('web:')), ...(this.cfg.desktopExtra || [])])]
    .filter(id => ALL_APPS[id] && !removed.includes(id));
};
OS.addToDesktop = function (id, cell) {
  this.set({ desktopExtra: [...new Set([...(this.cfg.desktopExtra || []), id])], desktopRemoved: (this.cfg.desktopRemoved || []).filter(x => x !== id),
    ...(cell ? { iconPos: { ...this.cfg.iconPos, [id]: cell } } : {}) });
  this.renderIcons();
};
OS.removeFromDesktop = function (id) {
  this.set({ desktopRemoved: [...new Set([...(this.cfg.desktopRemoved || []), id])], desktopExtra: (this.cfg.desktopExtra || []).filter(x => x !== id) });
  this.renderIcons();
};

const Arrange = {
  grid() { const el = $('#icons'); return { cols: Math.max(1, Math.floor((el.clientWidth - CELL.x) / CELL.w)), rows: Math.max(1, Math.floor((el.clientHeight - CELL.y) / CELL.h)) }; },
  // Cell for every desktop icon: its saved spot if it fits on screen, else the first free cell (column by column).
  layout(ids) {
    const saved = OS.cfg.iconPos || {}, { cols, rows } = this.grid(), taken = new Set(), pos = {};
    for (const id of ids) { const p = saved[id]; if (p && p[0] < cols && p[1] < rows && !taken.has(p + '')) { pos[id] = p; taken.add(p + ''); } }
    let k = 0;
    for (const id of ids) if (!pos[id]) { let p; do { p = [Math.floor(k / rows), k % rows]; k++; } while (taken.has(p + '')); pos[id] = p; taken.add(p + ''); }
    return pos;
  },
  cellAt(x, y) {
    const r = $('#icons').getBoundingClientRect(), { cols, rows } = this.grid();
    return [Math.max(0, Math.min(cols - 1, Math.floor((x - r.left - CELL.x) / CELL.w))), Math.max(0, Math.min(rows - 1, Math.floor((y - r.top - CELL.y) / CELL.h)))];
  },
  // The visible dock or taskbar, and its pinned items in order.
  bar() { const d = $('#dock'), t = $('#taskbar'); return !d.classList.contains('hidden') ? d : !t.classList.contains('hidden') ? t : null; },
  pinnedEls(bar, skip) { const pinned = OS.dock(); return [...bar.querySelectorAll('[data-dock]')].filter(el => pinned.includes(el.dataset.dock) && el !== skip); },
  vertical(bar) { return bar.id === 'dock' && bar.dataset.kind === 'dock-left'; },
};

OS.renderIcons = () => {
  const ids = OS.desktopApps(), pos = Arrange.layout(ids);
  $('#icons').innerHTML = ids.map(id => `<div class="icon" data-id="${id}" style="left:${CELL.x + pos[id][0] * CELL.w}px;top:${CELL.y + pos[id][1] * CELL.h}px">${tile(ALL_APPS[id].icon, 44)}<span>${esc(ALL_APPS[id].name)}</span></div>`).join('');
};
OS.renderIcons();
{ let t; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => OS.renderIcons(), 120); }).observe($('#icons')); }

document.addEventListener('pointerdown', e => {
  if (e.button !== 0 || $('#desktop').classList.contains('hidden')) return;
  const t = e.target; let src = null;
  const icon = t.closest('#icons .icon'), dk = t.closest('#dock [data-dock], #taskbar [data-dock]'), menu = t.closest('#launcher .app-cell[data-id], #startmenu [data-app]:not(.tk-btn)');
  if (icon) src = { kind: 'desktop', id: icon.dataset.id, el: icon };
  else if (dk) src = { kind: 'dock', id: dk.dataset.dock, el: dk };
  else if (menu) src = { kind: 'menu', id: menu.dataset.id || menu.dataset.app, el: menu };
  if (!src || !ALL_APPS[src.id]) return;
  const x0 = e.clientX, y0 = e.clientY; let d = null;
  const move = ev => {
    if (!d) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return; d = begin(src, ev); }
    update(d, ev);
  };
  const up = ev => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    if (!d) return;
    finish(d, ev, ev.type === 'pointercancel');
    // swallow the click that follows a drag
    const eat = c => { c.stopPropagation(); c.preventDefault(); }; addEventListener('click', eat, true); setTimeout(() => removeEventListener('click', eat, true), 0);
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}, true);

function begin(src, ev) {
  const r = src.el.getBoundingClientRect(), g = document.createElement('div');
  if (src.kind === 'desktop') { g.className = 'icon drag-ghost'; g.innerHTML = src.el.innerHTML; }
  else { g.className = 'drag-ghost drag-tile'; g.innerHTML = tile(ALL_APPS[src.id].icon, 48); }
  document.body.appendChild(g); document.body.classList.add('dragging-app');
  let ph = null;
  if (src.kind === 'dock') { ph = document.createElement('span'); ph.className = 'bar-ph'; src.el.before(ph); } // keep the bar's size while the app is lifted
  if (src.kind !== 'menu') src.el.classList.add('drag-src');
  if (src.kind === 'menu') OS.closeFlyouts();
  return { src, g, ox: src.kind === 'desktop' ? ev.clientX - r.left : 28, oy: src.kind === 'desktop' ? ev.clientY - r.top : 28, ph, cell: null, bar: null, at: 0 };
}

function update(d, ev) {
  d.g.style.left = (ev.clientX - d.ox) + 'px'; d.g.style.top = (ev.clientY - d.oy) + 'px';
  const bar = Arrange.bar(), br = bar?.getBoundingClientRect();
  const overBar = br && ev.clientX > br.left - 24 && ev.clientX < br.right + 24 && ev.clientY > br.top - 24 && ev.clientY < br.bottom + 24;
  d.g.style.pointerEvents = 'none';
  const under = document.elementFromPoint(ev.clientX, ev.clientY);
  const overDesktop = !overBar && under && (under === $('#desktop') || under.closest('#icons'));
  // dock / taskbar placeholder
  if (overBar) {
    const els = Arrange.pinnedEls(bar, d.src.el), v = Arrange.vertical(bar);
    d.at = els.filter(el => { const r = el.getBoundingClientRect(); return v ? ev.clientY > r.top + r.height / 2 : ev.clientX > r.left + r.width / 2; }).length;
    if (!d.ph) { d.ph = document.createElement('span'); d.ph.className = 'bar-ph'; }
    const ref = els[d.at];
    if (ref) ref.before(d.ph);
    else if (els.length) els[els.length - 1].after(d.ph);
    else (bar.querySelector('.tk-apps') || bar).prepend(d.ph);
    d.bar = bar;
  } else { d.ph?.remove(); d.bar = null; }
  // desktop cell outline
  let out = $('#icons .icon-ph');
  if (overDesktop) {
    const cx = d.src.kind === 'desktop' ? ev.clientX - d.ox + 42 : ev.clientX, cy = d.src.kind === 'desktop' ? ev.clientY - d.oy + 30 : ev.clientY;
    d.cell = Arrange.cellAt(cx, cy);
    if (!out) { out = document.createElement('div'); out.className = 'icon-ph'; $('#icons').appendChild(out); }
    out.style.left = CELL.x + d.cell[0] * CELL.w + 'px'; out.style.top = CELL.y + d.cell[1] * CELL.h + 'px';
  } else { out?.remove(); d.cell = null; }
}

function finish(d, ev, cancelled) {
  d.g.remove(); d.ph?.remove(); $('#icons .icon-ph')?.remove();
  document.body.classList.remove('dragging-app'); d.src.el.classList.remove('drag-src');
  if (cancelled) return;
  const id = d.src.id;
  if (d.bar) { // pin / reorder
    const pinned = OS.dock().filter(x => x !== id); pinned.splice(d.at, 0, id);
    OS.set({ dock: pinned }); OS.renderDock(); Shell.renderTaskbar();
    return;
  }
  if (!d.cell) return;
  const ids = OS.desktopApps(), pos = Arrange.layout(ids), key = d.cell + '';
  const other = ids.find(x => x !== id && pos[x] + '' === key);
  if (d.src.kind === 'desktop') {
    if (other) pos[other] = pos[id]; // swap
    pos[id] = d.cell;
    OS.set({ iconPos: { ...OS.cfg.iconPos, ...pos } }); OS.renderIcons();
  } else {
    let cell = d.cell;
    if (other) { // nearest free cell
      const { cols, rows } = Arrange.grid(), taken = new Set(Object.values(pos).map(p => p + '')); let best = null, bd = 1e9;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const dist = Math.hypot(c - cell[0], r - cell[1]); if (!taken.has(c + ',' + r) && dist < bd) { bd = dist; best = [c, r]; } }
      if (best) cell = best;
    }
    OS.set({ iconPos: { ...OS.cfg.iconPos, ...pos } }); OS.addToDesktop(id, cell);
  }
}
