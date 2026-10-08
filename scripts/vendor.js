// Copies the proxy client files out of node_modules so the site also works on static hosts
// (Vercel, GitHub Pages…) when pointed at an external Wisp server. Run after upgrading deps.
import { cpSync, mkdirSync } from 'node:fs';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { scramjetPath } from '@mercuryworkshop/scramjet/path';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
import { epoxyPath } from '@mercuryworkshop/epoxy-transport';
import { libcurlPath } from '@mercuryworkshop/libcurl-transport';

const copy = (from, to, files) => { mkdirSync(to, { recursive: true }); for (const f of files) cpSync(`${from}/${f}`, `${to}/${f}`); };
copy(scramjetPath, 'public/scram', ['scramjet.all.js', 'scramjet.sync.js', 'scramjet.wasm.wasm']);
copy(uvPath, 'public/uv', ['uv.bundle.js', 'uv.client.js', 'uv.handler.js', 'uv.sw.js']); // uv.config.js is ours
copy(baremuxPath, 'public/baremux', ['index.js', 'worker.js']);
copy(epoxyPath, 'public/epoxy', ['index.mjs']);
copy(libcurlPath, 'public/libcurl', ['index.mjs']);
console.log('Vendored proxy files into public/{scram,uv,baremux,epoxy,libcurl}');
