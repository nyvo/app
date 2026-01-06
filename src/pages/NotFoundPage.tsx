import { Link } from 'react-router-dom';
import { ArrowLeft, Infinity } from 'lucide-react';

const NotFoundPage = () => {

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-stone-900 font-sans antialiased flex flex-col selection:bg-stone-200 selection:text-stone-900">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 flex justify-center z-50">
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-stone-900 rounded-md flex items-center justify-center text-white shadow-sm">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-semibold tracking-tighter text-stone-900">
            Ease
          </span>
        </Link>
      </header>

      {/* 404 Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
        <div className="text-center max-w-md">
          {/* 404 Number */}
          <div className="mb-6">
            <span className="text-8xl md:text-9xl font-bold text-stone-200 select-none">
              404
            </span>
          </div>

          {/* Message */}
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 mb-3">
            Siden ble ikke funnet
          </h1>
          <p className="text-stone-500 text-sm mb-8">
            Beklager, vi kunne ikke finne siden du leter etter. Den kan ha blitt
            flyttet eller fjernet.
          </p>

          {/* Back Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Til forsiden
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
