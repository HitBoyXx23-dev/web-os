import { createServer } from 'node:http';
import { handleParty, listRooms } from '../party.js';

const server = createServer((req, res) => {
  const query = new URL(req.url || '/', 'http://127.0.0.1').searchParams;
  if (req.method === 'GET' && (query.has('list') || query.has('app'))) {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify(listRooms(String(query.get('app') || ''))));
    return;
  }
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify({ ok: true }));
});
server.on('upgrade', (req, socket, head) => handleParty(req, socket, head));

export default server;
