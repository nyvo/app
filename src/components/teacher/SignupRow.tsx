import { Link } from 'react-router-dom';
import { FileText } from '@/lib/icons';
import { cn, formatKroner } from '@/lib/utils';
import { getInitials } from '@/utils/stringUtils';
import { ParticipantActionMenu, type ParticipantActionHandlers } from './ParticipantActionMenu';
import { useSignupDrawer } from '@/contexts/SignupDrawerContext';
import type { SignupDisplay, TicketAudience } from '@/types/database';
import { routes } from '@/lib/routes';

interface SignupRowProps {
  signup: SignupDisplay;
  actionHandlers?: ParticipantActionHandlers;
  /** Hide the course-title link on rows already nested under a per-course group. */
  hideCourse?: boolean;
  /** Called after the drawer triggers a successful mutation (cancel, mark
   *  paid). The page that owns the list should refetch. Optional — if
   *  omitted the drawer still works, the list just won't auto-refresh. */
  onMutate?: () => void;
}

/**
 * Stable warm-monochrome avatar background derived from the participant's
 * name. Eight tones, hashed by name so the same person always gets the same
 * colour across the dashboard.
 */
const AVATAR_TONES = [
  '#6B7280', // slate
  '#4F6CB0', // indigo
  '#A66B4F', // terracotta
  '#5C7E5A', // sage
  '#8B6A8F', // plum
  '#B07B4F', // copper
  '#707070', // gray
  '#6E6E84', // charcoal
] as const;

function avatarToneFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

const AUDIENCE_LABEL: Record<TicketAudience, string> = {
  standard: 'Standard',
  student: 'Student / ufør',
  senior: 'Senior',
  staff: 'Personale',
};

function formatPackageWindow(
  totalWeeks: number | null | undefined,
  startDate: string | null | undefined,
): string | null {
  if (!totalWeeks || totalWeeks <= 0) return null;
  if (!startDate) return totalWeeks === 1 ? '1 uke' : `${totalWeeks} uker`;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return `${totalWeeks} uker`;
  const today = new Date();
  const weeksElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
  if (weeksElapsed < 0) return totalWeeks === 1 ? '1 uke' : `${totalWeeks} uker`;
  const currentWeek = Math.min(weeksElapsed + 1, totalWeeks);
  return `uke ${currentWeek} av ${totalWeeks}`;
}

/**
 * Status pill — fully monochrome. `failed` is the only filled treatment
 * (strongest signal for "this needs you"). `cancelled` keeps a strikethrough
 * since it's the genuinely terminal/voided state.
 */
type PillKind = 'confirmed' | 'pending' | 'failed' | 'refunded' | 'cancelled';

function pillFor(signup: SignupDisplay): { kind: PillKind; label: string } {
  if (signup.status === 'cancelled' || signup.status === 'course_cancelled') {
    if (signup.paymentStatus === 'refunded') return { kind: 'refunded', label: 'Refundert' };
    return { kind: 'cancelled', label: 'Avbestilt' };
  }
  if (signup.paymentStatus === 'failed') return { kind: 'failed', label: 'Betaling feilet' };
  if (signup.paymentStatus === 'pending') return { kind: 'pending', label: 'Venter på betaling' };
  return { kind: 'confirmed', label: 'Påmeldt' };
}

function StatusPill({ kind, label }: { kind: PillKind; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.5]',
        kind === 'failed' && 'bg-foreground text-background',
        kind === 'confirmed' && 'bg-muted text-foreground',
        kind === 'pending' && 'bg-muted text-muted-foreground',
        kind === 'refunded' && 'bg-muted text-muted-foreground',
        kind === 'cancelled' && 'bg-muted text-muted-foreground line-through',
      )}
    >
      {label}
    </span>
  );
}

