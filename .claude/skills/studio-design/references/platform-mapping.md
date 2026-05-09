# Studio — Platform Mapping

Drop-in code for CSS, Tailwind, and SwiftUI.

---

## CSS custom properties

Paste this into your global CSS (replaces existing `:root` neutrals if any).

```css
:root {
  /* ── Color: neutral ── */
  --background:           #ffffff;   /* page canvas */
  --surface:              #ffffff;   /* cards (when used) — same value, different role */
  --muted:                #f0f0f3;   /* slate-3 — hover fill */
  --active:               #e8e8ec;   /* slate-4 — selected fill */
  --border:               #d9d9e0;   /* slate-6 — borders, dividers */
  --foreground-disabled:  #b9bbc6;   /* slate-8 */
  --foreground-muted:     #60646c;   /* slate-11 */
  --foreground:           #1c2024;   /* slate-12 */
  --ring:                 #1c2024;   /* slate-12 */

  /* ── Color: status ── */
  --success-subtle:  #e6f7ed;   /* jade-3 */
  --success-fg:      #208368;   /* jade-11 */
  --warning-subtle:  #fff7c2;   /* amber-3 */
  --warning-fg:      #ab6400;   /* amber-11 */
  --danger-subtle:   #feebec;   /* red-3 */
  --danger-fg:       #ce2c31;   /* red-11 */

  /* ── Color: pop accents (course cards) ── */
  --accent-sky-subtle:    #e1f6fd;
  --accent-sky-fg:        #00749e;
  --accent-mint-subtle:   #ddf9f2;
  --accent-mint-fg:       #027864;
  --accent-iris-subtle:   #f0f1fe;
  --accent-iris-fg:       #5753c6;

  /* ── Typography ── */
  --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* ── Radius ── */
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-full: 9999px;

  /* ── Spacing ── */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   12px;
  --space-lg:   16px;
  --space-xl:   24px;
  --space-2xl:  32px;
  --space-3xl:  40px;
  --space-4xl:  48px;
  --space-5xl:  64px;

  /* ── Elevation ── */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.05);

  /* ── Motion ── */
  --duration-fast:   150ms;
  --duration-normal: 200ms;
  --duration-slow:   300ms;
  --ease-out:        cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out:     cubic-bezier(0.65, 0, 0.35, 1);
}

/* Geist via Google Fonts */
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap");

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 14px;       /* dashboard default — public surfaces override to 16px */
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

### Typography utility classes

```css
.text-xs    { font-size: 12px; line-height: 16px; letter-spacing: 0.0025em; }
.text-sm    { font-size: 14px; line-height: 20px; }
.text-base  { font-size: 16px; line-height: 24px; }
.text-xl    { font-size: 20px; line-height: 28px; letter-spacing: -0.005em; }
.text-2xl   { font-size: 24px; line-height: 30px; letter-spacing: -0.01em; }
.text-3xl   { font-size: 30px; line-height: 36px; letter-spacing: -0.015em; }
.text-5xl   { font-size: 48px; line-height: 52px; letter-spacing: -0.025em; }

.font-regular  { font-weight: 400; }
.font-medium   { font-weight: 500; }
.font-semibold { font-weight: 600; }
```

---

## Tailwind v4 config (recommended for this stack)

Paste into `src/index.css` using `@theme`:

```css
@import "tailwindcss";

