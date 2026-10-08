// HitBoy Live: a streaming app for people on this HitBoy Web-OS server. Browse who's live, watch with chat beside
// the video, or go live with your screen, camera or a Recorder scene. Video goes peer-to-peer (WebRTC) from the
// streamer to each viewer; the party server (party.js) relays chat, the connection setup and the list of streams.
const liveSince = t => { const m = Math.max(0, Math.floor((Date.now() - t) / 60000)); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`; };

APPS.live = ALL_APPS.live = { name: 'HitBoy Live', icon: { mono: 'Live', bg: '#e11d48' }, cat: 'Apps', w: 1080, h: 680, run(body, win) {
  const me = OS.account?.name || OS.user;
  let conn = null, view = null, refresh = null, stream = null, owner = null, meta = null, peers = new Map();
  const pcs = new Map(); // streamer: viewer id -> RTCPeerConnection; viewer: just the streamer's
  const $l = s => body.querySelector(s);
  const stop = () => {
    clearInterval(refresh); refresh = null;
    for (const pc of pcs.values()) pc.close(); pcs.clear();
    stream?.getTracks().forEach(t => t.stop()); stream = null;
    conn?.close(); conn = null; peers.clear(); owner = meta = null;
  };

  // ---- browse ----
  const browse = async () => {
    stop(); view = 'browse'; WM.setTitle(win, 'HitBoy Live');
    body.innerHTML = `<div class="live"><header class="live-head"><b>HitBoy Live</b><span class="muted small grow">Streams from people on this HitBoy server</span>
      <button class="ghost small" data-a="refresh">${glyph('reload', 14)}Refresh</button><button class="primary" data-a="golive">${glyph('vm', 14)}Go live</button></header>
      <div class="live-grid"><div class="spinner"></div></div></div>`;
    const draw = async () => {
      const list = await Party.rooms('live'), grid = $l('.live-grid'); if (!grid || view !== 'browse') return;
      if (list === null) { grid.innerHTML = `<div class="empty">${esc(NO_PARTY)}</div>`; return; }
      grid.innerHTML = list.length ? list.map(s => `<button class="live-card" data-room="${esc(s.room)}">
          <div class="live-thumb" style="--h:${[...s.name].reduce((n, c) => n + c.charCodeAt(0), 0) % 360}"><span class="live-badge">LIVE</span><span class="live-viewers">${glyph('user', 12)} ${Math.max(0, s.people - 1)}</span>${esc(initials(s.name))}</div>
          <b>${esc(s.title || 'Untitled stream')}</b><small>${esc(s.name)} · live for ${liveSince(s.started)}</small></button>`).join('')
        : `<div class="empty">${tile({ mono: 'Live', bg: '#e11d48' }, 56)}<h3>Nobody is live right now</h3><p class="muted">Be the first: press Go live to stream your screen, a game, your camera or a Recorder scene.</p></div>`;
    };
    await draw(); refresh = setInterval(draw, 8000);
  };

  // ---- shared chat panel ----
  const chatHtml = `<aside class="live-chat"><div class="live-chat-head">Stream chat</div><div class="live-log"></div>
    <form class="live-send"><input maxlength="500" placeholder="Send a message" autocomplete="off"><button class="primary">Chat</button></form></aside>`;
  const line = m => {
    const log = $l('.live-log'); if (!log) return; const d = document.createElement('div');
    if (m.sys) { d.className = 'chat-sys'; d.textContent = m.sys; }
    else { d.className = 'live-msg'; d.innerHTML = '<b></b> <span></span>'; d.querySelector('b').textContent = m.name; d.querySelector('b').style.color = `hsl(${[...m.name].reduce((n, c) => n + c.charCodeAt(0), 0) % 360} 70% 65%)`; d.querySelector('span').textContent = m.text; }
    const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 30; log.appendChild(d); if (stick) log.scrollTop = 1e9;
  };
  const viewers = () => $l('.live-count') && ($l('.live-count').textContent = `${Math.max(0, peers.size - (view === 'watch' ? 1 : 0))} watching`);
  const wireChat = () => { $l('.live-send').onsubmit = e => { e.preventDefault(); const i = $l('.live-send input'), text = i.value.trim(); if (text && conn) conn.send({ t: 'msg', text }); i.value = ''; }; };

  // ---- go live ----
  const setup = () => {
    stop(); view = 'setup';
    const hasScene = !!window.RecorderScene;
    body.innerHTML = `<div class="live"><header class="live-head"><button class="ghost small" data-a="back">${glyph('back', 14)}Back</button><b>Go live</b></header>
      <div class="live-setup"><label class="field">Stream title<input class="ls-title" maxlength="80" value="${esc(me.split(' ')[0])} is live"></label>
        <div class="field">Source<div class="seg ls-src">${[['screen', 'Screen, window or tab'], ['cam', 'Camera'], ...(hasScene ? [['scene', 'Recorder scene']] : [])].map(([k, n], i) => `<button data-src="${k}" class="${i ? '' : 'on'}">${n}</button>`).join('')}</div></div>
        <label class="row small"><input type="checkbox" class="switch ls-mic" checked> Include my microphone</label>
        <label class="row small"><input type="checkbox" class="switch ls-public" checked> List my stream in HitBoy Live (otherwise share the link)</label>
        <p class="small muted">${hasScene ? '' : 'Tip: open Recorder first to stream a scene with your camera over your screen. '}Video goes straight from you to each viewer, so many viewers need a good upload speed.</p>
        <div class="row"><button class="primary" data-a="start">${glyph('vm', 14)}Start streaming</button></div></div></div>`;
  };
  const start = async () => {
    const src = $l('.ls-src .on').dataset.src, title = $l('.ls-title').value.trim() || 'Live', mic = $l('.ls-mic').checked, pub = $l('.ls-public').checked;
    try {
      if (src === 'scene') stream = window.RecorderScene.stream();
      else if (src === 'cam') stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: mic });
      else stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      if (mic && src !== 'cam') { try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getAudioTracks().forEach(t => stream.addTrack(t)); } catch (e) {} }
    } catch (e) { stream = null; return OS.toast('Sharing was cancelled or blocked.'); }
    const room = 'ch-' + me.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) + '-' + Math.random().toString(36).slice(2, 6);
    view = 'studio'; WM.setTitle(win, 'Live — ' + title);
    body.innerHTML = `<div class="live live-watch"><section><div class="live-video"><video autoplay playsinline muted></video><span class="live-badge">LIVE</span></div>
        <div class="live-info"><div class="grow"><b class="live-title"></b><div class="small muted"><span class="live-count">0 watching</span> · <span class="live-up">just started</span> · ${pub ? 'listed in HitBoy Live' : 'unlisted'}</div></div>
          <button class="ghost small" data-a="copy">${glyph('file', 14)}Copy link</button><button class="danger" data-a="end">End stream</button></div></section>${chatHtml}</div>`;
    $l('.live-title').textContent = title; $l('video').srcObject = stream; wireChat();
    stream.getVideoTracks()[0].onended = () => end();
    const up = setInterval(() => { const u = $l('.live-up'); if (!u) return clearInterval(up); u.textContent = 'live for ' + liveSince(meta?.started || Date.now()); }, 15000);
    conn = Party.connect('live', room, me, {
      welcome: m => { conn.room = room; m.peers.forEach(p => peers.set(p.id, p)); conn.send({ t: 'meta', meta: { title, kind: 'stream', name: me, public: pub } }); line({ sys: 'You are live! Viewers can chat here.' }); viewers(); },
      join: p => { peers.set(p.id, p); viewers(); },
      leave: id => { peers.delete(id); pcs.get(id)?.close(); pcs.delete(id); viewers(); },
      message: async m => {
        if (m.t === 'meta') meta = m.meta;
        if (m.t === 'msg') line(m);
        if (m.t === 'watch') { // a viewer asks for the video
          pcs.get(m.from)?.close(); const pc = new RTCPeerConnection(RTC_CONFIG); pcs.set(m.from, pc);
          stream.getTracks().forEach(t => pc.addTrack(t, stream));
          pc.onicecandidate = e => e.candidate && conn.send({ t: 'rtc', to: m.from, ice: e.candidate });
          await pc.setLocalDescription(await pc.createOffer()); conn.send({ t: 'rtc', to: m.from, sdp: pc.localDescription });
        }
        if (m.t === 'rtc') { const pc = pcs.get(m.from); if (!pc) return; if (m.sdp) await pc.setRemoteDescription(m.sdp); else if (m.ice) await pc.addIceCandidate(m.ice).catch(() => {}); }
      },
      close: reason => { line({ sys: reason }); },
    });
  };
  const end = () => { if (view !== 'studio') return; stop(); OS.toast('Your stream has ended.'); browse(); };

  // ---- watch ----
  const watch = room => {
    stop(); view = 'watch';
    body.innerHTML = `<div class="live live-watch"><section><div class="live-video"><video autoplay playsinline muted></video><div class="live-wait">Connecting…</div>
        <button class="live-unmute hidden" data-a="unmute">${glyph('volume', 16)} Tap to unmute</button><button class="icon-btn live-fs" data-a="fs" title="Full screen">${glyph('max', 16)}</button></div>
        <div class="live-info"><button class="ghost small" data-a="back">${glyph('back', 14)}</button><div class="grow"><b class="live-title">Loading…</b><div class="small muted"><span class="live-who"></span> · <span class="live-count"></span></div></div></div></section>${chatHtml}</div>`;
    wireChat();
    const video = $l('video'), wait = t => { const w = $l('.live-wait'); if (w) { w.textContent = t; w.classList.toggle('hidden', !t); } };
    const ended = () => { wait('This stream has ended.'); pcs.forEach(pc => pc.close()); pcs.clear(); };
    const showMeta = () => { if (!meta) return; $l('.live-title').textContent = meta.title || 'Live'; $l('.live-who').textContent = meta.name; WM.setTitle(win, `${meta.name} — HitBoy Live`); };
    conn = Party.connect('live', room, me, {
      welcome: m => {
        m.peers.forEach(p => peers.set(p.id, p)); peers.set(m.id, { id: m.id, name: me }); owner = m.owner; meta = m.meta; viewers();
        m.history.forEach(line);
        if (!meta || owner === m.id) return ended();
        showMeta(); conn.send({ t: 'watch', to: owner });
      },
      join: p => { peers.set(p.id, p); viewers(); },
      leave: id => { peers.delete(id); viewers(); },
      message: async m => {
        if (m.t === 'msg') line(m);
        if (m.t === 'meta') { meta = m.meta; showMeta(); }
        if (m.t === 'owner') ended();
        if (m.t === 'rtc' && m.from === owner) {
          if (m.sdp) {
            pcs.get(owner)?.close(); const pc = new RTCPeerConnection(RTC_CONFIG); pcs.set(owner, pc);
            pc.ontrack = e => { video.srcObject = e.streams[0]; wait(''); video.play().catch(() => {}); $l('.live-unmute')?.classList.remove('hidden'); };
            pc.onicecandidate = e => e.candidate && conn.send({ t: 'rtc', to: owner, ice: e.candidate });
            pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') wait("Couldn't connect to the streamer's video (strict network). Chat still works."); };
            await pc.setRemoteDescription(m.sdp); await pc.setLocalDescription(await pc.createAnswer()); conn.send({ t: 'rtc', to: owner, sdp: pc.localDescription });
          } else if (m.ice) await pcs.get(owner)?.addIceCandidate(m.ice).catch(() => {});
        }
      },
      close: reason => { wait(reason); },
    });
  };

  body.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'refresh' || a === 'back') return browse();
    if (a === 'golive') return setup();
    if (a === 'start') return start();
    if (a === 'end') return end();
    if (a === 'copy') { const link = `${location.origin}${location.pathname}#live=${conn?.room}`; navigator.clipboard?.writeText(link).then(() => OS.toast('Stream link copied')); }
    if (a === 'unmute') { const v = $l('video'); v.muted = false; v.play().catch(() => {}); e.target.closest('button').classList.add('hidden'); }
    if (a === 'fs') $l('.live-video').requestFullscreen?.();
    const s = e.target.closest('[data-src]'); if (s) { body.querySelectorAll('[data-src]').forEach(b => b.classList.toggle('on', b === s)); }
    const c = e.target.closest('[data-room]'); if (c) watch(c.dataset.room);
  };
  win.cleanup.push(stop);
  const link = (location.hash.match(/live=([\w-]+)/) || [])[1];
  if (link) { history.replaceState(null, '', location.pathname + location.search); watch(link); } else browse();
} };
