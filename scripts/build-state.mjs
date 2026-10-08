// Boots a NovaBox VM in Node, waits for the login shell, and saves an instant-boot snapshot (.zst).
// usage: node scripts/build-state.mjs <vm dir> <raw disk.img> <memory MB> <prompt regex>
import fs from 'node:fs';
import { V86 } from 'v86';
import zstd from '@bokuweb/zstd-wasm';

const [dir, disk, memMb, prompt] = process.argv.slice(2);
const emu = new V86({
  wasm_path: 'public/v86/v86.wasm', bios: { url: 'public/v86/seabios.bin' }, vga_bios: { url: 'public/v86/vgabios.bin' },
  bzimage: { url: `${dir}/vmlinuz` }, initrd: { url: `${dir}/initrd` },
  hda: { url: disk, async: true, size: fs.statSync(disk).size },
  cmdline: 'root=/dev/sda rw console=ttyS0 console=tty1 tsc=reliable mitigations=off random.trust_cpu=on quiet init_on_free=on',
  memory_size: memMb * 1048576, vga_memory_size: 8 * 1048576,
  net_device: { type: 'virtio', relay_url: 'fetch' }, autostart: true, screen_dummy: true,
});
let out = '', saving = false; const t0 = Date.now();
emu.add_listener('serial0-output-byte', async b => {
  out = (out + String.fromCharCode(b)).slice(-400);
  if (saving || !new RegExp(prompt + '$').test(out)) return;
  saving = true;
  console.log(`logged in after ${((Date.now() - t0) / 1000).toFixed(0)}s, settling…`);
  emu.serial0_send('clear; sync; echo 3 | sudo tee /proc/sys/vm/drop_caches >/dev/null; clear\n');
  setTimeout(async () => {
    const state = new Uint8Array(await emu.save_state());
    await zstd.init();
    const z = zstd.compress(state, 19);
    fs.writeFileSync(`${dir}/state.bin.zst`, z);
    console.log(`state ${(state.length / 1048576).toFixed(0)} MB -> ${(z.length / 1048576).toFixed(1)} MB`);
    emu.destroy(); process.exit(0);
  }, 15000);
});
setTimeout(() => { console.error('timed out'); process.exit(1); }, 15 * 60 * 1000);
