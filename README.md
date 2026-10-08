# NovaOS — a web OS

A Linux-style desktop that runs in the browser: GRUB boot menu, boot splash (press Esc for the systemd log), a GNOME-style login screen with user accounts and optional passwords, a top bar, dock and app grid, quick settings, a notification center with calendar, windows you can drag, resize and snap, light and dark themes, and a persistent file system.

## Run it
```bash
npm install
npm start          # http://localhost:8080
```
`npm start` serves `public/` **and** a Wisp server, so the proxy browser uses your own server.

## Deploy
- **Vercel** — import the repo and deploy; `vercel.json` serves `public/` as a static site. Vercel can't host WebSockets, so the proxy automatically uses a public Wisp server (`wss://wisp.mercurywork.shop/`). You can point it at your own in **Settings → Proxy**.
- **Render / Railway / Fly.io / a VPS** — run `npm start` (it listens on `$PORT`). The proxy uses the built-in Wisp server, which is faster and doesn't depend on anyone else.
- **GitHub Pages / Netlify / any static host** — publish the `public/` folder. The proxy works the same way as on Vercel.

## What's inside
- **Proxy browser** — tabbed browser powered by [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) + bare-mux + epoxy over [Wisp](https://github.com/MercuryWorkshop/wisp-js). Bookmarks, history, new-tab page, proxy/direct toggle, open-in-about:blank.
- **App Store** — install YouTube, Discord, Spotify, Poki, Scratch, VS Code and more to your desktop; they open through the proxy.
- **Virtual PC** — boots real Windows 98/95/ME/2000/3.0/1.01, ReactOS, FreeDOS, Linux and KolibriOS via the [v86](https://github.com/copy/v86) emulator.
- **Game Hub** — offline games (Snake, 2048, Minesweeper, Tic-Tac-Toe, Breakout, Flappy Square), web games, and add-your-own by URL.
- **Apps** — Files, Notepad, Terminal, Paint, Calculator, Media Player, Task Manager, Settings.
- **Accounts** — first boot asks you to create an account; add more with “Not listed?” on the login screen and manage them in Settings → Users. Passwords are hashed and stored only in your browser — they keep casual users out, they are not real security.
- **Shortcuts** — `Ctrl+Space` app grid · ``Alt+` `` switch windows · `Alt+W` close window · `Alt+T` terminal · `Alt+L` lock.
- **Privacy** — tab disguise (title + icon), about:blank launcher, panic key.

The proxy client files in `public/uv/`, `public/baremux/` and `public/epoxy/` are copied from `node_modules` by `npm run vendor` (re-run after upgrading those packages). `public/uv/uv.config.js` and `public/uv/sw.js` are NovaOS's own.
