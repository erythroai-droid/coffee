'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Reveal from './Reveal';
import { reserve, ReviewsLayer } from './Coffee';
import { useI18n } from '@/lib/i18n';
import { gsap, goToSection, lockScroll, prefersReducedMotion, useScrollReady } from '@/lib/scroll';
import { BRAND, FOOTER_VIDEO, GALLERY, GALLERY_TABLE, MODEL, pad, SCENES } from '@/lib/site';


/**
 * Gallery: stills of the film as prints scattered on a dark table.
 * Desktop: the section pins and the scroll deals the prints onto the table one by one (they fall in turning and settle
 * overlapping). A print can be dragged around the table; a click opens it large. Phones: the prints drop onto a tall table
 * as it scrolls into view; a tap opens the viewer. Reduced motion: the prints simply lie in place.
 * Three layers per print: .tp (GSAP: deal-in) > .tp-drag (drag offset) > .tp-print (hover lift, CSS).
 */
export function Gallery() {
  const { t, dir } = useI18n();
  const ready = useScrollReady();
  const sec = useRef<HTMLElement>(null);
  const table = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>(() => GALLERY.map((_, i) => i));   // stacking order, last = on top

  const raise = useCallback((i: number) => setOrder((o) => [...o.filter((k) => k !== i), i]), []);

  // decode ahead: a big photo decoded only when it lands would show as an empty frame for a moment
  useEffect(() => { table.current?.querySelectorAll('img').forEach((img) => { img.decode?.().catch(() => {}); }); }, []);

  // desktop: the prints lie on the table from the start; the table is pinned for two more screens:
  // 0 → 100 % the photos leave and the reviews arrive, 100 → 200 % the footer slides up over the table
  // (.ctc has a -1 screen margin, coffee.css; the steps of lib/pager.ts: data-steps on the section)
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    const section = sec.current!, prints = gsap.utils.toArray<HTMLElement>(section.querySelectorAll('.tp'));
    const side = dir === 'rtl' ? -1 : 1;
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: section, start: 'top top', end: '+=200%', pin: true, scrub: 0.8, invalidateOnRefresh: true },
    });
    const B = 0;                                                   // 3.5 timeline units = one screen of scroll
    const copy = section.querySelector('.gal-t-copy'), rev = section.querySelector('.gal-rev');
    const heads = section.querySelectorAll('.gal-rev .gr-in'), cards = section.querySelectorAll('.gal-rev .gr-card');
    tl.fromTo(prints, { y: 0, x: 0, rotation: (i) => GALLERY[i].d.r, autoAlpha: 1 }, {
      y: () => -window.innerHeight * 1.05, x: (i) => side * window.innerWidth * (i % 2 ? 0.06 : -0.06),
      rotation: (i) => GALLERY[i].d.r + (i % 2 ? -18 : 18), autoAlpha: 0, duration: 1.1, stagger: 0.12, ease: 'power2.in',
    }, B);
    tl.to(copy, { y: -60, autoAlpha: 0, duration: 0.8, ease: 'power2.in' }, B);
    tl.set(rev, { autoAlpha: 1 }, B + 1.2);
    tl.fromTo(heads, { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12 }, B + 1.3);
    tl.fromTo(cards, { y: () => window.innerHeight * 0.35, autoAlpha: 0, rotation: (i) => (i % 2 ? 3 : -3) },
      { y: 0, autoAlpha: 1, rotation: 0, duration: 1, stagger: 0.1 }, B + 1.5);
    tl.to({}, { duration: Math.max(0, B + 3.5 - tl.duration()) });   // pad phase 2 to one screen
    tl.to({}, { duration: 3.5 });                                  // phase 3: hold while the footer covers the table
    return () => {
      tl.scrollTrigger?.kill(); tl.kill();
      gsap.set([...prints, ...section.querySelectorAll('.gal-t-copy, .gal-rev, .gal-rev .gr-in, .gal-rev .gr-card')], { clearProps: 'all' });
    };
  }, [ready, dir]);

  // drag a print around the table (mouse / pen); a press without movement is a click and opens the viewer
  const drag = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;      // touch scrolls the page; a tap opens the viewer (onClick)
    const el = e.currentTarget, x0 = e.clientX, y0 = e.clientY;
    const bx = Number(el.dataset.x || 0), by = Number(el.dataset.y || 0);
    let moved = false;
    raise(i);
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      el.classList.add('dragging');
      el.dataset.x = String(bx + dx); el.dataset.y = String(by + dy);
      el.style.transform = `translate(${bx + dx}px, ${by + dy}px)`;
    };
    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      if (!moved) setOpen(i);
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };

  return (
    <section ref={sec} id="gallery" className="gal-t" data-slide="blk" data-steps="1" style={{ backgroundImage: `url(${GALLERY_TABLE})` }}>
      <div className="gal-t-copy">
        <Reveal><p className="script">{t('gallery_s')}</p></Reveal>
        <Reveal delay={80}><h2 className="scn-h">{t('gallery_h1')}<br /><span>{t('gallery_h2')}</span></h2></Reveal>
        <Reveal delay={140}><p className="scn-p">{t('gallery_p')}</p></Reveal>
        <Reveal delay={200}><p className="gal-hint">{t('gallery_hint')}</p></Reveal>
      </div>
      <div ref={table} className="gal-table">
        {GALLERY.map((g, i) => (
          <div
            key={g.n}
            className="tp"
            style={{
              '--x': `${g.d.x}%`, '--y': `${g.d.y}%`, '--w': `${g.d.w}vw`, '--r': `${g.d.r}deg`,
              '--mx': `${g.m.x}%`, '--my': `${g.m.y}%`, '--mw': `${g.m.w}vw`, '--mr': `${g.m.r}deg`,
              '--d': `${i * 0.12}s`, zIndex: order.indexOf(i) + 1,
            } as React.CSSProperties}
          >
            <div
              className="tp-drag"
              role="button"
              tabIndex={0}
              aria-label={`${t('gal_open')}: ${t(`gal${g.n}`)}`}
              onPointerDown={drag(i)}
              onClick={(e) => { if (e.detail === 0 || (e.nativeEvent as PointerEvent).pointerType === 'touch') setOpen(i); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(i); } }}
            >
              <figure className="tp-print">
                <img
                  src={`${g.src}-1000.webp`}
                  srcSet={`${g.src}-1000.webp 1000w, ${g.src}-2000.webp 2000w`}
                  sizes={`(max-width: 900px) ${g.m.w}vw, ${g.d.w}vw`}
                  width={1000}
                  height={Math.round(1000 / g.a)}
                  alt={t(`gal${g.n}`)}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                <figcaption>{t(`gal${g.n}`)}</figcaption>
              </figure>
            </div>
          </div>
        ))}
      </div>
      <ReviewsLayer />
      {open !== null && <Lightbox i={open} onClose={() => setOpen(null)} onGo={setOpen} />}
    </section>
  );
}

