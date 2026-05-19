import { Heading, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout.tsx'

export interface RefundReceiptProps {
  buyerName: string
  studioName: string
  courseTitle: string
  amount: string
  refundDate: string
  bookingId: string
}

export const RefundReceipt = ({
  buyerName,
  studioName,
  courseTitle,
  amount,
  refundDate,
  bookingId,
}: RefundReceiptProps) => (
  <EmailLayout preview={`Refusjon utbetalt — ${amount}`}>
    <Heading as="h1" style={styles.h1}>
      Refusjon utbetalt
    </Heading>
    <Text style={styles.paragraph}>
      Hei {buyerName}, vi har refundert {amount} for {courseTitle}.
    </Text>
    <Text style={styles.paragraph}>
      Pengene er på vei tilbake til samme betalingsmetode du brukte. Det tar
      normalt 3–5 virkedager før det vises på kontoen din.
    </Text>

    <Section style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Beløp</Text>
      <Text style={styles.detailValue}>{amount}</Text>

      <Text style={styles.detailLabel}>Refundert</Text>
      <Text style={styles.detailValue}>{refundDate}</Text>

      <Text style={styles.detailLabel}>Kurs</Text>
      <Text style={styles.detailValue}>{courseTitle}</Text>

      <Text style={styles.detailLabel}>Studio</Text>
      <Text style={styles.detailValue}>{studioName}</Text>

      <Text style={styles.detailLabel}>Referanse</Text>
      <Text style={styles.detailValueLast}>{bookingId}</Text>
    </Section>
  </EmailLayout>
)

RefundReceipt.PreviewProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
  amount: '1 200 kr',
  refundDate: '17. mai 2026',
  bookingId: 'LY-2829',
} satisfies RefundReceiptProps

export default RefundReceipt
