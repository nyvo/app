# Code Cleanup Guide

This document outlines remaining code cleanup tasks after the initial optimization pass.

## Console.log Statements to Remove/Replace

The following files contain debug console.log statements that should be removed or replaced with the logger utility (`import { logger } from '@/lib/logger'`):

### High Priority (Development Debug Code)

1. **src/contexts/AuthContext.tsx** (29 console.logs)
   - Lines 122-134: Window focus tracking
   - Lines 139-167: Dependency tracking
   - Lines 179-216: Object reference tracking
   - Lines 255-356: Auth state change logging
   - **Action**: Remove all debug tracking code (lines 122-216) entirely
   - **Action**: Replace remaining logs with `logger.debug()`

2. **src/pages/teacher/TeacherDashboard.tsx** (10 console.logs)
   - Lines 127-171: Component render tracking
   - **Action**: Remove dependency tracking code
   - **Action**: Replace functional logs with `logger.debug()`

3. **src/pages/student/StudentDashboard.tsx** (8 console.logs)
   - Lines 18-46: Similar debug tracking
   - **Action**: Remove debug tracking code

### Medium Priority (Functional Logging)

4. **src/pages/public/PublicCoursesPage.tsx** (8 console.logs)
   - Some are functional error logging
   - **Action**: Replace `console.log()` with `logger.debug()`
   - **Action**: Replace `console.error()` with `logger.error()`

5. **src/services/publicCourses.ts** (debugging logs)
   - **Action**: Remove or replace with `logger.debug()`

6. **src/services/studentSignups.ts** (debugging logs)
   - **Action**: Remove or replace with `logger.debug()`

### Low Priority

Remaining files with occasional console.error statements can stay but should use `logger.error()` for consistency.

## Folder Structure Consolidation

### Context Folders

Currently there are TWO context folders:
- `src/context/EmptyStateContext.tsx`
- `src/contexts/AuthContext.tsx`

**Action**:
```bash
# Move EmptyStateContext to contexts folder
mv src/context/EmptyStateContext.tsx src/contexts/EmptyStateContext.tsx
rmdir src/context

# Update all imports from './context/EmptyStateContext' to './contexts/EmptyStateContext'
```

**Files to update**:
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/components/ui/EmptyStateToggle.tsx`
- Any other files importing from './context/'

## Type Safety Improvements

### Replace 'any' Types in Services

**Files with unsafe type casting (13 instances)**:

1. **src/services/courses.ts**
   - Lines 42-43, 78-79, 101-105, 136-137, 165-166, 178-179
   - Replace `as any` casts with proper Supabase types
   - Remove `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments

2. **src/services/signups.ts**
   - Similar pattern
   - Use proper database types from `@/types/database`

3. **src/contexts/AuthContext.tsx**
   - Lines 138, 154, 156
   - Replace `useRef<any>({})` with properly typed refs

4. **src/pages/teacher/TeacherDashboard.tsx**
   - Lines 146, 153, 155
   - Similar pattern

### Fix Supabase Query Types

Instead of:
```typescript
const { data, error } = await (supabase.from('courses') as any)
  .insert(courseData)
  .select()
  .single()

return { data: data as any as CourseWithStyle[], error: null }
```

Use:
```typescript
const { data, error } = await supabase
  .from('courses')
  .insert(courseData)
  .select<'*', CourseWithStyle>()
  .single()

if (error) return { data: null, error: error as Error }
return { data, error: null }
```

## Component Export Consistency

**Fix**: Change `EmptyStateToggle.tsx` from default export to named export:

```typescript
// Before
export default EmptyStateToggle;

// After
export { EmptyStateToggle };
```

Update imports accordingly.

## Implementation Priority

1. **Immediate** (5 min):
   - Remove console.log from supabase.ts ✅ (done)
   - Merge context folders

2. **High Priority** (30 min):
   - Remove AuthContext debug tracking code (lines 122-216)
   - Remove TeacherDashboard debug tracking
   - Remove StudentDashboard debug tracking

3. **Medium Priority** (1 hour):
   - Replace remaining console.log with logger.debug
   - Fix 'any' types in services

4. **Low Priority** (ongoing):
   - Improve type safety across the codebase
   - Add proper error boundaries

## Verification

After cleanup, verify:
- `grep -r "console.log" src/` should only show logger utility
- `grep -r "as any" src/` should return minimal results
- `ls src/context` should not exist
- `npm run build` should complete without type errors
