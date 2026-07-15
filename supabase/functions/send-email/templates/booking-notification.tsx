import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import { DetailBlock, DetailRow, EmailLayout, styles } from './_layout.tsx'

export interface BookingNotificationProps {
  buyerName: string
  courseTitle: string
  courseStart: string
  /** The studio's payout — what actually lands in their account, net of the
   * platform fee. Pre-formatted via formatKroner, e.g. "1 200 kr" — or
   * "Gratis" for free signups. The buyer's service fee is intentionally not
   * shown to the seller (it's the buyer's line, not the studio's). */
  payout: string
  /** Platform fee deducted from the payout, pre-formatted (e.g. "0,5 kr").
   * Set only for free-tier studios that actually paid one; omitted for Pro. */
  platformFee?: string
  /** Honor-discount claim, e.g. "Student (−20 %)" — set only when the buyer
   * claimed one. Verification is the seller's responsibility, so the row
   * doubles as the "check ID at the door" flag. */
  discount?: string
  bookingId: string
  buyerEmail?: string
}

export const BookingNotification = ({
  buyerName,
  courseTitle,
  courseStart,
  payout,
  platformFee,
  discount,
  bookingId,
  buyerEmail,
}: BookingNotificationProps) => (
  <EmailLayout preview={`Ny påmelding — ${courseTitle}`}>
    <Heading as="h1" style={styles.h1}>
      Ny påmelding
    </Heading>
    <Text style={styles.paragraph}>
      {buyerName} har meldt seg på {courseTitle}.
    </Text>

    <DetailBlock>
      <DetailRow label="Deltaker" value={buyerName} />
      {buyerEmail ? <DetailRow label="E-post" value={buyerEmail} /> : null}
      <DetailRow label="Kurs" value={courseTitle} />
      <DetailRow label="Tid" value={courseStart} />
      <DetailRow label="Referanse" value={bookingId} />
      {discount ? <DetailRow label="Rabatt" value={discount} /> : null}
      {platformFee ? <DetailRow label="Plattformgebyr" value={`−${platformFee}`} /> : null}
      <DetailRow label="Din utbetaling" value={payout} emphasis last />
    </DetailBlock>

    <Text style={styles.paragraphMuted}>
      Du finner deltakerlisten under kurset på Openspot.
    </Text>
  </EmailLayout>
)

BookingNotification.PreviewProps = {
  buyerName: 'Marte Hansen',
  courseTitle: 'Vinyasa Flow — onsdager',
  courseStart: 'onsdag 28. mai kl. 18:00',
  payout: '1 140 kr',
  platformFee: '60 kr',
  discount: 'Student (−20 %)',
  bookingId: 'LY-2829',
  buyerEmail: 'marte@example.no',
} satisfies BookingNotificationProps

export default BookingNotification
