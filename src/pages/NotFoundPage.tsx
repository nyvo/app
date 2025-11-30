import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen w-full bg-surface text-sidebar-foreground font-geist">
      {/* Simple Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-border text-primary">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="font-geist text-lg font-semibold text-text-primary tracking-tight">Ease</span>
          </Link>
        </div>
      </header>

      {/* 404 Content */}
      <main className="pt-28 pb-24 px-4 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          {/* 404 Number */}
          <div className="mb-8">
            <span className="text-8xl md:text-9xl font-bold text-border/60 select-none">404</span>
          </div>

          {/* Message */}
          <h1 className="font-geist text-2xl md:text-3xl font-semibold tracking-tight text-text-primary mb-4">
            Siden ble ikke funnet
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Beklager, vi kunne ikke finne siden du leter etter. Den kan ha blitt flyttet eller fjernet.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              variant="default"
              className="gap-2 w-full sm:w-auto"
            >
              <Link to="/">
                <Home className="h-4 w-4" />
                Gå til forsiden
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="gap-2 w-full sm:w-auto"
            >
              <Link to="/courses">
                <Search className="h-4 w-4" />
                Se alle kurs
              </Link>
            </Button>
          </div>

          {/* Back Link */}
          <div className="mt-8">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Gå tilbake
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
