#!/usr/bin/env bash
# Builds Ubuntu 24.04 (x86-64) for the browser with container2wasm into public/vm/ubuntu24/image/.
# Needs: docker with buildx, Go 1.22+, git. Takes a while (it compiles the Bochs emulator).
set -euo pipefail
cd "$(dirname "$0")/.."
C2W_REV=${C2W_REV:-3f0f9be4d5ee201ea1a12f9700e6e3ef52c8b345}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
OUT=public/vm/ubuntu24/image

git clone https://github.com/ktock/container2wasm "$WORK/c2w" && git -C "$WORK/c2w" checkout "$C2W_REV"
(cd "$WORK/c2w" && go build -o "$WORK/c2w-bin" ./cmd/c2w)
docker build -t hitboy-ubuntu:24.04 images/ubuntu24
"$WORK/c2w-bin" --assets "$WORK/c2w" hitboy-ubuntu:24.04 "$WORK/ubuntu.wasm"

rm -rf "$OUT" && mkdir -p "$OUT"
gzip -9 -c "$WORK/ubuntu.wasm" | split -b 45000000 -d - "$OUT/ubuntu.wasm.gz."
python3 - "$OUT" <<'PY'
import json, os, sys
d = sys.argv[1]; parts = sorted(f for f in os.listdir(d) if f.startswith('ubuntu.wasm.gz.'))
json.dump({'parts': parts, 'bytes': sum(os.path.getsize(os.path.join(d, f)) for f in parts), 'gzip': True}, open(os.path.join(d, 'manifest.json'), 'w'))
PY
du -sh "$OUT"
