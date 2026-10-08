// Live: chat rooms and screen/camera streaming between people on this HitBoy Web-OS server (party.js).
// Streams are peer-to-peer WebRTC; the party server only relays the connection setup.
const Party = {
  // The party server: this site's own (Render, Railway, a VPS…) unless another one is set in Settings → Proxy.
  url(app, room, name) {
    const custom = (OS.cfg.partyServer || '').trim().replace(/\/$/, '');
    const base = custom || (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + BASE.replace(/\/$/, '');
    return `${base}/party/?app=${app}&room=${encodeURIComponent(room)}&name=${encodeURIComponent(name)}`;
  },
  // Opens a room. on: { welcome, join, leave, message(m), close(reason) }
  connect(app, room, name, on) {
    const ws = new WebSocket(this.url(app, room, name)); let opened = false;
    const conn = { id: null, ws, send: m => ws.readyState === 1 && ws.send(JSON.stringify(m)), close: () => { conn.closed = true; ws.close(); } };
    ws.onopen = () => { opened = true; };
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.t === 'welcome') { conn.id = m.id; on.welcome?.(m); }
      else if (m.t === 'join') on.join?.(m.peer);
      else if (m.t === 'leave') on.leave?.(m.id);
      else if (m.t === 'full') on.close?.('That room is full.');
      else on.message?.(m);
    };
    ws.onclose = () => { if (!conn.closed) on.close?.(opened ? 'Disconnected from the server.' : NO_PARTY); };
    return conn;
  },
};
const NO_PARTY = "Can't reach the live server. Live chat and multiplayer need HitBoy Web-OS running on a server with WebSockets (Render, Railway, a VPS — see the README); static hosts like Vercel can't run it. You can point to another HitBoy server in Settings → Proxy.";
const RTC_CONFIG = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
const timeOf = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

