# Animation improvement plans

Plans are stamped against commit `b6f26d4b` and were implemented together on 2026-07-16 after a drift check.

| # | Plan | Severity | Status | Dependencies |
| --- | --- | --- | --- | --- |
| 001 | [Centralize motion tokens and press timing](001-centralize-motion-tokens.md) | MEDIUM | IMPLEMENTED | None |
| 002 | [Remove dashboard route-entry motion](002-remove-dashboard-page-motion.md) | HIGH | IMPLEMENTED | None; preserve Plan 001 exports if already applied |
| 003 | [Snap keyboard sidebar collapse](003-snap-keyboard-sidebar-collapse.md) | HIGH | IMPLEMENTED | None |
| 004 | [Preserve feedback under reduced motion](004-preserve-reduced-motion-feedback.md) | MEDIUM | IMPLEMENTED | Prefer 001, then 002 |
| 005 | [Composite checkout floating labels](005-composite-floating-labels.md) | MEDIUM | IMPLEMENTED | 001 and 004 |

## Recommended execution order

1. **001 — Motion tokens and press timing.** Establishes the shared CSS/JS vocabulary used by later plans.
2. **002 and 003 — Daily directness fixes.** These are the two HIGH findings and may run in parallel after 001.
3. **004 — Reduced-motion feedback.** Runs after shared tokens and after PageShell motion is removed, reducing the surface it must cover.
4. **005 — Floating labels.** Uses the shared easing token and the reduced-motion convention.

## Execution notes

- Plans 002 and 003 are the release-polish blockers.
- Do not execute several plans in one unreviewed diff. Keep each change reviewable and run its own feel check.
- After every plan, run the narrow tests listed in that plan, then re-run the twelve visual-regression surfaces before marking it done.
- Motion cannot be approved from static screenshots alone. Use slow-motion playback, rapid interruption, reduced-motion emulation, and Safari/mobile checks where specified.
- Remaining audited items—overlay keyframe interruptibility, sheet reversal, accordion reversal, checkout discount exit, and the dormant `scale(0)` indicator—are intentionally not planned in this first batch.
