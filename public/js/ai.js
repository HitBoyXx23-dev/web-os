// Assistant: an AI chat app. Runs a small open model on this device with WebLLM (WebGPU; free, private,
// works offline once downloaded), or Claude with your own Anthropic API key (official SDK, straight from
// the browser - the key is stored only in this browser).
const WEBLLM = 'https://esm.run/@mlc-ai/web-llm@0.2.85';
const ANTHROPIC_SDK = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm';
const LOCAL_MODELS = [
  ['Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Llama 3.2 1B', 'about 0.9 GB · fastest'],
  ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 'Qwen 2.5 1.5B', 'about 1.1 GB'],
  ['Llama-3.2-3B-Instruct-q4f16_1-MLC', 'Llama 3.2 3B', 'about 2.3 GB · smarter'],
  ['Phi-3.5-mini-instruct-q4f16_1-MLC', 'Phi 3.5 mini', 'about 2.2 GB'],
];
const MEDIA_MODELS = [
  ['photo', 'Photo', 'Natural light, sharp detail'],
  ['illustration', 'Illustration', 'Clean shapes, soft color'],
  ['poster', 'Poster', 'Bold graphic composition'],
  ['pixel', 'Pixel', 'Crisp pixel art'],
  ['uncensored', 'Uncensored', 'Photo, safety filter off'],
  ['uncensored-anime', 'Uncensored anime', 'Anime, safety filter off'],
];
const AI_PROVIDERS = [['local', 'On this device'], ['claude', 'Claude'], ['image', 'Image'], ['video', 'Video']];
const AI_SYSTEM = 'You are the assistant built into HitBoy Web-OS, a desktop that runs in a web browser. Be helpful, friendly and concise. Use Markdown for code.';

// Minimal, safe Markdown: escape everything, then add code blocks, inline code, bold and line breaks.
const aiMd = t => esc(t).replace(/```(\w*)\n?([\s\S]*?)(```|$)/g, (m, l, c) => `<pre><code>${c}</code></pre>`)
  .replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>').replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (m, c) => `<pre><code>${c.replace(/<br>/g, '\n')}</code></pre>`);

