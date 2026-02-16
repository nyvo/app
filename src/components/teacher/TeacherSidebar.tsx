import { useState } from 'react';
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
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  const { signOut, profile, userRole } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white outline-none">
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
                        "!transition-none",
                        active
                          ? 'bg-white border border-zinc-200 text-text-primary'
                          : 'text-text-secondary border border-transparent'
                      )}
                    >
                      <Link to={item.href} className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <item.icon className={cn(
                          "h-4 w-4 shrink-0",
                          active ? 'text-primary' : 'text-text-tertiary'
                        )} />
                        {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
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

      {/* Collapse Toggle Button */}
      <div className={`py-2 px-6 mb-2`}>
        <button
          onClick={toggleSidebar}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-lg text-text-tertiary hover:bg-zinc-50 hover:text-text-secondary smooth-transition cursor-pointer border border-transparent hover:border-zinc-200 p-2",
            isCollapsed && "px-0"
          )}
          title={isCollapsed ? 'Utvid meny' : 'Skjul meny'}
        >
          {isCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Skjul meny</span>
            </>
          )}
        </button>
      </div>

      <SidebarFooter className={`pb-6 pt-4 border-t border-zinc-200 ${isCollapsed ? 'px-3' : 'px-6'}`}>
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
              <PopoverTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className={cn(
                    "w-full transition-all duration-200",
                    "bg-white border border-zinc-200",
                    !isProfileMenuOpen && "hover:border-zinc-400"
                  )}
                >
                  <UserAvatar
                    name={profile?.name}
                    src={profile?.avatar_url}
                    size="sm"
                    ringClassName="border border-zinc-200"
                  />
                  {!isCollapsed && (
                    <>
                      <div className="flex flex-1 flex-col items-start overflow-hidden ml-0.5">
                        <p className="truncate text-sm font-medium text-text-primary leading-none mb-1.5">{profile?.name || 'Bruker'}</p>
                        <p className="truncate text-xs text-muted-foreground leading-none">
                          {userRole === 'owner' ? 'Admin' : userRole === 'admin' ? 'Administrator' : 'Instruktør'}
                        </p>
                      </div>
                      <ChevronsUpDown className="h-4 w-4 text-text-tertiary shrink-0" />
                    </>
                  )}
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent side={isCollapsed ? "right" : "top"} align="start" className={`${isCollapsed ? 'w-48' : 'w-[var(--radix-popover-trigger-width)]'} p-1.5 rounded-2xl border-zinc-200 ring-1 ring-zinc-200/50 ${isCollapsed ? 'ml-2' : 'mb-2'}`}>
                <div className="flex flex-col gap-0.5">
                  <div className="px-2 py-1.5 mb-1 border-b border-zinc-100">
                    <p className="text-sm font-medium text-text-primary truncate">{profile?.name}</p>
                    <p className="text-xxs font-medium text-text-tertiary truncate">{profile?.email}</p>
                  </div>
                  <Link
                    to="/teacher/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-zinc-50 hover:text-text-primary transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-text-tertiary" />
                    Innstillinger
                  </Link>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-zinc-50 hover:text-text-primary transition-colors cursor-pointer">
                    <HelpCircle className="h-3.5 w-3.5 text-text-tertiary" />
                    Hjelp & Support
                  </button>
                  <div className="my-1 border-t border-zinc-100"></div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5 text-destructive" />
                    Logg ut
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
