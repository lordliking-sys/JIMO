import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { workoutFixture } from './workout-fixture';
import { simulateSafeArea } from './helpers';

test.use({ timezoneId: 'Europe/Rome' });
for (const phone of [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
]) {
  test(`An active session never replaces another calendar day's plan ${phone.width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(phone);
    await simulateSafeArea(page, 24, 34);
    await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
    const fixture = await workoutFixture(page),
      [monday, wednesday, friday] = fixture.program.days;
    monday!.name = 'Upper corrente';
    wednesday!.name = 'Pull corrente';
    wednesday!.exercises = [
      { ...structuredClone(monday!.exercises[1]!), id: randomUUID() },
    ];
    friday!.name = 'Giornata vuota';
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Inizia allenamento', exact: true })
      .click();
    await expect(page).toHaveURL(/\/workout\/[^/]+$/);
    const workoutUrl = page.url();
    await page.goto('/');
    const card = page.getByTestId('home-workout-card'),
      exercises = page.getByTestId('home-upcoming-exercise');
    await expect(card).toContainText('Upper corrente');
    await expect(exercises).toContainText('Panca piana');
    await expect(page.getByTestId('home-resume-workout')).toHaveCount(0);

    await page.getByTestId('home-date-3').click();
    await expect(card).toContainText('Pull corrente');
    await expect(card).not.toContainText('Upper corrente');
    await expect(exercises).toContainText('Trazioni');
    await expect(exercises).not.toContainText('Panca piana');
    await expect(exercises.getByRole('button')).toHaveCount(1);
    await expect(page.getByTestId('home-resume-workout')).toContainText(
      'Upper corrente',
    );
    await expect(
      page.getByRole('button', { name: 'Inizia allenamento', exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath('selected-day-with-active-session.png'),
    });

    await page.getByTestId('home-date-2').click();
    await expect(card).toContainText('Giorno di riposo');
    await expect(exercises).toHaveCount(0);
    await page.getByTestId('home-date-5').click();
    await expect(card).toContainText('Giornata vuota');
    await expect(card).toContainText('Nessun esercizio configurato.');
    await expect(exercises).toHaveCount(0);
    await page.getByTestId('home-date-1').click();
    await expect(exercises).toContainText('Panca piana');
    await page.getByTestId('home-date-3').click();
    await page
      .getByRole('button', { name: 'Riprendi allenamento', exact: true })
      .click();
    await expect(page).toHaveURL(workoutUrl);
    await expect(
      page.getByRole('button', { name: '✓ Completa serie', exact: true }),
    ).toBeVisible();
  });
}
