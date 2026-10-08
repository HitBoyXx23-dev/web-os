// Party server: WebSocket rooms for live chat, live streams and multiplayer games.
// Clients connect to /party/?app=chat|game|live&room=NAME&name=NICK. Messages are JSON objects; the server adds
// `from` and relays them to everyone else in the room (or only to `to`). Nothing is stored on disk.
// The room's owner (its longest-connected member) can publish a small `meta` object (title, game, …); rooms
// with meta and `public: true` are listed by GET /party/rooms?app=… so people can find streams and games.
import { WebSocketServer } from 'ws';

const LIMITS = { // bytes per message, messages per 10 s
  chat: { size: 64 * 1024, rate: 400 }, // chat text is limited below; streams relay WebRTC signalling
  game: { size: 16 * 1024, rate: 400 },
  live: { size: 64 * 1024, rate: 400 }, // a streamer and viewers: WebRTC signalling + chat
};
const MAX_ROOM = { chat: 100, game: 10, live: 60 };
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
  if (!room.clients.size) { room.owner = id; room.meta = null; }
  send(ws, { t: 'welcome', id, room: roomName, owner: room.owner, meta: room.meta, peers: [...room.clients.values()].map(c => c.info), history: room.history });
  room.clients.set(id, ws); others({ t: 'join', peer: ws.info });

  let count = 0; const reset = setInterval(() => { count = 0; }, 10000);
  ws.on('message', raw => {
    if (++count > LIMITS[app].rate || raw.length > LIMITS[app].size) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    m.from = id;
    if (m.t === 'meta') { // only the owner describes the room
      if (id !== room.owner || !m.meta || typeof m.meta !== 'object') return;
      const x = m.meta; room.meta = { title: clean(x.title, 80), kind: clean(x.kind, 24), name: clean(x.name || ws.info.name, 24), public: !!x.public, started: room.meta?.started || Date.now(), state: clean(x.state, 24) };
      return others({ t: 'meta', meta: room.meta });
    }
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
    if (!room.clients.size) return rooms.delete(key);
    if (room.owner === id) { room.owner = Math.min(...room.clients.keys()); if (app === 'live') room.meta = null; others({ t: 'owner', id: room.owner, meta: room.meta }); } // a stream ends with its streamer
  });
  ws.on('error', () => {});
}

// Public rooms for an app (streams that are live, game rooms that are open).
export function listRooms(app) {
  const out = [];
  for (const [key, room] of rooms) {
    const [a, name] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (a !== app || !room.meta?.public) continue;
    out.push({ room: name, people: room.clients.size, max: MAX_ROOM[a], ...room.meta });
  }
  return out.sort((x, y) => y.people - x.people).slice(0, 100);
}
