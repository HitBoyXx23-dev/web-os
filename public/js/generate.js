const GEN_SIZES = { square: [768, 768], wide: [768, 432], tall: [432, 768] };
const GEN_STYLES = [['photo', 'Photo'], ['illustration', 'Illustration'], ['poster', 'Poster'], ['pixel', 'Pixel'], ['uncensored', 'Uncensored'], ['uncensored-anime', 'Uncensored anime']];
const GEN_IMAGE_IDEAS = ['A red fox in fresh snow at dusk', 'A tiny bookstore on a rainy street', 'An astronaut planting a garden on the moon', 'A glass lighthouse above a calm sea'];
const GEN_VIDEO_IDEAS = ['A paper boat drifting down a river', 'A fox running through a snowy forest', 'Clouds racing over a mountain lake', 'A lantern floating up into the night'];
const genSrc = (prompt, opts) => {
  const q = new URLSearchParams({ prompt, style: opts.style, width: opts.width, height: opts.height, seed: opts.seed });
  return BASE + 'api/generate?' + q;
};
async function fetchPicture(src, signal) {
  const res = await fetch(src, { signal });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/')) {
    let message = 'Image generation did not answer. Try again.';
    try { const data = await res.json(); if (data && data.error) message = String(data.error); } catch (e) {}
    throw new Error(message);
  }
  const blob = await res.blob();
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  try { return { blob, frame: await createImageBitmap(blob) }; }
  catch (e) { throw new Error('A frame failed. Try again.'); }
}

