import { Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles } from './_layout.tsx'

export interface BookingNotificationProps {
  buyerName: string
  courseTitle: string
  courseStart: string
  /** Pre-formatted via formatKroner, e.g. "1 200 kr" — or "Gratis" for free signups */
  amount: string
  bookingId: string
  buyerEmail?: string
}

export const BookingNotification = ({
  buyerName,
  courseTitle,
  courseStart,
  amount,
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

    <Section style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Deltaker</Text>
      <Text style={styles.detailValue}>{buyerName}</Text>

      {buyerEmail ? (
        <>
          <Text style={styles.detailLabel}>E-post</Text>
          <Text style={styles.detailValue}>{buyerEmail}</Text>
        </>
      ) : null}

      <Text style={styles.detailLabel}>Kurs</Text>
      <Text style={styles.detailValue}>{courseTitle}</Text>

      <Text style={styles.detailLabel}>Tid</Text>
      <Text style={styles.detailValue}>{courseStart}</Text>

      <Text style={styles.detailLabel}>Beløp</Text>
      <Text style={styles.detailValue}>{amount}</Text>

      <Text style={styles.detailLabel}>Referanse</Text>
      <Text style={styles.detailValueLast}>{bookingId}</Text>
    </Section>

    <Text style={styles.paragraphMuted}>
      Du finner deltakerlisten under kurset på Openspot.
    </Text>
  </EmailLayout>
)

BookingNotification.PreviewProps = {
  buyerName: 'Marte Hansen',
  courseTitle: 'Vinyasa Flow — onsdager',
  courseStart: 'onsdag 28. mai kl. 18:00',
  amount: '1 200 kr',
  bookingId: 'LY-2829',
  buyerEmail: 'marte@example.no',
} satisfies BookingNotificationProps

export default BookingNotification
