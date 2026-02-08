# Code Cleanup Guide

This document outlines remaining code cleanup tasks.
Last audited: 2026-01-29

---

## 1. Console Statements → Logger Utility

A logger utility exists at `src/lib/logger.ts` with `logger.debug()`, `logger.info()`, `logger.warn()`, and `logger.error()`. All direct `console.*` calls should migrate to it for consistency.

### Files to update (22 statements across 9 files)

| File | Count | Type | Action |
|------|-------|------|--------|
| `src/services/emails.ts` | 6 | `console.error` | Replace with `logger.error()` |
| `src/pages/teacher/TeacherDashboard.tsx` | 3 | `console.error` | Replace with `logger.error()` |
| `src/pages/teacher/MessagesPage.tsx` | 3 | `console.error` | Replace with `logger.error()` |
| `src/hooks/use-form-draft.ts` | 3 | `console.warn` | Replace with `logger.warn()` |
| `src/hooks/use-realtime-subscription.ts` | 2 | `console.debug` + `console.error` | Replace with `logger.debug()` / `logger.error()` |
| `src/pages/public/ClaimSpotPage.tsx` | 2 | `console.error` | Replace with `logger.error()` |
| `src/pages/teacher/CourseDetailPage.tsx` | 1 | `console.error` | Replace with `logger.error()` |
| `src/pages/public/CheckoutSuccessPage.tsx` | 1 | `console.warn` | Replace with `logger.warn()` |
| `src/lib/stripe.ts` | 1 | `console.warn` | Replace with `logger.warn()` |

> **Note:** `src/lib/logger.ts` itself uses `console.*` internally — that's expected and correct.

---

## 2. Type Safety — `as any` Casts

66 instances of `as any` across 9 files, plus 25 eslint-disable comments. Most are Supabase client typing workarounds.

### By file

| File | `as any` count | Pattern |
|------|----------------|---------|
| `src/services/courses.ts` | 18 | `.from('table') as any`, response casting |
| `src/services/messages.ts` | 18 | `.from('table') as any`, response casting |
| `src/services/signups.ts` | 12 | `.from('table') as any`, response casting |
| `src/services/studentSignups.ts` | 9 | Response casting, sorting workarounds |
| `src/services/publicCourses.ts` | 6 | Response casting |
| `src/contexts/AuthContext.tsx` | 2 | `.from('profiles') as any`, `.rpc as any` |
| `src/services/organizations.ts` | 1 | `.from('organizations') as any` |
| `src/pages/teacher/CoursesPage.tsx` | 1 | `.from('signups') as any` |

### Fix approach

Generate proper Supabase database types using `supabase gen types typescript` and use typed client methods:

```typescript
// Before
const { data } = await (supabase.from('courses') as any).select('*')
return data as any as CourseWithStyle[]

// After
const { data } = await supabase.from('courses').select('*')
return { data: data as CourseWithStyle[], error: null }
```

This eliminates both the `as any` casts and the eslint-disable comments.

---

## 3. File & Folder Cleanup

### Duplicate PageLoader components
- `src/components/PageLoader.tsx` — simple wrapper (used by `App.tsx`)
- `src/components/ui/page-loader.tsx` — full-featured version with variants (used by `SchedulePage.tsx`)

**Action:** Consolidate into `src/components/ui/page-loader.tsx` and update `App.tsx` import. Delete `src/components/PageLoader.tsx`.

### Orphaned temp file
- `src/pages/teacher/CourseDetailPage.tsx.temp`

**Action:** Delete.

### Non-standard file location
- `src/utils__cancellation.ts` — utility at root of `src/` with double-underscore naming

**Action:** Move to `src/utils/cancellation.ts` (or `src/lib/cancellation.ts`). Update import in `src/components/student/BookingCard.tsx`.

---

## 4. Export Consistency

### EmptyStateToggle default export
`src/components/ui/EmptyStateToggle.tsx` uses `export default` while all other UI components use named exports.

**Action:** Change to named export `export { EmptyStateToggle }`. Update import in `src/main.tsx`.

---

## Verification

After cleanup, verify:
- `grep -r "console\." src/ --include="*.ts" --include="*.tsx" | grep -v logger.ts` → should return 0 results
- `grep -r "as any" src/` → should return minimal/zero results
- `ls src/components/PageLoader.tsx` → should not exist
- `ls src/pages/teacher/CourseDetailPage.tsx.temp` → should not exist
- `ls src/utils__cancellation.ts` → should not exist
- `npm run build` → should complete without errors
