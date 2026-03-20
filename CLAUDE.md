## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
- Run multiple agents in parallel when a task has independent subtasks — don't serialize what can be concurrent

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Formatting Utilities (MUST USE)

- **Currency**: Always use `formatKroner()` from `@/lib/utils` to display NOK amounts. Never write `${amount} kr` inline — it skips the Norwegian thousands separator (e.g. `2200 kr` vs correct `2 200 kr`).
  - Returns `"Gratis"` for 0/null, otherwise `"1 200 kr"` with proper `nb-NO` locale formatting.
  - In Supabase Edge Functions: use the local `formatKr()` helper in `send-email/index.ts` (same logic, can't import from `@/lib`).
- **Copy/text**: Follow `COPY_STYLE_GUIDE.md` for all Norwegian text — currency format, date format, domain terms, tone.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Design System (MUST READ)

Before writing ANY UI code, read `DESIGN_SYSTEM.md` and `src/index.css` for full context on tokens, variables, and utility classes. Use the shadcn MCP tools to search for and reference existing shadcn components — prefer composing from shadcn primitives over building custom UI. Key rules enforced across the entire app:

- **Typography**: Read the "Quick Reference" table and "Strict Rules" section. The most common mistakes:
  - Using `text-lg` or `text-xl` for section/card headers (must be `text-sm font-medium`)
  - Using `text-xs` for body text (must be `text-sm`)
  - Using `font-semibold` (banned — use `font-medium`)
  - Using `text-base` for body text (only for lead/marketing text)
  - Adding `tracking-tight` to anything other than `text-2xl` page titles
  - Using hardcoded `text-zinc-*` colors instead of `text-text-primary/secondary/tertiary`
- **Section headers** sit ABOVE cards, not inside them (Norwegian SaaS pattern)
- **Reference implementation**: `CourseOverviewTab.tsx` is the gold standard for card/section patterns
