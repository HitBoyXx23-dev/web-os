// Picture and text models on AI Horde. The browser starts a job and polls, because the
// public queue can outlast one request. MOSS img2img returns noise, so that model follows
// the description. The other picture models can use an attached picture.
const HORDE = 'https://aihorde.net/api/v2';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CLIENT = 'hitboy-webos:1.0:unknown';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YOUTH = /\b(child|children|kid|kids|minor|minors|underage|preteen|pre-teen|loli|lolita|lolicon|shota|shotacon|toddler|infant|baby|teen|teenager|schoolgirl|schoolboy|young girl|young boy|little girl|little boy)\b/i;

// family: moss uses its own sampler. sdxl and sd15 are the usual Horde checkpoints.
const IMAGES = {
  moss: { model: 'MOSS-Image-SFT', family: 'moss' },
  flat2d: { model: 'Flat-2D Animerge', family: 'sd15' },
  nova: { model: 'Nova Anime XL', family: 'sdxl' },
  juggernaut: { model: 'Juggernaut XL', family: 'sdxl' },
  dreamshaper: { model: 'Dreamshaper', family: 'sd15' },
  realistic: { model: 'Realistic Vision', family: 'sd15' },
  deliberate: { model: 'Deliberate', family: 'sd15' },
  toon: { model: 'ToonYou', family: 'sd15' },
  western: { model: 'Western Animation Diffusion', family: 'sd15' },
  ghibli: { model: 'Ghibli Diffusion', family: 'sd15' },
  counterfeit: { model: 'Counterfeit', family: 'sd15' },
};
const TEXTS = {
  coder: 'koboldcpp/Qwen2.5-Coder-3B-Instruct',
  llama: 'koboldcpp/Llama-3.2-3B-Instruct-Q4_K_M',
  mistral: 'koboldcpp/Mistral-Nemo-2407-Thinking-Claude-Gemini-GPT5.2-Uncensored-HERETIC',
  qwen: 'koboldcpp/Qwen/Qwen3.5-0.8B',
};

export const isHorde = style => Object.prototype.hasOwnProperty.call(IMAGES, style) || Object.prototype.hasOwnProperty.call(TEXTS, style);

const grid = (n, step, cap, fallback) => {
  n = Math.round(Number(n) || fallback);
  if (!Number.isFinite(n)) n = fallback;
  n = Math.max(step * 4, Math.min(cap, n));
  return n - (n % step);
};

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string' && req.body) { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  if (Buffer.isBuffer(req.body) && req.body.length) { try { return JSON.parse(req.body.toString('utf8')); } catch (e) { return {}; } }
  if (req.method === 'GET' || req.method === 'DELETE' || req.readableEnded) return {};
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return {}; }
}

