// deno test --allow-env --allow-read supabase/functions/send-email/
//
// Copy-variant guard for the reschedule email: single-session courses must
// never get the series copy ("en kursøkt i …" / "resten av kurset"), which
// implies sibling sessions that don't exist.

import { assert } from 'jsr:@std/assert@1'
import { render } from '@react-email/render'
import * as React from 'react'
import SessionRescheduled, { type SessionRescheduledProps } from './session-rescheduled.tsx'

const baseProps: SessionRescheduledProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Helgeworkshop',
  oldDate: 'onsdag 21. mai',
  oldTime: '18:00',
  newDate: 'torsdag 22. mai',
  newTime: '18:00',
  courseLocation: 'Sal 1, Storgata 14, Oslo',
}

Deno.test('multi-session course keeps the session copy', async () => {
  const html = await render(React.createElement(SessionRescheduled, baseProps))
  assert(html.includes('Ny tid for en kursøkt'))
  assert(html.includes('har flyttet en kursøkt i'))
  assert(html.includes('Resten av kurset står som planlagt.'))
})

Deno.test('single-session course gets whole-course copy, no "resten av kurset"', async () => {
  const html = await render(
    React.createElement(SessionRescheduled, { ...baseProps, isSingleSession: true }),
  )
  assert(html.includes('Ny tid for kurset'))
  assert(html.includes('har flyttet Helgeworkshop til ny tid.'))
  assert(html.includes('Påmeldingen din gjelder den nye tiden.'))
  assert(!html.includes('kursøkt'))
  assert(!html.includes('Resten av kurset'))
})

Deno.test('both variants show new and old time', async () => {
  for (const isSingleSession of [true, false]) {
    const html = await render(
      React.createElement(SessionRescheduled, { ...baseProps, isSingleSession }),
    )
    assert(html.includes('torsdag 22. mai kl. 18:00'))
    assert(html.includes('onsdag 21. mai kl. 18:00'))
  }
})
