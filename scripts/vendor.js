// Copies the proxy client files out of node_modules so the site also works on static hosts
// (GitHub Pages etc.) when pointed at an external Wisp server. Run after upgrading deps.
import { cpSync, mkdirSync } from 'node:fs';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
import { epoxyPath } from '@mercuryworkshop/epoxy-transport';

const copy = (from, to, files) => { mkdirSync(to, { recursive: true }); for (const f of files) cpSync(`${from}/${f}`, `${to}/${f}`); };
copy(uvPath, 'uv', ['uv.bundle.js', 'uv.client.js', 'uv.handler.js', 'uv.sw.js']); // uv.config.js and sw.js are ours
copy(baremuxPath, 'baremux', ['index.js', 'worker.js']);
copy(epoxyPath, 'epoxy', ['index.mjs']);
console.log('Vendored proxy files into uv/, baremux/, epoxy/');
