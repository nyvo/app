import { Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles } from './_layout.tsx'

export interface SessionRescheduledProps {
  buyerName: string
  studioName: string
  courseTitle: string
  /** Original session date pre-formatted, e.g. "onsdag 21. mai" */
  oldDate: string
  /** Original session start time pre-formatted, e.g. "18:00" */
  oldTime: string
  /** New session date pre-formatted */
  newDate: string
  /** New session start time pre-formatted */
  newTime: string
  courseLocation?: string
}

const struckLabel = {
  ...styles.detailValue,
  color: '#8c8780',
  textDecoration: 'line-through',
} as const

export const SessionRescheduled = ({
  buyerName,
  studioName,
  courseTitle,
  oldDate,
  oldTime,
  newDate,
  newTime,
  courseLocation,
}: SessionRescheduledProps) => (
  <EmailLayout preview={`Ny tid for ${courseTitle} — ${newDate} kl. ${newTime}`}>
    <Heading as="h1" style={styles.h1}>
      En time har fått ny tid
    </Heading>
    <Text style={styles.paragraph}>
      Hei {buyerName}, vi har flyttet en time i {courseTitle} hos {studioName}.
    </Text>

    <Section style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Ny tid</Text>
      <Text style={styles.detailValue}>{newDate} kl. {newTime}</Text>

      <Text style={styles.detailLabel}>Tidligere tid</Text>
      <Text style={courseLocation ? struckLabel : { ...struckLabel, margin: 0 }}>
        {oldDate} kl. {oldTime}
      </Text>

      {courseLocation ? (
        <>
          <Text style={styles.detailLabel}>Sted</Text>
          <Text style={styles.detailValueLast}>{courseLocation}</Text>
        </>
      ) : null}
    </Section>

    <Text style={styles.paragraphMuted}>
      Resten av kurset står som planlagt.
    </Text>
  </EmailLayout>
)

SessionRescheduled.PreviewProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
  oldDate: 'onsdag 21. mai',
  oldTime: '18:00',
  newDate: 'torsdag 22. mai',
  newTime: '18:00',
  courseLocation: 'Sal 1, Storgata 14, Oslo',
} satisfies SessionRescheduledProps

export default SessionRescheduled
