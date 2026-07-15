# 005 — Composite checkout floating labels

- **Status**: IMPLEMENTED
- **Commit**: b6f26d4b
- **Severity**: MEDIUM
- **Category**: Performance / Response
- **Estimated scope**: 1 source file plus visual verification

## Problem

The public checkout's floating labels interpolate `top` and `font-size` on every focus/value change. These properties trigger layout and paint during a high-attention interaction on mobile and Safari.

```tsx
// src/components/public/FloatingField.tsx:47 — current
'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base leading-none text-foreground-muted transition-[top,transform,font-size,color] duration-150 ease-out',
'peer-focus:top-[8px] peer-focus:translate-y-0 peer-focus:text-[11px]',
'peer-[:not(:placeholder-shown)]:top-[8px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px]',
```

## Target

Render the label at its final 11px/top-8px geometry and animate only a transform plus color. The rest state visually matches the current 16px centered label by scaling the 11px glyphs by `16 / 11 = 1.4545` and translating them 10px downward.

```tsx
// target class structure
'pointer-events-none absolute left-4 top-[8px] origin-top-left text-[11px] leading-none text-foreground-muted',
'translate-y-[10px] scale-[1.4545] transition-[transform,color] duration-150 [transition-timing-function:var(--ease-out)]',
'peer-focus:translate-y-0 peer-focus:scale-100',
'peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-100',
'motion-reduce:transition-colors',
```

The input remains exactly 52px high with the existing 24px top and 4px bottom padding. The visual resting and floating positions must not shift relative to the current snapshots.

## Repo conventions to follow

- `FloatingField` is intentionally different from dashboard fields and is the canonical public checkout grammar.
- The label must remain a real `<label htmlFor={id}>`; do not duplicate visible text or accessible names.
- Use the canonical `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` from Plan 001.
- Keep the existing CSS-only peer-selector implementation; no React focus state or effects.
- Reduced motion changes position instantly while keeping color feedback.

## Steps

1. In `src/components/public/FloatingField.tsx`, keep the input markup, 52px shell, padding, focus rings, invalid state, disabled state, autocomplete behavior, and placeholder exactly unchanged.
2. Replace the label's current `top-1/2`, `-translate-y-1/2`, `text-base`, and `transition-[top,transform,font-size,color]` classes with the target class structure above.
3. Add `origin-top-left`, base `translate-y-[10px] scale-[1.4545]`, and floating `translate-y-0 scale-100` states. Do not animate `top`, `font-size`, line-height, padding, width, or height.
4. Use `[transition-timing-function:var(--ease-out)]`. If Plan 001 has not landed, apply it first rather than duplicating the cubic-bezier locally.
5. Add `motion-reduce:transition-colors` so reduced mode snaps geometry but retains the label's color response.
6. Do not change `CheckoutPage` consumers. Confirm all three fields—name, email, phone—still use the same primitive.

## Boundaries

- Do NOT replace floating labels with static dashboard labels; the public grammar is deliberate.
- Do NOT add JavaScript focus/filled state, duplicate labels, wrappers, or dependencies.
- Do NOT change input height, padding, type scale, label content, validation, or autocomplete attributes.
- Do NOT update visual snapshots unless the reviewer confirms that a static difference is intentional; the target should be visually unchanged at rest and while filled.
- If font rendering makes `scale(1.4545)` visibly softer on a real 1× display, STOP and report. Do not substitute a layout-property animation.

## Verification

- **Mechanical**:
  - `npm run lint`
  - `npm run test:run`
  - `npm run build`
  - `npm run test:visual`
  - `rg -n "transition-\\[[^]]*(top|font-size)|peer-focus:top|peer-focus:text-" src/components/public/FloatingField.tsx` returns no matches.
- **Feel check**:
  - Open `/dev/checkout-t1-preview` and test empty, focused, filled, autofilled, invalid, and disabled fields.
  - At 10% playback, the label should move and scale as one object with no layout jump or double exposure.
  - In the Performance panel, focusing each field must not trigger per-frame layout from the label.
  - Test Chrome and Safari at desktop and a real or simulated narrow mobile viewport.
  - Enable reduced motion: label geometry should snap while border/text color feedback remains.
  - Compare rest and filled states with the checked-in checkout snapshot; positions and input height must match.
- **Done when**: all checkout floating labels preserve their current appearance and accessibility while animating only transform and color.
