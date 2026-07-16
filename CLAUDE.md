## Formatting & Copy Rules

- **Currency**: Always use `formatKroner()` from `@/lib/utils` to display NOK amounts. Never write `${amount} kr` inline — it skips the Norwegian thousands separator (e.g. `2200 kr` vs correct `2 200 kr`).
  - Returns `"0 kr"` for 0/null/undefined, otherwise `"1 200 kr"` with proper `nb-NO` locale formatting.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Ship flow (do this without being asked)

When a task that changed code is complete and verified (build passes, relevant checks green):

1. **Commit** with a conventional message and **push** the branch: `git push -u origin HEAD`.
2. **Open a PR** to `main` (`gh pr create --base main`) with a summary and test plan, or push to the existing PR if one is open.
3. **Do not merge on your own.** Merging deploys — CI ships `main` straight to production (openspot.no). When the user clearly approves ("merge", "ship it", "send it", or an unambiguous yes to merging), merge immediately with `gh pr merge --squash --delete-branch` — no re-asking.

Exploratory work, QA sessions, and question-answering produce no commits — this flow applies only when code changed.

## Design references (Mobbin)

Before building or restyling any UI from external references, follow `docs/mobbin-reference-rule.md` exactly — query with intent, write the Reference Extraction block before any code, borrow structure only, re-skin in our system, and run the counterfactual self-check. Where that rule says `STYLE.md` and `PATTERNS.md`, this repo's files are `docs/design-language.md` and `docs/ui-patterns.md`.

## Design craft skill (mandatory for UI work)

Whenever you implement — or plan/discuss implementing — new or restyled UI, actively invoke the `emil-design-eng` skill together with the `ux-ui-pro` gate, and apply its craft bar throughout the build (component behavior, polish, animation decisions, invisible details), not as a one-time read. For motion/gesture-heavy work also load `apple-design`; run `review-animations` on new animation code before commit.

## Loading skeletons track layout

Any change to a screen's layout or structure (rows added/removed, spacing, reordered sections, new cards/columns) MUST update that screen's loading skeleton in the same change — the inline `<Skeleton>` block in the page/component and/or the shared `PageSkeleton` (`src/components/ui/page-skeleton.tsx`). Skeletons mirror the real layout's paddings and gaps exactly or the swap jumps (`docs/design-language.md` § Feedback states). Before finishing UI work, check whether the file (or its route) renders a skeleton and verify it still matches.

## Design tokens

Source of truth is `src/index.css` — a 3-layer OKLCH system: primitives (`--neutral-*`, `--jade/amber/red/blue-*`) → semantic tokens (`--foreground`, `--primary`, `--success`…) → Tailwind `@theme` utilities. Consume semantic tokens in components, never primitives directly; build hierarchy through spacing + the tier gaps (surface → border → muted-text → foreground), not bold weights.

- **Neutral = cool-tinted grey (hue 250, chroma 0.001–0.013 scaled by step).** Re-tinted 2026-07 from the earlier pure-neutral ramp toward a sharper Slate-like reference — the tint is deliberate; don't de-tint it back and don't push chroma higher. Lightness steps are accessibility-tuned (`--neutral-11` is 4.86:1 AA on white) — change hue/chroma, never the L values (`--neutral-2` canvas and `--neutral-12` foreground were darkened on purpose; both moves increase contrast).
- **Primary = azure blue** (`oklch(0.540 0.150 245)` light, `0.555` dark; `--primary-subtle` renders `#F2F7FB`). White button text is AA-verified (4.94:1 / 4.68:1) — keep any primary change in the 0.45–0.55 L band and hue-matched to the cool neutral ramp.
- **Interaction overlays — `--hover` / `--pressed` (`bg-hover` / `bg-pressed`)** are `--foreground` ink at 6% / 12% alpha. Because they reference `--foreground`, one token **adapts to any surface and theme** (darkens light-mode hovers on the grey rail or a white card; lightens dark-mode hovers). Prefer these for hover/active *fills* over baking a per-surface opaque token. The sidebar's `--sidebar-accent`/`-active` alias them.
- **Sidebar is a white rail** — `--sidebar` aliases `--background`, separated by a `--border-subtle` divider, with nav items and the plan/account cards on light `--muted` / translucent `--hover` fills (was dark chrome). `--chrome-*` stays dark — now only for toasts + marketing dark bands, not the sidebar.
- **Status colour = the light treatment, always.** jade/amber/red/blue on *any* status indicator — badge, chip, stepper/step marker, status dot — is either a small solid dot beside text, or a `-subtle` tinted pill/circle (`bg-{success,warning,danger,info}-subtle` fill + matching `text-*` glyph/ink). **Never** a saturated `bg-success` / `bg-warning` / `bg-danger` fill behind a glyph or label. Solid semantic fills stay for action affordances (the destructive button) — not status display. Full rule in `docs/design-language.md` § Chips / badges / status.

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