function studioShell(body, kind) {
  const ideas = kind === 'video' ? GEN_VIDEO_IDEAS : GEN_IMAGE_IDEAS;
  body.innerHTML = `<div class="studio"><form class="studio-side">
      <div><b>${kind === 'video' ? 'Video' : 'Image'}</b><p class="small muted">Made on this site. Nothing to configure.</p></div>
      <label class="field">${kind === 'video' ? 'Describe the clip' : 'Describe the picture'}<textarea name="prompt" rows="4" maxlength="400" placeholder="${kind === 'video' ? 'A paper boat on a calm river' : 'A red fox in the snow at dusk'}"></textarea></label>
      <div><div class="small muted">Look</div><div class="seg">${GEN_STYLES.map(([id, name], i) => `<button type="button" data-style="${id}" class="${i ? '' : 'on'}">${name}</button>`).join('')}</div></div>
      <div><div class="small muted">Shape</div><div class="seg">${[['square', 'Square'], ['wide', 'Wide'], ['tall', 'Tall']].map(([id, name], i) => `<button type="button" data-size="${id}" class="${i ? '' : 'on'}">${name}</button>`).join('')}</div></div>
      <button class="primary studio-go" type="submit">${kind === 'video' ? 'Generate clip' : 'Generate'}</button>
      <p class="studio-status small muted"></p>
      <div class="studio-ideas">${ideas.map(t => `<button type="button" data-idea="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    </form>
    <div class="studio-main"><div class="studio-empty">${tile(kind === 'video' ? { mono: 'Vid', bg: '#e11d48' } : { mono: 'Img', bg: '#0d9488' }, 64)}<p class="muted">Your ${kind === 'video' ? 'clip' : 'picture'} shows up here.</p></div>
      ${kind === 'video' ? '<video class="studio-view" controls hidden></video>' : '<img class="studio-view" alt="" hidden>'}
      <button type="button" class="ghost studio-save" hidden>${glyph('download', 14)}Save to ${kind === 'video' ? 'Videos' : 'Pictures'}</button>
    </div></div>`;
  const form = body.querySelector('form');
  const pick = (attr, value) => { body.querySelectorAll(`[${attr}]`).forEach(b => b.classList.toggle('on', b.dataset[attr.slice(5)] === value)); };
  body.querySelectorAll('[data-style]').forEach(b => b.onclick = () => pick('data-style', b.dataset.style));
  body.querySelectorAll('[data-size]').forEach(b => b.onclick = () => pick('data-size', b.dataset.size));
  body.querySelectorAll('[data-idea]').forEach(b => b.onclick = () => { form.prompt.value = b.dataset.idea; form.prompt.focus(); });
  return {
    form,
    status: t => { body.querySelector('.studio-status').textContent = t; },
    choice: name => body.querySelector(`[data-${name}].on`).dataset[name],
    show() {
      body.querySelector('.studio-empty').hidden = true;
      const view = body.querySelector('.studio-view');
      view.hidden = false;
      body.querySelector('.studio-save').hidden = false;
      return view;
    },
  };
}

APPS.image = ALL_APPS.image = { name: 'Image', icon: { mono: 'Img', bg: '#0d9488' }, cat: 'Apps', w: 920, h: 640, run(body, win) {
  const ui = studioShell(body, 'image');
  let blob = null, busy = false, ctl = null, viewUrl = '', name = 'picture';
  const go = async prompt => {
    prompt = prompt.trim();
    if (!prompt || busy) return;
    busy = true; ctl = new AbortController(); ui.status('Generating…');
    const size = GEN_SIZES[ui.choice('size')];
    const src = genSrc(prompt, { style: ui.choice('style'), width: size[0], height: size[1], seed: Math.floor(Math.random() * 1e9) });
    try {
      const picture = await fetchPicture(src, ctl.signal);
      picture.frame.close();
      blob = picture.blob;
      name = prompt.slice(0, 40);
      if (viewUrl) URL.revokeObjectURL(viewUrl);
      viewUrl = URL.createObjectURL(blob);
      ui.show().src = viewUrl;
      ui.status('');
    } catch (e) {
      if (e.name !== 'AbortError') ui.status(e.message || 'Image generation failed.');
    }
    busy = false; ctl = null;
  };
  ui.form.onsubmit = e => { e.preventDefault(); go(ui.form.prompt.value); };
  body.querySelector('.studio-save').onclick = () => {
    if (!blob) return;
    const base = (name.replace(/[^\w .-]+/g, '').trim().slice(0, 40) || 'picture') + '.jpg';
    const path = FS.freeName('/Pictures', base);
    blob.arrayBuffer().then(b => { FS.writeBytes(path, new Uint8Array(b), blob.type || 'image/jpeg'); OS.toast('Saved ' + path); });
  };
  win.cleanup.push(() => { ctl?.abort(); if (viewUrl) URL.revokeObjectURL(viewUrl); });
} };

APPS.video = ALL_APPS.video = { name: 'Video', icon: { mono: 'Vid', bg: '#e11d48' }, cat: 'Apps', w: 960, h: 660, run(body, win) {
  const ui = studioShell(body, 'video');
  let blob = null, busy = false, ctl = null, url = '', name = 'clip';
  const go = async prompt => {
    prompt = prompt.trim();
    if (!prompt || busy) return;
    if (typeof MediaRecorder === 'undefined') return ui.status('This browser cannot record a clip.');
    busy = true; ctl = new AbortController(); name = prompt.slice(0, 40);
    const size = GEN_SIZES[ui.choice('size')];
    const src = genSrc(prompt, { style: ui.choice('style'), width: size[0], height: size[1], seed: Math.floor(Math.random() * 1e9) });
    try {
      ui.status('Generating…');
      const picture = await fetchPicture(src, ctl.signal);
      ui.status('Recording the clip…');
      try { blob = await recordClip([picture.frame], ctl.signal); }
      finally { picture.frame.close(); }
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      const view = ui.show();
      view.src = url;
      view.play().catch(() => {});
      ui.status('');
    } catch (e) {
      if (e.name !== 'AbortError') ui.status(e.message || 'Video generation failed.');
    }
    busy = false; ctl = null;
  };
  ui.form.onsubmit = e => { e.preventDefault(); go(ui.form.prompt.value); };
  body.querySelector('.studio-save').onclick = () => {
    if (!blob) return;
    const base = (name.replace(/[^\w .-]+/g, '').trim().slice(0, 40) || 'clip') + '.webm';
    const path = FS.freeName('/Videos', base);
    blob.arrayBuffer().then(b => { FS.writeBytes(path, new Uint8Array(b), blob.type || 'video/webm'); OS.toast('Saved ' + path); });
  };
  win.cleanup.push(() => { ctl?.abort(); if (url) URL.revokeObjectURL(url); });
} };

function recordClip(frames, signal) {
  const canvas = document.createElement('canvas');
  canvas.width = frames[0].width;
  canvas.height = frames[0].height;
  const cx = canvas.getContext('2d');
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: mime });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise(resolve => { rec.onstop = resolve; });
  rec.start();
  const hold = frames.length === 1 ? 3200 : 900, fade = 280, total = frames.length * hold;
  const t0 = performance.now();
  let ended = false;
  return new Promise((resolve, reject) => {
    const done = err => {
      if (ended) return;
      ended = true;
      try { if (rec.state !== 'inactive') rec.stop(); } catch (e) {}
      stopped.then(() => err ? reject(err) : resolve(new Blob(chunks, { type: 'video/webm' })));
    };
    if (signal?.aborted) return done(new DOMException('Aborted', 'AbortError'));
    signal?.addEventListener('abort', () => done(new DOMException('Aborted', 'AbortError')), { once: true });
    const tick = now => {
      if (ended) return;
      const t = now - t0;
      if (t >= total) return done(null);
      try {
        const i = Math.min(frames.length - 1, Math.floor(t / hold));
        const local = t - i * hold;
        cx.fillStyle = '#000';
        cx.fillRect(0, 0, canvas.width, canvas.height);
        const paint = (img, alpha, zoom) => {
          cx.globalAlpha = alpha;
          const z = 1 + zoom;
          const dw = canvas.width * z, dh = canvas.height * z;
          cx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
        };
        paint(frames[i], 1, (local / hold) * 0.045);
        if (i + 1 < frames.length && local > hold - fade) paint(frames[i + 1], (local - (hold - fade)) / fade, 0);
        cx.globalAlpha = 1;
      } catch (e) {
        return done(e);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
