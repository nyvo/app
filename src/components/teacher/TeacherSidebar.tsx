import { useState, useEffect } from 'react';
import {
  Leaf,
  Home,
  UserPlus,
  Inbox,
  Calendar,
  CalendarDays,
  Settings,
  HelpCircle,
  LogOut,
  ChevronsUpDown
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getUnreadCount } from '@/services/messages';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navigationItems = [
  { icon: Home, label: 'Hjem', href: '/teacher' },
  { icon: CalendarDays, label: 'Timeplan', href: '/teacher/schedule' },
  { icon: Calendar, label: 'Kurs', href: '/teacher/courses' },
  { icon: UserPlus, label: 'Påmeldinger', href: '/teacher/signups' },
  { icon: Inbox, label: 'Meldinger', href: '/teacher/messages' },
];

export const TeacherSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, userRole, currentOrganization } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Fetch unread message count
  useEffect(() => {
    if (!currentOrganization?.id) return;
    const load = async () => {
      const { data } = await getUnreadCount(currentOrganization.id);
      setUnreadMessages(data);
    };
    load();
    // Poll every 30 seconds
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
    // Check if the current path starts with the href (e.g. /teacher/courses/detail matches /teacher/courses)
    if (location.pathname.startsWith(href)) {
      return true;
    }
    // Map sub-routes to their parent navigation items
    if (href === '/teacher/courses') {
      return location.pathname === '/teacher/new-course';
    }
    return false;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={`pt-8 pb-8 ${isCollapsed ? 'px-4' : 'px-6'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 focus-visible:ring-2 focus-visible:ring-zinc-400/50 outline-none">
            <Leaf className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="font-geist text-base font-medium text-text-primary tracking-tight select-none leading-none">
              Ease
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={`${isCollapsed ? 'space-y-2 px-3' : 'space-y-1 px-6'}`}>
              <TooltipProvider delayDuration={0}>
                {navigationItems.map((item) => {
                  const active = isActive(item.href);
                  const menuButton = (
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        "group relative cursor-pointer transition-colors",
                        active
                          ? 'bg-white border border-zinc-200 text-text-primary'
                          : 'text-text-secondary border border-transparent hover:bg-zinc-100'
                      )}
                    >
                      <Link to={item.href} className={cn("flex items-center relative", isCollapsed ? 'justify-center' : 'gap-3', active && !isCollapsed && 'pl-6')}>
                        {active && !isCollapsed && (
                          <span className="absolute left-[7px] top-1/2 -translate-y-1/2 w-[1.5px] h-2.5 bg-zinc-900 rounded-full" />
                        )}
                        <div className="relative">
                          <item.icon className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            active ? 'text-primary' : 'text-text-tertiary group-hover:text-text-primary'
                          )} />
                          {isCollapsed && item.href === '/teacher/messages' && unreadMessages > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                              {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <>
                            <span className="text-sm font-medium leading-none">{item.label}</span>
                            {item.href === '/teacher/messages' && unreadMessages > 0 && (
                              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xxs font-medium text-primary-foreground">
                                {unreadMessages > 9 ? '9+' : unreadMessages}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  );

                  return (
                    <SidebarMenuItem key={item.label}>
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8}>
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        menuButton
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>


      <SidebarFooter className={`pb-6 pt-4 ${isCollapsed ? 'px-3' : 'px-6'}`}>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className={cn(
                    "w-full cursor-pointer transition-colors",
                    "hover:bg-zinc-100 border border-transparent"
                  )}
                >
                  <UserAvatar
                    name={profile?.name}
                    src={profile?.avatar_url}
                    size="sm"
                  />
                  {!isCollapsed && (
                    <>
                      <div className="flex flex-1 flex-col items-start overflow-hidden ml-0.5">
                        <p className="truncate text-sm font-medium text-text-primary leading-none mb-1.5">{profile?.name || currentOrganization?.name || 'Konto'}</p>
                        <p className="truncate text-xs text-text-secondary leading-none">
                          {userRole === 'owner' ? 'Administrator' : userRole === 'admin' ? 'Administrator' : 'Instruktør'}
                        </p>
                      </div>
                      <ChevronsUpDown className="h-4 w-4 text-text-tertiary shrink-0" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isCollapsed ? "right" : "top"}
                align="start"
                className={isCollapsed ? 'w-48 ml-2' : 'w-[var(--radix-dropdown-menu-trigger-width)] mb-2'}
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-text-primary truncate">{profile?.name || currentOrganization?.name}</p>
                  <p className="text-xxs font-medium text-text-secondary truncate">{profile?.email}</p>
                </div>
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
    </Sidebar>
  );
};
