import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import type { ReactNode } from 'react'

interface EmailLayoutProps {
  preview: string
  children?: ReactNode
}

// Transactional shell on the app's design system — the pure-neutral
// (chroma 0) ramp from src/index.css converted to email-safe hex:
//   neutral-2 #f9f9f9 (canvas)   neutral-3 #f0f0f0 (muted fill / hairline)
//   neutral-4 #e8e8e8 (block border)   neutral-9 #8e8e8e (subtle text)
//   neutral-11 #717171 (muted text)    neutral-12 #1f1f1f (foreground)
// White card floating on the canvas, hierarchy through spacing and the
// neutral tiers — not weight. Email-safe inline styles only; Outlook
// ignores border-radius and degrades to a square card.
const main = {
  backgroundColor: '#f9f9f9',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '56px 16px 40px',
}

const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e8e8e8',
  borderRadius: '12px',
  padding: '48px 40px 40px',
}

const brand = {
  fontSize: '15px',
  fontWeight: 500,
  color: '#1f1f1f',
  margin: '0 0 40px',
  letterSpacing: '-0.005em',
}

const footer = {
  fontSize: '12px',
  lineHeight: '20px',
  color: '#8e8e8e',
  margin: '28px 0 0',
  textAlign: 'center' as const,
}

const footerLink = {
  color: '#717171',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html lang="nb">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brand}>Openspot</Text>
          {children}
        </Section>
        <Text style={footer}>
          Trenger du hjelp med Openspot? Skriv til{' '}
          <Link href="mailto:hei@framio.no" style={footerLink}>
            hei@framio.no
          </Link>
          .
        </Text>
      </Container>
    </Body>
  </Html>
)

// Shared content styles — imported by individual templates so visual
// language stays consistent across emails.
export const styles = {
  h1: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#1f1f1f',
    letterSpacing: '-0.01em',
    margin: '0 0 20px',
    lineHeight: '28px',
  },
  // Muted context line above the H1 ("Melding fra Lys Yoga · Vinyasa Flow").
  eyebrow: {
    fontSize: '12px',
    color: '#8e8e8e',
    lineHeight: '18px',
    margin: '0 0 8px',
  },
  paragraph: {
    fontSize: '14px',
    color: '#1f1f1f',
    lineHeight: '24px',
    margin: '0 0 16px',
  },
  paragraphMuted: {
    fontSize: '14px',
    color: '#717171',
    lineHeight: '24px',
    margin: '0 0 16px',
  },
  mono: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
} as const

const contentLink = {
  color: '#717171',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}

interface ArrangorContactProps {
  question: string
  studioName: string
  email: string
}

/** Shows the actual contact route instead of relying on email-client reply behavior. */
export const ArrangorContact = ({
  question,
  studioName,
  email,
}: ArrangorContactProps) => (
  <Text style={styles.paragraphMuted}>
    {question} Kontakt {studioName} på{' '}
    <Link href={`mailto:${email}`} style={contentLink}>
      {email}
    </Link>
    .
  </Text>
)

// ————— Detail rows —————
// Two-column key/value rows (label left, value right-aligned), separated
// by spacing and a neutral-3 hairline — the surface → border → muted-text
// → foreground tier ladder, not weight.

const detailBlockStyle = {
  borderTop: '1px solid #e8e8e8',
  borderBottom: '1px solid #e8e8e8',
  margin: '32px 0',
}

const rowLabel = {
  fontSize: '13px',
  color: '#8e8e8e',
  lineHeight: '20px',
  margin: 0,
}

const rowValue = {
  fontSize: '14px',
  color: '#1f1f1f',
  lineHeight: '20px',
  margin: 0,
  textAlign: 'right' as const,
}

const rowValueEmphasis = {
  ...rowValue,
  fontSize: '16px',
  fontWeight: 600,
}

const rowValueStruck = {
  ...rowValue,
  color: '#8e8e8e',
  textDecoration: 'line-through',
}

export interface DetailRowProps {
  label: string
  value: ReactNode
  /** Total-style row — larger, semibold value. */
  emphasis?: boolean
  /** Strike the value (superseded info, e.g. the old session time). */
  struck?: boolean
  /** Suppress the hairline under this row (last row in a block). */
  last?: boolean
}

export const DetailRow = ({ label, value, emphasis, struck, last }: DetailRowProps) => (
  <Row style={{ borderBottom: last ? 'none' : '1px solid #f0f0f0' }}>
    <Column style={{ padding: '16px 0', verticalAlign: 'top', width: '110px' }}>
      <Text style={rowLabel}>{label}</Text>
    </Column>
    <Column style={{ padding: '16px 0', verticalAlign: 'top' }}>
      <Text style={struck ? rowValueStruck : emphasis ? rowValueEmphasis : rowValue}>
        {value}
      </Text>
    </Column>
  </Row>
)

export const DetailBlock = ({ children }: { children: ReactNode }) => (
  <Section style={detailBlockStyle}>{children}</Section>
)
