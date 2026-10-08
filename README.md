# HitBoy Web-OS

A Linux-style desktop that runs in the browser: GRUB boot menu, boot splash (press Esc for the systemd log), a GNOME-style login screen with user accounts, a top bar, dock and app grid, quick settings, a notification center, real app icons, windows you can drag, resize and snap, light and dark themes, a real file system, and it installs as an app and works offline.

## Run it
```bash
npm install
npm start          # http://localhost:8080
```
`npm start` serves `public/` **and** a Wisp server, so the proxy browser and Linux networking use your own server.

## Deploy
- **Render (recommended)** — `render.yaml` is included: create a new Blueprint from this repo and it runs `npm start`. The proxy uses the built-in Wisp server, which is the fastest and most reliable setup for YouTube, Discord and other heavy sites. Railway, Fly.io or any VPS work the same way (it listens on `$PORT`).
- **Vercel** — import the repo and deploy; `vercel.json` serves `public/` as a static site. Vercel can't host WebSockets, so the proxy falls back to a public Wisp server (`wss://wisp.mercurywork.shop/`) — it works, but video is slower. Point it at your own in **Settings → Proxy**.
- **GitHub Pages / Netlify / any static host** — publish the `public/` folder. Same as Vercel.

## What's inside
- **VMBox** — a VirtualBox-style virtual machine manager (powered by [v86](https://github.com/copy/v86)). Create machines from templates or your own ISO / hard-disk / floppy image, set memory and networking, and run them in windows with Pause, Reset, Ctrl+Alt+Del, Save State, Screenshot and Full Screen. Templates include:
  - **Ubuntu 18.04 LTS** — real Ubuntu (Ubuntu's own 4.15 kernel and packages), boots in seconds from a snapshot, internet and `apt` work through the Wisp server. Built from the official `i386/ubuntu:bionic` image by `scripts/build-ubuntu18.sh` (hosted in this repo).
  - **Ubuntu 24.04 LTS** — real x86-64 Ubuntu via [container2wasm](https://github.com/ktock/container2wasm); slower, terminal only, no network, opens in its own tab (it needs cross-origin isolation). Its image is built on GitHub: run the **Build Ubuntu 24.04** workflow in the Actions tab once (about 30–60 min), it commits the image, then redeploy.
  - **Arch Linux** (Arch Linux 32, boots in seconds), Tiny Core, Damn Small Linux, Android 1.6, **Windows 98** (boots in seconds), Windows 95/2000/NT 4/3.0/1.01, FreeBSD, OpenBSD, NetBSD, ReactOS, Haiku, SerenityOS, BeOS, KolibriOS, 9front, MS-DOS and FreeDOS — streamed on demand from the v86 project's public image host.
- **Proxy browser** — tabbed browser powered by [Scramjet](https://github.com/MercuryWorkshop/scramjet) (handles YouTube, Discord, Spotify…), with [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) as a fallback engine. Traffic goes through bare-mux and libcurl or epoxy (both end-to-end encrypted) over [Wisp](https://github.com/MercuryWorkshop/wisp-js). Choose the engine and transport in **Settings → Proxy**. Bookmarks, history, new-tab page, open-in-about:blank.
- **Linux** — a quick x86 Linux terminal (Buildroot, kernel 6.8) with an [xterm.js](https://xtermjs.org) terminal, internet through the same Wisp server, and your Home folder shared at `/mnt` (press **Save /mnt to Home** to copy changes back).
- **Classic DOS games** — Doom, Wolfenstein 3D and Commander Keen (episode 1 shareware releases) running in [js-dos](https://js-dos.com).
- **Games** — Snake, 2048, Minesweeper, Tic-Tac-Toe, Breakout, Flappy, web games, and add-your-own by URL.
- **Files** — stored in IndexedDB (binary files, no 5 MB limit). Upload, drag and drop from your computer, download, rename, Open With, image/PDF viewer.
- **Text Editor** — CodeMirror with syntax highlighting for HTML, CSS, JS, JSON, Python, Markdown and shell, plus live **Preview** for HTML files.
- **App Store** — install YouTube, Discord, Spotify, Twitch, TikTok, Poki, Scratch, VS Code and more to your desktop; they open through the proxy.
- **More apps** — Terminal, Paint (saves into Pictures), Calculator, Videos, System Monitor, Settings.
- **Accounts** — first boot asks you to create an account; add more with "Not listed?" on the login screen and manage them in Settings → Users. Passwords are hashed and stored only in your browser — they keep casual users out, they are not real security.
- **Shortcuts** — `Ctrl+Space` app grid · ``Alt+` `` switch windows · `Alt+W` close window · `Alt+T` terminal · `Alt+L` lock.
- **Privacy** — tab disguise (title + icon), about:blank launcher, panic key.

## Maintenance
- `npm run vendor` copies the proxy client files (Scramjet, Ultraviolet, bare-mux, epoxy, libcurl) from `node_modules` into `public/`. Re-run after upgrading those packages.
- `npm run dos-bundles` rebuilds `public/dos/*.jsdos` from the original shareware archives.
- `scripts/build-ubuntu18.sh` rebuilds Ubuntu 18.04 (`images/ubuntu18/Dockerfile`) into `public/vm/ubuntu18/`: an ext4 disk split into 1 MB zstd chunks that load on demand, plus a snapshot taken after login (`scripts/build-state.mjs`). Needs Docker, `mke2fs`, `pip install zstandard`.
- `scripts/build-ubuntu24.sh` (also run by `.github/workflows/build-ubuntu24.yml`) builds Ubuntu 24.04 (`images/ubuntu24/Dockerfile`) with container2wasm into `public/vm/ubuntu24/image/`.
- `public/sw.js` is the single service worker: it serves both proxy engines and caches the OS for offline use. `public/uv/uv.config.js` is HitBoy Web-OS's own.

## Credits
- Icons: [Papirus icon theme](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme) (GPL-3.0). Product logos are trademarks of their owners.
- Scramjet, bare-mux, epoxy, libcurl-transport and wisp-js by [Mercury Workshop](https://github.com/MercuryWorkshop); Ultraviolet by Titanium Network.
- [v86](https://github.com/copy/v86) by Fabian Hemmer (BSD-2-Clause); BIOS, the Buildroot image and the VMBox template images (Arch, Windows, BSDs, …) come from the v86 project.
- [container2wasm](https://github.com/ktock/container2wasm) (Apache-2.0) and [browser_wasi_shim](https://github.com/bjorn3/browser_wasi_shim) for Ubuntu 24.04. Ubuntu is a trademark of Canonical Ltd.; Windows is a trademark of Microsoft.
- [js-dos](https://js-dos.com) / DOSBox. Doom and Wolfenstein 3D shareware © id Software; Commander Keen shareware © id Software / Apogee — distributed unmodified as permitted by their shareware licences.
- [CodeMirror](https://codemirror.net) and [xterm.js](https://xtermjs.org) (MIT), loaded from cdnjs.
