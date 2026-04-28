import { expect, test } from '@playwright/test';
import { loginIfNeeded } from './helpers/ui-helpers';

test.describe('dashboard', () => {
  test('renders a card per entity and navigates when clicked', async ({ page }) => {
    await page.goto('/dashboard');
    await loginIfNeeded(page);

    const grid = page.locator('section.dashboard-grid');
    await expect(grid).toBeVisible();

    const expected = ['Patients', 'Tumors', 'Samples', 'Biomodels', 'Passages'];
    for (const title of expected) {
      await expect(grid.getByRole('heading', { level: 3, name: title })).toBeVisible();
    }

    await grid.getByRole('link').filter({ hasText: 'Patients' }).click();
    await expect(page).toHaveURL(/\/patients$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Patients' })).toBeVisible();
  });

  test('each dashboard card exposes a numeric count or an error indicator', async ({ page }) => {
    await page.goto('/dashboard');
    await loginIfNeeded(page);

    const cards = page.locator('.entity-card');
    await expect(cards).toHaveCount(5);

    for (const card of await cards.all()) {
      const count = card.locator('.card-count');
      await expect(count).toBeVisible();
      await expect
        .poll(async () => (await count.textContent())?.trim() ?? '', { timeout: 10000 })
        .not.toBe('');
      await expect(count.locator('mat-spinner')).toHaveCount(0);
    }
  });
});
