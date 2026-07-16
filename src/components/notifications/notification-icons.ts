import {
  GlyphCardAlert,
  GlyphCardFailed,
  GlyphCardSent,
  GlyphRefund,
  GlyphUserAdd,
  GlyphUsers,
} from './notification-glyphs'
import type { NotificationType } from '@/types/database'

type NotificationGlyph = typeof GlyphUserAdd

/**
 * Type → leading-glyph map. The glyph signals the event class. The panel is
 * all-neutral — there is no per-status tint; the plate carries only the fresh
 * vs dimmed contrast (see NotificationRow).
 */
const ICON_MAP: Partial<Record<NotificationType, NotificationGlyph>> = {
  'booking.created': GlyphUserAdd,
  'booking.waitlist_promoted': GlyphUserAdd,
  'payment.failed': GlyphCardFailed,
  'refund.completed': GlyphRefund,
  'payout.sent': GlyphCardSent,
  'account.action_required': GlyphCardAlert,
  'team.invite_accepted': GlyphUsers,
  'affiliation.joined': GlyphUsers,
}

export function getNotificationIcon(type: string): NotificationGlyph {
  return ICON_MAP[type as NotificationType] ?? GlyphUserAdd
}
