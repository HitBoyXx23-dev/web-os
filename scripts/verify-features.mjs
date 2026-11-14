// Browser smoke: login as Ada, proxy, catalog counts, chat nick UI, recorder.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE || 'http://127.0.0.1:8080/';
const OUT = '/opt/cursor/artifacts';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

const results = [];
const snap = async (page, name) => { const path = `${OUT}/${name}.png`; await page.screenshot({ path }); results.push(path); };

const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(async () => {
    const hash = async (pw, user) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('novaos:' + user + ':' + pw)))].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('novaos.users', JSON.stringify([{ name: 'Ada', user: 'ada', hash: await hash('ada', 'ada'), color: '#3b82f6' }]));
    localStorage.setItem('novaos.cfg', JSON.stringify({ fastBoot: true, shell: 'hitboy', theme: 'dark', proxy: true }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.fill('#g-pass', 'ada').catch(() => {});
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForSelector('#desktop:not(.hidden)', { timeout: 90000 }).catch(() => {});
  await snap(page, '01-desktop');

  const hb = await page.evaluate(async () => {
    const base = new URL('./', location.href).pathname;
    const r = await fetch(location.origin + base + 'hb/https://example.com/');
    const t = await r.text();
    return r.ok && /Example Domain/i.test(t);
  });
  results.push(`proxy-hitboy-example:${hb ? 'ok' : 'fail'}`);

  await page.evaluate(() => OS.launch('games'));
  await page.waitForTimeout(8000);
  results.push(`games-count:${await page.textContent('.hub-n').catch(() => '')}`);
  await snap(page, '02-games');

  await page.evaluate(() => { WM.closeAll?.(); OS.launch('store'); });
  await page.waitForTimeout(8000);
  results.push(`apps-count:${await page.textContent('.store-total').catch(() => '')}`);
  await snap(page, '03-appstore');

  await page.evaluate(() => { WM.closeAll?.(); OS.launch('chat'); });
  await page.waitForTimeout(2000);
  results.push(`chat-nick-field:${await page.inputValue('.chat-nick-inp').catch(() => '') ? 'ok' : 'missing'}`);
  await snap(page, '04-chat-nick');
  await page.evaluate(() => { WM.closeAll?.(); OS.launch('recorder'); });
  await page.waitForTimeout(1000);
  await snap(page, '05-recorder');
} catch (e) {
  results.push('error:' + e.message);
} finally {
  await browser.close();
}
console.log(results.join('\n'));