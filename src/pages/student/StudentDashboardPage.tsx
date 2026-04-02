import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUpcomingSignups, fetchPastSignups, type StudentSignupWithCourse } from '@/services/studentSignups';
import { BookingCard } from '@/components/student/BookingCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
          <h2 className="text-sm font-medium text-foreground mb-2">Noe gikk galt</h2>
          <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
          <Button onClick={loadData} variant="outline-soft">Prøv på nytt</Button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Welcome / Header */}
      <div className="mb-8">
        <h1 className="font-geist text-2xl font-medium tracking-tight text-foreground">
          Mine kurs
        </h1>
        <p className="text-muted-foreground mt-1">
          Her finner du kursene dine.
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-8 w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-8">
          <TabsTrigger 
            value="upcoming"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground ios-ease"
          >
            Kommende ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground ios-ease"
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
              <div className="flex flex-col items-center justify-center py-16 text-center bg-background rounded-lg border border-border">
                <div>
                  <div className="rounded-full bg-muted p-3 mb-4 mx-auto inline-flex">
                    {isNewUser ? (
                      <Search className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <CalendarX className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    {isNewUser ? 'Velkommen til Ease' : 'Ingen kommende kurs'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                    {isNewUser
                      ? 'Se kurs i nærheten og meld deg på.'
                      : 'Du har ingen kommende kurs.'}
                  </p>
                  <Button onClick={() => window.open('/', '_self')} variant="default">
                    {isNewUser ? 'Se kurs' : 'Finn kurs'}
                  </Button>
                </div>
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
            <div className="flex flex-col items-center justify-center py-16 text-center bg-background rounded-lg border border-border">
              <div>
                <div className="rounded-full bg-muted p-3 mb-4 mx-auto inline-flex">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">Ingen tidligere kurs</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Du har ikke deltatt på noen kurs ennå.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

    </>
  );
};

export default StudentDashboardPage;
