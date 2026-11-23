// usage: node shotcdp.mjs <url> <out.png> [width=375] [reduced]  -> real-time screenshot via CDP (animations settle, images load)
// env: CHROME=<path to Chrome>  SHOT_SETTLE=<ms to wait after load, default 6000>
//      SHOT_CLICK=<css selector to click after load>  SHOT_AFTER_CLICK=<ms to wait after the click, default 600> (mid-motion frames)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, out, w = '375', reduced] = process.argv.slice(2);
const width = Number(w);
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SETTLE = Number(process.env.SHOT_SETTLE ?? 6000);
const CLICK = process.env.SHOT_CLICK;
const AFTER_CLICK = Number(process.env.SHOT_AFTER_CLICK ?? 600);
const PORT = 9300 + Math.floor(Math.random() * 600);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shotcdp-'))}`, 'about:blank',
], { stdio: 'ignore' });

async function pageWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = tabs.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('chrome did not start');
}

const ws = new WebSocket(await pageWsUrl());
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
  if (msg.method) listeners.forEach((fn) => fn(msg));
});
const send = (method, params = {}) => new Promise((r) => {
  pending.set(++id, r);
  ws.send(JSON.stringify({ id, method, params }));
});

listeners.push((m) => {
  if (m.method === 'Runtime.exceptionThrown') console.log('Uncaught', m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.log('CONSOLE error', m.params.args.map((a) => a.value ?? a.description).join(' '));
});

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 1000 : 900, deviceScaleFactor: 1, mobile: width < 768 });
  if (reduced) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const loaded = new Promise((r) => listeners.push((m) => m.method === 'Page.loadEventFired' && r()));
  await send('Page.navigate', { url });
  await Promise.race([loaded, sleep(15000)]);
  await sleep(SETTLE);
  if (CLICK) {
    await send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(CLICK)})?.click()` });
    await sleep(AFTER_CLICK);
  }
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(out, Buffer.from(data, 'base64'));
} finally {
  ws.close();
  chrome.kill();
}
