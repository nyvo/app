// deno test --allow-env supabase/functions/owner-event-alert/

import { assert, assertEquals } from 'jsr:@std/assert@1'
import { formatOwnerAlert } from './format.ts'

Deno.test('booking alert includes course, seller and formatted amount', () => {
  const content = formatOwnerAlert({
    type: 'booking',
    course_title: 'Yoga nybegynner',
    seller_name: 'Studio Test',
    participant_name: 'Kari Nordmann',
    ticket_label: 'Hele kurset',
    amount_paid: 2200,
    payment_status: 'paid',
  })
  assert(content)
  assertEquals(content.subject, 'Ny påmelding: Yoga nybegynner')
  assert(content.text.includes('Kurs: Yoga nybegynner'))
  assert(content.text.includes('Arrangør: Studio Test'))
  assert(content.text.includes('Deltaker: Kari Nordmann'))
  assert(content.text.includes(`Beløp: ${(2200).toLocaleString('nb-NO')} kr`))
})

Deno.test('free booking shows Gratis and skips empty lines', () => {
  const content = formatOwnerAlert({
    type: 'booking',
    course_title: 'Prøvetime',
    amount_paid: 0,
  })
  assert(content)
  assert(content.text.includes('Beløp: Gratis'))
  assert(!content.text.includes('Arrangør:'))
  assert(!content.text.includes('Billett:'))
})

Deno.test('external payment is marked as such', () => {
  const content = formatOwnerAlert({
    type: 'booking',
    course_title: 'Pilates',
    amount_paid: 500,
    payment_status: 'external',
  })
  assert(content)
  assert(content.text.includes('(ekstern betaling)'))
})

Deno.test('new seller alert', () => {
  const content = formatOwnerAlert({
    type: 'new_seller',
    name: 'Fjellheim Yoga',
    email: 'post@fjellheim.no',
    operating_model: 'studio',
  })
  assert(content)
  assertEquals(content.subject, 'Ny arrangør: Fjellheim Yoga')
  assert(content.text.includes('E-post: post@fjellheim.no'))
  assert(content.text.includes('Modell: studio'))
})

Deno.test('new user alert', () => {
  const content = formatOwnerAlert({ type: 'new_user', email: 'ny@example.com' })
  assert(content)
  assertEquals(content.subject, 'Ny bruker registrert')
  assertEquals(content.text, 'Ny konto registrert: ny@example.com')
})

Deno.test('unknown event type returns null', () => {
  assertEquals(formatOwnerAlert({ type: 'nonsense' }), null)
  assertEquals(formatOwnerAlert({}), null)
})
