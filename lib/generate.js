const STYLES = {
  photo: 'photograph, natural light, sharp detail',
  illustration: 'illustration, clean shapes, soft color',
  poster: 'graphic poster, bold composition',
  pixel: 'pixel art, crisp pixels',
};
// These skip the upstream safety filter. Prompts that sexualize minors are refused here.
const OPEN_STYLES = {
  uncensored: 'photograph, natural light, sharp detail',
  'uncensored-anime': 'anime illustration, clean linework, vivid color',
};
const YOUTH = /\b(child|children|kid|kids|minor|minors|underage|preteen|pre-teen|loli|lolita|lolicon|shota|shotacon|toddler|infant|baby|teen|teenager|schoolgirl|schoolboy|young girl|young boy|little girl|little boy)\b/i;

const clampSide = n => {
  n = Math.round(Number(n) || 768);
  if (!Number.isFinite(n)) n = 768;
  return Math.max(256, Math.min(768, n));
};

export function imageOptions(query) {
  const prompt = String(query.get('prompt') || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!prompt) return null;
  let width = clampSide(query.get('width'));
  let height = clampSide(query.get('height'));
  const area = 768 * 768;
  if (width * height > area) {
    const scale = Math.sqrt(area / (width * height));
    width = clampSide(width * scale);
    height = clampSide(height * scale);
  }
  const styleKey = String(query.get('style') || '');
  const open = Object.prototype.hasOwnProperty.call(OPEN_STYLES, styleKey);
  if (open && YOUTH.test(prompt)) return { blocked: true };
  const style = (open ? OPEN_STYLES : STYLES)[styleKey] || '';
  const seed = String(query.get('seed') || '').replace(/\D/g, '').slice(0, 12) || String(Math.floor(Math.random() * 1e9));
  const text = style ? `${prompt}. ${style}` : prompt;
  const upstream = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(text));
  upstream.searchParams.set('width', String(width));
  upstream.searchParams.set('height', String(height));
  upstream.searchParams.set('seed', seed);
  upstream.searchParams.set('model', 'sana');
  upstream.searchParams.set('nologo', 'true');
  upstream.searchParams.set('nofeed', 'true');
  upstream.searchParams.set('safe', open ? 'false' : 'true');
  return { upstream, width, height, seed, open };
}

const pause = (ms, signal) => new Promise((resolve, reject) => {
  if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
  const t = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
});

const RETRY = new Set([402, 429, 500, 502, 503, 504]);

async function fetchOnce(url, signal, headers, ms) {
  const attempt = new AbortController();
  const timer = setTimeout(() => attempt.abort(), ms);
  const stop = () => attempt.abort();
  signal.addEventListener('abort', stop);
  try { return await fetch(url, { signal: attempt.signal, headers }); }
  finally { clearTimeout(timer); signal.removeEventListener('abort', stop); }
}

async function fetchImage(url, signal) {
  const headers = { accept: 'image/jpeg,image/png,image/*' };
  let upstream;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { upstream = await fetchOnce(url, signal, headers, 18000); }
    catch (e) {
      if (signal.aborted || attempt === 2) throw e;
      await pause(1500, signal);
      continue;
    }
    const type = upstream.headers.get('content-type') || '';
    if (upstream.ok && type.startsWith('image/')) return upstream;
    if (!RETRY.has(upstream.status) || attempt === 2) return upstream;
    const wait = Math.min(6, Number(upstream.headers.get('retry-after')) || 2);
    await pause(wait * 1000, signal);
  }
  return upstream;
}

export async function sendImage(req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (req.query) for (const [key, value] of Object.entries(req.query)) if (value != null && !url.searchParams.has(key)) url.searchParams.set(key, String(value));
  const image = imageOptions(url.searchParams);
  if (!image) {
    res.writeHead(400, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ error: 'Describe what to make first.' }));
    return;
  }
  if (image.blocked) {
    res.writeHead(400, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ error: "That can't be made." }));
    return;
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 58000);
  try {
    const upstream = await fetchImage(image.upstream, ac.signal);
    const type = upstream.headers.get('content-type') || '';
    if (upstream.status === 402) {
      res.writeHead(429, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: 'The image server is busy. Try again in a moment.' }));
      return;
    }
    if (!upstream.ok || !type.startsWith('image/')) {
      res.writeHead(502, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: 'Image generation did not answer. Try again.' }));
      return;
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(200, { 'content-type': type.split(';')[0], 'content-length': body.length, 'cache-control': 'private, max-age=86400' });
    res.end(body);
  } catch (e) {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: 'Image generation failed. Try again.' }));
    } else res.end();
  } finally {
    clearTimeout(timer);
  }
}
