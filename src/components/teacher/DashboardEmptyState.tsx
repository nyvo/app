import { Link } from 'react-router-dom';
import { Plus, ChevronRight, Play, Coffee, CalendarPlus, Sprout } from 'lucide-react';

export const DashboardEmptyState = () => {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Hero Card: Onboarding (Span 7) */}
      <div className="lg:col-span-7 relative overflow-hidden rounded-[2rem] border border-border bg-white p-8 shadow-sm group">
        {/* Abstract Watermark */}
        <div className="absolute -right-10 -top-10 h-64 w-64 opacity-[0.03] rotate-12 pointer-events-none">
          <Sprout className="h-full w-full text-text-primary" />
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-secondary mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-text-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
              </span>
              Setup
            </div>
            <h3 className="font-geist text-xl font-medium text-text-primary">Kom i gang med Ease</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm">
              Tre steg for å få studioet ditt opp og gå. Vi hjelper deg hele veien.
            </p>
          </div>

          {/* Steps Checklist */}
          <div className="space-y-2">
            {/* Step 1: Active */}
            <Link
              to="/teacher/new-course"
              className="w-full flex items-center gap-4 rounded-xl border border-border bg-white p-3 hover:border-ring ios-ease text-left group/item"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text-primary text-white shadow-sm">
                <Plus className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="block text-sm font-medium text-text-primary">Opprett ditt første kurs</span>
              </div>
              <ChevronRight className="h-4 w-4 text-ring group-hover/item:text-muted-foreground ios-ease" />
            </Link>

            {/* Step 2: Pending */}
            <div className="flex items-center gap-4 rounded-xl border border-transparent p-3 opacity-60">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-text-tertiary">
                <span className="text-xs font-medium text-muted-foreground">2</span>
              </div>
              <span className="text-sm text-muted-foreground">Publiser din timeplan</span>
            </div>

            {/* Step 3: Pending */}
            <div className="flex items-center gap-4 rounded-xl border border-transparent p-3 opacity-60">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-text-tertiary">
                <span className="text-xs font-medium text-muted-foreground">3</span>
              </div>
              <span className="text-sm text-muted-foreground">Inviter dine deltakere</span>
            </div>
          </div>

          <div className="pt-2 border-t border-surface-elevated">
            <button className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-text-primary ios-ease">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated">
                <Play className="h-2.5 w-2.5 ml-0.5 text-text-secondary" />
              </div>
              Se introduksjonsvideo
            </button>
          </div>
        </div>
      </div>

      {/* Inbox Card: Empty State (Span 5) */}
      <div className="lg:col-span-5 flex flex-col rounded-3xl border border-border bg-white shadow-sm overflow-hidden ios-ease hover:border-ring hover:shadow-md">
        <div className="flex items-center justify-between border-b border-secondary p-5 px-7">
          <h3 className="font-geist text-sm font-semibold text-text-primary">Meldinger</h3>
          <Link to="/teacher/messages" className="text-xs font-medium text-text-tertiary hover:text-text-secondary ios-ease">
            Se alle
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[280px]">
          <div className="mb-4 rounded-full bg-surface p-4 border border-surface-elevated">
            <Coffee className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
          </div>
          <h4 className="text-sm font-medium text-text-primary">Ingen nye meldinger</h4>
          <p className="mt-2 text-xs text-muted-foreground max-w-[220px] leading-relaxed">
            Ta deg en kopp kaffe. Meldinger fra deltakere dukker opp her når kursene er i gang.
          </p>
        </div>
      </div>

      {/* Schedule Card: Empty State (Span 12) */}
      <div className="lg:col-span-12 rounded-3xl border border-border bg-white shadow-sm overflow-hidden ios-ease hover:border-ring hover:shadow-md">
        <div className="flex items-center justify-between p-5 px-7 border-b border-secondary">
          <h3 className="font-geist text-sm font-semibold text-text-primary">Dine kurs</h3>
        </div>

        {/* Empty State Container */}
        <div className="px-2 pb-2">
          <div className="flex flex-col items-center justify-center rounded-[1.5rem] bg-surface py-16 px-4 border border-border/50 border-dashed">
            <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-white border border-border shadow-sm">
              <CalendarPlus className="h-5 w-5 text-muted-foreground" />
            </div>
            <h4 className="text-base font-medium text-text-primary">Ingen kurs planlagt</h4>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
              Kalenderen din er tom – legg til et kurs for å fylle timeplanen.
            </p>
            <Link
              to="/teacher/new-course"
              className="mt-6 flex items-center gap-2 h-10 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text-primary hover:bg-text-primary hover:text-white hover:border-text-primary ios-ease shadow-sm"
            >
              Legg til i kalender
            </Link>
          </div>
        </div>
      </div>

      {/* Registrations Card: Empty State (Span 12) */}
      <div className="lg:col-span-12 rounded-3xl border border-border bg-white shadow-sm overflow-hidden ios-ease hover:border-ring hover:shadow-md">
        <div className="flex items-center justify-between p-5 px-7 border-b border-secondary">
          <h3 className="font-geist text-sm font-semibold text-text-primary">Påmeldinger</h3>
        </div>

        <div className="p-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Avatar Group Visual */}
            <div className="flex -space-x-4 opacity-50 grayscale">
              <div className="h-10 w-10 rounded-full border-2 border-white bg-surface-elevated"></div>
              <div className="h-10 w-10 rounded-full border-2 border-white bg-ring"></div>
              <div className="h-10 w-10 rounded-full border-2 border-white bg-text-tertiary flex items-center justify-center text-white text-[10px] font-bold">
                +
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-primary">Klar for deltakere?</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Når du publiserer kursene dine, vil nye påmeldinger vises her i sanntid.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
