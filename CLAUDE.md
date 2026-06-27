## Formatting & Copy Rules

- **Currency**: Always use `formatKroner()` from `@/lib/utils` to display NOK amounts. Never write `${amount} kr` inline — it skips the Norwegian thousands separator (e.g. `2200 kr` vs correct `2 200 kr`).
  - Returns `"0 kr"` for 0/null/undefined, otherwise `"1 200 kr"` with proper `nb-NO` locale formatting.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Design tokens

Source of truth is `src/index.css` — a 3-layer OKLCH system: primitives (`--neutral-*`, `--jade/amber/red-*`) → semantic tokens (`--foreground`, `--primary`, `--success`…) → Tailwind `@theme` utilities. Consume semantic tokens in components, never primitives directly; build hierarchy through spacing + the tier gaps (surface → border → muted-text → foreground), not bold weights.

- **Neutral = pure-neutral grey (chroma 0).** Deliberately de-tinted from Radix Slate to kill the cold blue cast. Do **not** re-introduce a hue on the neutral ramp. Lightness steps are accessibility-tuned (`--neutral-11` is AA on white) — change hue/chroma, never the L values.
- **Primary = periwinkle** (`oklch(0.540 0.150 274)` light, `0.555` dark). White button text is AA-verified — keep any primary change in the 0.45–0.55 L band.
- **Beige** (`--beige` / `-foreground` / `-border`, `bg-beige`) is the **one warm accent**. Highlight surfaces only (upsell, callouts) — **never a button/action**, never frequent, or it competes with periwinkle as a second brand colour.
- **Interaction overlays — `--hover` / `--pressed` (`bg-hover` / `bg-pressed`)** are `--foreground` ink at 6% / 12% alpha. Because they reference `--foreground`, one token **adapts to any surface and theme** (darkens light-mode hovers on the grey rail or a white card; lightens dark-mode hovers). Prefer these for hover/active *fills* over baking a per-surface opaque token. The sidebar's `--sidebar-accent`/`-active` alias them.
- **Sidebar is a white rail** — `--sidebar` aliases `--background`, separated by a `--border-subtle` divider, with nav items and the plan/account cards on light `--muted` / translucent `--hover` fills (was dark chrome). `--chrome-*` stays dark — now only for toasts + marketing dark bands, not the sidebar.

## Database Migrations (read before any schema/DB work)

This repo runs in **multiple Conductor workspaces across machines**, all pointing at **one shared remote Supabase**. The recurring failure mode: a migration gets applied to the remote DB but its `.sql` file never lands on `origin/main`, so `main` drifts behind the database and every new workspace inherits the gap (`supabase db push` then fails with *"Remote migration versions not found in local migrations directory"*).

**A migration is DONE only when its file is committed and on `origin/main` — not when `db push` (or `apply_migration`) succeeds.** Applying to the DB is half the job; the file is the other half.

When you create or apply a migration, you MUST:

1. **Write the file** under `supabase/migrations/<UTC-timestamp>_<snake_name>.sql`. Pick a timestamp **strictly greater** than the latest existing one — check first:
   ```bash
   ls supabase/migrations | sort | tail -3
   ```
   Reusing/duplicating a timestamp collides with another workspace's migration. Match the existing style: SECURITY DEFINER + `REVOKE ALL … FROM PUBLIC` + explicit `GRANT EXECUTE … TO anon, authenticated` for public RPCs (see `20260519161052_public_storefront_seller_ids`).
2. **Commit the file** in the same change as the code that depends on it. Never leave a migration applied-but-uncommitted.
3. **Get it onto `main`.** Before this workspace is merged or discarded, the migration file must reach `origin/main` (via the branch's PR/merge). If you `db push` from a workspace, treat the work as unfinished until the file is on `main`.
4. **State it explicitly** in your final message when a change includes a migration: that it still needs to be applied to remote and/or land on `main`, so it isn't forgotten.

If `db push` fails because remote has versions not present locally:
- It means `main` is **behind** the remote DB — recover the missing migration files into `supabase/migrations/` and commit them to `main` so files match the database.
- **Do NOT** run `supabase migration repair --status reverted …` (the CLI's suggestion) — it rewrites the remote history table and causes drift. Reconcile by getting the files into the repo instead.
- The files for already-applied migrations are recoverable from Conductor checkpoint refs (`git for-each-ref refs/conductor-checkpoints`). Already-applied migrations are **skipped** by `db push` (it keys on the version timestamp), so committing them to `main` is safe and won't re-run them.

To audit drift at any time: `supabase migration list` — anything shown as *remote only* is a file missing from the repo; fix it before doing more DB work.