APPS.assistant = ALL_APPS.assistant = { name: 'Assistant', icon: { mono: 'AI', bg: '#7c3aed' }, cat: 'Apps', w: 820, h: 620, run(body, win) {
  const cfg = () => ({ provider: localStorage.getItem('novaos.aiProvider') || 'local', model: localStorage.getItem('novaos.aiModel') || LOCAL_MODELS[0][0], key: localStorage.getItem('novaos.aiKey') || '' });
  let msgs = JSON.parse(localStorage.getItem('novaos.aiChat') || '[]'), busy = false, abort = null, engine = null, engineModel = null;
  body.innerHTML = `<div class="ai"><header class="ai-head"><b>Assistant</b><span class="ai-who small muted"></span><span class="grow"></span>
      <button class="ghost small" data-a="new">${glyph('plus', 14)}New chat</button><button class="ghost small" data-a="settings">${glyph('settings', 14)}Model</button></header>
    <div class="ai-settings hidden"></div><div class="ai-log"></div>
    <form class="ai-send"><div class="ai-pending" hidden></div><div class="ai-compose"><button type="button" class="icon-btn" data-a="file" title="Attach a picture">${glyph('image')}</button>
      <input class="ai-file" type="file" accept="image/*" multiple hidden><textarea rows="1" placeholder="Ask anything…"></textarea><button class="primary" data-a="send">Send</button></div></form></div>`;
  const $a = s => body.querySelector(s), log = $a('.ai-log'), ta = $a('textarea');
  let pending = [];
  const save = () => localStorage.setItem('novaos.aiChat', JSON.stringify(msgs.slice(-40)));
  const mediaUrls = [];
  const modelName = c => {
    const list = c.provider === 'image' || c.provider === 'video' ? MEDIA_MODELS : LOCAL_MODELS;
    return (list.find(m => m[0] === c.model) || list[0])[1];
  };
  const who = () => {
    const c = cfg();
    $a('.ai-who').textContent = c.provider === 'claude' ? '· Claude Opus 5.5 (your API key)'
      : c.provider === 'image' ? '· Image · ' + modelName(c)
      : c.provider === 'video' ? '· Video · ' + modelName(c)
      : '· ' + modelName(c) + ' on this device';
    ta.placeholder = c.provider === 'image' ? 'Describe a picture…' : c.provider === 'video' ? 'Describe a clip…' : 'Ask anything…';
  };
  const mediaHtml = m => {
    if (!m.media || !FS.exists(m.media.path)) return '';
    const blob = FS.blob(m.media.path); if (!blob) return '';
    const url = URL.createObjectURL(blob); mediaUrls.push(url);
    return m.media.kind === 'video' ? `<video class="ai-media" src="${url}" controls></video>` : `<img class="ai-media" alt="" src="${url}">`;
  };
  const shotsHtml = m => (m.images || []).map(p => {
    if (!FS.exists(p)) return '';
    const blob = FS.blob(p); if (!blob) return '';
    const url = URL.createObjectURL(blob); mediaUrls.push(url);
    return `<img class="ai-media" alt="" src="${url}">`;
  }).join('');
  const draw = () => {
    mediaUrls.splice(0).forEach(u => URL.revokeObjectURL(u));
    const c = cfg();
    const ideas = c.provider === 'image' ? GEN_IMAGE_IDEAS : c.provider === 'video' ? GEN_VIDEO_IDEAS : ['Explain how a web proxy works', 'Write a Python script that renames files', 'Give me 5 co-op game ideas', 'Help me study for a biology test'];
    log.innerHTML = msgs.length ? msgs.map(m => `<div class="ai-msg ${m.role}">${m.role === 'user' ? esc(m.content).replace(/\n/g, '<br>') + shotsHtml(m) : aiMd(m.content) + mediaHtml(m)}</div>`).join('')
      : `<div class="ai-empty">${tile({ mono: 'AI', bg: '#7c3aed' }, 56)}<h3>How can I help?</h3><p class="muted">Chat on this device, or switch to Claude, Image, or Video in <b>Model</b>. Attach a picture with the button below. Pictures save to Pictures and clips save to Videos.</p>
        <div class="ai-ideas">${ideas.map(t => `<button data-idea="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>`;
    log.scrollTop = 1e9;
  };
  const drawPending = () => {
    const box = $a('.ai-pending');
    box.hidden = !pending.length;
    box.innerHTML = pending.map((p, i) => `<span class="ai-chip"><img alt="" src="${p.url}"><button type="button" data-drop="${i}" title="Remove">${glyph('close', 12)}</button></span>`).join('');
  };
  const addFiles = async files => {
    for (const file of files) {
      if (pending.length >= 4) { OS.toast('Up to 4 pictures.'); break; }
      if (!file.type.startsWith('image/') && !/\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name || '')) { OS.toast('Attach a picture.'); continue; }
      if (file.size > 12 * 1048576) { OS.toast('That picture is over 12 MB.'); continue; }
      try {
        const bmp = await createImageBitmap(file);
        const max = 1568, scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(bmp, 0, 0, w, h); bmp.close();
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.86));
        if (!blob) throw new Error('empty');
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const name = ((file.name || 'picture').replace(/\.\w+$/, '').replace(/[^\w .-]+/g, '').trim().slice(0, 40) || 'picture') + '.jpg';
        pending.push({ name, bytes, url: URL.createObjectURL(blob) });
      } catch (e) { OS.toast('That picture could not be read.'); }
    }
    drawPending();
  };
  const settings = () => {
    const c = cfg(), box = $a('.ai-settings');
    const models = c.provider === 'image' || c.provider === 'video' ? MEDIA_MODELS : c.provider === 'local' ? LOCAL_MODELS : null;
    box.innerHTML = `<div class="seg">${AI_PROVIDERS.map(([k, n]) => `<button data-prov="${k}" class="${c.provider === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${models ? `<div class="ai-models">${models.map(([id, n, d]) => `<label><input type="radio" name="aim" value="${id}" ${c.model === id ? 'checked' : ''}><b>${n}</b><small>${d}</small></label>`).join('')}</div>
        <p class="small muted">${c.provider === 'local' ? 'Downloaded once, then cached. Needs a browser with WebGPU (Chrome, Edge, recent Safari/Firefox) and a few GB of free memory. This model cannot see attached pictures.' : 'Made on this site from the description you type. The result is saved in Files. An attached picture stays in the chat.'}</p>`
      : `<label class="field">Anthropic API key<input type="password" class="ai-key" placeholder="sk-ant-…" value="${esc(c.key)}" autocomplete="off"></label>
        <p class="small muted">Uses Claude Opus 5.5. Get a key at console.anthropic.com. The key is stored only in this browser — don't save it on a shared computer. Usage is billed to your Anthropic account. Attached pictures are sent with the message so Claude can see them.</p>`}`;
  };
  const push = (role, content) => { msgs.push({ role, content }); draw(); return msgs[msgs.length - 1]; };
  const setBusy = b => { busy = b; $a('[data-a=send]').textContent = b ? 'Stop' : 'Send'; };

  const runLocal = async (out, render) => {
    if (msgs.at(-2)?.images?.length) throw new Error('This model runs on this device and cannot see pictures. Switch to Claude, or describe the picture for Image or Video.');
    if (!navigator.gpu) throw new Error('This browser has no WebGPU, so models can\'t run on this device. Use Chrome or Edge, or switch to Claude in Model.');
    const c = cfg(), webllm = await import(WEBLLM);
    if (!engine || engineModel !== c.model) {
      engine?.unload?.(); engineModel = c.model;
      engine = await webllm.CreateMLCEngine(c.model, { initProgressCallback: p => { out.content = `_${p.text}_`; render(); } });
    }
    out.content = '';
    const history = msgs.slice(0, -1).slice(-12).map(m => ({ role: m.role, content: m.content || (m.images?.length ? '(a picture was attached)' : '') }));
    const stream = await engine.chat.completions.create({ messages: [{ role: 'system', content: AI_SYSTEM }, ...history], stream: true, temperature: .7 });
    abort = () => engine.interruptGenerate();
    for await (const ch of stream) { out.content += ch.choices[0]?.delta?.content || ''; render(); }
  };
  const runClaude = async (out, render) => {
    const c = cfg(); if (!c.key) throw new Error('Add your Anthropic API key in Model first.');
    const { default: Anthropic } = await import(ANTHROPIC_SDK);
    const client = new Anthropic({ apiKey: c.key, dangerouslyAllowBrowser: true });
    // Server-side fallback: if Claude Opus 5.5 declines, the API retries on a fallback model in the same call.
    const stream = client.beta.messages.stream({
      model: 'claude-opus-5-5', max_tokens: 16000, system: AI_SYSTEM,
      output_config: { effort: 'medium' }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      messages: msgs.slice(0, -1).slice(-30).filter((m, i, arr) => arr.findIndex(x => x.role === 'user') <= i).map(m => ({ role: m.role, content: claudeContent(m) })), // must start with a user turn
    });
    abort = () => stream.abort();
    out.content = '';
    for await (const ev of stream) if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') { out.content += ev.delta.text; render(); }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') out.content += (out.content ? '\n\n' : '') + "_Claude declined to answer this one._";
  };
  const b64 = bytes => { let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const claudeContent = m => {
    const images = (m.images || []).flatMap(p => {
      const bytes = FS.bytes(p), mime = FS.stat(p)?.mime || '';
      if (!bytes || !/^image\/(jpeg|png|gif|webp)$/.test(mime)) return [];
      return [{ type: 'image', source: { type: 'base64', media_type: mime, data: b64(bytes) } }];
    });
    if (!images.length) return m.content || '';
    return [...images, { type: 'text', text: m.content || 'What is in this picture?' }];
  };
  const runMedia = async (out, render) => {
    const c = cfg(), video = c.provider === 'video';
    if (video && typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record a clip.');
    const style = MEDIA_MODELS.some(m => m[0] === c.model) ? c.model : 'photo';
    const size = video ? GEN_SIZES.wide : GEN_SIZES.square;
    const ctl = new AbortController(); abort = () => ctl.abort();
    out.content = video ? 'Making the clip…' : 'Making the picture…'; render();
    const ask = (msgs.at(-2).content || '').trim() || 'A picture';
    const picture = await fetchPicture(genSrc(ask, { style, width: size[0], height: size[1], seed: Math.floor(Math.random() * 1e9) }), ctl.signal);
    let blob = picture.blob;
    try {
      if (video) { out.content = 'Recording the clip…'; render(); blob = await recordClip([picture.frame], ctl.signal); }
    } finally { picture.frame.close(); }
    const base = (ask.replace(/[^\w .-]+/g, '').trim().slice(0, 40) || (video ? 'clip' : 'picture')) + (video ? '.webm' : '.jpg');
    const path = FS.freeName(video ? '/Videos' : '/Pictures', base);
    FS.writeBytes(path, new Uint8Array(await blob.arrayBuffer()), blob.type || (video ? 'video/webm' : 'image/jpeg'));
    out.media = { kind: video ? 'video' : 'image', path };
    out.content = 'Saved to ' + path;
  };
  const send = async text => {
    text = text.trim();
    if (busy || (!text && !pending.length)) return;
    const shots = pending.splice(0);
    shots.forEach(p => URL.revokeObjectURL(p.url));
    drawPending();
    const images = shots.map(p => { const path = FS.freeName('/Pictures', p.name); FS.writeBytes(path, p.bytes, 'image/jpeg'); return path; });
    msgs.push({ role: 'user', content: text, ...(images.length ? { images } : {}) }); draw();
    const out = push('assistant', '…'); setBusy(true);
    const el = () => log.lastElementChild;
    const render = () => { el().innerHTML = aiMd(out.content || '…'); log.scrollTop = 1e9; };
    try {
      const provider = cfg().provider;
      await (provider === 'claude' ? runClaude : provider === 'image' || provider === 'video' ? runMedia : runLocal)(out, render);
    } catch (e) {
      const m = e?.status === 401 ? 'That API key was rejected. Check it in Model.' : e?.status === 429 ? 'Rate limited — wait a moment and try again.' : e?.name === 'AbortError' || /abort/i.test(e?.message) ? '' : (e?.message || String(e));
      if (!m && /^(Making the picture…|Making the clip…|Recording the clip…|…)$/.test(out.content)) out.content = '';
      if (m) out.content = (out.content && out.content !== '…' && !out.content.startsWith('Making ') && out.content !== 'Recording the clip…' ? out.content + '\n\n' : '') + '⚠️ ' + m;
    }
    if (!out.content || out.content === '…') msgs.pop();
    abort = null; setBusy(false); draw(); save();
  };

  body.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'new') { abort?.(); msgs = []; pending.splice(0).forEach(p => URL.revokeObjectURL(p.url)); drawPending(); save(); draw(); }
    if (a === 'file') $a('.ai-file').click();
    const drop = e.target.closest('[data-drop]'); if (drop) { const [gone] = pending.splice(+drop.dataset.drop, 1); if (gone) URL.revokeObjectURL(gone.url); drawPending(); }
    if (a === 'settings') { $a('.ai-settings').classList.toggle('hidden'); settings(); }
    if (a === 'send' && busy) { e.preventDefault(); abort?.(); }
    const p = e.target.closest('[data-prov]'); if (p) {
      localStorage.setItem('novaos.aiProvider', p.dataset.prov);
      const list = p.dataset.prov === 'image' || p.dataset.prov === 'video' ? MEDIA_MODELS : p.dataset.prov === 'local' ? LOCAL_MODELS : null;
      if (list && !list.some(m => m[0] === localStorage.getItem('novaos.aiModel'))) localStorage.setItem('novaos.aiModel', list[0][0]);
      settings(); who(); if (!msgs.length) draw();
    }
    const i = e.target.closest('[data-idea]'); if (i) send(i.dataset.idea);
  };
  body.onchange = e => {
    if (e.target.name === 'aim') { localStorage.setItem('novaos.aiModel', e.target.value); who(); }
    if (e.target.classList.contains('ai-key')) { localStorage.setItem('novaos.aiKey', e.target.value.trim()); }
  };
  $a('.ai-file').onchange = e => { addFiles([...e.target.files]); e.target.value = ''; };
  $a('.ai-send').ondragover = e => e.preventDefault();
  $a('.ai-send').ondrop = e => { e.preventDefault(); addFiles([...e.dataTransfer.files]); };
  $a('.ai-send').onsubmit = e => { e.preventDefault(); if (busy) return; const t = ta.value; ta.value = ''; ta.style.height = ''; send(t); };
  ta.onpaste = e => { const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/')); if (files.length) { e.preventDefault(); addFiles(files); } };
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $a('.ai-send').requestSubmit(); } };
  ta.oninput = () => { ta.style.height = ''; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; };
  win.cleanup.push(() => { abort?.(); engine?.unload?.(); });
  who(); draw(); setTimeout(() => ta.focus());
} };
