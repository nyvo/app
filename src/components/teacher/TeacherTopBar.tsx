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

// MESSAGES_DISABLED_PRE_LAUNCH (2026-04-25): re-add '/teacher/messages' here when enabling.
const FULL_WIDTH_ROUTES = ['/teacher/schedule'];

const teacherBreadcrumbs: Array<{
  path: string;
  crumbs: TeacherShellCrumb[];
}> = [
  {
    path: '/teacher',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Oversikt' },
    ],
  },
  {
    path: '/teacher/courses',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Kurs' },
    ],
  },
  {
    path: '/teacher/courses/:id',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Kurs', to: '/teacher/courses' },
      { label: 'Kursdetaljer' },
    ],
  },
  {
    path: '/teacher/new-course',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Kurs', to: '/teacher/courses' },
      { label: 'Opprett kurs' },
    ],
  },
  {
    path: '/teacher/schedule',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Timeplan' },
    ],
  },
  {
    path: '/teacher/signups',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Påmeldinger' },
    ],
  },
  // MESSAGES_DISABLED_PRE_LAUNCH (2026-04-25): re-add the messages crumb when re-enabling.
  // {
  //   path: '/teacher/messages',
  //   crumbs: [
  //     { label: 'Hjem', to: '/teacher' },
  //     { label: 'Meldinger' },
  //   ],
  // },
  {
    path: '/teacher/locations',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Adresser' },
    ],
  },
  {
    path: '/teacher/studio',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Studio' },
    ],
  },
  {
    path: '/teacher/profile',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Profil' },
    ],
  },
];

function getBreadcrumbs(pathname: string) {
  return (
    teacherBreadcrumbs.find(({ path }) => matchPath({ path, end: true }, pathname))?.crumbs ?? [
      { label: 'Hjem', to: '/teacher' },
    ]
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
          {/* Notification bell + Settings icon removed 2026-04-25 — updates now
              live on the dashboard activity card. Profile/settings reachable
              via the user-avatar dropdown in the sidebar footer. */}
        </div>
      </div>
    </div>
  );
}
