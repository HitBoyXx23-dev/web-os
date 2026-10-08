// Window manager: create, drag, resize, focus, minimize, maximize, close.
const WM = {
  z: 10, wins: new Map(), seq: 0,
  open({ title, icon = '🗔', w = 640, h = 440, content, onClose, appId }) {
    const id = 'w' + (++this.seq);
    const el = document.createElement('div');
    el.className = 'win';
    const vw = innerWidth, vh = innerHeight - 48;
    w = Math.min(w, vw - 10); h = Math.min(h, vh - 10);
    el.style.cssText = `width:${w}px;height:${h}px;left:${Math.max(0, (vw - w) / 2 + (this.seq % 6) * 24 - 60)}px;top:${Math.max(0, (vh - h) / 2 + (this.seq % 6) * 24 - 60)}px`;
    el.innerHTML = `<div class="titlebar"><span>${icon}</span><span class="t"></span>
      <button class="mn" title="Minimize">—</button><button class="mx" title="Maximize">☐</button><button class="x" title="Close">✕</button></div>
      <div class="body"></div><div class="shield"></div><div class="resize"></div>`;
    el.querySelector('.t').textContent = title;
    const body = el.querySelector('.body');
    document.getElementById('windows').appendChild(el);
    const win = { id, el, body, title, icon, onClose, appId, cleanup: [] };
    this.wins.set(id, win);

    const task = document.createElement('button');
    task.className = 'task'; task.textContent = icon + ' ' + title;
    task.onclick = () => (win.el.classList.contains('min') || !el.classList.contains('focused')) ? (el.classList.remove('min'), this.focus(id)) : this.minimize(id);
    document.getElementById('task-items').appendChild(task);
    win.task = task;

    el.addEventListener('pointerdown', () => this.focus(id), true);
    el.querySelector('.x').onclick = () => this.close(id);
    el.querySelector('.mn').onclick = e => { e.stopPropagation(); this.minimize(id); };
    el.querySelector('.mx').onclick = () => el.classList.toggle('max');
    el.querySelector('.titlebar').ondblclick = () => el.classList.toggle('max');
    this.drag(el, el.querySelector('.titlebar'), false);
    this.drag(el, el.querySelector('.resize'), true);

    if (typeof content === 'function') content(body, win); else if (content) body.innerHTML = content;
    this.focus(id);
    return win;
  },
  drag(el, handle, resize) {
    handle.addEventListener('pointerdown', e => {
      if (e.target.tagName === 'BUTTON' || (!resize && el.classList.contains('max'))) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, r = el.getBoundingClientRect();
      el.classList.add('dragging');
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (resize) { el.style.width = Math.max(260, r.width + dx) + 'px'; el.style.height = Math.max(160, r.height + dy) + 'px'; }
        else { el.style.left = r.left + dx + 'px'; el.style.top = Math.max(0, r.top + dy) + 'px'; }
      };
      const up = () => { el.classList.remove('dragging'); removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    });
  },
  focus(id) {
    for (const w of this.wins.values()) { w.el.classList.remove('focused'); w.task.classList.remove('active'); }
    const w = this.wins.get(id); if (!w) return;
    w.el.style.zIndex = ++this.z; w.el.classList.add('focused'); w.task.classList.add('active');
  },
  minimize(id) { const w = this.wins.get(id); w.el.classList.add('min'); w.el.classList.remove('focused'); w.task.classList.remove('active'); },
  close(id) {
    const w = this.wins.get(id); if (!w) return;
    w.cleanup.forEach(f => f()); if (w.onClose) w.onClose();
    w.el.remove(); w.task.remove(); this.wins.delete(id);
  },
  closeAll() { for (const id of [...this.wins.keys()]) this.close(id); },
};
