import { useState } from 'react';
import {
  Leaf,
  Home,
  UserPlus,
  Inbox,
  Calendar,
  ChevronsUpDown,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
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
  { icon: Calendar, label: 'Kurs', href: '/teacher/courses' },
  { icon: UserPlus, label: 'Påmeldinger', href: '/teacher/signups' },
  { icon: Inbox, label: 'Meldinger', href: '/teacher/messages' },
];

export const TeacherSidebar = () => {
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/teacher') {
      return location.pathname === '/teacher' || location.pathname === '/teacher/';
    }
    // Check if the current path starts with the href (e.g. /teacher/courses/detail matches /teacher/courses)
    return location.pathname.startsWith(href);
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
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
                          ? 'bg-white border border-sidebar-border text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:bg-white hover:text-text-primary'
                          : 'text-muted-foreground border border-transparent hover:bg-sidebar-border/50 hover:text-text-secondary ios-ease'
                      }
                    >
                      <Link to={item.href} className="flex items-center gap-3">
                        <item.icon className={`h-4 w-4 ${active ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary'}`} />
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

      <SidebarFooter className="px-6 pb-8 pt-5 border-t border-sidebar-border">
        <Popover open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className={`w-full group flex items-center gap-3 rounded-xl p-2 text-left ios-ease ${isProfileMenuOpen ? 'bg-white shadow-sm border border-border' : 'hover:bg-white hover:shadow-sm hover:border-border border border-transparent'}`}
            >
              <div className="h-8 w-8 rounded-full bg-surface-elevated flex items-center justify-center text-text-secondary text-xs font-medium">
                KN
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium text-text-primary">Kristoffer Nyvold</p>
                <p className="truncate text-[11px] text-text-tertiary">Studio Manager</p>
              </div>
              <ChevronsUpDown className="h-3 w-3 text-ring flex-shrink-0" />
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
              <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary transition-colors">
                <HelpCircle className="h-3.5 w-3.5 text-text-tertiary" />
                Hjelp & Support
              </button>
              <div className="my-1 border-t border-secondary"></div>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-status-error-bg transition-colors">
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
