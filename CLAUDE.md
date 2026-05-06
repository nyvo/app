## Formatting & Copy Rules

- **Currency**: Always use `formatKroner()` from `@/lib/utils` to display NOK amounts. Never write `${amount} kr` inline — it skips the Norwegian thousands separator (e.g. `2200 kr` vs correct `2 200 kr`).
  - Returns `"0 kr"` for 0/null/undefined, otherwise `"1 200 kr"` with proper `nb-NO` locale formatting.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
