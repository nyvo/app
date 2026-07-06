import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import { DetailBlock, DetailRow, EmailLayout, styles } from './_layout.tsx'

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

    <DetailBlock>
      <DetailRow label="Ny tid" value={`${newDate} kl. ${newTime}`} emphasis />
      <DetailRow
        label="Tidligere tid"
        value={`${oldDate} kl. ${oldTime}`}
        struck
        last={!courseLocation}
      />
      {courseLocation ? <DetailRow label="Sted" value={courseLocation} last /> : null}
    </DetailBlock>

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
