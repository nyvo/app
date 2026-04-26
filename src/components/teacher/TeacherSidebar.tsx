import { useEffect } from 'react';
import {
  Leaf,
  Home,
  UserPlus,
  CalendarDays,
  Calendar,
  CalendarPlus,
  MapPin,
  Wallet,
  Building,
  Settings,
  HelpCircle,
  LogOut,
  ChevronsUpDown,
  PanelLeft,
} from '@/lib/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/contexts/AuthContext';
// MESSAGES_DISABLED_PRE_LAUNCH (2026-04-25): re-add `Inbox` to the icons import,
// re-import `getUnreadCount`, restore the unreadMessages state + polling effect,
// and uncomment the Meldinger nav item below.
// import { Inbox } from '@/lib/icons';
// import { getUnreadCount } from '@/services/messages';
// import { useState } from 'react';
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
      // MESSAGES_DISABLED_PRE_LAUNCH (2026-04-25): re-enable when the messages page ships.
      // { icon: Inbox, label: 'Meldinger', href: '/teacher/messages' },
      { icon: MapPin, label: 'Adresser', href: '/teacher/locations' },
      { icon: Wallet, label: 'Betalinger', href: '/teacher/payments' },
      { icon: Building, label: 'Studio', href: '/teacher/studio' },
    ],
  },
];

export const TeacherSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, userRole, currentOrganization } = useAuth();
  const { isMobile, toggleSidebar, setOpenMobile, state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  // MESSAGES_DISABLED_PRE_LAUNCH (2026-04-25): unread-message polling removed.
  // Restore by re-adding `currentOrganization` to useAuth() destructuring and
  // re-introducing the useState + useEffect that calls getUnreadCount on a
  // 30-second interval.

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarToggleLabel = isCollapsed ? 'Vis sidemeny' : 'Skjul sidemeny';

  const isActive = (href: string) => {
    if (href === '/teacher') {
      return location.pathname === '/teacher' || location.pathname === '/teacher/';
    }
    if (location.pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <Sidebar variant="inset" collapsible="icon" aria-label="Instruktørnavigasjon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {isCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-12 w-full items-center justify-center rounded-lg text-sidebar-foreground outline-none ring-sidebar-ring transition-[background-color,color] duration-150 ease-out hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
                aria-label={sidebarToggleLabel}
                title={sidebarToggleLabel}
              >
                <PanelLeft className="size-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <SidebarMenuButton asChild size="lg" className="flex-1">
                  <Link to="/teacher">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Leaf className="size-4" />
                    </div>
                    <span className="font-medium">Ease</span>
                  </Link>
                </SidebarMenuButton>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none ring-sidebar-ring transition-[background-color,color] duration-150 ease-out hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2"
                  aria-label={sidebarToggleLabel}
                  title={sidebarToggleLabel}
                >
                  <PanelLeft className="size-4" />
                </button>
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarGroup className="pt-3 pb-3">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Opprett kurs"
                isActive={location.pathname === '/teacher/new-course'}
                className="h-9 justify-center bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground active:bg-primary/80 active:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
              >
                <Link to="/teacher/new-course">
                  <CalendarPlus />
                  <span>Opprett kurs</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

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
                        {/* MESSAGES_DISABLED_PRE_LAUNCH (2026-04-25): unread-messages
                            badge removed. Restore the conditional+span when re-enabling. */}
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
                  className="rounded-lg data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <UserAvatar
                    name={profile?.name}
                    src={profile?.avatar_url}
                    size="sm"
                  />
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="text-sm font-medium truncate text-foreground">{profile?.name || currentOrganization?.name || 'Konto'}</span>
                    <span className="text-xs font-medium tracking-wide truncate text-muted-foreground">
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
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border border-sidebar-border bg-background text-sidebar-foreground [&_[role=menuitem]]:focus:bg-sidebar-accent [&_[role=menuitem]]:focus:text-sidebar-accent-foreground"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                    <UserAvatar
                      name={profile?.name}
                      src={profile?.avatar_url}
                      size="sm"
                    />
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="text-sm font-medium truncate text-foreground">{profile?.name || currentOrganization?.name}</span>
                      <span className="text-xs truncate text-muted-foreground">{profile?.email}</span>
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
                  className="text-primary hover:text-primary focus:text-primary [&_svg]:text-primary"
                >
                  <LogOut />
                  Logg ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  );
};
