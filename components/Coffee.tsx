'use client';
import { useEffect, useRef } from 'react';
import Reveal from './Reveal';
import CountUp from './CountUp';
import { OPEN_CONTACT } from './Header';
import { useI18n } from '@/lib/i18n';
import { gsap, goToSection, prefersReducedMotion, ScrollTrigger, useScrollReady } from '@/lib/scroll';
import { MENU, pad, PARALLAX, REVIEWS, SCENES } from '@/lib/site';

export const reserve = () => window.dispatchEvent(new Event(OPEN_CONTACT));

/** Gold "reserve" + outline secondary — the pair every scene carries. */
function Actions({ second = 'act_menu', to = '#menu' }: { second?: string; to?: string }) {
  const { t } = useI18n();
  return (
    <div className="scn-act">
      <button type="button" className="btn solid" onClick={reserve}>{t('reserve_table')}</button>
      <a className="btn" href={to} onClick={(e) => { e.preventDefault(); goToSection(to); }}>{t(second)}</a>
    </div>
  );
}

/** Script accent line + display title (two lines), shared by the side scenes. */
function Head({ id, as: H = 'h2' }: { id: string; as?: 'h1' | 'h2' }) {
  const { t } = useI18n();
  return (
    <>
      <Reveal><p className="script">{t(`${id}_s`)}</p></Reveal>
      <Reveal delay={80}><H className="scn-h">{t(`${id}_h1`)}<br /><span>{t(`${id}_h2`)}</span></H></Reveal>
    </>
  );
}

/* ---------- film scenes: hero · origin · milk · ritual · the cup ---------- */

export function Hero() {
  const { t } = useI18n();
  return (
    <section id="top" className="scn scn-hero" data-slide="film">
      <div className="scn-in">
        <Head id="top" as="h1" />
        <Reveal delay={160}><p className="scn-p">{t('top_p')}</p></Reveal>
        <Reveal delay={240}><Actions /></Reveal>
      </div>
      <div className="scn-hint" aria-hidden><i />{t('scroll')}</div>
    </section>
  );
}

export function Origin() {
  const { t } = useI18n();
  return (
    <section id="origin" className="scn scn-origin" data-slide="film">
      <div className="scn-in">
        <Head id="origin" />
        <Reveal delay={160}><p className="scn-p">{t('origin_p')}</p></Reveal>
        <Reveal delay={220}>
          <ul className="scn-stats">
            <li><b><CountUp to={1850} /><sup>{t('unit_m')}</sup></b><span>{t('origin_s1')}</span></li>
            <li><b><CountUp to={72} /><sup>{t('unit_h')}</sup></b><span>{t('origin_s2')}</span></li>
            <li><b><CountUp to={100} /><sup>%</sup></b><span>{t('origin_s3')}</span></li>
          </ul>
        </Reveal>
        <Reveal delay={280}><Actions /></Reveal>
      </div>
    </section>
  );
}

export function Milk() {
  const { t } = useI18n();
  return (
    <section id="milk" className="scn scn-milk" data-slide="film">
      <div className="scn-in">
        <Head id="milk" />
        <Reveal delay={160}><p className="scn-p">{t('milk_p')}</p></Reveal>
        <Reveal delay={220}>
          <div className="scn-tags">{[1, 2, 3, 4, 5].map((n) => <span key={n}>{t(`milk_t${n}`)}</span>)}</div>
        </Reveal>
        <Reveal delay={260}><p className="scn-note">{t('milk_note')}</p></Reveal>
        <Reveal delay={300}><Actions /></Reveal>
      </div>
    </section>
  );
}

