# 001 — Centralize motion tokens and press timing

- **Status**: IMPLEMENTED
- **Commit**: b6f26d4b
- **Severity**: MEDIUM
- **Category**: Easing & duration / Cohesion & tokens
- **Estimated scope**: 24–26 files, mechanical plus two shared-control changes

## Problem

The application has the correct strong UI curves, but they are not shared across CSS and JavaScript. Framer Motion uses literal tuples in `src/lib/motion.ts`, several components repeat those tuples, most CSS components use Tailwind's built-in `ease-out`, and `.ios-ease` defines a separate 300ms curve. Core buttons also use the same 150ms timing on press and release.

```ts
// src/lib/motion.ts:3 — current
const ease: [number, number, number, number] = [0.23, 1, 0.32, 1];

// src/lib/motion.ts:50 — current
const stepEase: [number, number, number, number] = [0.32, 0.72, 0, 1];
```

```css
/* src/index.css:518 — current */
.ios-ease {
  transition: border-color 0.3s cubic-bezier(0.25, 1, 0.5, 1),
              box-shadow 0.3s cubic-bezier(0.25, 1, 0.5, 1),
              background-color 0.3s cubic-bezier(0.25, 1, 0.5, 1),
              color 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
```

```tsx
// src/components/ui/button.tsx:69 — current
"... transition-[color,background-color,border-color,transform] duration-150 ease-out ... active:not-aria-[haspopup]:translate-y-px ..."

// src/components/teacher/SegmentedTabs.tsx:119 — current
'... transition-[color,background-color,border-color,transform] duration-150 ease-out'
```

## Target

Define the three canonical curves once in CSS and expose matching named tuples for JavaScript:

```css
/* src/index.css, inside :root */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

```ts
// src/lib/motion.ts
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];
export const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1];
```

Add shared utilities that distinguish color feedback from physical press feedback:

```css
/* src/index.css, @layer components */
.motion-color {
  transition-property: color, background-color, border-color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease;
}

.motion-press {
  transition-property: color, background-color, border-color, transform;
  transition-duration: 100ms; /* release: system response snaps */
  transition-timing-function: ease, ease, ease, var(--ease-out);
}

.motion-press:active {
  transition-duration: 150ms; /* press: deliberate physical feedback */
}
```

Use `EASE_OUT` for entering/exiting UI, `EASE_IN_OUT` for on-screen movement, and `EASE_DRAWER` for directional step/drawer motion. Pure hover/color changes use CSS `ease`; press transforms use `var(--ease-out)`.

## Repo conventions to follow

- Motion values belong in `src/index.css`, which is already the design-token source of truth.
- Shared Framer variants belong in `src/lib/motion.ts`.
- The correct existing strong curve is the tuple at `src/lib/motion.ts:5`; do not change its values.
- `DirtyFormBar` is the timing exemplar: a 200ms deliberate entrance and 150ms system exit at `src/components/ui/dirty-form-bar.tsx:142`.
- Keep the product restrained. This plan changes timing/easing only; it does not add new motion.

## Steps

1. In `src/index.css`, add `--ease-out`, `--ease-in-out`, and `--ease-drawer` to `:root`, exactly as shown above. Add `.motion-color` and `.motion-press` under `@layer components`.
2. In `src/lib/motion.ts`, export `EASE_OUT`, `EASE_IN_OUT`, and `EASE_DRAWER`. Replace the private `ease` and `stepEase` constants with those exports without changing durations or variant geometry.
3. Replace repeated `[0.23, 1, 0.32, 1]` tuples with `EASE_OUT` imports in:
   - `src/components/notifications/NotificationRow.tsx`
   - `src/components/teacher/SessionDaysEditor.tsx`
4. Replace the shared button transition classes in `src/components/ui/button.tsx` with `motion-press`. Preserve the current 1px active translation and the `aria-haspopup` exception.
5. Replace the matching transition classes in `src/components/teacher/SegmentedTabs.tsx` with `motion-press`. Preserve sizes, borders, radiogroup semantics, focus rings, and active translation.
6. Replace `.ios-ease`'s four 300ms transitions with 150ms transitions using the correct property-specific easing: `ease` for color/background/border/shadow. Do not add transform to this utility.
7. For shared primitives whose transition is color/border/shadow only, replace `duration-150 ease-out` with `motion-color` and remove duplicate transition declarations. Audit these files explicitly:
   - `src/components/ui/badge.tsx`
   - `src/components/ui/checkbox.tsx`
   - `src/components/ui/date-picker.tsx`
   - `src/components/ui/info-tooltip.tsx`
   - `src/components/ui/input-group.tsx`
   - `src/components/ui/input-otp.tsx`
   - `src/components/ui/input.tsx`
   - `src/components/ui/radio-group.tsx`
   - `src/components/ui/rich-text-editor.tsx`
   - `src/components/ui/select.tsx`
   - `src/components/ui/switch.tsx`
   - `src/components/ui/textarea.tsx`
8. For components that animate transform or opacity, keep their existing transition-property list and replace only the timing function with `[transition-timing-function:var(--ease-out)]`. Audit:
   - `src/components/ui/dirty-form-bar.tsx`
   - `src/components/ui/image-upload.tsx`
   - `src/components/ui/toggle.tsx`
   - `src/pages/public/CheckoutPage.tsx` (`MetaLine` only)
   Do not alter duration or geometry in these components.
9. Run `rg -n "\\[0\\.23, 1, 0\\.32, 1\\]|\\[0\\.32, 0\\.72, 0, 1\\]|cubic-bezier\\(0\\.25, 1, 0\\.5, 1\\)" src` and confirm no unapproved duplicate curve remains.

## Boundaries

- Do NOT alter overlay keyframes, page motion, sidebar collapse, reduced-motion behavior, or floating-label geometry; those are separate plans.
- Do NOT convert color-only transitions to the strong ease-out curve. Hover/color uses `ease`.
- Do NOT change the visible active translation from `translate-y-px` to scale; that is an established product choice.
- Do NOT add dependencies or modify generated snapshots.
- If a step does not match commit `b6f26d4b`, STOP and report the drift instead of improvising.

## Verification

- **Mechanical**:
  - `npm run lint`
  - `npm run test:run`
  - `npm run build`
  - The duplicate-curve `rg` command in step 9 returns only the canonical definitions.
- **Feel check**:
  - In `/dev/primitives`, press and release every button variant. Press should feel deliberate; release should be visibly faster and never sticky.
  - Toggle checkout ticket segments and dashboard segmented tabs. Text/border color must remain calm while the 1px press response settles crisply.
  - Use DevTools at 10% playback to confirm color and transform properties no longer share an inappropriate easing.
  - Toggle `prefers-reduced-motion`; this plan must not change behavior yet.
- **Done when**: all canonical curves have one CSS definition and one named TypeScript equivalent, duplicate tuples are removed, shared press feedback is 150ms down/100ms up, and static screenshots are unchanged.
