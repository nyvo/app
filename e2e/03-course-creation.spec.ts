import { test, expect } from '@playwright/test';
import { loginTeacher } from './helpers';

test.describe('Course Creation', () => {
  test('can create a new course via the 3-step wizard', async ({ page }) => {
    test.setTimeout(60_000);

    // Step A: Log in
    await loginTeacher(page);

    // Step B: Navigate to course creation
    await page.goto('/teacher/new-course');
    await expect(page.getByRole('heading', { name: 'Opprett nytt kurs' })).toBeVisible();

    // Step C: Wizard Step 1 — "Detaljer"
    await page.getByText('Kursrekke').click();
    await page.getByLabel('Tittel').fill('Yoga for Beginners');
    await page.getByLabel('Beskrivelse').fill('A relaxing beginner yoga class for all levels.');
    await page.getByRole('button', { name: 'Neste' }).click();

    // Step D: Wizard Step 2 — "Tid og sted"
    // Open the date picker
    await page.getByRole('button', { name: /Startdato|Velg dato/i }).click();

    // Wait for the calendar dialog to appear
    const calendar = page.getByRole('dialog');
    await expect(calendar).toBeVisible();

    // Navigate to next month to ensure we have selectable future dates
    await calendar.getByRole('button', { name: /Next Month/i }).click();

    // Pick the first enabled gridcell button in the calendar
    const firstAvailableDay = calendar.getByRole('gridcell').locator('button:not([disabled])').first();
    await firstAvailableDay.click();

    // Select weeks — custom Popover, not a native select.
    // After selecting a date, the only "Velg" button remaining is the Uker trigger.
    await page.getByRole('button', { name: 'Velg', exact: true }).click();
    // Click the "4" option in the popover
    await page.getByRole('dialog').getByRole('button', { name: '4', exact: true }).click();

    // Set start time
    await page.getByRole('combobox', { name: /Starttid/i }).click();
    await page.getByRole('option', { name: '18:00' }).click();

    // Set duration
    await page.getByRole('combobox', { name: /Varighet/i }).click();
    await page.getByRole('option', { name: '1 t', exact: true }).click();

    // Fill location
    await page.getByLabel(/Sted/i).fill('Studio A');

    // Click "Neste" to go to step 3
    await page.getByRole('button', { name: 'Neste' }).click();

    // Step E: Wizard Step 3 — "Påmelding"
    await page.getByLabel('Pris').fill('500');
    await page.getByLabel('Maks deltakere').fill('15');

    // Click review button
    await page.getByRole('button', { name: /sjekk og/i }).click();

    // Step F: Review page
    await expect(page.getByText('Sjekk detaljer')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Yoga for Beginners')).toBeVisible();

    // Submit the course
    await page.getByRole('button', { name: /publiser kurs|lagre kurs/i }).click();

    // Step G: Verify success toast
    await expect(page.getByText('Kurs opprettet')).toBeVisible({ timeout: 15_000 });
  });
});
