import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUpcomingSignups, fetchPastSignups, type StudentSignupWithCourse } from '@/services/studentSignups';
import { BookingCard } from '@/components/student/BookingCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarX, Clock, Search } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';

const StudentDashboardPage = () => {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<StudentSignupWithCourse[]>([]);
  const [past, setPast] = useState<StudentSignupWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Refetch function for real-time updates (silent, no loading state)
  const refetchData = useCallback(async () => {
    if (!user?.email || !user?.id) return;

    try {
      const [upcomingRes, pastRes] = await Promise.all([
        fetchUpcomingSignups(user.id, user.email),
        fetchPastSignups(user.id, user.email)
      ]);

      if (!upcomingRes.error) setUpcoming(upcomingRes.data || []);
      if (!pastRes.error) setPast(pastRes.data || []);
    } catch {
      // Silent fail for real-time updates - keep existing data
    }
  }, [user?.id, user?.email]);

  // Subscribe to real-time updates for this student's signups
  useRealtimeSubscription(
    { table: 'signups', filter: `user_id=eq.${user?.id}` },
    refetchData,
    !!user?.id
  );

  // Initial data load
  const loadData = useCallback(async () => {
    if (!user?.email || !user?.id) return;

    // Only show loading on first load
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [upcomingRes, pastRes] = await Promise.all([
        fetchUpcomingSignups(user.id, user.email),
        fetchPastSignups(user.id, user.email)
      ]);

      if (upcomingRes.error) throw upcomingRes.error;
      if (pastRes.error) throw pastRes.error;

      setUpcoming(upcomingRes.data || []);
      setPast(pastRes.data || []);
    } catch {
      setError('Kunne ikke hente kursene. Prøv igjen.');
    } finally {
      setIsLoading(false);
      hasLoadedRef.current = true;
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
          <Spinner size="xl" className="mb-4" aria-hidden="true" />
          <p className="text-muted-foreground">Henter kurs</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="rounded-full bg-status-error-bg p-3 mb-4">
            <CalendarX className="h-5 w-5 text-status-error-text" />
          </div>
          <h2 className="type-title mb-2 text-foreground">Noe gikk galt</h2>
          <p className="type-body mb-6 max-w-md text-muted-foreground">{error}</p>
          <Button onClick={loadData} variant="outline-soft">Prøv på nytt</Button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Welcome / Header */}
      <div className="mb-8 space-y-1">
        <h1 className="type-heading-1 text-foreground">
          Mine kurs
        </h1>
        <p className="type-body text-muted-foreground">
          Her finner du kursene dine.
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-8 h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger 
            value="upcoming"
            className="type-label rounded-none px-0 pb-3 text-muted-foreground transition-[border-color,color,opacity] duration-150 ease-out data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
          >
            Kommende ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="type-label rounded-none px-0 pb-3 text-muted-foreground transition-[border-color,color,opacity] duration-150 ease-out data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
          >
            Tidligere
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 focus-visible:outline-none">
          {upcoming.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {upcoming.map((signup) => (
                <BookingCard
                  key={signup.id}
                  signup={signup}
                  onStatusChange={loadData}
                />
              ))}
            </div>
          ) : (() => {
            // Detect first visit: user created less than 5 minutes ago
            const isNewUser = user?.created_at
              ? (Date.now() - new Date(user.created_at).getTime()) < 5 * 60 * 1000
              : false;

            return (
              <div className="rounded-lg border border-border bg-surface">
                <EmptyState
                  icon={isNewUser ? Search : CalendarX}
                  title={isNewUser ? 'Velkommen til Ease' : 'Ingen kommende kurs'}
                  description={
                    isNewUser
                      ? 'Se kurs i nærheten og meld deg på.'
                      : 'Du har ingen kommende kurs.'
                  }
                  action={
                    <Button onClick={() => window.open('/', '_self')} variant="default">
                      {isNewUser ? 'Se kurs' : 'Finn kurs'}
                    </Button>
                  }
                />
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 focus-visible:outline-none">
          {past.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {past.map((signup) => (
                <BookingCard
                  key={signup.id}
                  signup={signup}
                  onStatusChange={loadData}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState
                icon={Clock}
                title="Ingen tidligere kurs"
                description="Du har ikke deltatt på noen kurs ennå."
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

    </>
  );
};

export default StudentDashboardPage;
