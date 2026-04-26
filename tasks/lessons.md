# Lessons

Architectural rules captured from user corrections. Read at session start before working in the relevant area.

---

## Permissions: three layers, no overlap

When a feature touches `auth.uid()` + tables, separate concerns:

- **RLS** decides "can this user read/write this row." This is the truth.
- **Triggers** enforce **invariants** (data integrity rules that hold regardless of who's writing). They must NOT be repurposed as permission gates that duplicate RLS.
- **Edge functions** perform **privileged multi-step mutations** that need atomicity, service-role access, or external side-effects (emails, payments).

**Drift risk:** any time the same authority check appears in two of those layers. When you spot it, ask: which layer should own it? Move the others to delegate.

**Edge function auth re-checks are NOT drift** when the function uses service-role to bypass RLS — the server-side check is the only remaining gate. Document that intent in a comment so it's not mistaken for duplication.

**Postgres RLS limitation worth knowing:** RLS cannot restrict UPDATE to specific columns. If you need "user X can update column A but not B," the only options are:
1. A `BEFORE UPDATE` trigger that raises on disallowed changes (this trigger encodes a permission check by necessity — call it out in a comment)
2. Move the privileged change to an edge function

Pick (1) only when the rule is a small invariant (one or two column constraints). For anything bigger, use (2).

---

## Frontend hooks must not become a backend layer

A page-level hook (`useXyzDashboard`) should:

- **Fetch** data the page needs.
- **Lightly aggregate** (group, sort, derive flags from already-fetched rows).

It must NOT:

- Compute permissions or business rules. Especially: don't mirror RLS logic client-side — that's defining auth in two places.
- Shape multiple unrelated domains into one return value.
- Become the place where "what can the user do" is decided.

**Pattern:** the server tells you what the user can see (via RLS-filtered queries). The hook surfaces that. If the UI needs "can this user click X," derive it from server data, not from re-checking the user's role client-side.

**Heuristic:** if a hook fetches `org_members.role` and computes a "is admin" flag for permission gating, that's the smell. Better: fetch the actually-permitted rows (RLS filters), and gate UI on `data.length > 0`.

---

## Sheet/tab "mini-app" patterns: invalidation is per-tab, not global

When tabs in a Sheet (or any nested view) each fetch independently:

- Don't share state across tabs unless explicitly necessary.
- Don't rely on a global `refetch()` to keep all tabs in sync — it only refetches what's mounted.
- When a mutation in tab A affects data viewed in tab B, plan the invalidation explicitly. Options: (a) tab B refetches on mount each time it's opened, (b) tabs share an invalidation token via the parent.

**MVP-acceptable shape:** tabs are sequential (only one mounted at a time), each fetches on mount. This works *because* you can't have stale data in a tab that isn't visible. Document that assumption — if it ever breaks (e.g. someone makes tabs visible simultaneously), invalidation must be revisited.

---

## Edge functions = critical path = idempotency + rollback are non-negotiable

When an edge function owns a mutation, it MUST:

1. **Be idempotent.** Re-running with the same input must not produce a different result. Gate on terminal state ("if already decided, return current state"). Add idempotency keys when the input alone isn't a stable identity.
2. **Race-safe writes.** Use conditional updates (`.eq('status', 'pending')`) so concurrent calls don't both succeed.
3. **Rollback partial failures.** If step N+1 fails after step N succeeded, either roll back step N or document why partial state is acceptable.
4. **Best-effort side-effects must be marked.** Emails, analytics, audit logs that don't gate the response should be `void` and wrapped — but logged on failure. Don't let an email failure roll back a database write.

**Drift risk:** if you find yourself adding "and also do X" to an existing edge function, ask whether X breaks the function's atomicity guarantee. If yes, X is a separate function or a side-effect, not part of the core mutation.

---

## Specific known shortcuts in current code (audit on next touch)

These are conscious tradeoffs, not bugs — but flag them when revising:

### `tg_space_members_role_guard`
- Encodes a permission check ("only space admins can change role"), violating the strict "triggers = invariants only" rule. Necessary because Postgres RLS can't restrict to a column.
- If we ever build admin role promotion in the UI, move that mutation to an edge function and remove the trigger's permission half. Keep only the invariant ("space_id and organization_id can't change").

### `useSpaceDashboard` computes `ownerAdminOrganizationIds`
- Fetches `org_members.role` and filters to owner/admin client-side. This duplicates the RLS check.
- For MVP it's a UI optimization (showing the right CTAs). Real auth is still RLS on every write.
- If RLS ever broadens (e.g., teachers can join spaces), the hook silently filters them out. Either remove the client-side filter (let RLS surface what's allowed) or pin the rule with a test.

### `notify-submitted` is not idempotent for emails
- Re-running fires a duplicate email blast. Caller is the client right after insert — not retried, so MVP-acceptable.
- If we ever wire this to a retry queue, add an idempotency check (e.g., a `notification_dispatched_at` column on `space_join_requests`).

---

## Naming history (2026-04-25)

The product surface uses **Studio** (UI label) over a domain entity that was originally called **venue** in the schema, then renamed to **space**. Layer mapping:

```
DB tables:  spaces, space_members, space_join_requests
DB column:  space_id
DB helpers: is_space_admin, tg_spaces_updated_at, tg_space_members_role_guard
Code:       Space, SpaceMember, useSpaceDashboard, fetchSpaceBySlug, …
Edge fn:    space-join-requests
URL public: /space/:slug    (distinct from /studio/:slug for individual orgs)
URL teacher dashboard: /teacher/studio
UI label:   "Studio" / "studios"
```

Rule: when introducing related concepts later, pick `space` for code/DB and `Studio` for user-visible labels. The `/studio/` vs `/space/` URL split exists deliberately to prevent the visual `/studio/` ↔ `/studios/` confusion that the previous shape had.
