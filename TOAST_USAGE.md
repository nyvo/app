# Toast Notifications Usage Guide

Sonner is now installed and configured in the application. Use it to provide user feedback for actions.

## Import

```typescript
import { toast } from 'sonner';
```

## Basic Usage

### Success Messages
```typescript
toast.success('Kurs opprettet!');
toast.success('Endringer lagret');
toast.success('Påmelding bekreftet');
```

### Error Messages
```typescript
toast.error('Kunne ikke lagre endringer');
toast.error('Ugyldig e-postadresse');
toast.error('Noe gikk galt. Prøv igjen.');
```

### Info Messages
```typescript
toast.info('Kurset starter om 15 minutter');
toast.info('Du har 3 nye påmeldinger');
```

### Warning Messages
```typescript
toast.warning('Kurset er nesten fullt');
toast.warning('Endringene vil ta effekt om 5 minutter');
```

### Loading States
```typescript
const toastId = toast.loading('Laster...');
// When done:
toast.success('Fullført!', { id: toastId });
// Or on error:
toast.error('Feil oppstod', { id: toastId });
```

## Advanced Usage

### Promise-based (Automatic Loading → Success/Error)
```typescript
toast.promise(
  saveChanges(),
  {
    loading: 'Lagrer...',
    success: 'Endringer lagret!',
    error: 'Kunne ikke lagre',
  }
);
```

### With Actions
```typescript
toast('Kurs slettet', {
  action: {
    label: 'Angre',
    onClick: () => restoreCourse(),
  },
});
```

### Custom Duration
```typescript
toast.success('Melding sendt', {
  duration: 5000, // 5 seconds
});
```

## Example Integration

### In Course Creation (NewCoursePage.tsx)
```typescript
const handleSubmit = async () => {
  try {
    const toastId = toast.loading('Oppretter kurs...');

    const { data, error } = await createCourse(courseData);

    if (error) {
      toast.error('Kunne ikke opprette kurs', { id: toastId });
      return;
    }

    toast.success('Kurs opprettet!', { id: toastId });
    navigate(`/teacher/courses/${data.id}`);
  } catch (err) {
    toast.error('En uventet feil oppstod');
  }
};
```

### In Login (LoginPage.tsx)
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  const { error } = await signIn(email, password);

  if (error) {
    toast.error('Ugyldig e-postadresse eller passord');
    return;
  }

  toast.success('Velkommen tilbake!');
  // Navigation handled by auth context
};
```

### In Course Deletion
```typescript
const handleDelete = async (courseId: string) => {
  const confirmed = window.confirm('Er du sikker?');
  if (!confirmed) return;

  toast.promise(
    deleteCourse(courseId),
    {
      loading: 'Sletter kurs...',
      success: 'Kurs slettet',
      error: 'Kunne ikke slette kurs',
    }
  );
};
```

## Where to Add Toasts

### High Priority Locations

1. **Authentication**
   - ✅ Login success/failure
   - ✅ Registration success
   - ✅ Password reset sent
   - ✅ Logout confirmation

2. **Course Management**
   - ✅ Course created
   - ✅ Course updated
   - ✅ Course deleted
   - ✅ Course published

3. **Signup Management**
   - ✅ Signup confirmed
   - ✅ Signup cancelled
   - ✅ Signup status changed
   - ✅ Waitlist joined

4. **Profile Updates**
   - ✅ Profile saved
   - ✅ Organization switched
   - ✅ Settings updated

5. **Errors**
   - ✅ Network errors
   - ✅ Validation errors
   - ✅ Permission errors

## Current Implementation

The Toaster component is already added to App.tsx with these settings:
- Position: top-right
- Rich colors enabled
- Automatic dismiss after 4 seconds (default)

You can customize global settings in [App.tsx:37](src/App.tsx#L37).
