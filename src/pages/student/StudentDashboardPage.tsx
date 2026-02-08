import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUpcomingSignups, fetchPastSignups, type StudentSignupWithCourse } from '@/services/studentSignups';
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout';
import { BookingCard } from '@/components/student/BookingCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CalendarX, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudentSignupsSubscription } from '@/hooks/use-realtime-subscription';

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
  useStudentSignupsSubscription(user?.id, refetchData);

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
      <StudentDashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary mb-4" />
          <p className="text-muted-foreground">Henter kurs ...</p>
        </div>
      </StudentDashboardLayout>
    );
  }

  if (error) {
    return (
      <StudentDashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="rounded-full bg-status-error-bg p-4 mb-4">
            <CalendarX className="h-8 w-8 text-status-error-text" />
          </div>
          <h2 className="text-xl font-medium text-text-primary mb-2">Noe gikk galt</h2>
          <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
          <Button onClick={loadData} variant="outline-soft">Prøv på nytt</Button>
        </div>
      </StudentDashboardLayout>
    );
  }

  return (
    <StudentDashboardLayout>
      
      {/* Welcome / Header */}
      <div className="mb-8">
        <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">
          Mine kurs
        </h1>
        <p className="text-muted-foreground mt-1">
          Her finner du kursene dine.
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-8 w-full justify-start bg-transparent border-b border-zinc-200 rounded-none h-auto p-0 gap-8">
          <TabsTrigger 
            value="upcoming"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0 text-sm font-medium text-muted-foreground data-[state=active]:text-text-primary transition-all"
          >
            Kommende ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0 text-sm font-medium text-muted-foreground data-[state=active]:text-text-primary transition-all"
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
          ) : (
            <div className="relative flex flex-col items-center justify-center py-16 text-center bg-gradient-to-br from-white to-surface-elevated/50 rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-zinc-200/30 blur-3xl"></div>
              <div className="relative z-10">
                <div className="rounded-full bg-surface-elevated p-4 mb-4 mx-auto inline-flex">
                  <CalendarX className="h-8 w-8 text-text-tertiary" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-1">Ingen kommende kurs</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Ingen kurs å vise.
                </p>
                <Button onClick={() => window.open('/', '_self')} variant="default">
                  Finn kurs
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 focus-visible:outline-none">
          {past.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 opacity-75">
              {past.map((signup) => (
                <BookingCard
                  key={signup.id}
                  signup={signup}
                  onStatusChange={loadData}
                />
              ))}
            </div>
          ) : (
            <div className="relative flex flex-col items-center justify-center py-16 text-center bg-gradient-to-br from-surface/50 to-surface-elevated/30 rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-zinc-200/20 blur-3xl"></div>
              <div className="relative z-10">
                <div className="rounded-full bg-surface-elevated p-4 mb-4 mx-auto inline-flex">
                  <Clock className="h-8 w-8 text-text-tertiary" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-1">Ingen tidligere kurs</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Du har ikke deltatt på noen kurs ennå.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

    </StudentDashboardLayout>
  );
};

export default StudentDashboardPage;
