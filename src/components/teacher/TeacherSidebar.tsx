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
  ChevronsRight
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
    <Sidebar collapsible="icon" className="border-r border-gray-200 bg-white">
      <SidebarHeader className={`pt-8 pb-10 ${isCollapsed ? 'px-4' : 'px-6'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-primary text-white shrink-0">
            <Leaf className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="font-geist text-base font-medium text-text-primary tracking-tight select-none">
              Ease
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={`${isCollapsed ? 'space-y-2 px-3' : 'space-y-1.5 px-6'}`}>
              <TooltipProvider delayDuration={0}>
                {navigationItems.map((item) => {
                  const active = isActive(item.href);
                  const menuButton = (
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={
                        active
                          ? 'bg-surface border border-border/50 text-text-primary hover:bg-surface hover:text-text-primary'
                          : 'text-text-secondary border border-transparent hover:bg-surface hover:text-text-primary ios-ease'
                      }
                    >
                      <Link to={item.href} className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <item.icon className={`h-5 w-5 shrink-0 ${active ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary'}`} />
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
      <div className={`py-2 ${isCollapsed ? 'px-4' : 'px-6'}`}>
        <button
          onClick={toggleSidebar}
          className={`w-full flex items-center justify-center gap-2 rounded-lg text-text-tertiary hover:bg-surface hover:text-text-secondary transition-colors cursor-pointer ${isCollapsed ? 'p-2.5' : 'p-2'}`}
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

      <SidebarFooter className={`pb-8 pt-5 border-t border-surface-elevated ${isCollapsed ? 'px-4' : 'px-6'}`}>
        <Popover open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className={`w-full group flex items-center rounded-xl p-2 text-left ios-ease cursor-pointer ${isCollapsed ? 'justify-center' : 'gap-3'} ${isProfileMenuOpen ? 'bg-surface' : 'hover:bg-gray-50'}`}
            >
              <div className="h-8 w-8 rounded-full bg-surface-elevated flex items-center justify-center overflow-hidden shrink-0 border border-border">
                <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name || 'User'}`} alt="User" className="h-full w-full object-cover" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-text-primary">{profile?.name || 'Bruker'}</p>
                  <p className="truncate text-xs text-text-tertiary">{userRole === 'owner' ? 'Eier' : userRole === 'admin' ? 'Administrator' : 'Instruktør'}</p>
                </div>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent side={isCollapsed ? "right" : "top"} align="start" className={`${isCollapsed ? 'w-48' : 'w-[var(--radix-popover-trigger-width)]'} p-1.5 rounded-2xl border-border shadow-lg ${isCollapsed ? 'ml-2' : 'mb-2'}`}>
            <div className="flex flex-col gap-0.5">
              <Link
                to="/teacher/profile"
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-text-tertiary" />
                Innstillinger
              </Link>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary transition-colors cursor-pointer">
                <HelpCircle className="h-3.5 w-3.5 text-text-tertiary" />
                Hjelp & Support
              </button>
              <div className="my-1 border-t border-surface-elevated"></div>
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
      </SidebarFooter>
    </Sidebar>
  );
};
