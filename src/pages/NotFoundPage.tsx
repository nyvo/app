import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

/**
 * Smart fallback per Studio § 13.5:
 * - Came from inside the app → go back to where they were
 * - Came from outside (or fresh load) → land on home
 */
function handleBackOrFallback() {
  if (
    typeof window !== 'undefined' &&
    window.history.length > 1 &&
    document.referrer.startsWith(window.location.origin)
  ) {
    window.history.back();
    return;
  }
  window.location.href = routes.home;
}

const NotFoundPage = () => {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight max-w-md text-foreground">
        Vi finner ikke den siden du leter etter
      </h1>
      <p className="mt-3 text-sm text-foreground-muted max-w-md">
        Lenken er kanskje utdatert, eller siden er flyttet.
      </p>
      <Button size="sm" className="mt-7" onClick={handleBackOrFallback}>
        Gå tilbake
      </Button>
      <Link
        to={routes.home}
        className="mt-3 text-sm text-foreground-muted underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground-muted"
      >
        eller gå til startsiden →
      </Link>
    </main>
  );
};

export default NotFoundPage;
