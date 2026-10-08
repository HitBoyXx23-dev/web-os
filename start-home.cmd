@echo off
rem Double-click to run HitBoy Web-OS at home with a free Cloudflare tunnel (needs Node.js).
cd /d %~dp0
if not exist node_modules call npm install
call npm run home -- %*
pause
