// Window manager: create, drag, snap, resize, focus, minimize, maximize, close.
// The usable area sits between the top bar and the dock.
const TOPBAR_H = 32, DOCK_H = 76;
const area = () => ({ x: 0, y: TOPBAR_H, w: innerWidth, h: innerHeight - TOPBAR_H - DOCK_H });

const WM = {
  z: 10, wins: new Map(), seq: 0,
  onChange: () => {}, // set by the shell to refresh the dock and top bar
  open({ title, icon = 'web', w = 640, h = 440, content, onClose, appId }) {
    const id = 'w' + (++this.seq);
    const el = document.createElement('div');
    el.className = 'win';
    const a = area();
    w = Math.min(w, a.w - 16); h = Math.min(h, a.h - 16);
    const off = (this.wins.size % 6) * 28;
    el.style.cssText = `width:${w}px;height:${h}px;left:${Math.max(8, (a.w - w) / 2 - 70 + off)}px;top:${Math.max(a.y + 8, a.y + (a.h - h) / 2 - 40 + off)}px`;
    el.innerHTML = `<div class="titlebar"><span class="tb-side"></span><span class="t"></span>
      <div class="wctl"><button class="mn" title="Minimize">${glyph('min', 14)}</button><button class="mx" title="Maximize">${glyph('max', 11)}</button><button class="x" title="Close">${glyph('close', 13)}</button></div></div>
      <div class="body"></div><div class="shield"></div><div class="resize"></div>`;
    el.querySelector('.t').textContent = title;
    const body = el.querySelector('.body');
    document.getElementById('windows').appendChild(el);
    const win = { id, el, body, title, icon, onClose, appId, cleanup: [] };
    this.wins.set(id, win);

    el.addEventListener('pointerdown', () => this.focus(id), true);
    el.querySelector('.x').onclick = () => this.close(id);
    el.querySelector('.mn').onclick = e => { e.stopPropagation(); this.minimize(id); };
    el.querySelector('.mx').onclick = () => this.toggleMax(win);
    el.querySelector('.titlebar').ondblclick = e => !e.target.closest('button') && this.toggleMax(win);
    this.drag(win, el.querySelector('.titlebar'), false);
    this.drag(win, el.querySelector('.resize'), true);

    if (typeof content === 'function') content(body, win); else if (content) body.innerHTML = content;
    this.focus(id);
    return win;
  },
  setTitle(win, title) { win.title = title; win.el.querySelector('.t').textContent = title; this.onChange(); },
  toggleMax(win, force) {
    const on = win.el.classList.toggle('max', force);
    win.el.querySelector('.mx').innerHTML = on ? glyph('restore', 12) : glyph('max', 11);
  },
  // Snap zones: top edge = maximize, left/right edge = half screen.
  zone(x, y) {
    if (y <= TOPBAR_H + 2) return 'max';
    if (x <= 2) return 'left';
    if (x >= innerWidth - 3) return 'right';
    return null;
  },
  zoneRect(z) {
    const a = area(), hw = a.w / 2;
    return { max: [0, a.y, a.w, a.h], left: [0, a.y, hw, a.h], right: [hw, a.y, hw, a.h] }[z];
  },
  drag(win, handle, resize) {
    const el = win.el;
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      let r = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, z = null, moved = false;
      const preview = document.getElementById('snap-preview') || Object.assign(document.createElement('div'), { id: 'snap-preview' });
      el.classList.add('dragging');
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
        if (!moved && !resize && (el.classList.contains('max') || win.restore)) {
          // dragging a maximized/snapped window restores it under the cursor
          const [rw, rh] = win.restore || [r.width, r.height];
          this.toggleMax(win, false); win.restore = null;
          el.style.width = rw + 'px'; el.style.height = rh + 'px';
          r = { left: ev.clientX - rw * ((sx - r.left) / r.width), top: TOPBAR_H, width: rw, height: rh }; sx = ev.clientX; sy = ev.clientY;
        }
        moved = true;
        if (resize) { el.style.width = Math.max(280, r.width + dx) + 'px'; el.style.height = Math.max(180, r.height + dy) + 'px'; return; }
        el.style.left = r.left + dx + 'px'; el.style.top = Math.min(Math.max(TOPBAR_H, r.top + dy), innerHeight - 60) + 'px';
        z = this.zone(ev.clientX, ev.clientY);
        if (z) { const [x, y, w, h] = this.zoneRect(z); Object.assign(preview.style, { left: x + 6 + 'px', top: y + 6 + 'px', width: w - 12 + 'px', height: h - 12 + 'px' }); if (!preview.isConnected) document.getElementById('desktop').appendChild(preview); }
        else preview.remove();
      };
      const up = () => {
        el.classList.remove('dragging'); preview.remove();
        removeEventListener('pointermove', move); removeEventListener('pointerup', up);
        if (!z) return;
        const b = el.getBoundingClientRect(); win.restore = [b.width, b.height];
        el.classList.add('snapping'); setTimeout(() => el.classList.remove('snapping'), 200);
        if (z === 'max') return this.toggleMax(win, true);
        const [x, y, w, h] = this.zoneRect(z); Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    });
  },
  focus(id) {
    for (const w of this.wins.values()) w.el.classList.remove('focused');
    const w = this.wins.get(id); if (!w) return;
    w.el.classList.remove('min');
    w.el.style.zIndex = ++this.z; w.el.classList.add('focused');
    this.onChange();
  },
  focused() { return [...this.wins.values()].find(w => w.el.classList.contains('focused')); },
  byZ() { return [...this.wins.values()].sort((a, b) => b.el.style.zIndex - a.el.style.zIndex); },
  // Focus the window at the back of the stack (Alt+`).
  cycle() { const list = this.byZ(); if (list.length > 1) this.focus(list[list.length - 1].id); },
  minimize(id) { const w = this.wins.get(id); w.el.classList.add('min'); w.el.classList.remove('focused'); this.onChange(); },
  close(id) {
    const w = this.wins.get(id); if (!w) return;
    this.wins.delete(id);
    w.cleanup.forEach(f => f()); if (w.onClose) w.onClose();
    w.el.classList.add('closing');
    setTimeout(() => w.el.remove(), 120);
    const next = this.byZ().find(x => !x.el.classList.contains('min'));
    if (next) this.focus(next.id); else this.onChange();
  },
  closeAll() { for (const id of [...this.wins.keys()]) this.close(id); },
};
