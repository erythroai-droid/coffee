#!/usr/bin/env node
/**
 * Phone performance check of the scroll film: emulates a phone (390x844 @3x, touch) with a throttled CPU, swipes scene by
 * scene and reports per transition how long the film takes to play, how smooth the page renders (frame intervals) and how
 * much main-thread work it costs.
 *
 * One-time setup (kept out of package.json so Vercel never installs it):
 *   npm i --no-save playwright-core        (uses the installed Google Chrome)
 *
 * Usage (site running: npm run dev or npm start):
 *   node scripts/perf-mobile.mjs                         → http://localhost:3200, CPU 4× slower
 *   node scripts/perf-mobile.mjs --cpu 6 --url https://origin.erythro.ai --json out.json
 *
 * Headless Chrome rasterizes in software, so absolute numbers are worse than on a real phone; compare runs with each other.
 */
import { writeFile } from 'node:fs/promises';

let chromium;
try { ({ chromium } = await import('playwright-core')); } catch {
  try { ({ chromium } = await import('playwright')); } catch {
    console.error('playwright-core is not installed. Run: npm i --no-save playwright-core');
    process.exit(1);
  }
}

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const url = arg('url', 'http://localhost:3200/');
const cpu = Number(arg('cpu', 4));
const out = arg('json');
const chrome = arg('chrome', process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);

const SCENES = [['origin', 40], ['milk', 66], ['ritual', 154], ['cup', 219]];

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
});
await ctx.addInitScript(() => {
  const w = window;
  w.__perf = { draws: [], gaps: [], long: [] };
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (im, ...a) {
    const m = /frame_(\d+)/.exec(im?.src || '');
    if (m) w.__perf.draws.push([performance.now(), +m[1] - 1]);
    return orig.call(this, im, ...a);
  };
  let last = 0;
  const loop = (t) => { if (last) w.__perf.gaps.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__perf.long.push(e.duration))).observe({ type: 'longtask', buffered: true }); } catch {}
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const pct = (a, p) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0);
const r = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(7000);                       // frames stream in, the intro plays

const rows = [];
for (const [id, target] of SCENES) {
  await page.evaluate(() => { const p = window.__perf; p.draws = []; p.gaps = []; p.long = []; });
  const m0 = await metrics();
  const t0 = await page.evaluate((id) => {
    const el = document.getElementById(id);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });   // one swipe → snap
    return performance.now();
  }, id);
  await page.waitForTimeout(5000);
  const m1 = await metrics();
  const p = await page.evaluate(() => window.__perf);
  const draws = p.draws.filter(([t]) => t >= t0);
  const reached = draws.find(([, f]) => Math.abs(f - target) <= 1);
  const jumps = draws.slice(1).map(([, f], i) => Math.abs(f - draws[i][1]));
  const gaps = p.gaps.slice(2);
  rows.push({
    scene: id,
    target,
    'film, s': reached ? r((reached[0] - t0) / 1000, 2) : null,
    frames: new Set(draws.map(([, f]) => f)).size,
    'max skip': jumps.length ? Math.max(...jumps) : 0,
    'fps': r(gaps.length / (gaps.reduce((a, b) => a + b, 0) / 1000)),
    'p95 ms': r(pct(gaps, 0.95)),
    'jank %': r((gaps.filter((g) => g > 34).length / Math.max(1, gaps.length)) * 100),
    'long ms': r(p.long.reduce((a, b) => a + b, 0), 0),
    'task ms': r((m1.TaskDuration - m0.TaskDuration) * 1000, 0),
    'style+layout ms': r(((m1.RecalcStyleDuration - m0.RecalcStyleDuration) + (m1.LayoutDuration - m0.LayoutDuration)) * 1000, 0),
  });
}
await browser.close();

console.log(`\n${url} · phone 390x844@3x · CPU ×${cpu} · 5 s after each swipe`);
console.table(rows);
console.log('film, s = time until the scene frame shows · max skip = biggest frame jump between two paints · jank = frames over 34 ms');
if (out) await writeFile(out, JSON.stringify(rows, null, 2));
