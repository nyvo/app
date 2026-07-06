import { Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { DetailBlock, DetailRow, EmailLayout, styles } from './_layout.tsx'

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

// Internal email (support inbox) — function over form. The user's message
// sits in a quoted block; lookup ids collect in a compact mono list at the
// bottom for copy-paste into the dashboard.
const quoteBlock = {
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 28px',
}

const quoteText = {
  ...styles.paragraph,
  whiteSpace: 'pre-wrap',
  margin: 0,
} as const

const idLine = {
  ...styles.mono,
  fontSize: '12px',
  lineHeight: '20px',
  color: '#8e8e8e',
  margin: 0,
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
    <Text style={styles.eyebrow}>
      Fra {senderName || senderEmail} · svar går til {senderEmail}
    </Text>
    <Heading as="h1" style={styles.h1}>
      {supportSubject}
    </Heading>

    <Section style={quoteBlock}>
      <Text style={quoteText}>{message}</Text>
    </Section>

    <DetailBlock>
      <DetailRow label="Navn" value={senderName || 'Ikke oppgitt'} />
      <DetailRow label="E-post" value={senderEmail} />
      <DetailRow
        label="Studio"
        value={sellerName || 'Ikke oppgitt'}
        last={!courseId && !signupId}
      />
      {courseId ? (
        <DetailRow label="Kurs" value={courseTitle || 'Ikke oppgitt'} last={!signupId} />
      ) : null}
      {signupId ? (
        <>
          <DetailRow label="Påmelding" value={participantName || 'Ikke oppgitt'} />
          <DetailRow label="Deltaker e-post" value={participantEmail || 'Ikke oppgitt'} />
          <DetailRow label="Status" value={signupStatus || 'Ikke oppgitt'} />
          <DetailRow label="Betaling" value={paymentStatus || 'Ikke oppgitt'} last />
        </>
      ) : null}
    </DetailBlock>

    <Text style={idLine}>bruker {userId}</Text>
    {sellerId ? <Text style={idLine}>studio {sellerId}</Text> : null}
    {courseId ? <Text style={idLine}>kurs {courseId}</Text> : null}
    {signupId ? <Text style={idLine}>påmelding {signupId}</Text> : null}
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
  message: 'Hei, jeg får ikke fullført utbetalingsoppsettet. Hva bør jeg gjøre?',
} satisfies SupportMessageProps

export default SupportMessage
