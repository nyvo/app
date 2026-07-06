import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import { DetailBlock, DetailRow, EmailLayout, styles } from './_layout.tsx'

export interface ClassReminderProps {
  buyerName: string
  studioName: string
  courseTitle: string
  courseStart: string
  courseLocation?: string
}

export const ClassReminder = ({
  buyerName,
  studioName,
  courseTitle,
  courseStart,
  courseLocation,
}: ClassReminderProps) => (
  <EmailLayout preview={`Påminnelse: ${courseTitle} starter snart`}>
    <Heading as="h1" style={styles.h1}>
      Snart er det kurs
    </Heading>
    <Text style={styles.paragraph}>
      Hei {buyerName}, en liten påminnelse om {courseTitle} hos {studioName}.
    </Text>

    <DetailBlock>
      <DetailRow label="Tid" value={courseStart} last={!courseLocation} />
      {courseLocation ? <DetailRow label="Sted" value={courseLocation} last /> : null}
    </DetailBlock>

    <Text style={styles.paragraphMuted}>Vi gleder oss til å se deg.</Text>
  </EmailLayout>
)

ClassReminder.PreviewProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
  courseStart: 'i morgen, onsdag 28. mai kl. 18:00',
  courseLocation: 'Sal 1, Storgata 14, Oslo',
} satisfies ClassReminderProps

export default ClassReminder
