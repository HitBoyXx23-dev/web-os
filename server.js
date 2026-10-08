// NovaOS server: serves the OS and runs a Wisp server so the proxy browser works out of the box.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

const root = fileURLToPath(new URL('.', import.meta.url));
const app = express();
app.use((req, res, next) => { if (/^\/(node_modules|server\.js|package)/.test(req.path)) return res.sendStatus(404); next(); });
app.use(express.static(root, { extensions: ['html'] }));

const server = createServer(app);
server.on('upgrade', (req, socket, head) => {
  if (req.url.endsWith('/wisp/')) wisp.routeRequest(req, socket, head);
  else socket.end();
});

const port = +process.env.PORT || 8080;
server.listen(port, () => console.log(`NovaOS running at http://localhost:${port}`));
