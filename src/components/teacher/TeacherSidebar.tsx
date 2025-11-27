import { useState } from 'react';
import { 
  Flower2, 
  LayoutGrid, 
  Users, 
  MessageCircle, 
  Layers, 
  ChevronUp, 
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
  { icon: LayoutGrid, label: 'Oversikt', href: '/teacher' },
  { icon: Layers, label: 'Kurs', href: '/teacher/courses' },
  // { icon: Calendar, label: 'Timeplan', href: '/teacher/schedule' }, // Removed for MVP
  { icon: Users, label: 'Påmeldinger', href: '/teacher/signups' },
  // { icon: BarChart2, label: 'Statistikk', href: '/teacher/stats' }, // Removed for MVP
  { icon: MessageCircle, label: 'Meldinger', href: '/teacher/messages', badge: 4 },
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
    <Sidebar className="border-r border-[#E7E5E4] bg-[#F7F5F2]">
      <SidebarHeader className="px-4 pt-8 pb-8">
        <div className="flex items-center gap-3 px-4">
          <div className="group flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-[#E7E5E4] text-[#354F41] ios-ease hover:border-[#D6D3D1] hover:shadow-md cursor-default">
            <Flower2 className="h-5 w-5 transition-transform duration-500 group-hover:rotate-45" />
          </div>
          <span className="font-geist text-base font-semibold text-[#292524] tracking-tight select-none">
            ZenStudio
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5 px-4">
              {navigationItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={
                        active
                          ? 'bg-white text-[#292524] shadow-sm ring-1 ring-[#E7E5E4] hover:bg-white hover:text-[#292524]'
                          : 'text-[#78716C] hover:bg-white hover:text-[#292524] hover:shadow-sm hover:ring-1 hover:ring-[#E7E5E4]'
                      }
                    >
                      <Link to={item.href} className="flex items-center gap-3.5 ios-ease">
                        <item.icon className={`h-4.5 w-4.5 ${active ? 'text-[#292524]' : 'text-[#A8A29E]'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#292524] px-1.5 text-[10px] font-bold text-[#F5F5F4]">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Popover open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
          <PopoverTrigger asChild>
            <button 
              className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ios-ease ${isProfileMenuOpen ? 'bg-white shadow-sm ring-1 ring-[#E7E5E4]' : 'hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-[#E7E5E4]'}`}
            >
              <img
                src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                alt="Profile"
                className={`h-9 w-9 rounded-full object-cover ring-1 ring-[#E7E5E4] transition-colors ${isProfileMenuOpen ? 'ring-[#D6D3D1]' : 'group-hover:ring-[#D6D3D1]'}`}
              />
              <div className="flex flex-col overflow-hidden flex-1 text-left">
                <span className="text-sm font-medium text-[#292524] truncate">Elena Fisher</span>
                <span className={`text-xs truncate transition-colors ${isProfileMenuOpen ? 'text-[#57534E]' : 'text-[#78716C] group-hover:text-[#57534E]'}`}>elena@zenstudio.no</span>
              </div>
              <ChevronUp className={`h-4 w-4 text-[#A8A29E] flex-shrink-0 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180 text-[#292524]' : 'group-hover:text-[#292524]'}`} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-[var(--radix-popover-trigger-width)] p-1.5 rounded-2xl border-[#E7E5E4] shadow-xl shadow-[#292524]/5 mb-2">
            <div className="flex flex-col gap-0.5">
                <Link 
                  to="/teacher/profile" 
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[#78716C] hover:bg-[#F7F5F2] hover:text-[#292524] transition-colors"
                >
                    <Settings className="h-4 w-4 text-[#A8A29E] group-hover:text-[#292524]" />
                    Innstillinger
                </Link>
                <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[#78716C] hover:bg-[#F7F5F2] hover:text-[#292524] transition-colors">
                    <HelpCircle className="h-4 w-4 text-[#A8A29E]" />
                    Hjelp & Support
                </button>
                <div className="my-1 border-t border-[#F5F5F4]"></div>
                <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">
                    <LogOut className="h-4 w-4 text-rose-500" />
                    Logg ut
                </button>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarFooter>
    </Sidebar>
  );
};
