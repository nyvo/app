import { useState, useEffect } from 'react';
import {
  Leaf,
  Home,
  UserPlus,
  Inbox,
  CalendarDays,
  Calendar,
  Settings,
  HelpCircle,
  LogOut,
  ChevronsUpDown,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { getUnreadCount } from '@/services/messages';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navSections = [
  {
    label: 'Oversikt',
    items: [
      { icon: Home, label: 'Hjem', href: '/teacher' },
      { icon: CalendarDays, label: 'Timeplan', href: '/teacher/schedule' },
    ],
  },
  {
    label: 'Administrer',
    items: [
      { icon: Calendar, label: 'Kurs', href: '/teacher/courses' },
      { icon: UserPlus, label: 'Påmeldinger', href: '/teacher/signups' },
      { icon: Inbox, label: 'Meldinger', href: '/teacher/messages' },
    ],
  },
];

export const TeacherSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, userRole, currentOrganization } = useAuth();
  const { isMobile } = useSidebar();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    const load = async () => {
      const { data } = await getUnreadCount(currentOrganization.id);
      setUnreadMessages(data);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [currentOrganization?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (href: string) => {
    if (href === '/teacher') {
      return location.pathname === '/teacher' || location.pathname === '/teacher/';
    }
    if (location.pathname.startsWith(href)) return true;
    if (href === '/teacher/courses') {
      return location.pathname === '/teacher/new-course';
    }
    return false;
  };

  return (
    <Sidebar collapsible="icon" aria-label="Instruktørnavigasjon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <a href="/teacher">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                  <Leaf className="h-4 w-4" />
                </div>
                <span className="font-medium">Ease</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                    >
                      <Link to={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        {item.href === '/teacher/messages' && unreadMessages > 0 && (
                          <span
                            className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xxs font-medium text-primary-foreground"
                            aria-label={`${unreadMessages > 9 ? 'Mer enn 9' : unreadMessages} uleste meldinger`}
                          >
                            <span aria-hidden="true">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <UserAvatar
                    name={profile?.name}
                    src={profile?.avatar_url}
                    size="sm"
                  />
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="type-label-sm truncate text-foreground">{profile?.name || currentOrganization?.name || 'Konto'}</span>
                    <span className="type-meta truncate text-muted-foreground">
                      {userRole === 'owner' || userRole === 'admin' ? 'Administrator' : 'Instruktør'}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                    <UserAvatar
                      name={profile?.name}
                      src={profile?.avatar_url}
                      size="sm"
                    />
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="type-label-sm truncate text-foreground">{profile?.name || currentOrganization?.name}</span>
                      <span className="type-meta truncate text-muted-foreground">{profile?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/teacher/profile">
                    <Settings />
                    Innstillinger
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle />
                  Hjelp
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive focus:text-destructive [&_svg]:text-destructive"
                >
                  <LogOut />
                  Logg ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
