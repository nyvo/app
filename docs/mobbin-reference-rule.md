# RULE: Using Mobbin Design References

This rule applies EVERY time you call Mobbin (or any design reference tool). A reference call that does not change your output is a wasted call. Follow this process exactly.

## Division of authority — never violate

- **Mobbin answers STRUCTURE questions:** layout skeleton, information hierarchy, component anatomy, screen composition, navigation patterns, empty/loading/error state handling, content density, flow between screens.
- **STYLE.md + PATTERNS.md answer STYLING questions:** colors, type scale, weights, radii, borders, spacing tokens, button/input treatment.
- You do not silently apply visual styling from a Mobbin reference. If a reference uses blue accents, heavy shadows, or bold weights, you still render the current build in our system: near-monochrome, black as the only UI accent, weights 400/500, pill buttons, filled borderless inputs, hairline dividers.
- **Exception — proposing a system change:** if across multiple references you see a styling pattern that is clearly stronger than what STYLE.md prescribes, do not sneak it into a screen. Instead, add a `STYLE PROPOSAL` note to your output: what the pattern is, which references use it, what it would replace in STYLE.md, and why it's better. The build itself stays on the current system until the proposal is accepted and STYLE.md is updated.
- Think of it as: **borrow the skeleton, re-skin it in our system — and file a proposal if the system itself should evolve.**

## Step 1 — Query with intent

Before calling Mobbin, state in one line what structural question you are trying to answer.
- BAD: "settings screen inspiration"
- GOOD: "how do best-in-class SaaS apps group settings into sections and handle the account/danger-zone split?"

If you cannot phrase the question, do not make the call.

## Step 2 — Mandatory extraction (the anti-drift step)

After viewing references, you MUST write a **Reference Extraction** block before writing any code. No extraction block = no implementation. Format:

```
REFERENCE EXTRACTION
Source screens: [app names / screens reviewed]
Layout skeleton: [regions, columns, sticky elements, where primary action lives]
Hierarchy: [what is visually dominant, what is secondary, what is buried]
Component anatomy: [structure of the key component — e.g. list row = avatar / two-line text / meta / chevron]
Spacing & density: [tight or airy, grouping logic, section separation method]
States observed: [empty, loading, error, edge cases the reference handles]
Decisions adopted: [3–6 concrete structural choices you are taking from the reference]
Decisions rejected: [what you saw but are NOT using, and why]
```

The "Decisions adopted" list is binding: each item must be visible in the final UI, and you must be able to point to it.

## Step 3 — Implement against the extraction

- Build the screen from the extraction's skeleton, then apply STYLE.md tokens and PATTERNS.md archetypes on top.
- While implementing, if you make a structural choice that contradicts the extraction, stop and state why. Silent divergence is drift.

## Step 4 — Self-check before finishing

Answer honestly:
1. **The counterfactual test:** Could this exact output have been generated without ever calling Mobbin? If yes, you failed — go back to the extraction and apply at least the "Decisions adopted" list.
2. Does every item in "Decisions adopted" appear in the output?
3. Is all styling in the build 100% from STYLE.md, with zero visual bleed from the reference (no borrowed colors, shadows, weights, radii)? Any styling you'd like to change belongs in a `STYLE PROPOSAL` note, not the screen.
4. Did you handle the non-happy-path states the reference handled (empty/loading/error)?

## Failure modes to avoid

- **The glance:** calling Mobbin, summarizing vaguely ("clean, modern layouts"), then generating default UI. The extraction block exists to make this impossible.
- **The clone:** copying a reference's styling wholesale. Structure only.
- **The average:** blending five references into a generic mean. Pick the strongest single pattern per structural question and commit to it; note runners-up under "Decisions rejected."
- **The happy-path-only build:** references almost always show how mature products handle edge states — take that, it's the highest-value thing Mobbin offers.
