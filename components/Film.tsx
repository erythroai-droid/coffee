'use client';
import { useEffect, useRef } from 'react';
import { FRAMES, LAST_FRAME, SCENES, UNIFORM, landscapePath, portraitPath } from '@/lib/site';
import { prefersReducedMotion } from '@/lib/scroll';

type Props = {
  /** 0..100 — the preloader finishes once a coarse pass over the whole film is in (any scroll position has a near frame). */
  onLoadProgress?: (pct: number) => void;
  /** index into SCENES of the section that owns the screen (rails, header). */
  onScene?: (i: number) => void;
};

const BG = '#140b06';                                   // espresso: matches --stage
/** The subject sits off-centre, away from the copy (reference layout) — for the whole film, the held last frame included. */
const SHIFT = 0.16;
const shiftAt = (_f?: number) => 1;
type Pack = 'p' | 768 | 1280 | 1920;

/**
 * Which frame pack fits this screen: centre-cropped portrait frames on tall screens, else the smallest landscape tier that is
 * at least as wide as the frame is actually drawn (cover width × device pixels), so a frame is never stretched up.
 */
function pickPack(): Pack {
  const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (w / h < 0.8) return 'p';
  const drawn = Math.max(w, (h * 16) / 9) * dpr;
  return drawn <= 800 ? 768 : drawn <= 1340 ? 1280 : 1920;
}

/** Coarse-to-fine load order: every 8th frame first, then 4th, 2nd, the rest — scrubbing anywhere soon has a near frame. */
const ORDER = (() => {
  const seen = new Set<number>(), out: number[] = [];
  for (const step of [8, 4, 2, 1]) for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); out.push(i); }
  if (!seen.has(FRAMES - 1)) out.splice(1, 0, FRAMES - 1);
  return out;
})();
const COARSE = Math.ceil(FRAMES / 4);

/**
 * Intro: the film starts moving by itself as soon as its first frame is in (ad visitors decide within 1–3 s, before any
 * touch): it plays up to INTRO_F over INTRO_MS, then waits for the scroll. The scroll takes over from there — the shown
 * frame is max(scroll frame, intro frame), so nothing jumps back.
 */
const INTRO_F = Math.round(SCENES[1].f * 0.3);   // a gentle start: the berry turns, it does not split yet
const INTRO_MS = 3200;
/**
 * Phones snap one screen per swipe (native scroll-snap, ~0.3 s), which flashed 40–90 frames by in a blink. There the film
 * follows the scroll at most PHONE_FPS frames per second: a swipe starts the shot and it plays at a watchable speed
 * (the desktop pager paces its glides the same way, lib/pager.ts FILM_FPS).
 */