APPS.chat = ALL_APPS.chat = { name: 'Live Chat', icon: realIcon('discord'), cat: 'Apps', w: 940, h: 620, run(body, win) {
  const me = OS.account?.name || OS.user;
  let conn = null, room = localStorage.getItem('novaos.chatRoom') || 'general', peers = new Map(), msgs = [];
  const rooms = () => [...new Set(['general', 'games', 'movies', 'help', ...JSON.parse(localStorage.getItem('novaos.chatRooms') || '[]')])];
  // streaming state
  let myStream = null; const outPCs = new Map(), inPCs = new Map(), live = new Set(); // live = peer ids streaming

  body.innerHTML = `<div class="chat"><aside><div class="chat-me">${avatar(OS.account, 30)}<div><b>${esc(me)}</b><small class="chat-status">Connecting…</small></div></div>
      <div class="section-label">Rooms</div><nav class="chat-rooms"></nav>
      <div class="row chat-newroom"><input placeholder="New room" maxlength="32"><button class="icon-btn" title="Join room">${glyph('plus', 15)}</button></div>
      <div class="section-label">Online</div><div class="chat-people"></div></aside>
    <section><header class="chat-head"><b class="chat-title"></b><span class="grow"></span>
      <button class="ghost small" data-a="live">${glyph('vm', 14)}<span>Go live</span></button></header>
      <div class="chat-streams hidden"></div>
      <div class="chat-log"></div>
      <form class="chat-send"><input maxlength="500" placeholder="Message" autocomplete="off"><button class="primary">Send</button></form></section></div>`;
  const $c = s => body.querySelector(s), log = $c('.chat-log');

  const drawRooms = () => { $c('.chat-rooms').innerHTML = rooms().map(r => `<button data-room="${esc(r)}" class="${r === room ? 'on' : ''}"># ${esc(r)}</button>`).join(''); $c('.chat-title').textContent = '# ' + room; };
  const drawPeople = () => {
    const list = [{ id: conn?.id, name: me + ' (you)' }, ...peers.values()];
    $c('.chat-people').innerHTML = list.map(p => `<div class="chat-person"><i class="dot ok"></i><span>${esc(p.name)}</span>${live.has(p.id) || (p.id === conn?.id && myStream) ? `<button class="chat-live" data-watch="${p.id}">LIVE</button>` : ''}</div>`).join('');
  };
  const line = m => {
    const d = document.createElement('div');
    if (m.sys) { d.className = 'chat-sys'; d.textContent = m.sys; }
    else { d.className = 'chat-msg' + (m.from === conn?.id ? ' mine' : ''); d.innerHTML = `<div><b></b><small>${timeOf(m.at)}</small></div><p></p>`; d.querySelector('b').textContent = m.name; d.querySelector('p').textContent = m.text; }
    const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
    log.appendChild(d); if (stick) log.scrollTop = 1e9;
  };
  const status = t => { $c('.chat-status').textContent = t; };

  const connect = () => {
    stopLive(); conn?.close(); peers.clear(); live.clear(); log.innerHTML = ''; drawRooms(); status('Connecting…');
    localStorage.setItem('novaos.chatRoom', room);
    conn = Party.connect('chat', room, me, {
      welcome: m => { status('Online'); m.peers.forEach(p => peers.set(p.id, p)); m.history.forEach(line); line({ sys: `You joined #${room}. Be kind — messages are visible to everyone in this room.` }); drawPeople(); },
      join: p => { peers.set(p.id, p); line({ sys: `${p.name} joined` }); drawPeople(); if (myStream) conn.send({ t: 'live', on: true, to: p.id }); },
      leave: id => { const p = peers.get(id); peers.delete(id); live.delete(id); closePC(inPCs, id); closePC(outPCs, id); removeTile(id); if (p) line({ sys: `${p.name} left` }); drawPeople(); },
      message: m => {
        if (m.t === 'msg') return line(m);
        if (m.t === 'slow') return line({ sys: 'Slow down a little.' });
        if (m.t === 'rename') { const p = peers.get(m.id); if (p) p.name = m.name; return drawPeople(); }
        if (m.t === 'live') { if (m.on) live.add(m.from); else { live.delete(m.from); closePC(inPCs, m.from); removeTile(m.from); } return drawPeople(); }
        if (m.t === 'watch') return offerTo(m.from);
        if (m.t === 'rtc') return signal(m);
      },
      close: reason => { status('Offline'); line({ sys: reason }); },
    });
  };

  // ---- streaming (WebRTC) ----
  const closePC = (map, id) => { map.get(id)?.close(); map.delete(id); };
  const tile_ = (id, name) => {
    const box = $c('.chat-streams'); box.classList.remove('hidden');
    let t = box.querySelector(`[data-stream="${id}"]`);
    if (!t) { t = document.createElement('div'); t.className = 'chat-stream'; t.dataset.stream = id; t.innerHTML = `<video autoplay playsinline></video><span></span><button class="icon-btn" title="Close">${glyph('close', 14)}</button>`; box.appendChild(t); }
    t.querySelector('span').textContent = name; return t;
  };
  const removeTile = id => { const t = $c(`[data-stream="${id}"]`); t?.remove(); if (!$c('.chat-stream')) $c('.chat-streams').classList.add('hidden'); };
  const offerTo = async id => {
    if (!myStream) return;
    closePC(outPCs, id); const pc = new RTCPeerConnection(RTC_CONFIG); outPCs.set(id, pc);
    myStream.getTracks().forEach(t => pc.addTrack(t, myStream));
    pc.onicecandidate = e => e.candidate && conn.send({ t: 'rtc', to: id, dir: 'out', ice: e.candidate });
    await pc.setLocalDescription(await pc.createOffer());
    conn.send({ t: 'rtc', to: id, dir: 'out', sdp: pc.localDescription });
  };
  const signal = async m => {
    if (m.dir === 'out') { // from a streamer to us (we watch)
      let pc = inPCs.get(m.from);
      if (m.sdp) {
        closePC(inPCs, m.from); pc = new RTCPeerConnection(RTC_CONFIG); inPCs.set(m.from, pc);
        pc.ontrack = e => { const v = tile_(m.from, (peers.get(m.from)?.name || 'Someone') + ' — live').querySelector('video'); v.srcObject = e.streams[0]; };
        pc.onicecandidate = e => e.candidate && conn.send({ t: 'rtc', to: m.from, dir: 'in', ice: e.candidate });
        await pc.setRemoteDescription(m.sdp); await pc.setLocalDescription(await pc.createAnswer());
        conn.send({ t: 'rtc', to: m.from, dir: 'in', sdp: pc.localDescription });
      } else if (m.ice && pc) await pc.addIceCandidate(m.ice).catch(() => {});
    } else { // from a viewer of our stream
      const pc = outPCs.get(m.from); if (!pc) return;
      if (m.sdp) await pc.setRemoteDescription(m.sdp); else if (m.ice) await pc.addIceCandidate(m.ice).catch(() => {});
    }
  };
  const goLive = async () => {
    try {
      const opts = [['vm', 'Share screen, window or tab', 'screen'], ['media', 'Share camera', 'cam'], ...(window.RecorderScene ? [['paint', 'Share Recorder scene (screen + camera + text)', 'scene']] : [])];
      const pick = await new Promise(res => OS.menu($('#ctx-menu'), opts.map(([g, n, k]) => [g, n, () => res(k)]), ...(() => { const r = $c('[data-a=live]').getBoundingClientRect(); return [r.left - 160, r.bottom + 4]; })()));
      if (pick === 'scene') {
        myStream = window.RecorderScene.stream();
        try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getAudioTracks().forEach(t => myStream.addTrack(t)); } catch (e) {} // add the mic if allowed
      } else myStream = pick === 'cam' ? await navigator.mediaDevices.getUserMedia({ video: true, audio: true }) : await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
    } catch (e) { myStream = null; return OS.toast('Sharing was cancelled or blocked.'); }
    myStream.getVideoTracks()[0].onended = () => stopLive();
    const t = tile_(conn.id, 'You — live'); t.querySelector('video').srcObject = myStream; t.querySelector('video').muted = true;
    conn.send({ t: 'live', on: true }); line({ sys: 'You are live. People in this room can press LIVE next to your name to watch.' });
    $c('[data-a=live] span').textContent = 'Stop'; drawPeople();
  };
  function stopLive() {
    if (!myStream) return;
    myStream.getTracks().forEach(t => t.stop()); myStream = null;
    for (const id of [...outPCs.keys()]) closePC(outPCs, id);
    conn?.send({ t: 'live', on: false }); removeTile(conn?.id); $c('[data-a=live] span').textContent = 'Go live'; drawPeople();
  }

  body.onclick = e => {
    const r = e.target.closest('[data-room]'); if (r && r.dataset.room !== room) { room = r.dataset.room; return connect(); }
    if (e.target.closest('.chat-newroom button')) {
      const inp = $c('.chat-newroom input'), name = inp.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 32); if (!name) return;
      localStorage.setItem('novaos.chatRooms', JSON.stringify([...new Set([...JSON.parse(localStorage.getItem('novaos.chatRooms') || '[]'), name])]));
      inp.value = ''; room = name; return connect();
    }
    const w = e.target.closest('[data-watch]');
    if (w) { const id = +w.dataset.watch; if (id === conn.id) return; if (inPCs.has(id)) return; tile_(id, (peers.get(id)?.name || '') + ' — connecting…'); return conn.send({ t: 'watch', to: id }); }
    const x = e.target.closest('.chat-stream .icon-btn');
    if (x) { const id = +x.closest('[data-stream]').dataset.stream; if (id === conn.id) stopLive(); else { closePC(inPCs, id); removeTile(id); } return; }
    if (e.target.closest('[data-a=live]')) return myStream ? stopLive() : goLive();
  };
  $c('.chat-send').onsubmit = e => { e.preventDefault(); const i = $c('.chat-send input'), text = i.value.trim(); if (!text || !conn) return; conn.send({ t: 'msg', text }); i.value = ''; };
  $c('.chat-newroom input').onkeydown = e => { if (e.key === 'Enter') $c('.chat-newroom button').click(); };
  win.cleanup.push(() => { stopLive(); for (const id of [...inPCs.keys()]) closePC(inPCs, id); conn?.close(); });
  connect();
} };
