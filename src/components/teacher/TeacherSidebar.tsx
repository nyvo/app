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
  LogOut
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
} from '@/components/ui/sidebar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (href: string) => {
    if (href === '/teacher') {
      return location.pathname === '/teacher' || location.pathname === '/teacher/';
    }
    // Check if the current path starts with the href (e.g. /teacher/courses/detail matches /teacher/courses)
    return location.pathname.startsWith(href);
  };

  return (
    <Sidebar className="border-r border-border bg-white">
      <SidebarHeader className="px-6 pt-8 pb-10">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-primary text-white shadow-sm">
            <Leaf className="h-4 w-4" />
          </div>
          <span className="font-geist text-base font-medium text-text-primary tracking-tight select-none">
            Ease
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5 px-6">
              {navigationItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={
                        active
                          ? 'bg-surface border border-border/50 text-text-primary hover:bg-surface hover:text-text-primary'
                          : 'text-muted-foreground border border-transparent hover:bg-surface hover:text-text-primary ios-ease'
                      }
                    >
                      <Link to={item.href} className="flex items-center gap-3">
                        <item.icon className={`h-5 w-5 ${active ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-6 pb-8 pt-5 border-t border-surface-elevated">
        <Popover open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className={`w-full group flex items-center gap-3 rounded-xl p-2 text-left ios-ease cursor-pointer ${isProfileMenuOpen ? 'bg-surface' : 'hover:bg-surface'}`}
            >
              <div className="h-8 w-8 rounded-full bg-surface-elevated flex items-center justify-center overflow-hidden shrink-0 border border-border">
                <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name || 'User'}`} alt="User" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium text-text-primary">{profile?.name || 'Bruker'}</p>
                <p className="truncate text-xxs text-muted-foreground">{userRole === 'owner' ? 'Eier' : userRole === 'admin' ? 'Administrator' : 'Instruktør'}</p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-[var(--radix-popover-trigger-width)] p-1.5 rounded-2xl border-border shadow-xl shadow-text-primary/5 mb-2">
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
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-red-600" />
                Logg ut
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarFooter>
    </Sidebar>
  );
};
