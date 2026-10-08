#!/usr/bin/env python3
"""Split a raw disk image into zstd-compressed fixed-size parts that v86 loads on demand.

usage: split-disk.py IMAGE OUT_DIR [CHUNK_BYTES]
Writes OUT_DIR/disk-<start>-<end>.img.zst, matching v86's `hda: { url: 'OUT_DIR/disk.img.zst', use_parts: true }`.
"""
import os, sys
import zstandard  # pip install zstandard

image, out = sys.argv[1], sys.argv[2]
chunk = int(sys.argv[3]) if len(sys.argv) > 3 else 1024 * 1024
os.makedirs(out, exist_ok=True)
cctx = zstandard.ZstdCompressor(level=19)
size = os.path.getsize(image)
assert size % chunk == 0, 'image size must be a multiple of the chunk size'
total = 0
with open(image, 'rb') as f:
    for start in range(0, size, chunk):
        data = cctx.compress(f.read(chunk))
        total += len(data)
        with open(os.path.join(out, f'disk-{start}-{start + chunk}.img.zst'), 'wb') as o:
            o.write(data)
print(f'{size // chunk} parts, {total / 1048576:.1f} MB compressed')
