# shadcn Preset Migration — `b1Z5aAzb6` (radix-vega)

Complete migration from Ease Design System v4 to shadcn preset `b1Z5aAzb6`.

**Decisions locked in:**
- Preset: `b1Z5aAzb6` (radix-vega, neutral grayscale, oklch)
- Icons: migrate lucide → hugeicons
- Typography: round `type-*` classes to nearest Tailwind default
- Custom color tokens: replace with raw Tailwind where used
- Sonner: remove overrides, use default
- Strategy: `--reinstall` (overwrite 25 base components)
- `DESIGN_SYSTEM.md`: deleted after migration complete

---

## Commit 1: Foundation
- [ ] Backup `src/index.css` → `src/index.css.backup`
- [ ] Install deps: `@fontsource-variable/geist`, `tw-animate-css`, `@hugeicons/react`, `@hugeicons/core-free-icons`
- [ ] Rewrite `src/index.css` — preset tokens + compat aliases for legacy tokens
- [ ] Update `components.json` — `style: radix-vega`, `iconLibrary: hugeicons`
- [ ] Run `npm run build` — must succeed
- [ ] Start dev server, spot-check key pages

## Commit 2: Reinstall base shadcn components
- [ ] `npx shadcn@latest init --preset b1Z5aAzb6 --force --reinstall`
- [ ] Review diffs on custom components that extend base (eg. input, button)
- [ ] Run `npm run build`

## Commit 3: Default Sonner
- [ ] Install default `sonner` shadcn component
- [ ] Remove lines 451–529 from `index.css` (custom overrides)
- [ ] Verify toast rendering

## Commit 4: Typography migration
- [ ] Create mapping table: `type-*` → Tailwind utilities
- [ ] Global search-replace across 93 files
- [ ] Remove `type-*` class definitions from `index.css` (lines ~265–373)
- [ ] Run `npm run build`

## Commit 5: Color token migration
- [ ] Replace `bg-surface`, `surface-muted`, etc. with `bg-card`, `bg-muted`
- [ ] Replace status tokens with raw Tailwind (`bg-green-100` etc.)
- [ ] Replace `success`/`warning`/`info` with Tailwind
- [ ] Keep Vipps/Fiken as hardcoded brand hex
- [ ] Remove compat aliases from `index.css`

## Commit 6: Icons + cleanup
- [ ] Build lucide → hugeicons name mapping table
- [ ] Replace imports in 98 files
- [ ] Delete `DESIGN_SYSTEM.md`
- [ ] Delete `src/index.css.backup`
- [ ] Final `npm run build`

---

## Review

(to be populated after each commit)
