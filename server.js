import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';
import { handleParty, listRooms } from './party.js';
import { sendImage } from './lib/generate.js';
import { isHorde, readJson, sendMoss } from './lib/moss.js';
import { sendYouTube } from './lib/youtube.js';

const app = express();
app.use('/vm/ubuntu24', (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
const rooms = (req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.json(listRooms(String(req.query.app || '')));
};
app.get('/party/rooms', rooms);
app.get('/api/party', (req, res) => {
  if ('list' in req.query || 'app' in req.query) return rooms(req, res);
  res.json({ ok: true });
});
app.get('/api/wisp', (req, res) => res.json({ ok: true }));
const generate = async (req, res) => {
  if (req.method === 'POST') req.body = await readJson(req);
  const style = String((req.body && req.body.style) || req.query.style || '');
  if (isHorde(style)) return sendMoss(req, res);
  return sendImage(req, res);
};
app.get('/api/generate', generate);
app.post('/api/generate', express.json({ limit: '8mb' }), generate);
app.delete('/api/generate', generate);
app.get('/api/youtube', (req, res) => sendYouTube(req, res));
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url)), { extensions: ['html'] }));

const server = createServer(app);
server.on('upgrade', (req, socket, head) => {
  const path = (req.url || '').split('?')[0];
  if (path.includes('wisp')) {
    if (!path.endsWith('/')) req.url = path + '/' + ((req.url || '').includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '');
    wisp.routeRequest(req, socket, head);
  }
  else if (path.includes('party')) handleParty(req, socket, head);
  else socket.destroy();
});

const port = +process.env.PORT || 8080;
server.listen(port, () => console.log(`HitBoy Web-OS running at http://localhost:${port}`));
