# NovaOS — a web OS

A desktop operating system that runs entirely in the browser: boot screen, login, draggable/resizable windows, taskbar, start menu with search, right-click menu, and a persistent file system.

**Open `index.html`** (or serve the folder: `python3 -m http.server`). Deploys as-is to GitHub Pages.

## What's inside
- **Virtual PC** — boots real operating systems (Windows 98/95/ME/2000/3.0/1.01, ReactOS, FreeDOS, Linux, KolibriOS) in an emulated x86 PC via the open-source [v86](https://github.com/copy/v86) emulator.
- **Game Hub** — offline games (Snake, 2048, Minesweeper, Tic-Tac-Toe vs. minimax CPU, Breakout, Flappy Square) plus embedded web games; add your own by URL.
- **Apps** — Files, Notepad, Terminal (`help` for commands), Browser, Paint, Calculator, Settings (wallpaper, accent color).

Files, settings, high scores and custom games are stored in `localStorage`.
