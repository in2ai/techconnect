import { expect, Page } from '@playwright/test';

const authEmail = process.env.E2E_AUTH_EMAIL ?? 'admin@techconnect.local';
const authPassword = process.env.E2E_AUTH_PASSWORD ?? 'techconnect-dev-password';

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function goToList(page: Page, path: string, title: string): Promise<void> {
  await page.goto(path);
  await loginIfNeeded(page);
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
  if (new URL(page.url()).pathname !== path) {
    await page.goto(path);
  }
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({
    timeout: 15000,
  });
}

export async function loginIfNeeded(page: Page): Promise<void> {
  const emailField = page.getByLabel('Email address');
  try {
    await emailField.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    return;
  }

  await emailField.fill(authEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill(authPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

export async function selectMatOption(
  page: Page,
  label: string,
  optionText: string | RegExp,
): Promise<void> {
  const dialog = page.locator('mat-dialog-container');
  const scope = (await dialog.count()) > 0 ? dialog : page.locator('body');
  await scope.getByRole('combobox', { name: label }).click();
  if (typeof optionText === 'string') {
    await page.getByRole('option', { name: optionText, exact: true }).click();
    return;
  }
  await page.getByRole('option', { name: optionText }).click();
}

export async function clickFilteredRow(page: Page, filterText: string): Promise<void> {
  await page.getByPlaceholder('Filter records…').fill(filterText);
  const row = page.locator('tr.clickable-row').filter({ hasText: filterText }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.click();
}

export async function confirmDialogAction(page: Page, actionLabel: string): Promise<void> {
  const dialog = page.locator('mat-dialog-container');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: actionLabel, exact: true }).click();
}