@theme {
  /* ── Color tokens (semantic) ── */
  --color-background: #ffffff;
  --color-surface: #ffffff;
  --color-muted: #f0f0f3;
  --color-active: #e8e8ec;
  --color-border: #d9d9e0;
  --color-foreground: #1c2024;
  --color-foreground-muted: #60646c;
  --color-foreground-disabled: #b9bbc6;
  --color-ring: #1c2024;

  --color-success-subtle: #e6f7ed;
  --color-success-fg: #208368;
  --color-warning-subtle: #fff7c2;
  --color-warning-fg: #ab6400;
  --color-danger-subtle: #feebec;
  --color-danger-fg: #ce2c31;

  --color-accent-sky-subtle: #e1f6fd;
  --color-accent-sky-fg: #00749e;
  --color-accent-mint-subtle: #ddf9f2;
  --color-accent-mint-fg: #027864;
  --color-accent-iris-subtle: #f0f1fe;
  --color-accent-iris-fg: #5753c6;

  /* ── Font ── */
  --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* ── Radius (overrides Tailwind defaults selectively) ── */
  --radius-md: 0.375rem;   /* 6px — buttons, inputs */
  --radius-lg: 0.5rem;     /* 8px — cards */
  --radius-xl: 0.75rem;    /* 12px — dialogs */

  /* ── Motion ── */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

Then in your components:
```html
<div class="bg-surface border border-border rounded-lg p-6">
  <h3 class="text-base font-semibold text-foreground">Card title</h3>
  <p class="mt-1 text-sm text-foreground-muted">Description.</p>
</div>
```

---

## SwiftUI extensions (if you ever ship native)

```swift
import SwiftUI

extension Color {
    // Neutral
    static let background          = Color(hex: 0xFCFCFD)
    static let surface             = Color(hex: 0xFFFFFF)
    static let muted               = Color(hex: 0xF0F0F3)
    static let active              = Color(hex: 0xE8E8EC)
    static let border              = Color(hex: 0xD9D9E0)
    static let foregroundDisabled  = Color(hex: 0xB9BBC6)
    static let foregroundMuted     = Color(hex: 0x60646C)
    static let foreground          = Color(hex: 0x1C2024)

    // Status
    static let successSubtle = Color(hex: 0xE6F7ED)
    static let successFg     = Color(hex: 0x208368)
    static let warningSubtle = Color(hex: 0xFFF7C2)
    static let warningFg     = Color(hex: 0xAB6400)
    static let dangerSubtle  = Color(hex: 0xFEEBEC)
    static let dangerFg      = Color(hex: 0xCE2C31)

    // Pop
    static let accentSkySubtle  = Color(hex: 0xE1F6FD)
    static let accentSkyFg      = Color(hex: 0x00749E)
    static let accentMintSubtle = Color(hex: 0xDDF9F2)
    static let accentMintFg     = Color(hex: 0x027864)
    static let accentIrisSubtle = Color(hex: 0xF0F1FE)
    static let accentIrisFg     = Color(hex: 0x5753C6)

    init(hex: UInt) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >>  8) & 0xFF) / 255,
            blue:  Double( hex        & 0xFF) / 255,
            opacity: 1
        )
    }
}

extension Font {
    static func studioBody()  -> Font { .custom("Geist", size: 14).weight(.regular) }
    static func studioH1()    -> Font { .custom("Geist", size: 30).weight(.semibold) }
    static func studioH2()    -> Font { .custom("Geist", size: 24).weight(.semibold) }
    static func studioH3()    -> Font { .custom("Geist", size: 20).weight(.semibold) }
    static func studioCaption() -> Font { .custom("Geist", size: 12).weight(.regular) }
}
```

---

## Migration from existing radix-vega tokens

If your project currently uses the radix-vega shadcn preset, here's the diff:

| Old token | New token | Notes |
|-----------|-----------|-------|
| `--background` | unchanged role, value `#ffffff` | pure white page canvas |
| `--card` | `--surface` (unchanged white) | renamed for clarity; same hex as background, different role |
| `--primary` | `--foreground` | primary button is just slate-12 |
| `--accent` | (removed) | pop tints replace generic accent |
| `--ring` | unchanged role, value `--foreground` | now monochrome |
| `--font-sans` | unchanged role, value `Geist, ...` | swap from radix-vega family to Geist |
| `--radius` | split: buttons `rounded-full` / cards `rounded-lg` 8px | shape diverges by component |
| chart-2 | (removed) | no chromatic accent for buttons or links |
| wellness pastels (rose / sage / lavender / sand / sky) | replaced by `--accent-sky-*`, `--accent-mint-*`, `--accent-iris-*` | three cool tints replace five warm/cool mix |
| `--text-xxs` (11px) | (removed) | scale stops at 12px |
| `font-mono` token | (removed) | one family — Geist |
| Card-default architecture | Canvas-default architecture | Cards become deliberate, used for KPI tiles, modals, course cards, callouts. Most sections live directly on the white canvas. |
