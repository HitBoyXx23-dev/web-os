// Window manager: create, drag, snap, resize, focus, minimize, maximize, close.
const TASKBAR_H = 52;
const WM = {
  z: 10, wins: new Map(), seq: 0,
  open({ title, icon = 'web', w = 640, h = 440, content, onClose, appId }) {
    const id = 'w' + (++this.seq);
    const el = document.createElement('div');
    el.className = 'win';
    const vw = innerWidth, vh = innerHeight - TASKBAR_H;
    w = Math.min(w, vw - 16); h = Math.min(h, vh - 16);
    const off = (this.wins.size % 6) * 28;
    el.style.cssText = `width:${w}px;height:${h}px;left:${Math.max(8, (vw - w) / 2 - 70 + off)}px;top:${Math.max(8, (vh - h) / 2 - 50 + off)}px`;
    el.innerHTML = `<div class="titlebar">${tile(icon, 18)}<span class="t"></span>
      <div class="wctl"><button class="mn" title="Minimize">${glyph('min', 14)}</button><button class="mx" title="Maximize">${glyph('max', 12)}</button><button class="x" title="Close">${glyph('close', 14)}</button></div></div>
      <div class="body"></div><div class="shield"></div><div class="resize"></div>`;
    el.querySelector('.t').textContent = title;
    const body = el.querySelector('.body');
    document.getElementById('windows').appendChild(el);
    const win = { id, el, body, title, icon, onClose, appId, cleanup: [] };
    this.wins.set(id, win);

    const task = document.createElement('button');
    task.className = 'tb-btn task'; task.title = title;
    task.innerHTML = `${tile(icon, 22)}<span class="tt"></span>`; task.querySelector('.tt').textContent = title;
    task.onclick = () => (el.classList.contains('min') || !el.classList.contains('focused')) ? this.focus(id) : this.minimize(id);
    document.getElementById('task-items').appendChild(task);
    win.task = task;

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
  setTitle(win, title) { win.el.querySelector('.t').textContent = title; win.task.querySelector('.tt').textContent = title; win.task.title = title; },
  toggleMax(win, force) {
    const on = win.el.classList.toggle('max', force);
    win.el.querySelector('.mx').innerHTML = on ? glyph('restore', 13) : glyph('max', 12);
  },
  // Snap zones: top edge = maximize, left/right edge = half screen.
  zone(x, y) {
    if (y <= 2) return 'max';
    if (x <= 2) return 'left';
    if (x >= innerWidth - 3) return 'right';
    return null;
  },
  zoneRect(z) {
    const h = innerHeight - TASKBAR_H, hw = innerWidth / 2;
    return { max: [0, 0, innerWidth, h], left: [0, 0, hw, h], right: [hw, 0, hw, h] }[z];
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
          r = { left: ev.clientX - rw * ((sx - r.left) / r.width), top: 0, width: rw, height: rh }; sx = ev.clientX; sy = ev.clientY;
        }
        moved = true;
        if (resize) { el.style.width = Math.max(280, r.width + dx) + 'px'; el.style.height = Math.max(180, r.height + dy) + 'px'; return; }
        el.style.left = r.left + dx + 'px'; el.style.top = Math.min(Math.max(0, r.top + dy), innerHeight - TASKBAR_H - 38) + 'px';
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
    for (const w of this.wins.values()) { w.el.classList.remove('focused'); w.task.classList.remove('active'); }
    const w = this.wins.get(id); if (!w) return;
    w.el.classList.remove('min');
    w.el.style.zIndex = ++this.z; w.el.classList.add('focused'); w.task.classList.add('active');
  },
  focused() { return [...this.wins.values()].find(w => w.el.classList.contains('focused')); },
  // Focus the next window in z-order (Alt+` / Alt+Shift+`).
  cycle() {
    const list = [...this.wins.values()].sort((a, b) => b.el.style.zIndex - a.el.style.zIndex);
    if (list.length > 1) this.focus(list[list.length - 1].id);
  },
  minimize(id) { const w = this.wins.get(id); w.el.classList.add('min'); w.el.classList.remove('focused'); w.task.classList.remove('active'); },
  close(id) {
    const w = this.wins.get(id); if (!w) return;
    this.wins.delete(id);
    w.cleanup.forEach(f => f()); if (w.onClose) w.onClose();
    w.task.remove(); w.el.classList.add('closing');
    setTimeout(() => w.el.remove(), 120);
    const next = [...this.wins.values()].filter(x => !x.el.classList.contains('min')).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0];
    if (next) this.focus(next.id);
  },
  closeAll() { for (const id of [...this.wins.keys()]) this.close(id); },
};
