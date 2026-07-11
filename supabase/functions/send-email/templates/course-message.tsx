import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles } from './_layout.tsx'

export interface CourseMessageProps {
  buyerName: string
  studioName: string
  courseTitle: string
  /** Subject line — also used as the email's H1 inside the body. */
  subject: string
  /** Plain-text body. Newlines preserved via pre-wrap. */
  body: string
}

const bodyText = {
  ...styles.paragraph,
  whiteSpace: 'pre-wrap',
} as const

export const CourseMessage = ({
  buyerName,
  studioName,
  courseTitle,
  subject,
  body,
}: CourseMessageProps) => (
  <EmailLayout preview={subject}>
    <Text style={styles.eyebrow}>
      Melding fra {studioName} – {courseTitle}
    </Text>
    <Heading as="h1" style={styles.h1}>
      {subject}
    </Heading>
    <Text style={bodyText}>
      {`Hei ${buyerName},\n\n${body}`}
    </Text>
  </EmailLayout>
)

CourseMessage.PreviewProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
  subject: 'Husk å ta med matte',
  body: 'Vi har dessverre færre lånematter denne uka. Ta med din egen hvis du har en.\n\nVi sees onsdag!',
} satisfies CourseMessageProps

export default CourseMessage
