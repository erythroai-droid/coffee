"""Run i18n/ru.txt ("key = text" per line) through the Translater worker (C:\\agents\\Translater).

Run from the worker folder with its venv:
  cd C:\\agents\\Translater
  .venv\\Scripts\\python.exe <this file> <project>\\i18n\\ru.txt <out_dir> [--keys k1,k2] [--hint "extra context"] [--apply <project>\\i18n]

Writes <out_dir>/{en,he,ar}.txt and audit_log.json. With --keys only those keys are translated.
With --apply the worker's lines are merged into <project>/i18n/{en,he,ar}.txt as the worker wrote them
(other keys untouched, file order follows ru.txt)."""
import sys, re, json, argparse
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from core.pipeline import TechnicalTranslationPipeline  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('ru'); ap.add_argument('out')
ap.add_argument('--keys', default='')
ap.add_argument('--hint', default='')
ap.add_argument('--apply', default='')
ap.add_argument('--chunk', type=int, default=25)
ap.add_argument('--langs', default='en,he,ar', help='which languages --apply writes (the worker always returns all three)')
a = ap.parse_args()

ru_path, out_dir = Path(a.ru), Path(a.out)
out_dir.mkdir(parents=True, exist_ok=True)
LINE = re.compile(r'^\s*[\u200E\u200F]?\s*([a-z][a-z0-9_]*)\s*=\s*(.*)$', re.I)


def parse(p: Path) -> dict:
    out = {}
    if p.exists():
        for raw in p.read_text(encoding='utf-8').lstrip('\ufeff').splitlines():
            m = LINE.match(raw)
            if m:
                out[m.group(1)] = m.group(2).strip()
    return out


src = parse(ru_path)
order = list(src)
keys = [k for k in a.keys.split(',') if k] or order
HINT = ("Это UI-строки сайта кофейни ORIGIN Coffee (лендинг: меню, обжарка, отзывы, бронирование). "
        "Формат: одна строка = 'key = текст'. Ключи (до знака =) НЕ переводить и НЕ менять, сохранить все строки, "
        "их порядок и количество; переводить только текст после '='. Сохранить плейсхолдеры, цифры, цены, HTML/markdown, "
        "названия бренда. Тон — тёплый маркетинговый, не технический. " + a.hint)

pipe = TechnicalTranslationPipeline()
res = {'en': {}, 'he': {}, 'ar': {}}
log = []
for i in range(0, len(keys), a.chunk):
    part = keys[i:i + a.chunk]
    text = '\n'.join(f'{k} = {src[k]}' for k in part)
    r = None
    for attempt in range(2):
        try:
            r = pipe.translate_and_verify(text, context_hint=HINT, target_style='UI/Microcopy')
            break
        except Exception as e:  # noqa: BLE001
            print(f'chunk {i}: attempt {attempt + 1} failed: {e}', flush=True)
    if r is None:
        continue
    for lang, body in (('en', r.english_final), ('he', r.hebrew_final), ('ar', r.arabic_final)):
        for raw in (body or '').splitlines():
            m = LINE.match(raw)
            if m and m.group(1) in part:
                res[lang][m.group(1)] = m.group(2).strip()
    log.append({'chunk': i, 'scores': [r.quality_score_en, r.quality_score_he, r.quality_score_ar],
                'findings': [f.model_dump() for f in r.audit_findings], 'summary': r.audit_summary})
    print(f'chunk {i}-{i + len(part)} done, scores {log[-1]["scores"]}', flush=True)

for lang, d in res.items():
    (out_dir / f'{lang}.txt').write_text('\n'.join(f'{k} = {d[k]}' for k in keys if k in d) + '\n', encoding='utf-8')
    miss = [k for k in keys if k not in d]
    print(f'{lang}: {len(d)}/{len(keys)} keys' + (f', missing: {", ".join(miss)}' if miss else ''), flush=True)
    if a.apply and lang in a.langs.split(','):
        target = Path(a.apply) / f'{lang}.txt'
        merged = {**parse(target), **d}
        target.write_text('\n'.join(f'{k} = {merged[k]}' for k in order if k in merged) + '\n', encoding='utf-8')
        print(f'applied {len(d)} keys to {target}', flush=True)
(out_dir / 'audit_log.json').write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding='utf-8')
