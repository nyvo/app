# Responsiveness Audit — Findings

> **Companion to** `RESPONSIVENESS_AUDIT_PLAN.md`. Audit-only deliverable —
> no code was changed. Method: live app at `localhost:5173`, driven via an
> iframe harness (media queries evaluate against the iframe's own width, so a
> 320px iframe renders exactly as a 320px phone). Every page probed for
> document-level horizontal overflow (`scrollWidth > clientWidth`), with a
> scroller-aware filter so intentional horizontal strips aren't flagged as bugs.
> Teacher surface audited logged-in as `nyvo77@gmail.com` against the live
> `kristoffer-yoga` studio.
>
> **Date:** 2026-06-09 · **Breakpoints exercised:** 320 / 375 / 767 / 768 / 1024 / 1280.

---

## 1. Summary

**The app is in good responsive shape.** No horizontal overflow was found on
**any** page of either surface at the worst-case width (320px). The `md` (768px)
phone↔desktop seam works correctly. The pre-scan's headline risk — "fixed pixel
widths" — turned out to be **false** (see §4). The real, actionable issue is a
single shared component: the **Sheet drawer is locked to 75% width on phones**,
which cramps every content drawer. Everything else is minor touch-target polish.

| Surface | State | Notes |
|---|---|---|
| **Public / booking** | ✅ Clean | Zero overflow at 320 on landing, studio, course detail, checkout, auth, about, terms. Booking flow stacks correctly; CTA full-width; summary card reflows below form. |
| **Teacher / dashboard** | ✅ Usable | All page layouts clean at 320. `md` swap correct (rail ≥768, hamburger <768). Tables/tabs scroll, don't overflow. Dialogs well-behaved. **One shared drawer-width issue** (F1). |

**Top themes**
1. **One high-leverage fix** (F1) resolves cramping across *all* side drawers.
2. **Touch targets** are the only recurring polish item — several interactive
   elements sit at 36px / 28px / 16px instead of the 44px `.touch-target` bar.
3. **The §4 "fixed width" risk list is a non-issue** — every cited width is
   actually `max-w-[…] min-w-0` (safe), a tooltip `min-w`, or `/dev`-only.

---

## 2. Findings

Severity: **P0** = blocks a booking/core action · **P1** = visibly broken,
workaroundable · **P2** = polish/awkward.

| # | Sev | Surface | Component | file:line | Viewport(s) | What breaks | Proposed fix (design-system terms) |
|---|-----|---------|-----------|-----------|-------------|-------------|-------------------------------------|
| **F1 ✅ FIXED** | **P2** | Both (all drawers) | `Sheet` (left/right) | `src/components/ui/sheet.tsx:63` | <640px (worst at 320) | Side sheets were `data-[side=right]:w-3/4`; the `sm:max-w-[480px]` cap only applies at ≥640px, so below `sm` the drawer was **always 75% of viewport** = 240px @320 / 281px @375. Content cramped (enrollment date wrapped to 3 lines, "Dintero_psp" wrapped, email truncated to "nyvo7…", Start/Slutt selects squeezed) while **25% of the screen sat empty under the scrim**. Confirmed on `ParticipantDetailDrawer` and `CreateCourseDrawer`. | **Done (2026-06-09):** `w-3/4` → `w-[calc(100vw-2rem)]` for both sides, keeping `sm:max-w-[480px]`. Drawers now 288px @320 / 343px @375 (32px scrim peek); desktop still capped at 480px. **Latent sub-bug found & fixed:** the mobile sidebar's `w-(--sidebar-width)` (18rem) was *also* being overridden by the old `w-3/4` (so it shipped at 75%, not its intended 18rem). Made it important (`w-(--sidebar-width)!` in `sidebar.tsx:187`) so the sidebar owns its width and the shared Sheet base no longer dictates it. Verified live: drawers wider/uncramped, sidebar back to 18rem. |
| **F2** | ~~P2~~ **Dismissed** | Public (booking) | terms checkbox | `CheckoutPage:391` / `checkbox.tsx:15` | 320–768 | Probe measured the **visible** 16×16px box, but the real tap area is already fine: `checkbox.tsx` has `after:-inset-x-3 after:-inset-y-2` (invisible hit-area extender → ~40×32px), and the checkbox sits inside a `<label cursor-pointer>` wrapping the full consent text, so the whole row toggles it. | **No change** (verified 2026-06-09). False positive — hit area already extended + label-wrapped. |
| **F3** | ~~P2~~ **Won't fix** | Public (booking) | inputs & primary CTAs | `button.tsx:63` (`h-9`), `input.tsx` (`h-9`) | 320–768 | Inputs (`h-9`/36px) and primary CTAs ("Fortsett til betaling", "Reserver", default `h-9`/36px) sit under the 44px bar. Tapping a field is forgiving; CTAs are full-width (huge horizontal target). A design-system `cta` size (`h-11`/44px, `button.tsx:65`) exists if wanted. | **No change** (owner decision 2026-06-09): reaching 44px means taller controls (visual change) or an invisible `after:-inset-y-1` extender; owner opted to keep current design. 36px accepted. |
| **F4** | **P2** | Teacher | header icon buttons | `MobileTeacherHeader` (sidebar toggle, bell) | <768 | Sidebar toggle and notifications bell are **36×36px**. Frequent taps, slightly small. | Add `.touch-target` to the header icon buttons. |
| **F5** | **P2** | Teacher | segmented control | dashboard income range (Uke/Måned/År) | all | Segments are **28px tall**. Small for a toggle that's tapped often on mobile. | Bump segment height to ≥36–44px on phone, or apply `.touch-target`. |

