/*
 * Glyphs from the Hugeicons free set (MIT) — vendored to avoid the full icon
 * dependency. The payout glyph is composed from the set's card body + a send
 * arrow.
 */
import type { SVGProps } from 'react'

type GlyphProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

/** booking.created / booking.waitlist_promoted */
export function GlyphUserAdd(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M15 8C15 5.23858 12.7614 3 10 3C7.23858 3 5 5.23858 5 8C5 10.7614 7.23858 13 10 13C12.7614 13 15 10.7614 15 8Z" />
      <path d="M17.5 21L17.5 14M14 17.5H21" />
      <path d="M3 20C3 16.134 6.13401 13 10 13C11.4872 13 12.8662 13.4638 14 14.2547" />
    </Svg>
  )
}

/** payment.failed */
export function GlyphCardFailed(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M12.5 20H10.5C6.74142 20 4.86213 20 3.60746 19.0091C3.40678 18.8506 3.22119 18.676 3.0528 18.4871C2 17.3062 2 15.5375 2 12C2 8.46252 2 6.69377 3.0528 5.5129C3.22119 5.32403 3.40678 5.14935 3.60746 4.99087C4.86213 4 6.74142 4 10.5 4H13.5C17.2586 4 19.1379 4 20.3925 4.99087C20.5932 5.14935 20.7788 5.32403 20.9472 5.5129C21.8957 6.57684 21.9897 8.11799 21.999 11" />
      <path d="M2 9H22" />
      <path d="M22 14L16 20M22 20L16 14" />
    </Svg>
  )
}

/** refund.completed */
export function GlyphRefund(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M11 6H15.5C17.9853 6 20 8.01472 20 10.5C20 12.9853 17.9853 15 15.5 15H4" />
      <path d="M6.99998 12C6.99998 12 4.00001 14.2095 4 15C3.99999 15.7906 7 18 7 18" />
    </Svg>
  )
}

/** payout.sent — card body from GlyphCardFailed + a send arrow */
export function GlyphCardSent(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M12.5 20H10.5C6.74142 20 4.86213 20 3.60746 19.0091C3.40678 18.8506 3.22119 18.676 3.0528 18.4871C2 17.3062 2 15.5375 2 12C2 8.46252 2 6.69377 3.0528 5.5129C3.22119 5.32403 3.40678 5.14935 3.60746 4.99087C4.86213 4 6.74142 4 10.5 4H13.5C17.2586 4 19.1379 4 20.3925 4.99087C20.5932 5.14935 20.7788 5.32403 20.9472 5.5129C21.8957 6.57684 21.9897 8.11799 21.999 11" />
      <path d="M2 9H22" />
      <path d="M16 20L22 14M22 14H17.6M22 14V18.4" />
    </Svg>
  )
}

/** affiliation.joined / team.invite_accepted (historical rows) */
export function GlyphUsers(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" />
      <path d="M15 11C17.2091 11 19 9.20914 19 7C19 4.79086 17.2091 3 15 3" />
      <path d="M11 14H7C4.23858 14 2 16.2386 2 19C2 20.1046 2.89543 21 4 21H14C15.1046 21 16 20.1046 16 19C16 16.2386 13.7614 14 11 14Z" />
      <path d="M17 14C19.7614 14 22 16.2386 22 19C22 20.1046 21.1046 21 20 21H18.5" />
    </Svg>
  )
}
