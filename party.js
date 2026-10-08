// Party server: WebSocket rooms for live chat, screen-share streams and multiplayer games.
// Clients connect to /party/?app=chat|game&room=NAME&name=NICK. Messages are JSON objects; the server adds
// `from` and relays them to everyone else in the room (or only to `to`). Nothing is stored on disk.
import { WebSocketServer } from 'ws';

const LIMITS = { // bytes per message, messages per 10 s
  chat: { size: 64 * 1024, rate: 400 }, // chat text is limited below; streams relay WebRTC signalling
  game: { size: 16 * 1024, rate: 400 },
};
const MAX_ROOM = { chat: 100, game: 8 };
const HISTORY = 60;
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);

const rooms = new Map(); // "app:room" -> { clients: Map(id -> ws), history: [] }
let nextId = 1;
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

export function handleParty(req, socket, head) {
  const u = new URL(req.url, 'http://x'), app = u.searchParams.get('app');
  if (!LIMITS[app]) return socket.destroy();
  wss.handleUpgrade(req, socket, head, ws => join(ws, app, clean(u.searchParams.get('room'), 32).toLowerCase() || 'lobby', clean(u.searchParams.get('name'), 24) || 'Guest'));
}

function join(ws, app, roomName, name) {
  const key = app + ':' + roomName;
  if (!rooms.has(key)) rooms.set(key, { clients: new Map(), history: [] });
  const room = rooms.get(key);
  if (room.clients.size >= MAX_ROOM[app]) { ws.send(JSON.stringify({ t: 'full' })); return ws.close(); }
  const id = nextId++; ws.info = { id, name, joined: Date.now() };
  const send = (c, m) => { if (c.readyState === 1) c.send(typeof m === 'string' ? m : JSON.stringify(m)); };
  const others = m => { for (const c of room.clients.values()) if (c !== ws) send(c, m); };
  send(ws, { t: 'welcome', id, room: roomName, peers: [...room.clients.values()].map(c => c.info), history: room.history });
  room.clients.set(id, ws); others({ t: 'join', peer: ws.info });

  let count = 0; const reset = setInterval(() => { count = 0; }, 10000);
  ws.on('message', raw => {
    if (++count > LIMITS[app].rate || raw.length > LIMITS[app].size) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    m.from = id;
    if (m.t === 'name') { ws.info.name = clean(m.name, 24) || ws.info.name; return others({ t: 'rename', id, name: ws.info.name }); }
    if (m.t === 'msg') { // chat text: short, rate-limited harder, kept in recent history
      const now = Date.now(); ws.recent = (ws.recent || []).filter(t => now - t < 10000);
      if (ws.recent.length >= 8) return send(ws, { t: 'slow' });
      ws.recent.push(now);
      const out = { t: 'msg', from: id, name: ws.info.name, text: clean(m.text, 500), at: now };
      if (!out.text) return;
      room.history.push(out); if (room.history.length > HISTORY) room.history.shift();
      send(ws, out); return others(out);
    }
    const data = JSON.stringify(m);
    if (m.to) { const c = room.clients.get(m.to); if (c) send(c, data); } else others(data);
  });
  ws.on('close', () => {
    clearInterval(reset); room.clients.delete(id); others({ t: 'leave', id });
    if (!room.clients.size) rooms.delete(key);
  });
  ws.on('error', () => {});
}
