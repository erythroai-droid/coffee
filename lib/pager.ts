'use client';
import { useEffect } from 'react';
import { gsap, prefersReducedMotion, ScrollSmoother, ScrollTrigger } from './scroll';
import { SCENES } from './site';

/**
 * Block-by-block scroll (desktop, reference: a full-page vertical slider). Every block of <main> fills the screen; one wheel
 * notch / trackpad swipe / arrow key moves exactly one step and never skips a block. Inertia of the trackpad is swallowed:
 * the next step is accepted only after the glide has finished and the wheel has been quiet for a moment.
 *
 * Steps: the top of every block. A block taller than the screen (the pinned gallery deal-in, a long footer) adds steps inside
 * it, so its whole height is shown before the page moves on.
 *
 * Film blocks: the glide between two scenes lasts in proportion to the frames the film plays on the way (FILM_FPS), so the
 * shot always runs at the same, watchable speed — longer camera moves simply take longer.
 *
 * Phones / reduced motion run without ScrollSmoother; there the same blocks snap with native CSS scroll snapping (coffee.css).
 */
const FILM_FPS = 34;          // film playback speed during a glide, frames per second
const BASE = 0.85;           // glide time between ordinary blocks, s
const QUIET = 200;            // ms of wheel silence that starts a new gesture (shorter gaps are the same swipe's inertia)
const WHEEL_MIN = 12;         // ignore tiny wheel jitter

type Stop = { y: number; f: number | null };

export function usePager(ready: boolean) {
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    const sm = ScrollSmoother.get();
    if (!sm) return;
    const main = document.querySelector('main');
    if (!main) return;
    const vh = () => window.innerHeight;
    const film = new Map<string, number>(SCENES.map((s) => [s.id, s.f]));

    const stops = (): Stop[] => {
      const max = ScrollTrigger.maxScroll(window);
      const out: Stop[] = [];
      for (const el of [...main.children] as HTMLElement[]) {
        const top = sm.offset(el, 'top top');
        const h = el.offsetHeight;
        const id = el.id || el.firstElementChild?.id || '';
        out.push({ y: top, f: film.has(id) ? film.get(id)! : null });
        // a pinned block names its own steps in screens (the gallery: photos dealt in · reviews in place)
        const steps = el.dataset.steps || (el.firstElementChild as HTMLElement | null)?.dataset.steps;
        if (steps) { steps.split(',').forEach((v) => out.push({ y: top + Number(v) * vh(), f: null })); continue; }
        const over = h - vh();
        if (over > 4) {
          if (over <= vh() * 1.5) out.push({ y: top + over, f: null });           // one more step: the block's end
          else for (let k = 1; k * vh() * 0.85 < over; k++) out.push({ y: top + Math.min(over, k * vh() * 0.85), f: null });
          if (over > vh() * 1.5) out.push({ y: top + over, f: null });
        }
      }
      const seen = new Set<number>();
      return out
        .map((s) => ({ ...s, y: Math.round(Math.min(max, Math.max(0, s.y))) }))
        .sort((a, b) => a.y - b.y)
        .filter((s) => (seen.has(s.y) ? false : (seen.add(s.y), true)));
    };

    let tw: gsap.core.Tween | null = null;
    let busy = false, used = false, lastWheel = 0, aim = 0, startAt = 0;

    const blocked = (target: EventTarget | null) =>
      sm.paused() || !!document.querySelector('.lbx, .modal.open') ||
      (target instanceof Element && !!target.closest('.ai, .lang-menu'));

    // `at`: the position the next stop is counted from — the glide's own target when a new gesture comes in mid-glide
    const go = (dir: 1 | -1, at = window.scrollY) => {
      const pts = stops(), y = at, y0 = window.scrollY;
      let i = -1;
      if (dir > 0) i = pts.findIndex((p) => p.y > y + 4);
      else for (let k = pts.length - 1; k >= 0; k--) if (pts[k].y < y - 4) { i = k; break; }
      if (i < 0) return;
      // where the film is now (the stop at or just behind us) and where it goes
      const from = dir > 0 ? [...pts].reverse().find((p) => p.y <= y + 4) : pts.find((p) => p.y >= y - 4);
      const to = pts[i];
      const frames = from?.f != null && to.f != null ? Math.abs(to.f - from.f) : 0;
      const dist = Math.abs(to.y - y0) / vh();
      const duration = frames ? Math.max(BASE, frames / FILM_FPS) : Math.min(1.3, Math.max(0.6, BASE * Math.max(0.6, dist)));
      const pos = { y: y0 };
      busy = true; aim = to.y; startAt = performance.now();
      tw?.kill();
      tw = gsap.to(pos, {
        // power2, not power3: power3's last third is barely movement, and the block seemed to hang at the end of every glide
        y: to.y, duration, ease: frames ? 'sine.inOut' : 'power2.inOut',
        onUpdate: () => window.scrollTo(0, pos.y),
        onComplete: () => { busy = false; tw = null; },
      });
    };

    const onWheel = (e: WheelEvent) => {
      if (blocked(e.target) || e.ctrlKey) return;
      e.preventDefault();                                   // the page never free-scrolls: one gesture = one step
      const now = performance.now(), quietFor = now - lastWheel;
      lastWheel = now;
      // one gesture = one step: a gesture starts after a pause in the wheel stream, and the rest of it (trackpad inertia, a fast
      // spin of the wheel) is swallowed however long it runs, so a swipe never moves two blocks
      if (quietFor >= QUIET) used = false;
      if (used || Math.abs(e.deltaY) < WHEEL_MIN) return;
      used = true;
      const dir = e.deltaY > 0 ? 1 : -1;
      if (!busy) { go(dir); return; }
      // a new notch while a long film glide is still running (milk → swirl takes 2.6 s): take it at once and carry on to the
      // following block, instead of swallowing it and making people scroll twice
      if (now - startAt > 250) go(dir, dir === Math.sign(aim - window.scrollY) ? aim : window.scrollY);
    };

    const onKey = (e: KeyboardEvent) => {
      if (blocked(e.target) || (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]'))) return;
      const down = ['ArrowDown', 'PageDown', ' '].includes(e.key) && !(e.key === ' ' && e.shiftKey);
      const up = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
      if (!down && !up) return;
      e.preventDefault();
      if (!busy) go(down ? 1 : -1);
    };

    // touch screens on laptops / tablets wider than the phone breakpoint
    let ty = 0;
    const onTouchStart = (e: TouchEvent) => { ty = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => { if (!blocked(e.target)) e.preventDefault(); };
    const onTouchEnd = (e: TouchEvent) => {
      if (blocked(e.target) || busy) return;
      const dy = ty - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 40) go(dy > 0 ? 1 : -1);
    };

    // a resize or a jump by the menu leaves the page between steps: settle onto the nearest step
    const settle = () => {
      if (busy) return;
      const pts = stops(), y = window.scrollY;
      const near = pts.reduce((b, p) => (Math.abs(p.y - y) < Math.abs(b.y - y) ? p : b), pts[0]);
      if (near && Math.abs(near.y - y) > 2) window.scrollTo(0, near.y);
    };
    ScrollTrigger.addEventListener('refresh', settle);

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      tw?.kill();
      ScrollTrigger.removeEventListener('refresh', settle);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [ready]);
}
