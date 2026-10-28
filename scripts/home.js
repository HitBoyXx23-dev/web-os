import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const port = +process.env.PORT || 8080;
process.env.PORT = port;
await import('../server.js');

const require = createRequire(import.meta.url);
let cf;
try { cf = require('cloudflared'); }
catch (e) {
  console.log('Installing the Cloudflare tunnel tool (first run only)…');
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--no-save', 'cloudflared@0.7.3'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error('Could not install cloudflared. Install it yourself (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) and run: cloudflared tunnel --url http://localhost:' + port); process.exit(1); }
  cf = require('cloudflared');
}
if (!existsSync(cf.bin)) { console.log('Downloading cloudflared…'); await cf.install(cf.bin); }

const tunnel = cf.Tunnel.quick(`http://localhost:${port}`);
tunnel.once('url', url => {
  console.log(`
  HitBoy Web-OS is running on this computer.

  Open it here:  ${url}

  The Vercel site uses Vercel as its server on its own.
  This address is only the copy running on this computer.
  Keep this window open. The address changes each time you start it.`);
});
tunnel.on('error', e => console.error('Tunnel error:', e.message));
tunnel.on('exit', code => { console.log('Tunnel closed' + (code ? ` (code ${code})` : '') + '.'); process.exit(code || 0); });
process.on('SIGINT', () => { tunnel.stop(); process.exit(0); });
