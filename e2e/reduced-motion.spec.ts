import { expect, test } from '@playwright/test';

test('reduced motion preserves feedback without transform transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  const control = page.getByLabel('Hovednavigasjon').getByRole('link', { name: 'Logg inn' });
  await expect(control).toBeVisible();
  const normalTransition = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      property: style.transitionProperty,
      duration: style.transitionDuration,
    };
  });
  expect(normalTransition.property).toContain('translate');
  expect(normalTransition.duration).not.toBe('0s');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedTransition = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      property: style.transitionProperty,
      duration: style.transitionDuration,
    };
  });

  expect(reducedTransition.property).toContain('color');
  expect(reducedTransition.property).toContain('opacity');
  expect(reducedTransition.property).not.toContain('transform');
  expect(reducedTransition.property).not.toContain('translate');
  expect(reducedTransition.property).not.toContain('scale');
  expect(reducedTransition.property).not.toContain('filter');
  expect(reducedTransition.duration).not.toBe('0s');

  const reducedKeyframe = await page.evaluate(() => {
    const element = document.createElement('div');
    element.className = 'animate-in fade-in-0 slide-in-from-bottom-4 duration-300';
    document.body.append(element);
    const style = getComputedStyle(element);
    const result = {
      duration: style.animationDuration,
      translateY: style.getPropertyValue('--tw-enter-translate-y').trim(),
      opacity: style.getPropertyValue('--tw-enter-opacity').trim(),
    };
    element.remove();
    return result;
  });

  expect(reducedKeyframe.duration).toBe('0.15s');
  expect(reducedKeyframe.translateY).toBe('0');
  expect(reducedKeyframe.opacity).toBe('0');
});
