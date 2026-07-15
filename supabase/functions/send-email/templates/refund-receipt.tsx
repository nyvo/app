import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import {
  ArrangorContact,
  DetailBlock,
  DetailRow,
  EmailLayout,
  styles,
} from './_layout.tsx'

export interface RefundReceiptProps {
  buyerName: string
  studioName: string
  courseTitle: string
  amount: string
  refundDate: string
  bookingId: string
  /** Pre-formatted org number, e.g. "987 654 321". */
  arrangorOrgNumber?: string
  /** Arrangør address shown as the participant's contact route. */
  arrangorEmail?: string
}

export const RefundReceipt = ({
  buyerName,
  studioName,
  courseTitle,
  amount,
  refundDate,
  bookingId,
  arrangorOrgNumber,
  arrangorEmail,
}: RefundReceiptProps) => (
  <EmailLayout preview={`Refusjon bekreftet — ${amount}`}>
    <Heading as="h1" style={styles.h1}>
      Refusjon bekreftet
    </Heading>
    <Text style={styles.paragraph}>
      Hei{buyerName ? ` ${buyerName}` : ''}, refusjonen på {amount} for {courseTitle} er
      behandlet.
    </Text>
    <Text style={styles.paragraph}>
      Pengene er på vei tilbake til samme betalingsmåte du brukte. Det tar
      normalt 3–5 virkedager før det vises på kontoen din.
    </Text>

    <DetailBlock>
      <DetailRow label="Kurs" value={courseTitle} />
      <DetailRow label="Refundert" value={refundDate} />
      <DetailRow
        label="Arrangør"
        value={
          arrangorOrgNumber ? `${studioName}, org.nr ${arrangorOrgNumber}` : studioName
        }
      />
      <DetailRow label="Referanse" value={bookingId} />
      <DetailRow label="Beløp" value={amount} emphasis last />
    </DetailBlock>

    {arrangorEmail ? (
      <ArrangorContact
        question="Spørsmål om refusjonen?"
        studioName={studioName}
        email={arrangorEmail}
      />
    ) : null}
  </EmailLayout>
)

RefundReceipt.PreviewProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
  amount: '1 200 kr',
  refundDate: '17. mai 2026',
  bookingId: 'LY-2829',
  arrangorOrgNumber: '987 654 321',
  arrangorEmail: 'hei@lysyoga.no',
} satisfies RefundReceiptProps

export default RefundReceipt
