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

## Update 2026-04-15: reverted hugeicons → lucide

Hugeicons' free kit is curve-heavy, multi-path, and designed more for
marketing illustrations than dense product UI. Every chevron came out
as a soft curve rather than a sharp V. Reverted to lucide-react as the
icon kit. `@/lib/icons` barrel stays — now re-exports lucide icons
directly (plus three inline brand SVGs: Facebook / Linkedin / Twitter,
which lucide removed from its free kit). `components.json` iconLibrary
flipped back to `lucide`. Shadcn base components (breadcrumb, checkbox,
calendar, dialog, sheet, dropdown-menu, select, sidebar, alert,
spinner, sonner) all rewritten to use lucide directly. hugeicons deps
uninstalled.

## Review

All 6 migration commits + sweep + icon-kit revert landed. `npm run build` passes on each.

**Commit 1 (Foundation):** preset tokens in, compat aliases mapped old→new.
**Commit 2 (Reinstall):** 27 shadcn base files overwritten; custom variants
(`outline-soft`, `destructive-outline`, `compact`, loading), `SkeletonCard`,
`SkeletonTableRow`, `SkeletonTableRows`, `RadioGroupCardItem`, `showOverlay`
on Popover, alert variant map (info/success/warning/error/neutral),
spinner size API, utils.ts helpers (`getShowEmptyState`, `toggleEmptyState`,
`formatKroner`) all re-layered on top of preset base.
**Commit 3 (Sonner):** ~80 lines of !important overrides deleted; Toaster
wrapped in `@/components/ui/sonner` with hugeicons for type icons.
**Commit 4 (Typography):** 774 occurrences across 90 files replaced via
`scripts/migrate-typography.mjs`. Type-* definitions removed from index.css.
**Commit 5 (Colors):** 262 occurrences across 75 files replaced via
`scripts/migrate-colors.mjs`. All custom color/shadow tokens deleted from
index.css.
**Commit 6 (Icons):** 87 files rewired to `@/lib/icons` (wrapper file that
re-exports lucide-named components powered by hugeicons under the hood —
zero JSX changes needed). `lucide-react` uninstalled. `DESIGN_SYSTEM.md`
and `index.css.backup` deleted.

### Known drift / items flagged for manual review

- **Visible palette shift:** warm cream/charcoal (#FDFBF8 / #1A1A19) →
  cool neutral grayscale (oklch). Deliberate per migration plan.
- **Radius tighter:** 10px → 7.2px across all components. Deliberate.
- **Typography rounding drift:** most sizes moved ±1-2px during the
  type-* → Tailwind-default mapping. Deliberate.
- **Status/growth colors:** replaced with raw Tailwind (green-100, amber-900,
  etc.) rather than preset roles — visually close to old tokens but not
  identical (old used zinc-based neutrals tuned by hand, new uses Tailwind's
  default palette).
- **Icons:** all 82 lucide icons mapped to a HugeIcon best-match. Several
  don't have a true 1:1 equivalent and should be visually audited:
  - `ArrowRightLeft` → `ArrowDataTransferHorizontal` (generic arrows)
  - `ChevronsUpDown` → `ArrowDataTransferVertical`
  - `DoorOpen` → `DoorOpen` (close match)
  - `ExternalLink` → `LinkSquare01` (different metaphor)
  - `Layers` → `Layer` (singular)
  - `Paperclip` → `Attachment` (paperclip-like)
  - `Share2` → `Share01`
  - `Smile` → `Happy01`
  - `Undo2` → `Undo`
- **Custom SVG scale:** hugeicons render at the size set by the parent's
  className (`size-4` etc.). Should work identically to lucide.
- **Chart colors:** preset ships blue-based chart-1..5. Old app didn't
  actually use chart tokens, so no visible regression expected.
- **`--text-xxs` (11px):** retained; still used in several components.

### Risks

- Runtime visual audit not performed — build passes, but render-time
  checks (sidebar, calendar, toasts, payment badges, Vipps button) should
  be done manually.
- `radix-ui` umbrella package introduced by preset base components
  (Slot, Popover, etc.). `@radix-ui/react-*` packages still in
  package.json for primitives not yet migrated — safe to leave; preset
  base components exclusively use the umbrella.
- `next-themes` was referenced by the preset-generated sonner.tsx; stripped
  out since the app has no theme provider. If dark mode gets wired in later,
  restore `useTheme` in sonner.tsx.

### Follow-ups (not part of this migration)

- Audit the 9 icon replacements listed above visually; swap if a closer
  HugeIcon exists.
- Consider migrating `src/components/ui/*.tsx` custom components (date-badge,
  payment-badge, status-badge, stepper, etc.) to use preset semantic tokens
  directly — most already do after commit 5.
- Clean up unused `@radix-ui/react-*` deps after all primitives verified
  running on the umbrella `radix-ui` package.
