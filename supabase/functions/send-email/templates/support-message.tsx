import { Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles } from './_layout.tsx'

export interface SupportMessageProps {
  userId: string
  senderName?: string
  senderEmail: string
  sellerId?: string
  sellerName?: string
  courseId?: string
  courseTitle?: string
  signupId?: string
  participantName?: string
  participantEmail?: string
  signupStatus?: string
  paymentStatus?: string
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
  courseId,
  courseTitle,
  signupId,
  participantName,
  participantEmail,
  signupStatus,
  paymentStatus,
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
          <Text style={courseId ? styles.detailValue : styles.detailValueLast}>{sellerId}</Text>
        </>
      ) : null}

      {courseId ? (
        <>
          <Text style={styles.detailLabel}>Kurs</Text>
          <Text style={styles.detailValue}>{courseTitle || 'Ikke oppgitt'}</Text>

          <Text style={styles.detailLabel}>Kurs-ID</Text>
          <Text style={signupId ? styles.detailValue : styles.detailValueLast}>{courseId}</Text>
        </>
      ) : null}

      {signupId ? (
        <>
          <Text style={styles.detailLabel}>Påmelding</Text>
          <Text style={styles.detailValue}>{participantName || 'Ikke oppgitt'}</Text>

          <Text style={styles.detailLabel}>Deltaker e-post</Text>
          <Text style={styles.detailValue}>{participantEmail || 'Ikke oppgitt'}</Text>

          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>{signupStatus || 'Ikke oppgitt'}</Text>

          <Text style={styles.detailLabel}>Betaling</Text>
          <Text style={styles.detailValue}>{paymentStatus || 'Ikke oppgitt'}</Text>

          <Text style={styles.detailLabel}>Påmelding-ID</Text>
          <Text style={styles.detailValueLast}>{signupId}</Text>
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
  courseId: '3d642fb2-35ca-4e0f-8106-81fa2f5cc50d',
  courseTitle: 'Vinyasa Flow',
  signupId: '8f7b9d44-53f1-4f92-a62f-6ee38a7f5f0a',
  participantName: 'Ola Nordmann',
  participantEmail: 'ola@example.com',
  signupStatus: 'confirmed',
  paymentStatus: 'paid',
  supportSubject: 'Betaling og utbetaling',
  message: 'Hei, jeg får ikke fullført Dintero-oppsettet. Hva bør jeg gjøre?',
} satisfies SupportMessageProps

export default SupportMessage