const PHONE_FPS = 30;
const PHONE_DIM = 0.28;   // darkens the film on phones; was a CSS filter on the canvas, re-applied on every repaint
const introEase =(t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * The fixed film behind the page. The frame follows the sections: when scene i's top is at the top of the screen the film
 * shows SCENES[i].f, and it plays through to the next scene's frame while that section scrolls by. The last scene runs to
 * LAST_FRAME as the contact block rises. Measured from getBoundingClientRect, so it tracks the smoothed (ScrollSmoother)
 * position on desktop and the native scroll on phones alike.
 */
export default function Film({ onLoadProgress, onScene }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current!, ctx = canvas.getContext('2d')!;
    const reduced = prefersReducedMotion();
    let pack: Pack = pickPack();
    let imgs: (HTMLImageElement | null)[] = [];
    const phone = window.matchMedia('(max-width: 900px)');
    let wake = () => {};                                                         // restarts the paint loop, set below
    let missing = true;                                                          // the screen shows a stand-in frame
    let gen = 0, cssW = 0, cssH = 0, cur = 0, drawn = -1, scene = -1, raf = 0, first = true, last = 0, introAt = 0, painted = false, rushFrom = -1, jump = false, jumpY = -1, jumpAt = 0;
    const intro = (now: number) => (reduced || !introAt ? 0 : INTRO_F * introEase(Math.min(1, Math.max(0, (now - introAt) / INTRO_MS))));

    const load = () => {
      const g = ++gen;
      imgs = new Array(FRAMES).fill(null);
      let n = 0;
      ORDER.forEach((i, k) => {
        const im = new Image();
        im.decoding = 'async';
        // first 2 coarse passes at full priority, the fill-in later so it does not compete with the preloader
        if (k > COARSE) (im as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
        const fin = () => {
          n++;
          if (g === 1 && n <= COARSE) onLoadProgress?.(Math.round((n / COARSE) * 100));
          // repaint only if the screen shows a stand-in for a frame that had not arrived; otherwise the ~200 frames
          // streaming in on a slow phone connection each forced a full repaint and kept the loop awake
          if (missing) { drawn = -1; wake(); }
        };
        // decode off the main thread before the frame counts as ready: drawing an undecoded image stalls the scroll
        const ready = () => {
          if (g === gen) imgs[i] = im;
          if (i === 0 && !introAt) introAt = performance.now() + 250;   // start the intro once the first frame can show
          fin();
        };
        im.onload = () => { if (im.decode) im.decode().then(ready, ready); else ready(); };
        im.onerror = fin;
        const src = pack === 'p' ? portraitPath(i) : landscapePath(pack, i);
        // phones: the first frames (first, last, the intro's) now, the other ~2 MB once the page has loaded, so the film
        // does not fight the page's own CSS, fonts and scripts for a mobile connection
        if (k < 4 || !phone.matches || document.readyState === 'complete') im.src = src;
        else window.addEventListener('load', () => { if (g === gen) im.src = src; }, { once: true });
      });
    };

    const ok = (i: number) => !!imgs[i] && imgs[i]!.naturalWidth > 0;
    const nearest = (i: number) => {
      for (let d = 0; d < FRAMES; d++) {
        if (i - d >= 0 && ok(i - d)) return i - d;
        if (i + d < FRAMES && ok(i + d)) return i + d;
      }
      return -1;
    };
    let dx = 0;                                                                  // horizontal offset of the frame, px
    const paint = (j: number, alpha: number) => {
      const im = imgs[j]!;
      const s = Math.max(cssW / im.naturalWidth, cssH / im.naturalHeight);      // object-fit: cover
      const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(im, (cssW - dw) / 2 + dx, (cssH - dh) / 2, dw, dh);
    };
    // feather the edge the shift uncovered, so the frame melts into the dark copy side
    const feather = () => {
      if (Math.abs(dx) < 1) return;
      const s = Math.max(cssW / 1920, cssH / 1080), edge = (cssW - 1920 * s) / 2 + dx + (dx < 0 ? 1920 * s : 0);
      const w = cssW * 0.22, x0 = dx > 0 ? edge : edge - w, x1 = dx > 0 ? edge + w : edge;
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(dx > 0 ? 0 : 1, BG); g.addColorStop(dx > 0 ? 1 : 0, 'rgba(20,11,6,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g;
      ctx.fillRect(dx > 0 ? 0 : x0, 0, dx > 0 ? x1 : cssW - x0, cssH);
    };
    // one sharp frame at a time: blending neighbours left a see-through double of everything that moves
    const draw = (f: number) => {
      const a = Math.round(f);
      const ja = ok(a) ? a : nearest(a);
      if (ja < 0) return;
      const wide = pack !== 'p' && cssW > 900;
      dx = wide ? SHIFT * cssW * shiftAt(f) * (document.documentElement.dir === 'rtl' ? -1 : 1) : 0;
      ctx.globalAlpha = 1; ctx.fillStyle = BG; ctx.fillRect(0, 0, cssW, cssH);
      paint(ja, 1);
      feather();
      if (phone.matches) { ctx.globalAlpha = PHONE_DIM; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cssW, cssH); }
      if (!painted) {                                                          // first real picture on screen → metrics
        painted = true;
        window.dispatchEvent(new CustomEvent('film-first-frame', { detail: Math.round(performance.now()) }));
      }
      ctx.globalAlpha = 1;
    };
    const resize = () => {
      // phones get 540 px portrait frames: a backing store past 1.5× only costs fill rate, it adds no detail
      const dpr = Math.min(window.devicePixelRatio || 1, phone.matches ? 1.5 : 2);
      cssW = window.innerWidth; cssH = window.innerHeight;
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingQuality = 'high';
      drawn = -1;
      const next = pickPack();
      if (next !== pack) { pack = next; load(); }
    };

    // the section that owns the screen: switch at mid-screen, not when its top reaches the very top
    const ownerOf = (tops: number[], vh: number) => {
      let owner = 0;
      for (let k = 0; k < SCENES.length; k++) if (tops[k] < vh * 0.5) owner = k;
      return owner;
    };
    const els = () => SCENES.map((s) => document.getElementById(s.id));
    const target = () => {
      const vh = window.innerHeight;
      const list = els(), end = document.getElementById('contact');
      if (!list[0]) return { f: 0, i: 0 };
      const tops = list.map((el) => el?.getBoundingClientRect().top ?? 0);
      const frames = [...SCENES.map((s) => s.f), LAST_FRAME];
      tops.push(end ? end.getBoundingClientRect().top - vh : tops[tops.length - 1] + vh);
      if (tops[0] > 0) return { f: frames[0], i: 0 };
      if (UNIFORM) {
        // one straight line from the hero top to the finale top: the same scroll distance always plays the same number of frames
        const lastTop = tops[SCENES.length - 1], span = Math.max(1, lastTop - tops[0]);
        const p = Math.max(0, Math.min(1, -tops[0] / span));
        return { f: p * LAST_FRAME, i: ownerOf(tops, vh) };
      }
      let i = 0;
      for (let k = 0; k < SCENES.length; k++) if (tops[k] <= 1) i = k;
      if (frames[i] === frames[i + 1]) return { f: frames[i], i: ownerOf(tops, vh) };   // film over: hold the last frame
      const span = Math.max(1, tops[i + 1] - tops[i]);
      const local = Math.max(0, Math.min(1, -tops[i] / span));
      return { f: frames[i] + local * (frames[i + 1] - frames[i]), i: ownerOf(tops, vh) };
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t0 = target(), i = t0.i;
      const f = Math.max(t0.f, intro(performance.now()));
      if (i !== scene) { scene = i; onScene?.(i); }
      // time-based easing (~90 ms): the same feel at 30, 60 or 120 Hz and no lag when the browser throttles frames
      const now = performance.now(), dt = last ? Math.min(250, now - last) : 16;
      last = now;
      if (first || reduced) cur = f;
      else {
        let step = (f - cur) * (1 - Math.exp(-dt / 90));
        if (phone.matches) {
          // a long jump (menu link, back to top) runs faster, so it does not rewind the whole film at 30 fps
          // and once the menu block starts sliding over the film, the shot is played out fast, so the cup is on screen
          // before the film is covered instead of the swirl being cut off mid-way
          const menu = document.getElementById('menu')?.getBoundingClientRect().top ?? Infinity;
          // (on the last scene the film already hurries a bit: it is the screen people swipe past soonest)
          const rush = menu < window.innerHeight ? 5 : i === SCENES.length - 1 ? 2 : 1;
          const cap = (PHONE_FPS * rush * Math.max(1, Math.abs(f - cur) / 60) * dt) / 1000;
          // a jump by a button or a menu link ("to top", a section link) follows the scroll closely instead: the page glides
          // there in about a second, and a 30 fps film went on rewinding for five more seconds after it had arrived
          if (!jump) step = Math.max(-cap, Math.min(cap, step));
          else if (cur === f && scrollY === jumpY && now > jumpAt + 200) jump = false;   // arrived and the scroll has stopped
          jumpY = scrollY;
          // and a hard floor tied to the menu's slide: whatever the pacing, the film is on its last frame by the time the menu
          // covers half the screen; it moves with the finger, so a fast swipe never leaves the swirl cut off under the menu
          if (menu < window.innerHeight && f === LAST_FRAME && step >= 0) {
            if (rushFrom < 0) rushFrom = cur;
            const p = Math.max(0, Math.min(1, (1 - menu / window.innerHeight) / 0.5));
            step = Math.max(step, rushFrom + (LAST_FRAME - rushFrom) * p - cur);
          } else if (menu >= window.innerHeight) rushFrom = -1;
        }
        cur += step;
      }
      first = false;
      if (Math.abs(cur - f) < 0.002) cur = f;
      const key = (Math.round(cur) + 1) * 1000 + Math.round(shiftAt(cur) * 100) * (document.documentElement.dir === 'rtl' ? -1 : 1);
      // the nearest loaded frame stands in for a missing one; the load handler repaints when frames arrive
      if (key !== drawn) { draw(cur); drawn = key; missing = !ok(Math.round(cur)); }
      // nothing moves (scroll settled, the smoother caught up, the frame is on screen, the intro is over): go to sleep
      // instead of measuring the sections 60 times a second; any input, scroll, resize or a loaded frame wakes it
      const still = f === lastF && cur === f && key === drawn && introAt > 0 && now > introAt + INTRO_MS;
      lastF = f;
      idle = still ? idle + 1 : 0;
      if (idle > 45) { cancelAnimationFrame(raf); raf = 0; }
    };
    let idle = 0, lastF = -1;
    const onJump = () => { jump = true; jumpY = -1; jumpAt = performance.now(); wake(); };
    window.addEventListener('film:jump', onJump);
    wake = () => { idle = 0; if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };

    resize();
    load();
    raf = requestAnimationFrame(tick);
    const WAKE = ['scroll', 'wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown', 'resize'] as const;
    window.addEventListener('resize', resize);
    WAKE.forEach((e) => window.addEventListener(e, wake, { passive: true, capture: true }));
    return () => {
      cancelAnimationFrame(raf); raf = -1;
      window.removeEventListener('film:jump', onJump);
      window.removeEventListener('resize', resize);
      WAKE.forEach((e) => window.removeEventListener(e, wake, { capture: true }));
      gen++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="film" aria-hidden>
      <canvas ref={cv} className="film-cv" />
      <div className="film-shade" />
      <div className="film-grain" />
    </div>
  );
}