/** Large view of one photo: arrows, swipe, ← → keys (mirrored in RTL); Esc or the backdrop closes. Portalled to <body>. */
function Lightbox({ i, onClose, onGo }: { i: number; onClose: () => void; onGo: (i: number) => void }) {
  const { t, dir } = useI18n();
  const n = GALLERY.length, g = GALLERY[i];
  const x0 = useRef(0);
  const go = useCallback((d: number) => onGo((i + d + n) % n), [i, n, onGo]);
  useEffect(() => {
    lockScroll(true);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(dir === 'rtl' ? -1 : 1);
      else if (e.key === 'ArrowLeft') go(dir === 'rtl' ? 1 : -1);
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); lockScroll(false); };
  }, [go, onClose, dir]);
  return createPortal(
    <div
      className="lbx"
      role="dialog"
      aria-modal="true"
      aria-label={t(`gal${g.n}`)}
      onClick={onClose}
      onTouchStart={(e) => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - x0.current;
        if (Math.abs(dx) > 50) go((dx < 0 ? 1 : -1) * (dir === 'rtl' ? -1 : 1));
      }}
    >
      <figure className="lbx-fig" onClick={(e) => e.stopPropagation()}>
        <img key={g.n} src={`${g.src}-2000.webp`} alt={t(`gal${g.n}`)} />
        <figcaption><i dir="ltr">{pad(i + 1)} / {pad(n)}</i>{t(`gal${g.n}`)}</figcaption>
      </figure>
      <button type="button" className="lbx-x" aria-label={t('close')} onClick={onClose}>✕</button>
      <button type="button" className="lbx-nav lbx-prev" aria-label={t('gal_prev')} onClick={(e) => { e.stopPropagation(); go(-1); }}><span className="arr">←</span></button>
      <button type="button" className="lbx-nav lbx-next" aria-label={t('gal_next')} onClick={(e) => { e.stopPropagation(); go(1); }}><span className="arr">→</span></button>
    </div>,
    document.body,
  );
}

/**
 * Footer backdrop: an optional loop (FOOTER_VIDEO in lib/site.ts, e.g. the venue hall) under a dark veil.
 * Loads and plays only while the footer is near the screen; phones get the lighter cut; reduced motion keeps the poster.
 */
