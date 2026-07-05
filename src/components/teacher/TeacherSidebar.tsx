import { useEffect } from 'react';
import { ChevronsUpDown } from '@/lib/icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  DashboardSquare02Icon,
  Calendar03Icon,
  Folder01Icon,
  Home01Icon,
  CreditCardIcon,
  UserCircleIcon,
  Settings01Icon,
  HelpCircleIcon,
  Logout03Icon,
} from '@hugeicons/core-free-icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isProSeller } from '@/lib/payments';
import { routes } from '@/lib/routes';
import { accountDisplayName, formatKroner } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

// Seller sidebar — single-level items: home, schedule, courses, the
// storefront (Studio — Samarbeid lives there as a section), payouts.
// Personal account settings (Innstillinger) live in the footer account
// menu, not here — they're low-frequency and belong under the user's
// identity. No nested groups.
const SELLER_NAV_ITEMS: NavItem[] = [
  { icon: DashboardSquare02Icon, label: 'Oversikt', href: routes.dashboard },
  { icon: Calendar03Icon, label: 'Timeplan', href: routes.schedule },
  { icon: Folder01Icon, label: 'Kurs', href: routes.courses },
  { icon: Home01Icon, label: 'Studio', href: routes.studio },
  { icon: CreditCardIcon, label: 'Utbetalingskonto', href: routes.settingsPayouts },
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
  const isSeller = profile?.role === 'seller';
  const isPro = isProSeller(currentSeller);
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
          className="flex h-12 items-center rounded-md px-3 text-base font-medium text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
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
        {/* Free sellers get the upsell card; Pro folds plan + billing into the
            account menu below (no standalone card → no doubled bottom cards). */}
        {isSeller && !isPro && (
          <div className="rounded-lg bg-muted px-3 py-2.5">
            <div className="text-sm font-medium text-sidebar-foreground">Start</div>
            <p className="mt-1 text-sm text-sidebar-foreground-muted">
              Med Pro betaler du {formatKroner(0)} i plattformgebyr.
            </p>
            <Button asChild className="mt-2.5 w-full">
              <Link to={routes.settingsBilling}>Oppgrader til Pro</Link>
            </Button>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-1.5 text-sidebar-foreground-muted hover:bg-sidebar-accent hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground">
                  <div className="grid flex-1 min-w-0 text-left leading-tight">
                    <span className="truncate text-sidebar-foreground">{displayName || 'Konto'}</span>
                    {isPro && <span className="text-xs">Pro</span>}
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
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
                        {isPro ? 'Pro' : 'Start'}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isSeller && (
                  <DropdownMenuItem asChild>
                    <Link to={routes.settingsBilling}>
                      <HugeiconsIcon icon={CreditCardIcon} size={16} strokeWidth={1.75} />
                      Abonnement
                    </Link>
                  </DropdownMenuItem>
                )}
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
