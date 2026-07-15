// Render tests for the cancellation email templates (H2/H3).
//
// These templates live under supabase/functions/send-email/templates/ and are
// normally rendered by the send-email edge function (Deno). They're plain
// React Email components, so we render them here with @react-email/render and
// pin the participant-facing copy: the money line must match what actually
// happened to the payment, and the contact line must only appear when an
// arrangør address is available.
//
// Copy assertions run against the plain-text render — the HTML render breaks
// text across JSX expression boundaries with `<!-- -->` markers, which would
// make contiguous-string assertions brittle. The plain-text renderer wraps
// lines and uppercases headings, so assertions normalize whitespace and case.
//
// NOTE: this file is excluded from the app tsconfig (the imported templates
// are Deno-targeted, classic-JSX React Email components); vitest type-checks
// and runs it via its own transform.

import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import CourseCancelled from '../../supabase/functions/send-email/templates/course-cancelled.tsx';
import SignupCancelled from '../../supabase/functions/send-email/templates/signup-cancelled.tsx';

const base = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
};

const renderText = async (element: React.ReactElement) => {
  const text = await render(element, { plainText: true });
  return text.replace(/\s+/g, ' ').toLowerCase();
};

describe('course-cancelled template', () => {
  it('renders greeting, studio, course and the refund note', async () => {
    const text = await renderText(
      CourseCancelled({
        ...base,
        refundNote:
          'Du får 1 200 kr tilbake til kortet du betalte med. Kvitteringen kommer i en egen e-post.',
        arrangorEmail: 'hei@lysyoga.no',
      }),
    );
    expect(text).toContain('kurset er avlyst');
    expect(text).toContain('hei marte hansen, lys yoga har dessverre avlyst');
    expect(text).toContain('du får 1 200 kr tilbake');
    expect(text).toContain('kontakt lys yoga på hei@lysyoga.no');
    expect(text).not.toContain('svar på denne e-posten');
  });

  it('omits refund note and contact line when not provided (free signup, no replyTo)', async () => {
    const text = await renderText(CourseCancelled({ ...base }));
    expect(text).toContain('kurset er avlyst');
    expect(text).not.toContain('tilbake til kortet');
    expect(text).not.toContain('kontakt lys yoga på');
  });

  it('degrades gracefully without a participant name', async () => {
    const text = await renderText(CourseCancelled({ ...base, buyerName: '' }));
    expect(text).toContain('hei, lys yoga har dessverre avlyst');
    expect(text).not.toContain('hei ,');
  });
});

describe('signup-cancelled template', () => {
  it('renders greeting, course start and the manual-payment note', async () => {
    const text = await renderText(
      SignupCancelled({
        ...base,
        courseStart: 'onsdag 28. mai kl. 18:00',
        paymentNote:
          'Har du betalt direkte til Lys Yoga, ta kontakt med dem om tilbakebetaling.',
        arrangorEmail: 'hei@lysyoga.no',
      }),
    );
    expect(text).toContain('du er avmeldt');
    expect(text).toContain('hei marte hansen, lys yoga har meldt deg av');
    expect(text).toContain('onsdag 28. mai kl. 18:00');
    expect(text).toContain('betalt direkte til lys yoga');
    expect(text).toContain('kontakt lys yoga på hei@lysyoga.no');
    expect(text).not.toContain('svar på denne e-posten');
  });

  it('omits payment note, start row and contact line when not provided', async () => {
    const text = await renderText(SignupCancelled({ ...base }));
    expect(text).toContain('du er avmeldt');
    expect(text).not.toContain('betalt direkte');
    expect(text).not.toMatch(/\bstart\b/);
    expect(text).not.toContain('kontakt lys yoga på');
  });
});