export function SignupRow({ signup, actionHandlers, hideCourse = false, onMutate }: SignupRowProps) {
  const { open: openDrawer } = useSignupDrawer();
  const isCancelled = signup.status === 'cancelled' || signup.status === 'course_cancelled';
  const isDropIn = signup.ticketKind === 'drop_in';
  const audienceLabel = signup.ticketAudience ? AUDIENCE_LABEL[signup.ticketAudience] : null;

  // Meta middle slot: drop-in shows date+time, packages show weeks.
  const middle = isDropIn
    ? `${signup.classDate}${signup.classTime ? ` · ${signup.classTime}` : ''}`
    : formatPackageWindow(signup.courseTotalWeeks, signup.courseStartDate);

  // Right slot of the meta line: ticket label or audience tier.
  // Drop-in tier label says "Drop-in"; package tiers vary, fall back to audience.
  const ticketTag = isDropIn
    ? 'Drop-in'
    : (audienceLabel ?? signup.ticketLabel ?? 'Standard');

  const pill = pillFor(signup);
  const tone = avatarToneFor(signup.participantName || signup.participantEmail || '?');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openDrawer(signup, { onMutate })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDrawer(signup, { onMutate });
        }
      }}
      aria-label={`Vis detaljer for ${signup.participantName}`}
      className={cn(
        'grid items-center gap-4 px-4 py-3.5 cursor-pointer text-left',
        'grid-cols-[32px_minmax(0,1fr)_32px] md:grid-cols-[32px_minmax(0,1fr)_160px_32px]',
        'transition-colors duration-100',
        'hover:bg-muted/50',
        'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50',
        isCancelled && 'opacity-90',
      )}
    >
      <div
        className="size-8 shrink-0 rounded-full inline-flex items-center justify-center text-white text-[11px] font-semibold tracking-tight"
        style={{ background: tone }}
        aria-label={signup.participantName || signup.participantEmail || 'Bruker'}
      >
        {getInitials(signup.participantName || signup.participantEmail || null)}
      </div>

      {/* Identity cluster */}
      <div className="min-w-0 flex flex-col gap-0.5">
        <p className={cn(
          'text-sm font-medium leading-[1.3] truncate',
          isCancelled ? 'text-muted-foreground' : 'text-foreground',
        )}>
          <span>{signup.participantName}</span>
          {signup.note && (
            <span
              className="ml-1.5 inline-flex items-center align-middle text-muted-foreground"
              title={signup.note}
            >
              <FileText className="size-3" strokeWidth={1.75} />
            </span>
          )}
        </p>
        <p className="text-xs leading-[1.4] text-muted-foreground tabular-nums truncate">
          {!hideCourse && (
            <>
              <Link
                to={routes.course(signup.courseId)}
                className="text-foreground hover:underline decoration-disabled-foreground underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                {signup.className}
              </Link>
              {(middle || ticketTag) && <span className="text-disabled-foreground mx-1.5">·</span>}
            </>
          )}
          {middle && <span>{middle}</span>}
          {middle && ticketTag && <span className="text-disabled-foreground mx-1.5">·</span>}
          {ticketTag && <span>{ticketTag}</span>}
        </p>
        <p className="text-xs leading-[1.4] text-muted-foreground truncate">
          {signup.participantEmail}
        </p>
      </div>

      {/* Status / amount / time-ago — desktop only, vertically centered */}
      <div className="hidden md:flex flex-col items-end justify-center gap-1 self-center">
        <StatusPill kind={pill.kind} label={pill.label} />
        <span className="text-[13px] font-medium text-foreground tabular-nums leading-none">
          {signup.amountPaid != null && signup.amountPaid > 0
            ? formatKroner(signup.amountPaid)
            : 'Gratis'}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums leading-none">
          {signup.registeredAt}
        </span>
      </div>

      {/* Action menu — always visible at the far right. The wrapper stops
          click propagation so opening the dropdown doesn't also open the
          drawer. */}
      <div
        className="flex justify-end"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {actionHandlers ? (
          <ParticipantActionMenu signup={signup} handlers={actionHandlers} />
        ) : (
          <span className="size-8" aria-hidden />
        )}
      </div>
    </div>
  );
}
