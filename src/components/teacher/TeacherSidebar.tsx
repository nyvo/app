import { useEffect, useMemo, useState } from 'react';
import {
  Leaf,
  Home,
  CalendarDays,
  Calendar,
  CalendarPlus,
  Building,
  Settings,
  HelpCircle,
  LogOut,
  ChevronsUpDown,
  ChevronRight,
  PanelLeft,
} from '@/lib/icons';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/lib/routes';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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

// ---------------------------------------------------------------------------
// Nav model
//
// Two kinds of items:
//   - leaf:  a direct route. Click to navigate.
//   - group: a parent that owns 1..n leaves. Click to expand/collapse (does
//            NOT navigate). When the sidebar is in icon-only collapsed mode,
//            the children can't be shown, so a parent click navigates to its
//            first child instead — that way every visible icon is reachable.
//
// Only items whose routes actually exist are included. Future sections
// (Oppgjør, Samarbeid, Bedriftsinfo, Varslinger, Passord & sikkerhet) are
// intentionally omitted to avoid dead links; add them as you build the pages.
// ---------------------------------------------------------------------------

type LeafItem = { kind: 'leaf'; icon: LucideIcon; label: string; href: string };
type GroupItem = {
  kind: 'group';
  icon: LucideIcon;
  label: string;
  key: string;
  children: { label: string; href: string }[];
};
type NavItem = LeafItem | GroupItem;

const NAV_ITEMS: NavItem[] = [
  { kind: 'leaf', icon: Home, label: 'Hjem', href: routes.dashboard },
  { kind: 'leaf', icon: CalendarDays, label: 'Timeplan', href: routes.schedule },
  {
    kind: 'group',
    icon: Calendar,
    label: 'Kurs',
    key: 'kurs',
    children: [
      { label: 'Alle kurs', href: routes.courses },
      { label: 'Påmeldinger', href: routes.signups },
    ],
  },
  // Studio is a single leaf for now. Becomes a group again once the
  // affiliations UI ships (Min studio + Samarbeid). Locations live as a
  // section inside the Studio page itself.
  { kind: 'leaf', icon: Building, label: 'Studio', href: routes.studio },
  {
    kind: 'group',
    icon: Settings,
    label: 'Innstillinger',
    key: 'innstillinger',
    children: [
      { label: 'Profil', href: routes.settingsProfile },
      { label: 'Betalingskonto', href: routes.settingsPayouts },
    ],
  },
];

/** Returns true if the given href matches the current pathname (exact for
 *  dashboard root, prefix-based for everything else). */
function isPathActive(pathname: string, href: string): boolean {
  if (href === routes.dashboard) {
    return pathname === routes.dashboard || pathname === `${routes.dashboard}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Find the group whose children contain the current path, if any. */
function findActiveGroupKey(pathname: string): string | null {
  for (const item of NAV_ITEMS) {
    if (item.kind === 'group') {
      if (item.children.some((c) => isPathActive(pathname, c.href))) {
        return item.key;
      }
    }
  }
  return null;
}

export const TeacherSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, userRole, currentSeller } = useAuth();
  const { isMobile, toggleSidebar, setOpenMobile, state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Which group sections are expanded. Auto-expanded on mount based on the
  // current route; manual toggles are remembered for the rest of the session.
  // We don't persist to localStorage — keeps the sidebar predictable on
  // refresh and avoids stale state when nav structure changes.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const active = findActiveGroupKey(location.pathname);
    return new Set(active ? [active] : []);
  });

  // Auto-expand the matching group when the user navigates *into* a section
  // they had collapsed. Doesn't collapse anything — manual expansions stick.
  useEffect(() => {
    const active = findActiveGroupKey(location.pathname);
    if (active) {
      setExpandedGroups((prev) => (prev.has(active) ? prev : new Set([...prev, active])));
    }
  }, [location.pathname]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarToggleLabel = isCollapsed ? 'Vis sidemeny' : 'Skjul sidemeny';

  /** Toggle a group's expanded state. */
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** True if any leaf inside a group is the current route. */
  const isGroupActive = useMemo(() => {
    const active = findActiveGroupKey(location.pathname);
    return (key: string) => active === key;
  }, [location.pathname]);

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
                  <Link to={routes.dashboard}>
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
                isActive={location.pathname === routes.newCourse}
                className="h-9 justify-center bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground active:bg-primary/80 active:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
              >
                <Link to={routes.newCourse}>
                  <CalendarPlus />
                  <span>Opprett kurs</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                if (item.kind === 'leaf') {
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={isPathActive(location.pathname, item.href)}
                        tooltip={item.label}
                      >
                        <Link to={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Group item — clickable parent that toggles expand. In
                // collapsed-icon mode the children aren't visible, so we
                // navigate to the first child instead so the icon row stays
                // useful.
                const isExpanded = expandedGroups.has(item.key);
                const sectionActive = isGroupActive(item.key);
                const firstChildHref = item.children[0]?.href;

                return (
                  <SidebarMenuItem key={item.key}>
                    {isCollapsed ? (
                      <SidebarMenuButton
                        asChild
                        isActive={sectionActive}
                        tooltip={item.label}
                      >
                        <Link to={firstChildHref ?? '#'}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        type="button"
                        onClick={() => toggleGroup(item.key)}
                        isActive={sectionActive && !isExpanded}
                        aria-expanded={isExpanded}
                        aria-controls={`nav-group-${item.key}`}
                        tooltip={item.label}
                      >
                        <item.icon />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronRight
                          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </SidebarMenuButton>
                    )}

                    {!isCollapsed && isExpanded && (
                      <SidebarMenuSub id={`nav-group-${item.key}`}>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isPathActive(location.pathname, child.href)}
                            >
                              <Link to={child.href}>
                                <span>{child.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
                    <span className="text-sm font-medium truncate text-foreground">{profile?.name || currentSeller?.name || 'Konto'}</span>
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
                      <span className="text-sm font-medium truncate text-foreground">{profile?.name || currentSeller?.name}</span>
                      <span className="text-xs truncate text-muted-foreground">{profile?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
