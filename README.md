# HitBoy Web-OS

A desktop OS that runs in the browser: GRUB boot menu, boot splash (press Esc for the systemd log), a login screen with user accounts, a choice of desktops (Windows 11/10, macOS, GNOME/Ubuntu, KDE, a text-only console, or your own mix), quick settings, a notification center, real app icons, windows you can drag, resize and snap, light and dark themes, a real file system, and it installs as an app and works offline.

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
- **Setup** — the first boot runs a setup wizard: choose your desktop, theme, account and options (proxy, boot menu, desktop icons, tab disguise). Run it again from **Settings → System** or with `setup` in the terminal.
- **Desktop styles** — pick one in setup or in **Settings → Desktop**: HitBoy (the original desktop), Windows 11, Windows 10, macOS, Ubuntu, GNOME, KDE Plasma, or **Command line**. The command line is text only: it boots with text messages to a `login:` prompt, and no windows, pop-ups or desktop appear (`startx` starts a desktop, `lock`, `logout`, `reboot` and `poweroff` work as on Linux). **Hybrid** mixes the parts freely (top bar, taskbar or dock, launcher, window buttons), with 12 themes (Arch, Ubuntu Yaru, Catppuccin, Nord, Dracula, Gruvbox, Hyprland/Wayland-style glass…), corner radius and transparency. The terminal has `desktops`, `startx` and `theme`.
- **Move apps** — drag desktop icons anywhere (they snap to a grid, swap places and stay put), drag apps along the dock or taskbar to reorder them, and drag apps from the app grid or Start menu onto the desktop (adds a shortcut) or the dock (pins it). Right-click the desktop for **Arrange Icons**, or an icon for **Remove from Desktop**.
- **HitBoy sites** — [HitBoyFlix](https://hitboyflix.vercel.app), [HitBoyStream](https://hitboystream.vercel.app) and [NaviAnime](https://navianime.vercel.app) come installed on the desktop, are in the App Store, and are at the top of Movies.
- **Run** — opens programs and game files with the right emulator: DOS `.exe`/`.com`/`.bat` and `.zip`s in DOSBox; Windows programs in a Windows 98 virtual machine with your files on drive D:; Flash `.swf` in [Ruffle](https://ruffle.rs); Python `.py` in [Pyodide](https://pyodide.org); console games you own (`.nes`, `.sfc`, `.gba`, `.md`, `.n64`…) in [EmulatorJS](https://emulatorjs.org); `.iso`/`.img` in VMBox. Also available from **Files → Run…**. Modern 64-bit Windows apps can't run in a browser.
- **VMBox** — a VirtualBox-style virtual machine manager (powered by [v86](https://github.com/copy/v86)). Create machines from templates or your own ISO / hard-disk / floppy image, set memory and networking, and run them in windows with Pause, Reset, Ctrl+Alt+Del, Save State, Screenshot and Full Screen. Templates include:
  - **Ubuntu 18.04 LTS** — real Ubuntu (Ubuntu's own 4.15 kernel and packages), boots in seconds from a snapshot, internet and `apt` work through the Wisp server. Built from the official `i386/ubuntu:bionic` image by `scripts/build-ubuntu18.sh` (hosted in this repo).
  - **Ubuntu 24.04 LTS** — real x86-64 Ubuntu via [container2wasm](https://github.com/ktock/container2wasm); slower, terminal only, no network, opens in its own tab (it needs cross-origin isolation). Its image is built on GitHub: run the **Build Ubuntu 24.04** workflow in the Actions tab once (about 30–60 min), it commits the image, then redeploy.
  - **Arch Linux** (Arch Linux 32, boots in seconds), Tiny Core, Damn Small Linux, Android 1.6, **Windows 98** (boots in seconds), Windows 95/2000/NT 4/3.0/1.01, FreeBSD, OpenBSD, NetBSD, ReactOS, Haiku, SerenityOS, BeOS, KolibriOS, 9front, MS-DOS and FreeDOS — streamed on demand from the v86 project's public image host.
- **Proxy browser** — tabbed browser powered by [Scramjet](https://github.com/MercuryWorkshop/scramjet) (handles YouTube, Discord, Spotify…), with [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) as a fallback engine. Traffic goes through bare-mux and libcurl or epoxy (both end-to-end encrypted) over [Wisp](https://github.com/MercuryWorkshop/wisp-js). Choose the engine and transport in **Settings → Proxy**. Bookmarks, history, new-tab page, open-in-about:blank.
- **Linux** — a quick x86 Linux terminal (Buildroot, kernel 6.8) with an [xterm.js](https://xtermjs.org) terminal, internet through the same Wisp server, and your Home folder shared at `/mnt` (press **Save /mnt to Home** to copy changes back).
- **Classic DOS games** — Doom, Wolfenstein 3D and Commander Keen (episode 1 shareware releases) running in [js-dos](https://js-dos.com).
- **Games** — 115+ games in categories with search: built-ins (Snake, 2048, Minesweeper, Tic-Tac-Toe, Breakout, Flappy, Doom, Wolfenstein 3D, Keen) plus web games from their official sites — multiplayer (Minecraft Classic, Krunker, Shell Shockers, Slither.io, Bloxd.io, Smash Karts, TETR.IO, Lichess, Skribbl.io…), action, racing, sports, puzzle, idle, strategy and sandbox. Web games open through the proxy; add your own by URL.
- **Movies** — thousands of public-domain films from the [Internet Archive](https://archive.org) (classics, comedy, noir, sci-fi & horror, silent films, cartoons, open movies like Big Buck Bunny), with search, plus links to free ad-supported services (Tubi, Pluto TV, Plex, Kanopy).
- **Recorder** — an OBS-style recorder: capture your screen, a window or a tab, add your camera as a picture-in-picture, the microphone and a text overlay, and save a WebM to Videos.
- **Files** — stored in IndexedDB (binary files, no 5 MB limit). Upload, drag and drop from your computer, download, rename, Open With, image/PDF viewer.
- **Text Editor** — CodeMirror with syntax highlighting for HTML, CSS, JS, JSON, Python, Markdown and shell, plus live **Preview** for HTML files.
- **App Store** — install YouTube, Discord, Spotify, Twitch, TikTok, Poki, Scratch, VS Code, 3D tools (SculptGL, three.js editor, Tinkercad), creative apps (Photopea, Pixlr, miniPaint, Kleki, AudioMass, Excalidraw, diagrams.net), Google Docs, Microsoft 365, Notion, Figma, Canva, Desmos, Replit and more; they open through the proxy.
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
- [CodeMirror](https://codemirror.net) and [xterm.js](https://xtermjs.org) (MIT), loaded from cdnjs. [Ruffle](https://ruffle.rs), [Pyodide](https://pyodide.org), [EmulatorJS](https://emulatorjs.org) and [fflate](https://github.com/101arrowz/fflate), loaded from jsDelivr.
- Web games, apps and streaming services belong to their owners and are opened from their official sites. Films come from the Internet Archive's public-domain collections. Site icons come from Google's favicon service.
