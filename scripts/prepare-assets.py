"""
Web cuts of the design assets in /Assets (kept local, git-ignored) -> /public.

    py -3 scripts/prepare-assets.py

- gallery prints: slide stills -> public/gallery/<name>-1000.webp / -2000.webp
- parallax layers: Background.jpg + PNG cut-outs, cropped to their alpha box -> public/parallax/*.webp (alpha kept)
- share card: app/opengraph-image.jpg + app/twitter-image.jpg (1200x630) and public/poster.webp
The film frames are cut separately: npm run frames -- Assets/Video_Final.mp4 --every 1
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / 'Assets'
GAL = ROOT / 'public' / 'gallery'
PAR = ROOT / 'public' / 'parallax'
GAL.mkdir(parents=True, exist_ok=True)
PAR.mkdir(parents=True, exist_ok=True)

# gallery: one still per stage of the film
GALLERY = {   # Assets/Foto/Coffee, in file-name order
    'spice': 'Foto/Coffee/aromatic-coffee-cinnamon-and-star-anise-still-li-2026-09-23-05-16-48-utc.jpg',
    'glass': 'Foto/Coffee/aromatic-espresso-with-coffee-beans-in-glassware-2026-09-24-08-56-44-utc.jpg',
    'break': 'Foto/Coffee/coffee-break-with-latte-and-black-coffee-2026-09-22-22-07-36-utc.jpg',
    'beans': 'Foto/Coffee/coffee-cup-surrounded-by-beans-with-vintage-spoons-2026-09-23-18-01-14-utc.jpg',
    'machine': 'Foto/Coffee/espresso-machine-pouring-coffee-into-cup-on-saucer-2026-09-24-08-29-05-utc.jpg',
    'served': 'Foto/Coffee/fresh-coffee-served-in-a-cafe-2026-09-23-00-24-47-utc.jpg',
    'choc': 'Foto/Coffee/hot-coffee-cup-with-chocolate-and-spice-2026-09-21-12-00-27-utc.jpg',
}
for name, src in GALLERY.items():
    im = Image.open(A / src)
    im.draft('RGB', (2200, 2200))
    im = im.convert('RGB')
    for w in (1000, 2000):
        h = round(im.height * w / im.width)
        im.resize((w, h), Image.LANCZOS).save(GAL / f'{name}-{w}.webp', 'WEBP', quality=80 if w == 1000 else 78, method=6)
    print('gallery', name)

# gallery backdrop: dark table from above, beans and a scoop on the right
tb = Image.open(A / 'coffee-beans-wooden-scoop-brown-sugar-coffee-dr-2026-09-22-22-08-10-utc.jpg').convert('RGB')
for w in (1400, 2400):
    tb.resize((w, round(tb.height * w / tb.width)), Image.LANCZOS).save(GAL / f'table-{w}.webp', 'WEBP', quality=78, method=6)
print('gallery table')

# parallax backdrop
bg = Image.open(A / 'Background.jpg').convert('RGB')
for w in (1280, 2400):
    h = round(bg.height * w / bg.width)
    bg.resize((w, h), Image.LANCZOS).save(PAR / f'bg-{w}.webp', 'WEBP', quality=74, method=6)
print('parallax bg')

# cut-outs: crop to the alpha box (+ a few px), cap the width
LAYERS = {
    'berry': ('Slide1/Bean.png', 640),
    'berry-split': ('Slide2/Bean.png', 900),
    'bean': ('Slide2/roasted_bean.png', 360),
    'grains': ('Slide2/grains.png', 420),
    'swirl': ('Slide7/Elements.png', 1100),
    'crown': ('Slide5/Elements.png', 1920),
    'splash': ('Slide4/Elements.png', 1920),
    'cup': ('Slide9/Cup.png', 1920),
    'steam': ('Slide9/Steam.png', 700),
}
for name, (src, cap) in LAYERS.items():
    im = Image.open(A / src).convert('RGBA')
    l, t, r, b = im.getchannel('A').getbbox()
    pad = 6
    im = im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))
    if im.width > cap:
        im = im.resize((cap, round(im.height * cap / im.width)), Image.LANCZOS)
    im.save(PAR / f'{name}.webp', 'WEBP', quality=82, method=6)
    print('layer', name, im.size)

# share card + poster from the last shot (the cup)
cup = Image.open(A / 'Slide9/Coffee_slide9.jpg').convert('RGB')
card = cup.resize((1200, 675), Image.LANCZOS).crop((0, 20, 1200, 650))
card.save(ROOT / 'app' / 'opengraph-image.jpg', 'JPEG', quality=84)
card.save(ROOT / 'app' / 'twitter-image.jpg', 'JPEG', quality=84)
first = Image.open(A / 'Slide1/Coffee_slide1.jpg').convert('RGB').resize((1280, 720), Image.LANCZOS)
first.save(ROOT / 'public' / 'poster.webp', 'WEBP', quality=72, method=6)
print('share card + poster')
