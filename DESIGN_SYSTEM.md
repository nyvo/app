# Ease Design System

> This document will be rewritten as the redesign progresses. Only foundational decisions are recorded here.

---

## Font

**Family:** Geist Sans

---

## Form Inputs

All form inputs use shared components: `<Input>`, `<Textarea>`, `<Select>`, `<Checkbox>`.

**Input styling:**
```
h-11, rounded-lg, border border-input, bg-transparent, px-4
Focus: border-ring + ring-2 ring-ring/50
Hover: border-ring
Error: border-destructive + ring-destructive/20
Transition: ios-ease
```