async function horde(path, signal, options = {}) {
  const res = await fetch(HORDE + path, {
    ...options,
    signal,
    headers: {
      accept: 'application/json',
      'user-agent': UA,
      'client-agent': CLIENT,
      apikey: '0000000000',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 202) {
    const message = data.message || data.error || 'The model did not answer.';
    throw new Error(typeof message === 'string' ? message : 'The model did not answer.');
  }
  return data;
}

export async function sendMoss(req, res) {
  const body = req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : await readJson(req);
  req.body = body;
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (req.query) for (const [key, value] of Object.entries(req.query)) if (value != null && !url.searchParams.has(key)) url.searchParams.set(key, String(value));
  const send = (status, payload, type = 'application/json') => {
    if (res.writableEnded) return;
    const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
    res.writeHead(status, {
      'content-type': type,
      'content-length': buf.length,
      'cache-control': type.startsWith('image/') ? 'private, max-age=86400' : 'no-store',
    });
    res.end(buf);
  };
  const style = String(body.style || url.searchParams.get('style') || '');
  const textModel = TEXTS[style];
  const image = IMAGES[style];
  const statusPath = textModel ? '/generate/text/status/' : '/generate/status/';
  const id = String(body.id || url.searchParams.get('id') || '');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);
  const busy = 'The model is busy. Try again in a moment.';
  try {
    if (req.method === 'DELETE') {
      if (!ID.test(id)) return send(400, { error: 'The model did not have that request.' });
      await horde(statusPath + id, ac.signal, { method: 'DELETE' }).catch(() => {});
      return send(200, { ok: true });
    }
    if (id) {
      if (!ID.test(id)) return send(400, { error: 'The model did not have that request.' });
      let status;
      try { status = await horde(statusPath + id, ac.signal); }
      catch (e) {
        if (/per 1 minute|too many/i.test(e.message || '')) return send(202, { pending: true });
        throw e;
      }
      if (status.faulted) return send(502, { error: textModel ? 'The model did not answer. Try again.' : 'The model did not return a picture. Try again.' });
      if (!status.done) return send(202, { pending: true });
      const gen = (status.generations || [])[0] || {};
      if (textModel) {
        const text = String(gen.text || '').trim();
        if (!text) return send(502, { error: 'The model did not answer. Try again.' });
        return send(200, { text });
      }
      const img = gen.img;
      if (!img) return send(502, { error: 'The model did not return a picture. Try again.' });
      if (img.startsWith('http')) {
        const file = await fetch(img, { signal: ac.signal, headers: { 'user-agent': UA, accept: 'image/*' } });
        if (!file.ok) return send(502, { error: 'The model did not return a picture. Try again.' });
        return send(200, Buffer.from(await file.arrayBuffer()), (file.headers.get('content-type') || 'image/webp').split(';')[0]);
      }
      return send(200, Buffer.from(img, 'base64'), 'image/webp');
    }
    const prompt = String(body.prompt ?? url.searchParams.get('prompt') ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, textModel ? 6000 : 2000);
    if (!prompt) return send(400, { error: textModel ? 'Write a message first.' : 'Describe what to make first.' });
    if (!textModel && YOUTH.test(prompt)) return send(400, { error: "That can't be made." });
    const queued = textModel
      ? await horde('/generate/text/async', ac.signal, {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          params: { max_context_length: 512, max_length: 200, temperature: 0.7, top_p: 0.9 },
          models: [textModel],
        }),
      })
      : await horde('/generate/async', ac.signal, {
        method: 'POST',
        body: JSON.stringify(imageJob(image, prompt, body, url)),
      });
    if (!queued.id) return send(502, { error: textModel ? 'The model did not answer. Try again.' : 'The model did not take the picture. Try again.' });
    send(202, { id: queued.id });
  } catch (e) {
    console.error('horde', style, e?.name, e?.message);
    const detail = e?.name === 'AbortError' ? busy : (typeof e?.message === 'string' && e.message && e.message.length < 180 ? e.message : (textModel ? 'The model did not answer. Try again.' : 'The model did not return a picture. Try again.'));
    if (!res.writableEnded) send(502, { error: detail });
  } finally {
    clearTimeout(timer);
  }
}

function imageJob(image, prompt, body, url) {
  const family = image.family;
  const cap = family === 'sd15' ? 512 : 768;
  const step = family === 'moss' ? 16 : 64;
  const params = family === 'moss'
    ? { width: grid(body.width ?? url.searchParams.get('width'), step, cap, 768), height: grid(body.height ?? url.searchParams.get('height'), step, cap, 768), steps: 50, cfg_scale: 2.5, sampler_name: 'k_euler', scheduler: 'simple', n: 1 }
    : family === 'sdxl'
      ? { width: grid(body.width ?? url.searchParams.get('width'), step, cap, 768), height: grid(body.height ?? url.searchParams.get('height'), step, cap, 768), steps: 25, cfg_scale: 6, sampler_name: 'k_euler', n: 1 }
      : { width: grid(body.width ?? url.searchParams.get('width'), step, cap, 512), height: grid(body.height ?? url.searchParams.get('height'), step, cap, 512), steps: 28, cfg_scale: 7, sampler_name: 'k_euler_a', n: 1 };
  const job = {
    prompt,
    params,
    nsfw: true,
    censor_nsfw: false,
    slow_workers: true,
    models: [image.model],
    r2: true,
    replacement_filter: false,
  };
  // MOSS turns a reference picture into noise. The other checkpoints can start from one.
  let picture = family === 'moss' ? '' : String(body.image || '').replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
  if (picture && (picture.length > 8_000_000 || !/^[A-Za-z0-9+/=]+$/.test(picture))) picture = '';
  if (picture) {
    job.source_image = picture;
    job.source_processing = 'img2img';
    job.params.denoising_strength = 0.58;
  }
  return job;
}
