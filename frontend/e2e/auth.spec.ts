import { expect, test } from '@playwright/test';

const authEmail = process.env.E2E_AUTH_EMAIL ?? 'admin@techconnect.local';
const authPassword = process.env.E2E_AUTH_PASSWORD ?? 'techconnect-dev-password';

test.describe('authentication', () => {
  test('unauthenticated access to a protected route redirects to login', async ({ page }) => {
    await page.goto('/patients');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });

  test('invalid credentials surface an error and stay on the login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(authEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.locator('mat-snack-bar-container')).toContainText(
      /invalid email or password/i,
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test('successful login redirects to dashboard and logout returns to login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(authEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill(authPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Welcome to TechConnect/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Open account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('accessing /login while authenticated redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(authEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill(authPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