No **P0** or **P1** findings. The booking flow — the surface where bugs cost real
money — is clean end to end.

---

## 3. Cross-cutting recommendations (ranked by leverage)

1. **Widen the mobile Sheet (F1).** Single edit in `sheet.tsx:63`. Fixes
   `ParticipantDetailDrawer`, `CreateCourseDrawer`, `AddParticipantDrawer`,
   `CourseDrawer`, `SendCourseMessageDrawer` simultaneously. **Highest leverage.**
2. **A touch-target pass on the booking flow (F2–F3).** The checkbox, inputs,
   and CTAs on `CheckoutPage` are the only sub-44px controls on a money path.
   Apply the existing `.touch-target` utility — no new primitives.
3. **A touch-target pass on teacher chrome (F4–F5).** Lower priority (internal,
   not buyer-facing) but cheap and consistent with #2.

---

## 4. Dismissed with evidence (do NOT spend time "fixing" these)

The plan's §4 "known risk areas" were pre-scan *hypotheses*. Verified against
live code + runtime — all are non-issues:

| Plan claim | Reality | Verdict |
|---|---|---|
| `PublicCourseDetailPage` `w-[1100px]`, `w-[640px]` | Actually `max-w-[1100px] w-full` and `max-w-[640px] min-w-0` (`sellers`/detail page lines 118/130/349/356). `max-w` + `min-w-0` shrinks freely below the cap. | **Safe.** No overflow at 320. |
| `CheckoutPage` `w-[560px]`, `w-[552px]` | Actually `max-w-[560px]` and `max-w-[552px] min-w-0` (lines 676/332). | **Safe.** No overflow at 320. |
| `ui/table.tsx` `w-[360px]`/`w-[220px]` | Those values appear only in a **doc comment** recommending `min-w/max-w`; no live fixed-width cell. | **N/A.** |
| `IncomeChart.tsx` `w-[180px]` | Actually `min-w-[180px]` on the **chart tooltip** (renders off-canvas, can't push page width). Chart itself uses a responsive container. | **Safe.** Dashboard clean at 320. |
| `w-[360px]` literal | Only in `src/pages/dev/ModalsButtonsToastsPreview.tsx` — DEV-only, excluded. | **Out of scope.** |
| `ParticipantDetailDrawer` `grid-cols-2` (line 296) | Fits without overflow at 320; cramping is a symptom of F1, not the grid. | **Covered by F1.** |
| `time-picker.tsx` `grid-cols-4` in `w-[280px]` popover | Popover is fixed 280px and renders within viewport; not reached via a page in this pass. | **Low risk — spot-check if touched.** |
| `StudioMonthGrid` `grid-cols-7` | Public studio page clean at 320; 7-col month grid is intrinsic. Legibility at 320 acceptable in screenshots. | **Acceptable.** |

---

## 5. Coverage & method notes

**Pages probed (overflow + chrome + touch targets):**
- Public: `/` · `/kristoffer-yoga` · `/kristoffer-yoga/paid` ·
  `/kristoffer-yoga/paid/pamelding` · `/auth` · `/om-oss` · `/terms`.
- Teacher: `/overview` · `/schedule` · `/courses` · `/courses/:id` · `/studio` ·
  `/collaboration` · `/settings/payouts` · `/settings/profile` · `/get-started` ·
  `/help`.
- Interactive: Påmeldte table, `ParticipantDetailDrawer`, `CreateCourseDrawer`,
  `SessionsModal`, notifications popover, course tabs.

**Not exhaustively covered (low risk, recommend a quick pass if time):**
`CheckoutSuccessPage` (requires a completed payment), `JoinPage` (needs an invite
code), `OnboardingPage`, `NotFoundPage`, landscape-phone on the checkout sticky
rail, and the `time-picker` popover internals.

**`md` seam verification (innerW exact):**
- `innerW 767` → `railVisible:false, hamburgerVisible:true` (mobile) ✅
- `innerW 768` → `railVisible:true, hamburgerVisible:false` (desktop) ✅
- No double-chrome, no overflow on either side.

**Reproducibility:** the iframe harness (`window.auditRoute(innerW, path)`) and
interaction helpers (`loadFrame` / `clickText` / `probeFrame`) were injected via
chrome-devtools `evaluate`. Screenshots were captured per surface/breakpoint
during the run (landing-320, checkout-375, overview-767, coursepage-320,
participant-drawer-320, create-course-drawer-320, paameldte-320).

---

## 6. Suggested fix order (when approved)

Per the plan, fixes are gated on your review. When greenlit:
1. **F1** — `sheet.tsx` mobile width (one line, highest leverage).
2. **F2 + F3** — booking-flow touch targets (checkout checkbox, inputs, CTAs).
3. **F4 + F5** — teacher chrome touch targets.

All proposed fixes reuse existing tokens/utilities (`.touch-target`,
`w-[calc(100vw-2rem)]`, `min-h-11`). **No new design primitives required.**
