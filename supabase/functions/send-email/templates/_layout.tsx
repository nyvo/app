import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import type { ReactNode } from 'react'

interface EmailLayoutProps {
  preview: string
  children?: ReactNode
}

// Studio-style transactional shell — calm, monochrome, sentence case.
// Email-safe inline styles only; no Tailwind, no shared CSS.
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '48px 24px 24px',
}

const brand = {
  fontSize: '15px',
  fontWeight: 500,
  color: '#191917',
  margin: '0 0 40px',
  letterSpacing: '-0.005em',
}

const hr = {
  border: 'none',
  borderTop: '1px solid #e6e3df',
  margin: '40px 0 24px',
}

const footer = {
  fontSize: '12px',
  lineHeight: '20px',
  color: '#8c8780',
  margin: 0,
}

const footerLink = {
  color: '#191917',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html lang="nb">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Openspot</Text>
        {children}
        <Hr style={hr} />
        <Section>
          <Text style={footer}>
            Spørsmål? Skriv til{' '}
            <Link href="mailto:hei@openspot.no" style={footerLink}>
              hei@openspot.no
            </Link>
            .
          </Text>
        </Section>
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
    color: '#191917',
    letterSpacing: '-0.01em',
    margin: '0 0 16px',
    lineHeight: '28px',
  },
  paragraph: {
    fontSize: '14px',
    color: '#191917',
    lineHeight: '22px',
    margin: '0 0 16px',
  },
  paragraphMuted: {
    fontSize: '14px',
    color: '#605c54',
    lineHeight: '22px',
    margin: '0 0 16px',
  },
  detailBlock: {
    borderTop: '1px solid #e6e3df',
    borderBottom: '1px solid #e6e3df',
    padding: '20px 0',
    margin: '24px 0',
  },
  detailLabel: {
    color: '#8c8780',
    fontSize: '12px',
    margin: '0 0 4px',
    lineHeight: '18px',
  },
  detailValue: {
    color: '#191917',
    fontSize: '14px',
    margin: '0 0 16px',
    lineHeight: '20px',
  },
  detailValueLast: {
    color: '#191917',
    fontSize: '14px',
    margin: 0,
    lineHeight: '20px',
  },
} as const
