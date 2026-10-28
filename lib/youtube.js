// YouTube watch pages from this server's address get "Sign in to confirm you're not a bot".
// A public Invidious instance can hand back an ordinary video file (and a separate audio file)
// that the browser plays itself, so the watch page never has to load.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const FALLBACK = ['https://yt.chocolatemoo53.com'];

const httpsUrl = value => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' ? url.href : '';
  } catch (e) {
    return '';
  }
};

async function getJson(url, ms) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': UA },
    signal: AbortSignal.timeout(ms),
  });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.includes('json')) return null;
  return res.json();
}

async function hosts() {
  try {
    const data = await getJson('https://api.invidious.io/instances.json?sort_by=health', 5000);
    if (!Array.isArray(data)) return FALLBACK;
    const list = [];
    for (const item of data) {
      if (!Array.isArray(item) || item.length < 2) continue;
      const [host, info] = item;
      if (!info || info.type !== 'https' || !info.api || info.monitor?.down) continue;
      if (typeof host === 'string' && host && !host.includes('/')) list.push('https://' + host);
      if (list.length >= 3) break;
    }
    return list.length ? list : FALLBACK;
  } catch (e) {
    return FALLBACK;
  }
}

const heightOf = f => Number(f.height) || parseInt(String(f.qualityLabel || ''), 10) || 0;

function choose(data) {
  const formats = data.adaptiveFormats || [];
  const muxed = (data.formatStreams || []).find(f => f && httpsUrl(f.url) && /video\/mp4/i.test(f.type || '') && /avc1/i.test(f.type || ''));
  if (muxed) return { video: muxed, audio: null };
  const videos = formats.filter(f => f && httpsUrl(f.url) && /video\/mp4/i.test(f.type || '') && /avc1/i.test(f.type || ''));
  videos.sort((a, b) => heightOf(b) - heightOf(a) || (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
  const video = videos.find(f => { const h = heightOf(f); return h > 0 && h <= 720; }) || videos[0];
  const audios = formats.filter(f => f && httpsUrl(f.url) && /^audio\/mp4/i.test(f.type || ''));
  audios.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  const audio = audios[0] || formats.find(f => f && httpsUrl(f.url) && /^audio\//i.test(f.type || ''));
  return { video, audio };
}

async function lookup(id) {
  let last = 'YouTube did not return a playable video. Try again.';
  for (const host of await hosts()) {
    let data;
    try { data = await getJson(host + '/api/v1/videos/' + id + '?local=true', 12000); }
    catch (e) { continue; }
    if (!data) continue;
    if (data.error) {
      last = typeof data.error === 'string' ? data.error : 'This video is unavailable.';
      continue;
    }
    const { video, audio } = choose(data);
    const videoUrl = video && httpsUrl(video.url);
    if (!videoUrl) { last = 'This video has no playable file.'; continue; }
    return {
      id,
      title: String(data.title || 'YouTube').slice(0, 180),
      author: String(data.author || '').slice(0, 120),
      quality: String(video.qualityLabel || ''),
      video: videoUrl,
      audio: audio ? httpsUrl(audio.url) : '',
    };
  }
  return { error: last };
}

export async function sendYouTube(req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (req.query) for (const [key, value] of Object.entries(req.query)) if (value != null && !url.searchParams.has(key)) url.searchParams.set(key, String(value));
  const id = String(url.searchParams.get('v') || '');
  const send = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  if (!/^[\w-]{11}$/.test(id)) return send(400, { error: 'That is not a video address.' });
  try {
    const info = await lookup(id);
    if (info.error) return send(502, info);
    send(200, info);
  } catch (e) {
    send(502, { error: 'YouTube did not return a playable video. Try again.' });
  }
}