export function Ritual() {
  const { t } = useI18n();
  return (
    <section id="ritual" className="scn scn-ritual" data-slide="film">
      <div className="scn-in">
        <Head id="ritual" />
        <Reveal delay={160}><p className="scn-p">{t('ritual_p')}</p></Reveal>
        <Reveal delay={220}>
          <ol className="scn-steps">
            {[1, 2, 3, 4].map((n) => (
              <li key={n}>
                <i dir="ltr">{pad(n)}</i>
                <span className="nm">{t(`step${n}n`)}<small>{t(`step${n}d`)}</small></span>
                <b className="wt">{t(`step${n}v`)}</b>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={280}><Actions second="act_gallery" to="#gallery" /></Reveal>
      </div>
    </section>
  );
}

export function Finale({ active }: { active: number }) {
  const { t } = useI18n();
  return (
    <section id="cup" className="scn scn-exp" data-slide="film">
      <div className="scn-in">
        <Reveal>
          <div className="exp-dots" aria-hidden>{SCENES.map((s, i) => <i key={s.id} className={i === active ? 'on' : ''} />)}</div>
        </Reveal>
        <Reveal delay={80}><p className="script">{t('cup_s')}</p></Reveal>
        <Reveal delay={140}><h2 className="exp-h">{t('cup_h')}</h2></Reveal>
        <Reveal delay={220}>
          <div className="scn-act exp-act">
            <a className="btn solid" href="#menu" onClick={(e) => { e.preventDefault(); goToSection('#menu'); }}>{t('act_menu')} <span className="arr">→</span></a>
            <button type="button" className="btn" onClick={reserve}>{t('reserve_table')}</button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- parallax ---------- */

type LayerProps = { src: string; d: number; className?: string; w?: number; h?: number };

/**
 * One parallax layer. d = depth: 0 sits with the page, > 0 is closer (moves faster than the scroll), < 0 is farther (slower).
 * The outer box is moved by the scroll (GSAP on desktop, CSS view-timeline on phones), the image inside by the pointer.
 */
function Layer({ src, d, className = '', w, h }: LayerProps) {
  return (
    <div className={`plx ${className}`} style={{ '--d': d } as React.CSSProperties} aria-hidden>
      <img src={src} alt="" width={w} height={h} loading="lazy" decoding="async" draggable={false} />
    </div>
  );
}

/**
 * Depth for a section's decorative layers.
 * Desktop: ScrollSmoother moves the content with a transform, so native view timelines cannot see the scroll there —
 * GSAP ScrollTrigger scrubs each layer's y across the section's pass through the screen, and the mouse tilts the scene.
 * Phones (static mode): native CSS scroll-driven animation (view-timeline in globals.css) where supported; decorative, no fallback.
 * Reduced motion: the layers stay put.
 */
function useParallax(ref: React.RefObject<HTMLElement | null>) {
  const ready = useScrollReady();
  useEffect(() => {
    const sec = ref.current;
    if (!sec || !ready || prefersReducedMotion()) return;
    const layers = gsap.utils.toArray<HTMLElement>(sec.querySelectorAll('.plx'));
    const tweens = layers.map((el) => {
      const d = Number(getComputedStyle(el).getPropertyValue('--d')) || 0;
      return gsap.fromTo(el, { y: () => d * window.innerHeight * 0.42 }, {
        y: () => -d * window.innerHeight * 0.42, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
      });
    });
    // pointer depth: -1..1 from the centre of the section, eased by the CSS transition on .plx img
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = sec.getBoundingClientRect();
      sec.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      sec.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    };
    const leave = () => { sec.style.setProperty('--mx', '0'); sec.style.setProperty('--my', '0'); };
    sec.addEventListener('pointermove', move);
    sec.addEventListener('pointerleave', leave);
    return () => {
      tweens.forEach((tw) => { tw.scrollTrigger?.kill(); tw.kill(); });
      gsap.set(layers, { clearProps: 'transform' });
      sec.removeEventListener('pointermove', move);
      sec.removeEventListener('pointerleave', leave);
    };
  }, [ready, ref]);
}

const L = (name: string) => `${PARALLAX}/${name}.webp`;

/** Coffee menu over a parallax scene: the bokeh backdrop far away, the milk-and-espresso swirl, beans flying past. */
export function Menu() {
  const { t } = useI18n();
  const sec = useRef<HTMLElement>(null);
  useParallax(sec);
  // desktop: the menu stays pinned for one more screen while the gallery slides up over it (#gallery has a -1 screen
  // margin, coffee.css); lib/pager.ts treats the pin as one step, so a single notch brings the gallery in
  const ready = useScrollReady();
  useEffect(() => {
    if (!ready || prefersReducedMotion() || !sec.current) return;
    const st = ScrollTrigger.create({ trigger: sec.current, start: 'top top', end: '+=100%', pin: true });
    return () => st.kill(true);
  }, [ready]);
  return (
    <section ref={sec} id="menu" className="plx-sec menu-sec" data-slide="blk">
      <div className="plx-stage" aria-hidden>
        <Layer src={L('bg-2400')} d={-0.22} className="plx-bg" />
        <Layer src={L('swirl')} d={0.12} className="m-swirl" w={969} h={1016} />
        <Layer src={L('berry-split')} d={0.55} className="m-split" w={549} h={514} />
        <Layer src={L('bean')} d={0.9} className="m-b1" w={157} h={160} />
        <Layer src={L('bean')} d={1.3} className="m-b2 blur" w={157} h={160} />
        <Layer src={L('bean')} d={0.35} className="m-b3 far" w={157} h={160} />
        <Layer src={L('grains')} d={0.7} className="m-grains" w={224} h={203} />
        <div className="plx-veil menu-veil" />
      </div>
      <div className="plx-in">
        <div className="sec-head">
          <Reveal><p className="script">{t('menu_s')}</p></Reveal>
          <Reveal delay={80}><h2 className="scn-h">{t('menu_h1')}<br /><span>{t('menu_h2')}</span></h2></Reveal>
          <Reveal delay={140}><p className="scn-p">{t('menu_p')}</p></Reveal>
        </div>
        <ul className="menu-grid">
          {MENU.map((m, i) => (
            <li key={m.n}>
              <Reveal delay={80 + i * 60} className="mc-wrap">
                <article className="mc">
                  <header>
                    <i dir="ltr">{pad(m.n)}</i>
                    <span className={`mc-tag t-${m.tag}`}>{t(`mt_${m.tag}`)}</span>
                  </header>
                  <h3 className="mc-n">{t(`m${m.n}n`)}</h3>
                  <p className="mc-d">{t(`m${m.n}d`)}</p>
                  <footer>
                    <span className="mc-ml" dir="ltr">{m.ml} {t('ml')}</span>
                    <i aria-hidden />
                    <b className="mc-p" dir="ltr">${m.p.toFixed(2)}</b>
                  </footer>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
        <Reveal delay={200}><p className="menu-foot-note">{t('menu_note')}</p></Reveal>
      </div>
    </section>
  );
}

/**
 * Guest reviews. They live on the gallery's table (components/Scenes.tsx): when the photos have been looked at, the next
 * step clears them off the table and the reviews take their place — the backdrop never moves.
 * No Reveal here: the gallery timeline brings the layer in on desktop; phones show it in flow under the photos.
 */
export function ReviewsLayer() {
  const { t } = useI18n();
  return (
    <div id="reviews" className="gal-rev" data-at="1">
      <div className="sec-head rev-head">
        <div className="gr-in">
          <p className="script">{t('reviews_s')}</p>
          <h2 className="scn-h">{t('reviews_h1')}<br /><span>{t('reviews_h2')}</span></h2>
        </div>
        <div className="rev-score gr-in">
          <b dir="ltr">4,9</b>
          <span className="stars" aria-hidden>★★★★★</span>
          <small>{t('reviews_count')}</small>
        </div>
      </div>
      <ul className="rev-grid">
        {REVIEWS.map((r) => (
          <li key={r.n} className="gr-card">
            <figure className="rc">
              <span className="stars" role="img" aria-label={`${r.s} / 5`}>{'★'.repeat(r.s)}<u>{'★'.repeat(5 - r.s)}</u></span>
              <blockquote>{t(`r${r.n}t`)}</blockquote>
              <figcaption>
                <img className="rc-av" src={r.photo} alt="" width={56} height={56} loading="lazy" decoding="async" />
                <span><b>{t(`r${r.n}a`)}</b><small>{t(`r${r.n}w`)}</small></span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
