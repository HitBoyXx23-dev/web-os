// Builds the js-dos bundles in public/dos/ from the original shareware releases, which id Software and
// Apogee allow to be freely redistributed unmodified. Run once: `npm run dos-bundles`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { unzipSync, zipSync, strToU8 } from 'fflate';

const conf = exe => `[sdl]
autolock=false
[dosbox]
machine=svga_s3
memsize=16
[cpu]
core=auto
cputype=auto
cycles=max
[mixer]
rate=44100
[sblaster]
sbtype=sb16
sbbase=220
irq=7
dma=1
hdma=5
[autoexec]
@echo off
mount c .
c:
${exe}
`;

const GAMES = [
  { out: 'doom', exe: 'DOOM.EXE', url: 'https://archive.org/download/DoomsharewareEpisode/doom.ZIP',
    keep: n => /^(DOOM\.EXE|DOOM1\.WAD|DEFAULT\.CFG|README\.TXT|ORDER\.FRM)$/i.test(n) },
  { out: 'wolf3d', exe: 'WOLF3D.EXE', url: 'https://archive.org/download/Wolfenstein3d/Wolfenstein3dV14sw.ZIP',
    keep: n => /\.(EXE|WL1)$/i.test(n) },
  { out: 'keen1', exe: 'KEEN1.EXE', url: 'https://archive.org/download/msdos_Commander_Keen_1_-_Marooned_on_Mars_1990/Commander_Keen_1_-_Marooned_on_Mars_1990.zip',
    keep: n => /^(KEEN1\.EXE|ORDER\.FRM)$/i.test(n) || (/\.CK1$/i.test(n) && !/^SAVED/i.test(n)) },
];

mkdirSync('public/dos', { recursive: true });
for (const g of GAMES) {
  const res = await fetch(g.url);
  if (!res.ok) throw new Error(`${g.url}: HTTP ${res.status}`);
  const files = {};
  for (const [path, data] of Object.entries(unzipSync(new Uint8Array(await res.arrayBuffer())))) {
    const name = path.split('/').pop();
    if (name && g.keep(name)) files[name.toUpperCase()] = data;
  }
  if (!files[g.exe]) throw new Error(`${g.out}: ${g.exe} missing from archive`);
  files['.jsdos/dosbox.conf'] = strToU8(conf(g.exe));
  const zip = zipSync(files, { level: 9 });
  writeFileSync(`public/dos/${g.out}.jsdos`, zip);
  console.log(`public/dos/${g.out}.jsdos  ${(zip.length / 1048576).toFixed(2)} MB  (${Object.keys(files).length} files)`);
}
