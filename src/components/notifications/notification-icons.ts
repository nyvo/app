import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  RefreshCw,
  User,
  UserPlus,
  Users,
  Wallet,
  XCircle,
  type LucideIcon,
} from '@/lib/icons'
import type { NotificationType } from '@/types/database'

/**
 * Type → leading-glyph map. All icons render in a uniform neutral plate
 * (no per-type color); the glyph itself signals the event class. Severity
 * is communicated structurally (Krever handling group, amber bell dot),
 * never via color on the row.
 */
const ICON_MAP: Record<NotificationType, LucideIcon> = {
  'booking.created': User,
  'booking.waitlist_promoted': UserPlus,
  'payment.failed': CreditCard,
  'refund.completed': RefreshCw,
  'payout.sent': Wallet,
  'dintero_seller.action_required': AlertTriangle,
  'dintero_seller.approved': CheckCircle,
  'dintero_seller.rejected': XCircle,
  'team.invite_accepted': Users,
}

export function getNotificationIcon(type: string): LucideIcon {
  return ICON_MAP[type as NotificationType] ?? User
}
