# NovaOS — a web OS

A desktop operating system that runs in the browser: login screen, windows you can drag, resize and snap to screen edges, a taskbar, a searchable start menu, quick settings, a calendar, light and dark themes, and a persistent file system.

## Run it
```bash
npm install
npm start          # http://localhost:8080
```
`npm start` serves the OS **and** a Wisp server, so the proxy browser works with no extra setup.
Deploy anywhere that runs Node (Render, Railway, Fly.io, a VPS, Replit…) — it listens on `$PORT`.

Static hosting (GitHub Pages) also works for everything except the proxy's backend: set an external Wisp server in **Settings → Proxy**.

## What's inside
- **Proxy browser** — tabbed browser powered by [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) + bare-mux + epoxy over [Wisp](https://github.com/MercuryWorkshop/wisp-js). Bookmarks, history, new-tab page, proxy/direct toggle, open-in-about:blank.
- **App Store** — install YouTube, Discord, Spotify, Poki, Scratch, VS Code and more to your desktop; they open through the proxy.
- **Virtual PC** — boots real Windows 98/95/ME/2000/3.0/1.01, ReactOS, FreeDOS, Linux and KolibriOS via the [v86](https://github.com/copy/v86) emulator.
- **Game Hub** — offline games (Snake, 2048, Minesweeper, Tic-Tac-Toe, Breakout, Flappy Square), web games, and add-your-own by URL.
- **Apps** — Files, Notepad, Terminal, Paint, Calculator, Media Player, Task Manager, Settings.
- **Shortcuts** — `Ctrl+Space` start menu · ``Alt+` `` switch windows · `Alt+W` close window · `Alt+T` terminal.
- **Privacy** — tab disguise (title + icon), about:blank launcher, panic key.

The proxy client files in `uv/`, `baremux/` and `epoxy/` are copied from `node_modules` by `npm run vendor` (re-run after upgrading those packages). `uv/uv.config.js` and `uv/sw.js` are NovaOS's own.
