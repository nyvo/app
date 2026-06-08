import { useEffect } from 'react';
import { ChevronsUpDown } from '@/lib/icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  Calendar03Icon,
  BookOpen02Icon,
  Building03Icon,
  UserGroupIcon,
  CreditCardIcon,
  UserCircleIcon,
  Settings01Icon,
  HelpCircleIcon,
  Logout03Icon,
} from '@hugeicons/core-free-icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/lib/routes';
import { accountDisplayName } from '@/lib/utils';
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
import { SidebarSetupCard } from '@/components/teacher/SidebarSetupCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type IconRef = typeof Home01Icon;

interface NavItem {
  icon: IconRef;
  label: string;
  href: string;
}

// Seller sidebar — 6 single-level items: home, schedule, courses, the
// storefront (Studio), team (Samarbeid), payouts. Personal account settings
// (Innstillinger) live in the footer account menu, not here — they're
// low-frequency and belong under the user's identity. No nested groups.
const SELLER_NAV_ITEMS: NavItem[] = [
  { icon: Home01Icon, label: 'Hjem', href: routes.dashboard },
  { icon: Calendar03Icon, label: 'Timeplan', href: routes.schedule },
  { icon: BookOpen02Icon, label: 'Kurs', href: routes.courses },
  { icon: Building03Icon, label: 'Studio', href: routes.studio },
  { icon: UserGroupIcon, label: 'Samarbeid', href: routes.collaboration },
  { icon: CreditCardIcon, label: 'Betalingskonto', href: routes.settingsPayouts },
];

// Buyer sidebar — minimal. Until the buyer dashboard build-out (deferred
// per post-mvp-feedback §12), just Oversikt + the profile/logout card in
// the footer. Same shell, different surface.
const BUYER_NAV_ITEMS: NavItem[] = [
  { icon: Home01Icon, label: 'Oversikt', href: routes.dashboard },
];

function isPathActive(pathname: string, href: string): boolean {
  if (href === routes.dashboard) {
    return pathname === routes.dashboard || pathname === `${routes.dashboard}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const TeacherSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, currentSeller } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const navItems = profile?.role === 'buyer' ? BUYER_NAV_ITEMS : SELLER_NAV_ITEMS;
  const displayName = accountDisplayName({
    profileName: profile?.name,
    sellerName: currentSeller?.name,
    email: profile?.email,
  });

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar aria-label="Instruktørnavigasjon">
      <SidebarHeader>
        <Link
          to={routes.dashboard}
          className="flex h-12 items-center rounded-md px-3 text-base font-medium tracking-tight text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Openspot
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isPathActive(location.pathname, item.href)}
                    tooltip={item.label}
                  >
                    <Link to={item.href}>
                      <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            {profile?.role === 'seller' && <SidebarSetupCard />}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="text-sidebar-foreground-muted hover:bg-sidebar-accent hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground">
                  <span className="flex-1 truncate">{displayName || 'Konto'}</span>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-start gap-2.5">
                    <HugeiconsIcon
                      icon={UserCircleIcon}
                      size={18}
                      strokeWidth={1.75}
                      className="text-foreground-muted shrink-0 mt-px"
                    />
                    <div className="grid flex-1 leading-tight">
                      <span className="text-sm font-medium truncate text-foreground">
                        {displayName}
                      </span>
                      <span className="text-sm truncate text-foreground-muted">
                        {profile?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={routes.settingsProfile}>
                    <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.75} />
                    Innstillinger
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={routes.help}>
                    <HugeiconsIcon icon={HelpCircleIcon} size={16} strokeWidth={1.75} />
                    Hjelp
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <HugeiconsIcon icon={Logout03Icon} size={16} strokeWidth={1.75} />
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
