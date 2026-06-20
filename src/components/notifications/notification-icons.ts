import {
  CreditCard,
  RefreshCw,
  User,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from '@/lib/icons'
import type { NotificationType } from '@/types/database'

/**
 * Type → leading-glyph map. The glyph signals the event class; the plate
 * tint (see STATUS_MAP) signals severity.
 */
const ICON_MAP: Partial<Record<NotificationType, LucideIcon>> = {
  'booking.created': User,
  'booking.waitlist_promoted': UserPlus,
  'payment.failed': CreditCard,
  'refund.completed': RefreshCw,
  'payout.sent': Wallet,
  'team.invite_accepted': Users,
  'affiliation.joined': UserPlus,
}

export function getNotificationIcon(type: string): LucideIcon {
  return ICON_MAP[type as NotificationType] ?? User
}

/**
 * Type → status tint for the icon plate. Carried by the `--success/-subtle`,
 * `--warning/-subtle`, `--danger/-subtle` token pairs; `neutral` keeps the
 * plain muted plate. Row text stays single-color per line — only the plate
 * carries hue. Read rows drain this back to neutral (see NotificationRow).
 */
export type NotificationStatus = 'success' | 'warning' | 'danger' | 'neutral'

const STATUS_MAP: Partial<Record<NotificationType, NotificationStatus>> = {
  'booking.created': 'success',
  'booking.waitlist_promoted': 'success',
  'payment.failed': 'danger',
  'refund.completed': 'neutral',
  'payout.sent': 'success',
  'team.invite_accepted': 'neutral',
  'affiliation.joined': 'neutral',
}

export function getNotificationStatus(type: string): NotificationStatus {
  return STATUS_MAP[type as NotificationType] ?? 'neutral'
}
