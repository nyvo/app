import { ForgotPasswordView } from '@/components/auth/ForgotPasswordView'

const ForgotPasswordPage = () => (
  <ForgotPasswordView
    context="teacher"
    linkLabel="Send lenke"
    subtitle="Skriv inn e-posten din, så sender vi en lenke."
    sentHeadline="Vi har sendt en lenke til"
    sentDescription="Sjekk innboksen din for lenken."
  />
)

export default ForgotPasswordPage
