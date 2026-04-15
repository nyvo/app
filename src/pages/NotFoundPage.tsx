import { Link } from 'react-router-dom';
import { ArrowLeft, Infinity } from '@/lib/icons';
import { Button } from '@/components/ui/button';

const NotFoundPage = () => {

  return (
    <div className="min-h-screen w-full bg-background text-foreground antialiased flex flex-col selection:bg-muted selection:text-foreground">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
        </div>
        
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="size-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-base font-medium text-foreground">
            Ease
          </span>
        </Link>

        <div className="w-24" />
      </header>

      {/* 404 Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
        <div className="text-center max-w-md">
          {/* 404 Number */}
          <div className="mb-6">
            <span className="text-6xl font-semibold tracking-tight text-muted select-none">
              404
            </span>
          </div>

          {/* Message */}
          <h1 className="text-3xl font-semibold tracking-tight mb-3 text-foreground">
            Siden ble ikke funnet
          </h1>
          <p className="text-sm mb-8 text-muted-foreground">
            Siden finnes ikke. Den kan ha blitt flyttet eller fjernet.
          </p>

          {/* Back Button */}
          <Button asChild className="h-11 px-8">
            <Link to="/">
              <ArrowLeft className="size-4 mr-2" />
              Til forsiden
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
