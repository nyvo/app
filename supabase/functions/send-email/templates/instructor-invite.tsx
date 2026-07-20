import { Button, Heading, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles } from './_layout.tsx'

export interface InstructorInviteProps {
  studioName: string
  /** Absolute link to /join/:token (built by send-instructor-invite from the
   *  caller's origin, falling back to SITE_URL). */
  acceptUrl: string
}

const button = {
  // Monochrome ink — buttons/chrome stay ink, not azure (brand direction).
  backgroundColor: '#1f1f1f',
  borderRadius: '999px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500,
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '4px 0 8px',
}

export const InstructorInvite = ({ studioName, acceptUrl }: InstructorInviteProps) => (
  <EmailLayout preview={`${studioName} har invitert deg`}>
    <Text style={styles.eyebrow}>{studioName}</Text>
    <Heading as="h1" style={styles.h1}>
      {studioName} har invitert deg
    </Heading>
    <Text style={styles.paragraph}>
      Godtar du invitasjonen, vises de publiserte kursene dine på studiosiden til {studioName}.
    </Text>
    <Text style={styles.paragraphMuted}>
      Har du ikke en kursholderkonto ennå, oppretter du en når du godtar. Invitasjonen er
      gyldig i 30 dager.
    </Text>
    <Button href={acceptUrl} style={button}>
      Godta invitasjonen
    </Button>
  </EmailLayout>
)

InstructorInvite.PreviewProps = {
  studioName: 'Yogahuset',
  acceptUrl: 'https://upnext.no/join/a1b2c3d4e5f6',
} satisfies InstructorInviteProps

export default InstructorInvite
