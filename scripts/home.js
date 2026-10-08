// Home relay: runs HitBoy Web-OS (with its Wisp relay and Live server) on this computer and opens a free
// Cloudflare quick tunnel to it, so sites see your home internet instead of a shared server.
//   npm run home                                     → prints the tunnel address
//   npm run home -- https://hitboy-web-os.vercel.app → also prints a one-click link that connects that site
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const site = (process.argv[2] || '').replace(/\/$/, '');
const port = +process.env.PORT || 8080;
process.env.PORT = port;
await import('../server.js');

// The tunnel tool is installed on first use only (it downloads Cloudflare's cloudflared program).
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
  const relay = url.replace(/^https:/, 'wss:');
  console.log(`
  HitBoy Web-OS is running at home.

  Open it directly:   ${url}
  Wisp server:        ${relay}/wisp/
  Live server:        ${relay}
${site ? `
  One-click setup for your site (open this link, then confirm):
  ${site}/#relay=${encodeURIComponent(relay)}
` : `
  To connect your Vercel site, open:  https://your-site.vercel.app/#relay=${encodeURIComponent(relay)}
  (or paste the addresses above into Settings → Proxy)
`}
  Keep this window open. The address changes each time you start it.`);
});
tunnel.on('error', e => console.error('Tunnel error:', e.message));
tunnel.on('exit', code => { console.log('Tunnel closed' + (code ? ` (code ${code})` : '') + '.'); process.exit(code || 0); });
process.on('SIGINT', () => { tunnel.stop(); process.exit(0); });
