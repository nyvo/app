import { Heading, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout.tsx'

export interface SupportMessageProps {
  userId: string
  senderName?: string
  senderEmail: string
  sellerId?: string
  sellerName?: string
  supportSubject: string
  message: string
}

const messageText = {
  ...styles.paragraph,
  whiteSpace: 'pre-wrap',
} as const

export const SupportMessage = ({
  userId,
  senderName,
  senderEmail,
  sellerId,
  sellerName,
  supportSubject,
  message,
}: SupportMessageProps) => (
  <EmailLayout preview={`Ny supportmelding — ${supportSubject}`}>
    <Heading as="h1" style={styles.h1}>
      Ny supportmelding
    </Heading>

    <Section style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Emne</Text>
      <Text style={styles.detailValue}>{supportSubject}</Text>

      <Text style={styles.detailLabel}>Navn</Text>
      <Text style={styles.detailValue}>{senderName || 'Ikke oppgitt'}</Text>

      <Text style={styles.detailLabel}>E-post</Text>
      <Text style={styles.detailValue}>{senderEmail}</Text>

      <Text style={styles.detailLabel}>Svar til</Text>
      <Text style={styles.detailValue}>{senderEmail}</Text>

      <Text style={styles.detailLabel}>Bruker-ID</Text>
      <Text style={styles.detailValue}>{userId}</Text>

      <Text style={styles.detailLabel}>Studio</Text>
      <Text style={sellerId ? styles.detailValue : styles.detailValueLast}>
        {sellerName || 'Ikke oppgitt'}
      </Text>

      {sellerId ? (
        <>
          <Text style={styles.detailLabel}>Studio-ID</Text>
          <Text style={styles.detailValueLast}>{sellerId}</Text>
        </>
      ) : null}
    </Section>

    <Text style={messageText}>{message}</Text>
  </EmailLayout>
)

SupportMessage.PreviewProps = {
  userId: '9d49a3bb-3b4b-4f3b-a2a4-7120c2a31c2f',
  senderName: 'Marte Hansen',
  senderEmail: 'marte@example.com',
  sellerId: '5c7db053-e3ca-4902-8f12-6ded280d5034',
  sellerName: 'Lys Yoga',
  supportSubject: 'Betaling og utbetaling',
  message: 'Hei, jeg får ikke fullført Dintero-oppsettet. Hva bør jeg gjøre?',
} satisfies SupportMessageProps

export default SupportMessage
