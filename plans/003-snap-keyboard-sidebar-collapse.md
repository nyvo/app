# 003 — Snap keyboard sidebar collapse

- **Status**: IMPLEMENTED
- **Commit**: b6f26d4b
- **Severity**: HIGH
- **Category**: Performance / Purpose & frequency
- **Estimated scope**: 1 file, one shared class plus verification

## Problem

The desktop sidebar is toggled with `⌘/Control+B`, but each menu button transitions layout properties for 150ms. Keyboard actions must be immediate, and animating `width`, `height`, and `padding` causes layout work across every navigation item.

```tsx
// src/components/ui/sidebar.tsx:123 — current
if (
  event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
  (event.metaKey || event.ctrlKey)
) {
  if (isEditableEventTarget(event.target)) return;
  event.preventDefault();
  toggleSidebar();
}
```

```tsx
// src/components/ui/sidebar.tsx:515 — current
"... transition-[color,background-color,width,height,padding] duration-150 ease-out ..."
```

## Target

Sidebar item dimensions snap to their new state. Pointer hover/focus colors can still transition for 150ms with CSS `ease`.

```tsx
// target class fragment
"... transition-colors duration-150 ease ..."
```

No rule in the sidebar menu button may transition `width`, `height`, `padding`, `margin`, `top`, `left`, or any other layout property.

## Repo conventions to follow

- Keep the existing editable-target guard for `⌘/Control+B`.
- Keep mobile behavior in the Vaul drawer; this finding concerns the persistent desktop sidebar.
- Keep hover/active fills using semantic `sidebar-accent` and `sidebar-active` tokens.
- High-frequency keyboard actions are intentionally instant.

## Steps

1. In `src/components/ui/sidebar.tsx`, change `sidebarMenuButtonVariants` from `transition-[color,background-color,width,height,padding] duration-150 ease-out` to `transition-colors duration-150 ease`.
2. Search the same file for other transitions that are triggered by the desktop expanded/collapsed state: `rg -n "transition-.*(width|height|padding|margin|left|right)|transition-all" src/components/ui/sidebar.tsx`.
3. For any match whose values change under `group-data-[collapsible=icon]` or `group-data-[collapsible=offcanvas]`, remove the layout property from its transition list. Do not touch a transform used solely for pointer affordance unless it also runs on the keyboard toggle.
4. Preserve all size variants, 44px mobile touch floors, tooltip behavior, focus rings, active route styling, cookie persistence, and RTL rules.

## Boundaries

- Do NOT remove the keyboard shortcut or change its key.
- Do NOT change sidebar widths, collapsed icon sizes, padding values, breakpoints, cookie behavior, or mobile drawer motion.
- Do NOT add a replacement opacity/scale animation to the keyboard toggle.
- Do NOT change navigation labels or icons.
- If sidebar collapse has been redesigned since `b6f26d4b`, STOP and report the drift.

## Verification

- **Mechanical**:
  - `npm run lint`
  - `npm run test:run -- src/components/teacher/TeacherSidebar.test.tsx`
  - `npm run build`
  - `rg -n "transition-.*(width|height|padding|margin)|transition-all" src/components/ui/sidebar.tsx` returns no collapse-related layout transitions.
- **Feel check**:
  - At desktop width, press `⌘/Control+B` rapidly 10 times. The rail and every item must snap without chasing an in-progress transition.
  - Place focus inside an input, textarea, and rich-text editor; the shortcut must remain ignored there.
  - Use the pointer rail and trigger button; dimensions should still snap, while hover colors remain soft.
  - In DevTools Performance, a toggle should not show a 150ms sequence of per-item layout recalculations.
  - Verify mobile still uses its existing drawer and is unaffected.
- **Done when**: desktop collapse is immediate from keyboard and pointer, with no animated layout properties and no regression to navigation, focus, RTL, or mobile behavior.
