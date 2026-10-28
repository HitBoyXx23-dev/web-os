// MOSS-Image-SFT on AI Horde. A request often waits in a public queue, so the browser
// starts the job and polls. Horde's img2img path for this model returns noise, so the
// picture follows the description. Workers accept Euler, the simple scheduler, CFG 2.5, and 50 steps.
const HORDE = 'https://aihorde.net/api/v2';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CLIENT = 'hitboy-webos:1.0:unknown';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YOUTH = /\b(child|children|kid|kids|minor|minors|underage|preteen|pre-teen|loli|lolita|lolicon|shota|shotacon|toddler|infant|baby|teen|teenager|schoolgirl|schoolboy|young girl|young boy|little girl|little boy)\b/i;

const side = n => {
  n = Math.round(Number(n) || 768);
  if (!Number.isFinite(n)) n = 768;
  n = Math.max(256, Math.min(768, n));
  return n - (n % 16);
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
    const message = data.message || data.error || 'MOSS did not answer.';
    throw new Error(typeof message === 'string' ? message : 'MOSS did not answer.');
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
  const id = String(body.id || url.searchParams.get('id') || '');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);
  try {
    if (req.method === 'DELETE') {
      if (!ID.test(id)) return send(400, { error: 'MOSS did not have that picture.' });
      await horde('/generate/status/' + id, ac.signal, { method: 'DELETE' }).catch(() => {});
      return send(200, { ok: true });
    }
    if (id) {
      if (!ID.test(id)) return send(400, { error: 'MOSS did not have that picture.' });
      const status = await horde('/generate/status/' + id, ac.signal);
      if (status.faulted) return send(502, { error: 'MOSS did not return a picture. Try again.' });
      if (!status.done) return send(202, { pending: true });
      const img = (status.generations || [])[0]?.img;
      if (!img) return send(502, { error: 'MOSS did not return a picture. Try again.' });
      if (img.startsWith('http')) {
        const file = await fetch(img, { signal: ac.signal, headers: { 'user-agent': UA, accept: 'image/*' } });
        if (!file.ok) return send(502, { error: 'MOSS did not return a picture. Try again.' });
        return send(200, Buffer.from(await file.arrayBuffer()), (file.headers.get('content-type') || 'image/webp').split(';')[0]);
      }
      return send(200, Buffer.from(img, 'base64'), 'image/webp');
    }
    const prompt = String(body.prompt ?? url.searchParams.get('prompt') ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
    if (!prompt) return send(400, { error: 'Describe what to make first.' });
    if (YOUTH.test(prompt)) return send(400, { error: "That can't be made." });
    const queued = await horde('/generate/async', ac.signal, {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        params: {
          width: side(body.width ?? url.searchParams.get('width')),
          height: side(body.height ?? url.searchParams.get('height')),
          steps: 50,
          cfg_scale: 2.5,
          sampler_name: 'k_euler',
          scheduler: 'simple',
          n: 1,
        },
        nsfw: true,
        censor_nsfw: false,
        slow_workers: true,
        models: ['MOSS-Image-SFT'],
        r2: true,
        replacement_filter: false,
      }),
    });
    if (!queued.id) return send(502, { error: 'MOSS did not take the picture. Try again.' });
    send(202, { id: queued.id });
  } catch (e) {
    if (!res.writableEnded) send(502, { error: e.name === 'AbortError' ? 'MOSS is busy. Try again in a moment.' : 'MOSS did not answer. Try again.' });
  } finally {
    clearTimeout(timer);
  }
}
