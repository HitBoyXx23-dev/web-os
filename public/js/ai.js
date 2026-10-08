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
    <form class="ai-send"><textarea rows="1" placeholder="Ask anything…"></textarea><button class="primary" data-a="send">Send</button></form></div>`;
  const $a = s => body.querySelector(s), log = $a('.ai-log'), ta = $a('textarea');
  const save = () => localStorage.setItem('novaos.aiChat', JSON.stringify(msgs.slice(-40)));
  const who = () => { const c = cfg(); $a('.ai-who').textContent = c.provider === 'claude' ? '· Claude Opus 5.5 (your API key)' : '· ' + (LOCAL_MODELS.find(m => m[0] === c.model) || LOCAL_MODELS[0])[1] + ' on this device'; };
  const draw = () => {
    log.innerHTML = msgs.length ? msgs.map(m => `<div class="ai-msg ${m.role}">${m.role === 'user' ? esc(m.content).replace(/\n/g, '<br>') : aiMd(m.content)}</div>`).join('')
      : `<div class="ai-empty">${tile({ mono: 'AI', bg: '#7c3aed' }, 56)}<h3>How can I help?</h3><p class="muted">Runs on this device by default — nothing you type leaves your computer. Switch to Claude in <b>Model</b>.</p>
        <div class="ai-ideas">${['Explain how a web proxy works', 'Write a Python script that renames files', 'Give me 5 co-op game ideas', 'Help me study for a biology test'].map(t => `<button data-idea="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>`;
    log.scrollTop = 1e9;
  };
  const settings = () => {
    const c = cfg(), box = $a('.ai-settings');
    box.innerHTML = `<div class="seg">${[['local', 'On this device'], ['claude', 'Claude (API key)']].map(([k, n]) => `<button data-prov="${k}" class="${c.provider === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${c.provider === 'local' ? `<div class="ai-models">${LOCAL_MODELS.map(([id, n, d]) => `<label><input type="radio" name="aim" value="${id}" ${c.model === id ? 'checked' : ''}><b>${n}</b><small>${d}</small></label>`).join('')}</div>
        <p class="small muted">Downloaded once, then cached. Needs a browser with WebGPU (Chrome, Edge, recent Safari/Firefox) and a few GB of free memory.</p>`
      : `<label class="field">Anthropic API key<input type="password" class="ai-key" placeholder="sk-ant-…" value="${esc(c.key)}" autocomplete="off"></label>
        <p class="small muted">Uses Claude Opus 5.5. Get a key at console.anthropic.com. The key is stored only in this browser — don't save it on a shared computer. Usage is billed to your Anthropic account.</p>`}`;
  };
  const push = (role, content) => { msgs.push({ role, content }); draw(); return msgs[msgs.length - 1]; };
  const setBusy = b => { busy = b; $a('[data-a=send]').textContent = b ? 'Stop' : 'Send'; };

  const runLocal = async (out, render) => {
    if (!navigator.gpu) throw new Error('This browser has no WebGPU, so models can\'t run on this device. Use Chrome or Edge, or switch to Claude in Model.');
    const c = cfg(), webllm = await import(WEBLLM);
    if (!engine || engineModel !== c.model) {
      engine?.unload?.(); engineModel = c.model;
      engine = await webllm.CreateMLCEngine(c.model, { initProgressCallback: p => { out.content = `_${p.text}_`; render(); } });
    }
    out.content = '';
    const stream = await engine.chat.completions.create({ messages: [{ role: 'system', content: AI_SYSTEM }, ...msgs.slice(0, -1).slice(-12)], stream: true, temperature: .7 });
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
      messages: msgs.slice(0, -1).slice(-30).filter((m, i, arr) => arr.findIndex(x => x.role === 'user') <= i).map(m => ({ role: m.role, content: m.content })), // must start with a user turn
    });
    abort = () => stream.abort();
    out.content = '';
    for await (const ev of stream) if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') { out.content += ev.delta.text; render(); }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') out.content += (out.content ? '\n\n' : '') + "_Claude declined to answer this one._";
  };
  const send = async text => {
    text = text.trim(); if (!text || busy) return;
    push('user', text); const out = push('assistant', '…'); setBusy(true);
    const el = () => log.lastElementChild;
    const render = () => { el().innerHTML = aiMd(out.content || '…'); log.scrollTop = 1e9; };
    try { await (cfg().provider === 'claude' ? runClaude : runLocal)(out, render); }
    catch (e) {
      const m = e?.status === 401 ? 'That API key was rejected. Check it in Model.' : e?.status === 429 ? 'Rate limited — wait a moment and try again.' : e?.name === 'AbortError' || /abort/i.test(e?.message) ? '' : (e?.message || String(e));
      if (m) out.content = (out.content && out.content !== '…' ? out.content + '\n\n' : '') + '⚠️ ' + m;
    }
    if (!out.content || out.content === '…') msgs.pop();
    abort = null; setBusy(false); draw(); save();
  };

  body.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'new') { abort?.(); msgs = []; save(); draw(); }
    if (a === 'settings') { $a('.ai-settings').classList.toggle('hidden'); settings(); }
    if (a === 'send' && busy) { e.preventDefault(); abort?.(); }
    const p = e.target.closest('[data-prov]'); if (p) { localStorage.setItem('novaos.aiProvider', p.dataset.prov); settings(); who(); }
    const i = e.target.closest('[data-idea]'); if (i) send(i.dataset.idea);
  };
  body.onchange = e => {
    if (e.target.name === 'aim') { localStorage.setItem('novaos.aiModel', e.target.value); who(); }
    if (e.target.classList.contains('ai-key')) { localStorage.setItem('novaos.aiKey', e.target.value.trim()); }
  };
  $a('.ai-send').onsubmit = e => { e.preventDefault(); if (busy) return; const t = ta.value; ta.value = ''; ta.style.height = ''; send(t); };
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $a('.ai-send').requestSubmit(); } };
  ta.oninput = () => { ta.style.height = ''; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; };
  win.cleanup.push(() => { abort?.(); engine?.unload?.(); });
  who(); draw(); setTimeout(() => ta.focus());
} };
