---
name: i18n-translater
description: >-
  Translations for this site (en / he / ar) are made ONLY through the Translater worker
  (C:\agents\Translater), never by hand. Use whenever i18n/ru.txt changes, a translation
  looks wrong, or the user asks to translate, re-translate, check or fix any en/he/ar string.
---

# Translations: only through the Translater worker

**Rule.** Russian (`i18n/ru.txt`) is the source. `i18n/en.txt`, `he.txt`, `ar.txt` are written by the
Translater worker and applied **exactly as the worker wrote them**. Do not translate, fix or polish a
string by hand — not even a one-word grammar fix. If a worker line is wrong, re-run that key through
the worker with more context (`--hint`), and apply what it returns.

## Run

```powershell
cd C:\agents\Translater
.venv\Scripts\python.exe C:\dev\Coffee\.claude\skills\i18n-translater\run_translater.py C:\dev\Coffee\i18n\ru.txt <scratch_out_dir> --apply C:\dev\Coffee\i18n
```

- Whole file: ~7 chunks of 25 keys, 3 LLM calls each (Gemini, set in the worker's `.env`). Run in the background.
- Only some keys (after editing ru.txt): `--keys key1,key2`.
- A key needs context (units, a button name, where it shows): `--keys unit_m --hint "м = метры высоты над уровнем моря, рядом с числом 1850"`.
- Fix only one language (e.g. the user picked an English wording): `--langs en` — the others are not written.
- Headings split over two keys (`*_h1` + `*_h2`): run both keys together and hint that it is one phrase on two lines.
- Address the reader as polite «вы» everywhere: he — plural forms (לחצו, שלכם), ar — plural (اضغطوا، لكم).
- Without `--apply` it only writes `<out>/{en,he,ar}.txt` + `audit_log.json` for comparison.

Then:

```powershell
npm run i18n
```

(`scripts/build-i18n.mjs` → `lib/dict.ts`; it warns about missing keys.) Check the page in he (RTL) and ar.

## Notes

- After every run check (and re-run the offending keys if found): Hebrew letters inside ar.txt (`[֐-׿]`) and
  Arabic inside he.txt — the worker sometimes leaks them; «cherry / דובדבן / كرز» for «ягода» — always pass the berry
  hint when a key mentions ягода; singular address in he/ar.

- The worker adds BiDi marks (U+200E / U+200F) around Latin, numbers and at line ends — keep them.
- The worker's auditor findings in `audit_log.json` are about its own drafts, not about the current files.
- After the run, report the changed keys and any line that is factually wrong (then re-run it with `--hint`).
