import { readFileSync, readdirSync } from 'node:fs';
import { render } from '@react-email/render';
import { describe, expect, it } from 'vitest';
import BookingNotification from '../../supabase/functions/send-email/templates/booking-notification.tsx';
import ClassReminder from '../../supabase/functions/send-email/templates/class-reminder.tsx';
import CourseMessage from '../../supabase/functions/send-email/templates/course-message.tsx';
import OrderConfirm from '../../supabase/functions/send-email/templates/order-confirm.tsx';
import RefundReceipt from '../../supabase/functions/send-email/templates/refund-receipt.tsx';
import SessionRescheduled from '../../supabase/functions/send-email/templates/session-rescheduled.tsx';

const renderText = async (element: React.ReactElement): Promise<string> => {
  const text = await render(element, { plainText: true });
  return text.replace(/\s+/g, ' ').toLowerCase();
};

describe('transactional email copy', () => {
  it('shows the arrangør address instead of promising that a reply is routed', async () => {
    const text = await renderText(
      OrderConfirm({
        buyerName: 'Marte Hansen',
        studioName: 'Lys Yoga',
        courseTitle: 'Vinyasa Flow',
        courseStart: 'onsdag 28. mai kl. 18:00',
        bookingId: 'LY-2829',
        arrangorEmail: 'hei@lysyoga.no',
      }),
    );

    expect(text).toContain('kontakt lys yoga på hei@lysyoga.no');
    expect(text).not.toContain('svar på denne e-posten');
  });

  it('describes a processed refund as confirmed, not already paid out', async () => {
    const text = await renderText(
      RefundReceipt({
        buyerName: 'Marte Hansen',
        studioName: 'Lys Yoga',
        courseTitle: 'Vinyasa Flow',
        amount: '1 200 kr',
        refundDate: '17. mai 2026',
        bookingId: 'LY-2829',
      }),
    );

    expect(text).toContain('refusjon bekreftet');
    expect(text).not.toContain('refusjon utbetalt');
  });

  it('says reminders are sent before each session', async () => {
    const text = await renderText(
      OrderConfirm({
        buyerName: 'Marte Hansen',
        studioName: 'Lys Yoga',
        courseTitle: 'Vinyasa Flow',
        courseStart: 'onsdag 28. mai kl. 18:00',
        bookingId: 'LY-2829',
      }),
    );

    expect(text).toContain('vi sender en påminnelse før hver kursøkt');
    expect(text).not.toContain('dagen før kurset starter');
  });

  it('describes a free booking as Gratis in the buyer confirmation', async () => {
    const text = await renderText(
      OrderConfirm({
        buyerName: 'Marte Hansen',
        studioName: 'Lys Yoga',
        courseTitle: 'Gratis prøvetime',
        courseStart: 'onsdag 28. mai kl. 18:00',
        bookingId: 'LY-2829',
        amount: 'Gratis',
      }),
    );

    expect(text).toContain('beløp gratis');
    expect(text).not.toContain('beløp 0 kr');
  });

  it('shows Pris: Gratis instead of a payout row in a free seller notification', async () => {
    const text = await renderText(
      BookingNotification({
        buyerName: 'Marte Hansen',
        courseTitle: 'Gratis prøvetime',
        courseStart: 'onsdag 28. mai kl. 18:00',
        payout: '0 kr',
        isFree: true,
        bookingId: 'LY-2829',
      }),
    );

    expect(text).toContain('pris gratis');
    expect(text).not.toContain('din utbetaling');
  });

  it('uses a clean greeting when a reminder has no participant name', async () => {
    const text = await renderText(
      ClassReminder({
        buyerName: '',
        studioName: 'Lys Yoga',
        courseTitle: 'Vinyasa Flow',
        courseStart: 'i morgen kl. 18:00',
      }),
    );

    expect(text).toContain('hei, en liten påminnelse');
    expect(text).not.toContain('hei hei');
  });

  it('uses a clean greeting when a course message has no participant name', async () => {
    const text = await renderText(
      CourseMessage({
        buyerName: '',
        studioName: 'Lys Yoga',
        courseTitle: 'Vinyasa Flow',
        subject: 'Vinyasa Flow',
        body: 'Ta med egen matte.',
      }),
    );

    expect(text).toContain('hei, ta med egen matte');
    expect(text).not.toContain('hei hei');
  });

  it('uses a clean greeting when a schedule update has no participant name', async () => {
    const text = await renderText(
      SessionRescheduled({
        buyerName: '',
        studioName: 'Lys Yoga',
        courseTitle: 'Vinyasa Flow',
        oldDate: 'onsdag 21. mai',
        oldTime: '18:00',
        newDate: 'torsdag 22. mai',
        newTime: '18:00',
      }),
    );

    expect(text).toContain('hei, lys yoga har flyttet');
    expect(text).not.toContain('hei hei');
  });

  it('labels the shared contact address as UpNext support', async () => {
    const text = await renderText(
      ClassReminder({
        buyerName: 'Marte Hansen',
        studioName: 'Lys Yoga',
        courseTitle: 'Vinyasa Flow',
        courseStart: 'i morgen kl. 18:00',
      }),
    );

    expect(text).toContain('trenger du hjelp med upnext? skriv til hei@framio.no');
  });
});

describe('auth email reference templates', () => {
  const templateDirectory = 'supabase/auth-email-templates';
  const templateFiles = readdirSync(templateDirectory).filter((file) => file.endsWith('.html'));

  it.each(templateFiles)('%s points to the current support address', (file) => {
    const template = readFileSync(`${templateDirectory}/${file}`, 'utf8');

    expect(template).toContain('mailto:hei@framio.no');
    expect(template).not.toContain('mailto:hei@raden.no');
  });
});
