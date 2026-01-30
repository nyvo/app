import { Link } from 'react-router-dom';
import { ArrowLeft, Infinity } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFoundPage = () => {

  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-gray-200 selection:text-gray-900">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
        </div>
        
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center text-white shadow-sm">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-semibold tracking-tighter text-text-primary">
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
            <span className="text-8xl md:text-9xl font-bold text-gray-100 select-none">
              404
            </span>
          </div>

          {/* Message */}
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary mb-3">
            Siden ble ikke funnet
          </h1>
          <p className="text-text-secondary text-sm mb-8">
            Siden finnes ikke. Den kan ha blitt flyttet eller fjernet.
          </p>

          {/* Back Button */}
          <Button asChild className="h-11 px-8">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Til forsiden
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;