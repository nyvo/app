import { Link, matchPath, useLocation } from 'react-router-dom';
import { Bell, Settings } from 'lucide-react';
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
  {
    path: '/teacher/messages',
    crumbs: [
      { label: 'Hjem', to: '/teacher' },
      { label: 'Meldinger' },
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
  const { breadcrumbs, action } = useTeacherShell();
  const crumbs = breadcrumbs ?? getBreadcrumbs(location.pathname);

  return (
    <div className="hidden h-14 shrink-0 items-center justify-between gap-4 border-b border-border-strong px-6 md:flex lg:px-8">
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="type-label-sm gap-2 text-muted-foreground">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;

            return (
              <BreadcrumbItem key={`${crumb.label}-${index}`}>
                {crumb.to && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="font-medium">{crumb.label}</BreadcrumbPage>
                )}
                {!isLast && <BreadcrumbSeparator />}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex shrink-0 items-center gap-1">
        {action && (
          <Button asChild size="compact" className="gap-2">
            <Link to={action.to}>{action.label}</Link>
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Link to="/teacher/profile">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
