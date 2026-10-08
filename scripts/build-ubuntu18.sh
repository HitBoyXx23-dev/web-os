#!/usr/bin/env bash
# Builds Ubuntu 18.04 LTS (i386, Ubuntu's own 4.15 kernel) for VMBox into public/vm/ubuntu18/.
# Needs: docker, e2fsprogs (mke2fs), python3 + `pip install zstandard`, node (npm install).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/vm/ubuntu18
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
SIZE_MB=1024   # virtual disk size; only blocks that are actually read get downloaded

docker build --platform linux/386 -t hitboy-ubuntu:18.04 images/ubuntu18
cid=$(docker create --platform linux/386 hitboy-ubuntu:18.04)
mkdir "$WORK/root"
docker export "$cid" | tar -x -C "$WORK/root" --numeric-owner
docker rm "$cid" >/dev/null

# Files Docker keeps read-only during the build
echo ubuntu > "$WORK/root/etc/hostname"
printf '127.0.0.1 localhost\n127.0.1.1 ubuntu\n' > "$WORK/root/etc/hosts"
rm -f "$WORK/root/etc/resolv.conf" && ln -s /run/systemd/resolve/resolv.conf "$WORK/root/etc/resolv.conf"

rm -rf "$OUT" && mkdir -p "$OUT"
cp "$WORK"/root/boot/vmlinuz-* "$OUT/vmlinuz"
cp "$WORK"/root/boot/initrd.img-* "$OUT/initrd"
mke2fs -q -t ext4 -L ubuntu -O ^metadata_csum,^64bit -E root_owner=0:0 -d "$WORK/root" "$WORK/disk.img" "${SIZE_MB}M"
python3 scripts/split-disk.py "$WORK/disk.img" "$OUT"
echo "{\"size\": $((SIZE_MB * 1024 * 1024)), \"chunk\": 1048576}" > "$OUT/disk.json"
# Boot once and snapshot the logged-in machine so it starts in seconds in the browser.
node scripts/build-state.mjs "$OUT" "$WORK/disk.img" 256 'ubuntu@ubuntu:~\$ '
rm -f "$OUT/vmlinuz" "$OUT/initrd" "$OUT/disk.json"  # only the snapshot + disk are needed at runtime
du -sh "$OUT"
