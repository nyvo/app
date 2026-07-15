# 004 — Preserve feedback under reduced motion

- **Status**: IMPLEMENTED
- **Commit**: b6f26d4b
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 4 files, focused global and Framer behavior

## Problem

The global reduced-motion rule reduces every CSS animation and transition to `0.01ms`. The JavaScript helper also converts every shared Framer duration to zero, and realtime notification entrances explicitly become instant. This removes useful color/opacity feedback along with vestibular movement.

```css
/* src/index.css:470 — current */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```ts
// src/lib/motion.ts:7 — current
const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const dur = (ms: number) => (prefersReducedMotion ? 0 : ms / 1000);
```

```tsx
// src/components/notifications/NotificationRow.tsx:101 — current
transition: {
  duration: shouldReduceMotion ? 0 : 0.15,
  ease: [0.23, 1, 0.32, 1] as const,
}
```

## Target

Reduced motion removes position, scale, rotation, blur, parallax, smooth scrolling, and overshoot while retaining short color/opacity feedback.

```css
/* target */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-property: color, background-color, border-color, opacity, box-shadow !important;
    scroll-behavior: auto !important;
  }
}
```

Do not globally override `transition-duration`. Existing component durations remain, but the property whitelist prevents movement and filter/layout interpolation. Framer Motion remains wrapped by:

```tsx
<MotionConfig reducedMotion="user">
```

Shared Framer durations remain 150–220ms so MotionConfig can remove transforms while leaving opacity feedback. Realtime notification entrance/exit uses opacity for 150ms when reduced motion is requested.

## Repo conventions to follow

- `MotionConfig reducedMotion="user"` in `src/App.tsx:313` is the authority for Framer transforms.
- `NotificationRow` already has a reduced-motion branch that removes `x` and `height`; preserve that structure.
- `CreateCourseDrawer` correctly changes `scrollIntoView` from `smooth` to `auto`; leave it unchanged.
- Reduced motion means gentler feedback, not no feedback.

## Steps

1. In `src/index.css`, replace the global `transition-duration: 0.01ms !important` rule with the exact transition-property whitelist shown above. Keep animation suppression and `scroll-behavior: auto`.
2. In `src/lib/motion.ts`, remove the module-load `matchMedia` query and the `dur()` helper. Express existing durations directly in seconds (`180ms` → `0.18`, `600ms` → `0.6`, `220ms` → `0.22`, `160ms` → `0.16`). If Plan 002 has landed, only scroll and step durations remain. Do not alter their normal-mode timing.
3. In `src/components/notifications/NotificationRow.tsx`, keep the reduced exit as opacity-only for 150ms and change the reduced entrance from duration `0` to `0.15`. If Plan 001 has landed, use its `EASE_OUT` export.
4. Update the comment above `MotionConfig` in `src/App.tsx` to state that Framer removes transform/layout motion while opacity feedback remains. Do not change the provider configuration.
5. Run `rg -n "prefers-reduced-motion|useReducedMotion\\(" src` and confirm every remaining match is one of:
   - the global CSS rule;
   - `CreateCourseDrawer` smooth-scroll guard;
   - `MotionConfig` comment/configuration;
   - an intentional per-component reduced branch such as notifications.
6. Inspect CSS movement sites with `rg -n "transition-.*(transform|filter|top|left|right|width|height|padding|margin)|animate-in|animate-out" src`. Under the reduced-motion media query, none may interpolate those properties. Do not rewrite those components in this plan unless the global whitelist fails to cover them.

## Boundaries

- Do NOT restore movement under reduced motion.
- Do NOT remove the `CreateCourseDrawer` auto-scroll guard.
- Do NOT change normal-mode duration, easing, geometry, or animation count.
- Do NOT solve overlay interruptibility here; keyframe migration is a separate future plan.
- Do NOT add a user preference toggle or dependency.
- If MotionConfig behavior differs in the installed Framer Motion version, STOP and report instead of emulating it with custom JavaScript.

## Verification

- **Mechanical**:
  - `npm run lint`
  - `npm run test:run`
  - `npm run build`
  - The `rg` checks in steps 5 and 6 show only intentional reduced-motion handling.
- **Feel check**:
  - Enable `prefers-reduced-motion: reduce` in DevTools.
  - Open dialogs, dropdowns, drawers, onboarding steps, and the dirty bar. There must be no sliding, scaling, rotation, blur, or smooth scrolling.
  - Hover/focus buttons and change selection controls. Color/border/opacity feedback should remain visible for roughly 150ms.
  - Insert and archive a notification. Reduced mode must crossfade for 150ms without horizontal travel or height animation.
  - Switch reduced motion off and confirm normal behavior is pixel-identical to before this plan.
- **Done when**: reduced mode removes vestibular movement but preserves short, comprehensible opacity/color feedback across CSS and Framer surfaces.
