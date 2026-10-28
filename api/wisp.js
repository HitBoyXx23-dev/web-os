import { createServer } from 'node:http';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify({ ok: true }));
});
server.on('upgrade', (req, socket, head) => {
  const raw = req.url || '/';
  const cut = raw.indexOf('?');
  const path = cut === -1 ? raw : raw.slice(0, cut);
  if (!path.endsWith('/')) req.url = path + '/' + (cut === -1 ? '' : raw.slice(cut));
  wisp.routeRequest(req, socket, head);
});

export default server;
