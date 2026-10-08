// NovaOS server: serves the OS from public/ and runs a Wisp server so the proxy browser works out of the box.
// Use this on hosts with WebSocket support (Render, Railway, Fly.io, a VPS…). Vercel serves public/ statically
// (see vercel.json) and the proxy falls back to a public Wisp server there.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

const app = express();
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url)), { extensions: ['html'] }));

const server = createServer(app);
server.on('upgrade', (req, socket, head) => {
  if (req.url.endsWith('/wisp/')) wisp.routeRequest(req, socket, head);
  else socket.end();
});

const port = +process.env.PORT || 8080;
server.listen(port, () => console.log(`NovaOS running at http://localhost:${port}`));
