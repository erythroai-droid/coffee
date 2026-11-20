# Agent notes — Scroll Film

Shared entry for Cursor, Claude, Gemini/Antigravity, Grok, and any other agent that reads `AGENTS.md`.

## Skills (auto-discover)

| Skill | Paths | Use when |
|---|---|---|
| `ai-search-visibility` | `.agents/skills/ai-search-visibility/SKILL.md` (Antigravity / Codex / shared) · `.cursor/skills/…` (Cursor) · `.claude/skills/…` (Claude Code) · `.grok/skills/…` (Grok Build) | Creating or auditing a public site; robots.txt / sitemap / WAF / SEO meta; landing copy for AI citation |

| `i18n-translater` | `.claude/skills/i18n-translater/SKILL.md` | Any en/he/ar translation: only through the Translater worker (C:\agents\Translater), applied as it wrote it, never by hand |

Human-readable copy: `docs/seo/ai-search-visibility-playbook.md`.

Short pointers: `CLAUDE.md`, `GEMINI.md` (Antigravity also loads `.agents/` + this file).

## Stack reminders

See `README.md` and `SITE.md`. Do not regress fonts, the studio frame (StudioBar) + first-seconds metrics, `/Video/` + `/Foto/` gitignore, or shipping robots/llms/sitemap/OG/analytics.
