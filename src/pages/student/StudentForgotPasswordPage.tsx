import { ForgotPasswordView } from '@/components/auth/ForgotPasswordView'

const StudentForgotPasswordPage = () => (
  <ForgotPasswordView
    context="student"
    linkLabel="Send lenke"
    subtitle="Skriv inn e-posten din, så sender vi en innloggingslenke."
    sentHeadline="Vi har sendt en innloggingslenke til"
    sentDescription="Sjekk innboksen din for innloggingslenken."
  />
)

export default StudentForgotPasswordPage
