// Site + scroll-film config in one place.
// The film: one master video cut into WebP frame packs. The frames sit fixed behind the page and are scrubbed by the scroll;
// the content sections scroll over them in normal flow. Each scene says which frame the film shows when that section's top
// reaches the top of the screen; between two scenes the film plays through the frames in between.
//
// The template ships a 16-frame stub cut from a steak demo video so `npm run build` works and the motion is visible.
// For a client: `npm run frames -- <video> --every 2` (writes all packs, prints the count), set FRAMES, bump FRAMES_VERSION,
// cut the still tail if the video ends on a static shot (see README), retime SCENES from a contact sheet.

/** Frames per pack (same count in every pack). All 224 native frames of the 24 fps master (Assets/Video_Final.mp4, 9.3 s). */
export const FRAMES = 224;

/** Landscape packs for wide screens, a centre-cropped portrait pack for phones. */
export const FRAME_DIR = '/frames/assembly';
export const PORTRAIT_DIR = '/frames/portrait/540';

/**
 * Frames are served with Cache-Control: immutable (next.config.mjs), so a re-extract under the same file names would mix old
 * cached frames with new ones in returning browsers. Bump this on every re-extract — it goes into every frame URL.
 */
export const FRAMES_VERSION = 'origin-224-v1';

export const BRAND = 'ORIGIN';
export const MODEL = 'Coffee';

/** Production URL: canonical, Open Graph, sitemap. NEXT_PUBLIC_SITE_URL overrides it per Vercel environment. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://origin.erythro.ai').replace(/\/$/, '');

/** Page title / description (also the Open Graph + Twitter card text). */
export const TITLE = `${BRAND} ${MODEL} — от ягоды до чашки`;
export const DESCRIPTION = `${BRAND} ${MODEL}: кофейня полного цикла — от спелой ягоды и обжарки до вашей чашки. Меню, галерея, отзывы и бронь.`;

/**
 * Uniform film speed: the frame is a straight function of the scroll distance from the hero top to the finale top, so every
 * pixel of scroll advances the film by the same amount whatever the sections' heights are (~0.45 frame per 1 % of a screen).
 * SCENES.f is the frame the film shows when that section's top reaches the top of the screen at the designed section heights —
 * used for the intro and as documentation; the CSS section heights (.scn-*) are set in proportion to these spans.
 *
 * Story of the master video (contact sheet):  0–40 ripe berry · 24–56 it splits, the bean falls · 56–80 milk splash ·
 * 80–136 milk surface, the jug pours · 136–184 milk & espresso swirl · 184–223 the cup, steam rising.
 */
export const LAST_FRAME = FRAMES - 1;
export const UNIFORM = false;   // block-by-block scroll (lib/pager.ts): the glide time keeps the speed even instead
export const SCENES = [
  { id: 'top', f: 0 },          // the whole ripe berry
  { id: 'origin', f: 40 },      // the berry split open, the bean between the halves
  { id: 'milk', f: 70 },        // the milk crown
  { id: 'ritual', f: 158 },     // the milk-and-espresso swirl
  { id: 'cup', f: LAST_FRAME }, // the cup, steam rising
] as const;

/** Coffee menu: i18n m{n}n / m{n}d, volume in ml, price in USD, tag (i18n mt_*), parallax depth of the card. */
export const MENU = [
  { n: 1, ml: 30, p: 3.2, tag: 'classic' },
  { n: 2, ml: 180, p: 4.5, tag: 'milk' },
  { n: 3, ml: 160, p: 4.8, tag: 'milk' },
  { n: 4, ml: 280, p: 4.9, tag: 'milk' },
  { n: 5, ml: 250, p: 5.6, tag: 'sig' },
  { n: 6, ml: 300, p: 5.2, tag: 'cold' },
] as const;

/** Reviews: i18n r{n}t (text), r{n}a (author), r{n}w (who), stars, guest photo (240 px square, cut from Assets/Foto). */
export const REVIEWS = [
  { n: 1, s: 5, photo: '/reviews/anna.webp' },
  { n: 2, s: 5, photo: '/reviews/mikhail.webp' },
  { n: 3, s: 5, photo: '/reviews/elena.webp' },
  { n: 4, s: 4, photo: '/reviews/dmitry.webp' },
  { n: 5, s: 5, photo: '/reviews/sofia.webp' },
  { n: 6, s: 5, photo: '/reviews/artem.webp' },
] as const;

/**
 * Gallery: coffee photos (Assets/Foto/Coffee) as WebP in /public/gallery at 1000 and 2000 px wide (`<src>-1000.webp`, `<src>-2000.webp`),
 * cut by scripts/prepare-assets.py; a = width / height; i18n gal{n}.
 * Prints lie scattered on a dark table. d = desktop spot, m = phone spot: x / y = centre of the print in % of the table
 * (x from the start side, so RTL mirrors it), w = print width in vw, r = rotation in degrees. Later prints lie on top.
 */
export const GALLERY = [
  { n: 1, src: '/gallery/spice', a: 3 / 2, d: { x: 47, y: 24, w: 15, r: -6 }, m: { x: 44, y: 6, w: 70, r: -4 } },
  { n: 2, src: '/gallery/glass', a: 3 / 2, d: { x: 62, y: 21, w: 14, r: 5 }, m: { x: 57, y: 20, w: 68, r: 5 } },
  { n: 3, src: '/gallery/break', a: 3 / 2, d: { x: 51, y: 49, w: 15, r: 4 }, m: { x: 44, y: 34, w: 70, r: -5 } },
  { n: 4, src: '/gallery/beans', a: 3 / 2, d: { x: 65, y: 46, w: 13, r: -7 }, m: { x: 57, y: 48, w: 68, r: 6 } },
  { n: 5, src: '/gallery/machine', a: 3 / 2, d: { x: 45, y: 76, w: 15, r: 6 }, m: { x: 44, y: 62, w: 70, r: -4 } },
  { n: 6, src: '/gallery/served', a: 3 / 2, d: { x: 60, y: 74, w: 14, r: -4 }, m: { x: 57, y: 77, w: 68, r: 5 } },
  { n: 7, src: '/gallery/choc', a: 3 / 2, d: { x: 29, y: 80, w: 14, r: -8 }, m: { x: 48, y: 92, w: 72, r: -3 } },
] as const;

/** Gallery backdrop: a dark table seen from above, beans and a scoop on the end side (Assets/coffee-beans-wooden-scoop-…jpg). */
export const GALLERY_TABLE = '/gallery/table-2400.webp';

/** Parallax layers (scripts/prepare-assets.py → public/parallax). */
export const PARALLAX = '/parallax';

/**
 * Footer backdrop loop under a dark veil. null = a plain dark footer.
 */
export const FOOTER_VIDEO: { desktop: string; phone: string; poster: string } | null = {
  desktop: '/video/footer-1280.mp4',   // Assets/Footer.mp4 cut as a seamless loop (README → Footer video)
  phone: '/video/footer-854.mp4',
  poster: '/video/footer-poster.webp',
};

export const landscapePath = (size: number, i: number) =>
  `${FRAME_DIR}/${size}/frame_${String(Math.max(0, Math.min(FRAMES - 1, Math.round(i))) + 1).padStart(4, '0')}.webp?v=${FRAMES_VERSION}`;
export const portraitPath = (i: number) =>
  `${PORTRAIT_DIR}/frame_${String(Math.max(0, Math.min(FRAMES - 1, Math.round(i))) + 1).padStart(4, '0')}.webp?v=${FRAMES_VERSION}`;

export const pad = (n: number) => String(n).padStart(2, '0');
