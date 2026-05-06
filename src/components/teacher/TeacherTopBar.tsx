import { Fragment } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useTeacherShell, type TeacherShellCrumb } from '@/components/teacher/TeacherShellContext';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';

// No routes currently need full-width layout. Kept as an empty array so the
// isFullWidth conditional below stays cheap; add a route here if a future
// page needs to escape the centered max-width.
const FULL_WIDTH_ROUTES: string[] = [];

const home: TeacherShellCrumb = { label: 'Hjem', to: routes.dashboard };

const teacherBreadcrumbs: Array<{
  path: string;
  crumbs: TeacherShellCrumb[];
}> = [
  { path: routes.dashboard,                   crumbs: [home, { label: 'Oversikt' }] },
  { path: routes.courses,                     crumbs: [home, { label: 'Kurs' }] },
  { path: routes.course(':id'),               crumbs: [home, { label: 'Kurs', to: routes.courses }, { label: 'Kursdetaljer' }] },
  { path: routes.editCourse(':id'),           crumbs: [home, { label: 'Kurs', to: routes.courses }, { label: 'Endre kurs' }] },
  { path: routes.coursePricing(':id'),        crumbs: [home, { label: 'Kurs', to: routes.courses }, { label: 'Priser' }] },
  { path: routes.newCourse,                   crumbs: [home, { label: 'Kurs', to: routes.courses }, { label: 'Opprett kurs' }] },
  { path: routes.schedule,                    crumbs: [home, { label: 'Timeplan' }] },
  { path: routes.signups,                     crumbs: [home, { label: 'Påmeldinger' }] },
  { path: routes.studio,                      crumbs: [home, { label: 'Studio' }] },
  { path: routes.settingsProfile,             crumbs: [home, { label: 'Innstillinger' }, { label: 'Profil' }] },
  { path: routes.settingsPayouts,            crumbs: [home, { label: 'Innstillinger' }, { label: 'Betalingskonto' }] },
];

function getBreadcrumbs(pathname: string) {
  return (
    teacherBreadcrumbs.find(({ path }) => matchPath({ path, end: true }, pathname))?.crumbs ?? [home]
  );
}

export function TeacherTopBar() {
  const location = useLocation();
  const { breadcrumbs, action, topBarSlot } = useTeacherShell();
  const crumbs = breadcrumbs ?? getBreadcrumbs(location.pathname);
  const isFullWidth = FULL_WIDTH_ROUTES.some((route) => location.pathname.startsWith(route));

  return (
    <div className="hidden h-14 shrink-0 border-b border-border md:block">
      <div
        className={cn(
          'flex h-full items-center justify-between gap-4 px-6 lg:px-8',
          !isFullWidth && 'mx-auto w-full max-w-[1600px]'
        )}
      >
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="text-sm gap-2 text-muted-foreground">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;

              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem>
                    {crumb.to && !isLast ? (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.to}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="font-medium text-foreground">{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator className="text-disabled-foreground" />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex shrink-0 items-center gap-3">
          {topBarSlot}
          {action && (
            <Button asChild size="sm" className="gap-2">
              <Link to={action.to}>{action.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
