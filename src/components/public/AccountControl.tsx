import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, Ticket } from '@/lib/icons';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type AccountControlStyle = 'named' | 'avatar';

interface AccountControlProps {
  /** Logged-in trigger treatment. Default 'named' — buyers have no avatar
   * photo (no `profiles.avatar_url`), so a bare neutral silhouette reads as a
   * placeholder; the first name carries identity. */
  style?: AccountControlStyle;
}

/**
 * Discreet buyer-account affordance for the public storefront / course /
 * checkout headers. Logged out → a quiet "Logg inn" pill carrying
 * `intent=buyer` + a `next` back to the current page (the buyer's missing front
 * door — see App.tsx RootRoute). Logged in → avatar menu (Mine påmeldinger /
 * Profil / Logg ut). Never gates a guest.
 *
 * Style grounded in real references: bordered "Logg inn" pill (Preply,
 * Brilliant); clean white profile-card menu (Preply, Fibery, Dovetail).
 */
export function AccountControl({ style = 'named' }: AccountControlProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // DEV-only preview override (?account=in|out & ?accountStyle=named|avatar) so
  // the real pages can be screenshotted in either state without a live session.
  // Guarded by import.meta.env.DEV → stripped from production builds.
  const demo = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
  const forced = demo?.get('account');
  const resolvedStyle = (demo?.get('accountStyle') as AccountControlStyle | null) ?? style;

  const isAuthed = forced ? forced === 'in' : !!user;
  const isDemoUser = forced === 'in' && !user;
  const displayName = (isDemoUser ? 'Ingrid Hansen' : profile?.name ?? user?.email) ?? 'Konto';
  const email = (isDemoUser ? 'ingrid@example.com' : profile?.email ?? user?.email) ?? '';
  const firstName = displayName.trim().split(/\s+/)[0];

  const next = `${location.pathname}${location.search}`;
  const loginHref = `/auth?intent=buyer&next=${encodeURIComponent(next)}`;

  if (!isAuthed) {
    return (
      <Link
        to={loginHref}
        className="group inline-flex h-9 select-none items-center gap-1.5 rounded-full border border-border bg-surface pl-2.5 pr-3.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px"
      >
        <User className="size-4 text-foreground-muted transition-colors group-hover:text-foreground" strokeWidth={1.75} />
        Logg inn
      </Link>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {resolvedStyle === 'avatar' ? (
          <button
            type="button"
            aria-label="Kontomeny"
            className="group rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <UserAvatar
              size="sm"
              name={displayName}
              ringClassName="ring-1 ring-border transition-[box-shadow] group-hover:ring-border-strong group-aria-expanded:ring-border-strong"
            />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Kontomeny"
            className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-0.5 pr-3.5 shadow-xs outline-none transition-colors hover:border-border-strong hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-expanded:border-border-strong aria-expanded:bg-muted"
          >
            <UserAvatar size="sm" name={displayName} />
            <span className="max-w-[14ch] truncate pl-0.5 text-sm font-medium text-foreground">{firstName}</span>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-border px-3 py-3">
          <UserAvatar size="md" name={displayName} ringClassName="ring-1 ring-border" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            {email && <p className="truncate text-xs text-foreground-muted">{email}</p>}
          </div>
        </div>
        <div className="p-1">
          <DropdownMenuItem asChild className="gap-2.5 py-2">
            <Link to="/overview">
              <Ticket className="size-4 text-primary" strokeWidth={1.75} />
              <span className="font-medium">Mine påmeldinger</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="gap-2.5 py-2">
            <Link to="/settings/profile">
              <User className="size-4 text-foreground-muted" strokeWidth={1.75} />
              Profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSignOut} className="gap-2.5 py-2">
            <LogOut className="size-4 text-foreground-muted" strokeWidth={1.75} />
            Logg ut
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
