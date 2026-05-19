import { Heading, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout.tsx'

export interface OrderConfirmProps {
  buyerName: string
  studioName: string
  courseTitle: string
  courseStart: string
  courseLocation?: string
  amount: string
  bookingId: string
}

export const OrderConfirm = ({
  buyerName,
  studioName,
  courseTitle,
  courseStart,
  courseLocation,
  amount,
  bookingId,
}: OrderConfirmProps) => (
  <EmailLayout preview={`Påmelding bekreftet — ${courseTitle}`}>
    <Heading as="h1" style={styles.h1}>
      Du er påmeldt
    </Heading>
    <Text style={styles.paragraph}>
      Hei {buyerName}, takk for påmeldingen til {courseTitle} hos {studioName}.
    </Text>

    <Section style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Kurs</Text>
      <Text style={styles.detailValue}>{courseTitle}</Text>

      <Text style={styles.detailLabel}>Tid</Text>
      <Text style={styles.detailValue}>{courseStart}</Text>

      {courseLocation ? (
        <>
          <Text style={styles.detailLabel}>Sted</Text>
          <Text style={styles.detailValue}>{courseLocation}</Text>
        </>
      ) : null}

      <Text style={styles.detailLabel}>Beløp</Text>
      <Text style={styles.detailValue}>{amount}</Text>

      <Text style={styles.detailLabel}>Referanse</Text>
      <Text style={styles.detailValueLast}>{bookingId}</Text>
    </Section>

    <Text style={styles.paragraphMuted}>
      Vi sender en påminnelse dagen før kurset starter.
    </Text>
  </EmailLayout>
)

OrderConfirm.PreviewProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
  courseStart: 'onsdag 28. mai kl. 18:00',
  courseLocation: 'Sal 1, Storgata 14, Oslo',
  amount: '1 200 kr',
  bookingId: 'LY-2829',
} satisfies OrderConfirmProps

export default OrderConfirm