function HallVideo() {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const node = v.current;
    if (!node) return;
    if (prefersReducedMotion()) return;
    if (!FOOTER_VIDEO) return;
    node.src = window.innerWidth <= 900 ? FOOTER_VIDEO.phone : FOOTER_VIDEO.desktop;
    // the cut is a seamless loop (its last second cross-fades into the first); `loop` repeats it, and if a browser
    // still stops at the end, start it again
    const again = () => { node.currentTime = 0; node.play().catch(() => {}); };
    node.addEventListener('ended', again);
    let near = false;
    const io = new IntersectionObserver(([e]) => {
      near = e.isIntersecting;
      if (near && !document.hidden) node.play().catch(() => {}); else node.pause();
    }, { rootMargin: '30% 0px' });
    io.observe(node.parentElement!);
    // pause in a background tab, resume on return if the footer is still on screen
    const vis = () => { if (document.hidden) node.pause(); else if (near) node.play().catch(() => {}); };
    document.addEventListener('visibilitychange', vis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); node.removeEventListener('ended', again); node.pause(); };
  }, []);
  return (
    <div className="ctc-bg" aria-hidden>
      {FOOTER_VIDEO && <video ref={v} className="ctc-video" poster={FOOTER_VIDEO.poster} muted loop playsInline preload="none" disablePictureInPicture />}
      <div className="ctc-veil" />
    </div>
  );
}

const FOOT_NAV = [['origin_nav', '#origin'], ['menu_nav', '#menu'], ['gallery_nav', '#gallery'], ['reviews_nav', '#reviews'], ['nav_contact', '#contact']] as const;

export function Contact() {
  const { t } = useI18n();
  return (
    <footer id="contact" className="ctc" data-slide="blk">
      <HallVideo />
      <div className="ctc-grid">
        <div>
          <Reveal><p className="script">{t('contact_s')}</p></Reveal>
          <Reveal delay={80}><h2 className="scn-h">{t('contact_h1')}<br /><span>{t('contact_h2')}</span></h2></Reveal>
          <Reveal delay={140}><p className="scn-p">{t('contact_p')}</p></Reveal>
          <Reveal delay={200}><button type="button" className="btn solid" onClick={reserve}>{t('reserve_table')} <span className="arr">→</span></button></Reveal>
        </div>
        <Reveal delay={120}>
          <dl className="ctc-dl">
            <div><dt>{t('c_addr')}</dt><dd>{t('c_addr_v')}</dd></div>
            <div><dt>{t('c_hours')}</dt><dd>{t('c_hours_v')}</dd></div>
            <div><dt>{t('c_phone')}</dt><dd><a href="tel:+70000000000" dir="ltr">+7 000 000-00-00</a></dd></div>
            <div><dt>{t('c_email')}</dt><dd><a href="mailto:hello@origin.coffee" dir="ltr">hello@origin.coffee</a></dd></div>
            <div><dt>{t('f_social')}</dt><dd className="soc"><a href="#" onClick={(e) => e.preventDefault()}>Instagram</a><a href="#" onClick={(e) => e.preventDefault()}>Telegram</a></dd></div>
          </dl>
        </Reveal>
      </div>
      <nav className="ctc-nav" aria-label={t('nav_label')}>
        {FOOT_NAV.map(([k, h]) => (
          <a key={h} href={h} onClick={(e) => { e.preventDefault(); goToSection(h); }}>{t(k)}</a>
        ))}
      </nav>
      <div className="ctc-brand" dir="ltr" aria-hidden>{BRAND}<span>{MODEL}</span></div>
      <div className="ctc-bot"><span>{t('f_rights')}</span><span>{t('f_note')}</span></div>
    </footer>
  );
}

/** Fixed side rails: start side = vertical caption + progress line, end side = home + scene dots + current scene name. */
export function Rails({ active }: { active: number }) {
  const { t } = useI18n();
  return (
    <>
      <div className="rail rail-s" aria-hidden>
        <span className="rail-txt">{t('rail_caption')}</span>
        <span className="rail-line"><u style={{ transform: `scaleY(${(active + 1) / SCENES.length})` }} /></span>
        <span className="rail-ico">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 3c1 3 5 5 5 9.5A5 5 0 0 1 12 18a5 5 0 0 1-5-5.5c0-2 1-3.3 2-4.3.2 1.5.9 2.5 1.9 2.9C10.5 8.6 11 5.6 12 3Z" fill="currentColor" /></svg>
        </span>
      </div>
      <nav className="rail rail-e" aria-label={t('nav_label')}>
        <button type="button" className="rail-home" aria-label={t('nav_overview')} onClick={() => goToSection('#top')}>
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z" fill="currentColor" /></svg>
        </button>
        <ol>
          {SCENES.map((s, i) => (
            <li key={s.id}>
              <button type="button" className={i === active ? 'on' : ''} aria-label={t(`${s.id}_nav`)} aria-current={i === active} onClick={() => goToSection(`#${s.id}`)} />
            </li>
          ))}
        </ol>
        <span className="rail-txt">{t(`${SCENES[active]?.id ?? 'top'}_nav`)}</span>
      </nav>
    </>
  );
}
