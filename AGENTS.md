# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # tsc + vite build
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run (CI-style)
npm run test:coverage
npm run test:e2e     # Playwright (auto-starts dev server if needed)
```

Run a single Vitest test file:
```bash
npx vitest run src/lib/utils.test.ts
```

Run a single Playwright test by file:
```bash
npx playwright test e2e/auth.spec.ts
```

Regenerate Supabase TypeScript types after schema changes:
```bash
supabase gen types typescript --project-id nollnnkksgicsvuthnjq > src/types/database.ts
```

Set Stripe secrets in Supabase edge functions:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Architecture

This is a Norwegian SaaS platform ("Ease") for fitness/yoga studio management. It is a React 19 SPA (Vite, TypeScript) with Supabase as the backend and Stripe Connect for payments.

### User roles and routing

There are two user types, determined at login by `AuthContext`:
- **Teachers** — users with entries in `org_members`. Land at `/teacher/*`, use `TeacherLayout` (sidebar).
- **Students** — users with no org memberships. Land at `/student/*`, use `StudentLayout` (header).

The distinction is resolved in `src/contexts/AuthContext.tsx`: if `org_members` returns rows, `userType` is `'teacher'`; otherwise `'student'`. This context is the single source of truth for `user`, `profile`, `currentOrganization`, `userRole`, and all auth methods.

All page components are lazy-loaded via `React.lazy()` and wrapped in `<Suspense>`.

### Key directories

- `src/services/` — all Supabase query functions (courses, signups, messages, etc.). No direct `supabase.from()` calls in components.
- `src/hooks/` — data-fetching hooks (e.g. `useCourseDetail`) that compose services + real-time subscriptions.
- `src/contexts/AuthContext.tsx` — global auth and org state.
- `src/types/database.ts` — auto-generated Supabase types + convenience aliases (e.g. `Course`, `Signup`).
- `src/lib/supabase.ts` — exports the typed Supabase client and `typedFrom()` helper.
- `src/lib/utils.ts` — exports `cn()` (tailwind-merge) and `formatKroner()`.
- `supabase/functions/` — Deno edge functions for Stripe checkout, webhooks, email, refunds, etc.
- `supabase/migrations/` — SQL migration history.

### Data layer patterns

- **Read**: `supabase.from('table').select(...)` directly or via `typedFrom()`.
- **Write**: always use `typedFrom('table')` — Supabase RLS causes insert/update types to resolve to `never` without this cast.
- **Real-time**: `useRealtimeSubscription` hook wraps Supabase channel subscriptions with automatic cleanup.
- **Idempotent operations**: course creation uses `create_course_idempotent` RPC; signup creation uses `create_signup_if_available` RPC (prevents double-booking).

### Supabase edge functions

Functions live in `supabase/functions/`. Shared utilities are in `supabase/functions/_shared/`. The `send-email` function contains a local `formatKr()` helper (mirrors `formatKroner()` from `@/lib/utils`) because edge functions cannot import from `src/`.

### Path alias

`@/` resolves to `src/` (configured in `vite.config.ts` and `tsconfig.json`).

## Design system

Before writing any UI, read `DESIGN_SYSTEM.md`. Key rules:

- **Surfaces**: page background is `bg-background` (zinc-100), content cards are `bg-white border border-border rounded-lg`.
- **Typography**: body text is `text-sm text-muted-foreground`. Section titles are `text-sm font-medium text-foreground mb-3` and placed **above** their card, not inside. Page `<h1>` uses `font-geist text-2xl font-medium tracking-tight`. `font-semibold` is banned — use `font-medium`.
- **No shadows**: hierarchy is expressed via borders and background contrast only.
- **Colors**: use semantic tokens (`text-foreground/text-muted-foreground`), not hardcoded `text-zinc-*`.
- **Reference implementation**: `src/components/teacher/CourseOverviewTab.tsx` is the gold standard for section/card layout.
- **shadcn primitives** in `src/components/ui/` over custom UI.

## Copy and formatting

All user-facing text is Norwegian bokmål. Read `COPY_STYLE_GUIDE.md` for domain vocabulary (e.g. "kursrekke" not "kurs-serie", "instruktør" not "lærer") and formatting rules.

**Currency**: always use `formatKroner(amount)` from `@/lib/utils`. Returns `"Gratis"` for 0/null, otherwise `"1 200 kr"` with `nb-NO` locale. Never write inline `${amount} kr`.

**Status display** (from `COPY_STYLE_GUIDE.md`):
- Course: `draft` → hidden, `upcoming` → Kommende, `active` → Pågår, `completed` → Fullført, `cancelled` → Avlyst
- Signup: `confirmed` → Påmeldt, `cancelled` → Avbestilt, `course_cancelled` → Kurs avlyst
- Payment: `paid` → Betalt, `pending` → Venter betaling, `failed` → Betaling feilet, `refunded` → Refundert

## Workflow notes (from CLAUDE.md)

- Commit after each completed fix or feature; don't amend previous commits.
- After any correction, update `tasks/lessons.md` with the pattern to avoid repeating it.
- After completing a task, check `tasks/lessons.md` at session start for relevant learnings.
- Plan first for any non-trivial change (3+ steps or architectural decisions). Write plans to `tasks/todo.md`.
