import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import { DetailBlock, DetailRow, EmailLayout, styles } from './_layout.tsx'

export interface CourseCancelledProps {
  buyerName: string
  studioName: string
  courseTitle: string
  /**
   * Optional pre-formatted money line for this participant's situation, e.g.
   * "Du får 1 200 kr tilbake til kortet du betalte med …". Computed by the
   * caller (cancel-course) — the template stays dumb about payment state.
   */
  refundNote?: string
  /** Set when the email's replyTo routes to the arrangør. */
  arrangorEmail?: string
}

export const CourseCancelled = ({
  buyerName,
  studioName,
  courseTitle,
  refundNote,
  arrangorEmail,
}: CourseCancelledProps) => (
  <EmailLayout preview={`Avlyst: ${courseTitle}`}>
    <Heading as="h1" style={styles.h1}>
      Kurset er avlyst
    </Heading>
    <Text style={styles.paragraph}>
      Hei{buyerName ? ` ${buyerName}` : ''}, {studioName} har dessverre avlyst{' '}
      {courseTitle}. Du trenger ikke å foreta deg noe.
    </Text>

    {refundNote ? <Text style={styles.paragraph}>{refundNote}</Text> : null}

    <DetailBlock>
      <DetailRow label="Kurs" value={courseTitle} />
      <DetailRow label="Arrangør" value={studioName} last />
    </DetailBlock>

    {arrangorEmail ? (
      <Text style={styles.paragraphMuted}>
        Har du spørsmål? Svar på denne e-posten, så når du arrangøren direkte.
      </Text>
    ) : null}
  </EmailLayout>
)

CourseCancelled.PreviewProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
  refundNote:
    'Du får 1 200 kr tilbake til kortet du betalte med. Kvitteringen kommer i en egen e-post.',
  arrangorEmail: 'hei@lysyoga.no',
} satisfies CourseCancelledProps

export default CourseCancelled
