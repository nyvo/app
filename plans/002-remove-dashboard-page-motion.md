# 002 — Remove dashboard route-entry motion

- **Status**: IMPLEMENTED
- **Commit**: b6f26d4b
- **Severity**: HIGH
- **Category**: Purpose & frequency / Response
- **Estimated scope**: 2 files, small deletion

## Problem

Every teacher/buyer dashboard page animates from `opacity: 0; y: 4` over 180ms because `PageShell` enables Framer Motion by default. The same direction is used for every route, so it does not explain navigation. It only delays high-frequency sidebar and browser navigation.

```tsx
// src/components/teacher/PageShell.tsx:76 — current
animate = true,

// src/components/teacher/PageShell.tsx:80 — current
const Container = animate ? motion.div : 'div';
const motionProps = animate
  ? {
      variants: pageVariants,
      initial: 'initial' as const,
      animate: 'animate' as const,
      transition: pageTransition,
    }
  : {};
```

```ts
// src/lib/motion.ts:14 — current
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const pageTransition: Transition = {
  duration: dur(180),
  ease,
};
```

## Target

`PageShell` always renders a plain `<div>`. Seller/buyer route content is immediately available with no opacity or positional entrance. Rare motion remains local to onboarding, success, marketing, and other components where it has a specific purpose.

```tsx
// target shape
export function PageShell({ title, description, badge, badgePlacement = 'inline', action, tabs, narrow, className, children }: PageShellProps) {
  return (
    <div className={cn('mx-auto w-full ...', className)}>
      {/* existing content unchanged */}
    </div>
  );
}
```

## Repo conventions to follow

- `PageShell` owns layout only: width, padding, header, tabs, and content spacing.
- Rare onboarding direction changes stay in `stepVariants` and are not part of this plan.
- Marketing scroll reveals stay in `scrollVariants` and are not part of this plan.
- The app's product personality is calm and direct; deleting unnecessary motion is preferred over retuning it.

## Steps

1. In `src/components/teacher/PageShell.tsx`, remove the `framer-motion` import and the `pageVariants`/`pageTransition` import.
2. Remove `animate?: boolean` from `PageShellProps` and remove `animate` from destructuring.
3. Delete `Container` and `motionProps`. Replace `<Container {...motionProps}>` and `</Container>` with `<div>` and `</div>`, preserving the exact class list and child markup.
4. In `src/lib/motion.ts`, delete `pageVariants` and `pageTransition`. Keep the scroll and step variants unchanged. If Plan 001 has landed, retain its named curve imports/exports.
5. Run `rg -n "pageVariants|pageTransition|animate=\{?(true|false)\}?" src/components/teacher src/pages/teacher` and confirm there are no remaining PageShell-motion references.

## Boundaries

- Do NOT remove onboarding, checkout-success, notification, dirty-bar, dialog, drawer, or landing-page motion.
- Do NOT change PageShell spacing, markup hierarchy, title sizes, narrow widths, or responsive behavior.
- Do NOT replace Framer Motion with CSS animation; the target is no route-entry motion.
- Do NOT add dependencies.
- If the PageShell API has new consumers using `animate`, STOP and report before deleting the prop.

## Verification

- **Mechanical**:
  - `npm run lint`
  - `npm run test:run`
  - `npm run build`
  - `rg -n "pageVariants|pageTransition" src` returns no matches.
- **Feel check**:
  - Navigate repeatedly among `/overview`, `/courses`, `/schedule`, `/studio`, and `/settings/profile` using both pointer and keyboard.
  - Content must appear immediately without a 4px rise or opacity flash.
  - Sidebar persistence, scroll restoration, skeletons, and focus behavior must remain unchanged.
  - At 10% DevTools playback, route changes must show no page-level animation.
  - With `prefers-reduced-motion` enabled, navigation should look identical to the default mode.
- **Done when**: all protected route changes are immediate and no PageShell consumer imports or enables page-entry motion.
