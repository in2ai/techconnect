import { expect, test } from '@playwright/test';
import { apiBaseUrl, deletePatient, ensureAuthenticated } from './helpers/api-fixtures';
import {
  clickFilteredRow,
  confirmDialogAction,
  goToList,
  selectMatOption,
  uniqueSuffix,
} from './helpers/ui-helpers';

test('patients CRUD flow', async ({ page, request }) => {
  const suffix = uniqueSuffix();
  const nhc = `E2E-P-${suffix}`;
  let createdPatientNHC: string | null = nhc;

  try {
    await goToList(page, '/patients', 'Patients');

    await page.getByRole('button', { name: 'Add Patient' }).click();
    const createDialog = page.locator('mat-dialog-container');
    await createDialog.getByLabel('NHC').fill(nhc);
    await selectMatOption(page, 'Sex', 'Female');
    await createDialog.getByLabel('Age').fill('34');
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await clickFilteredRow(page, nhc);
    await expect(page).toHaveURL(new RegExp(`/patients/${nhc}$`));
    await expect(page.locator('.detail-item', { hasText: 'Age' })).toContainText('34');

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.locator('mat-dialog-container');
    await selectMatOption(page, 'Sex', 'Male');
    await editDialog.getByLabel('Age').fill('33');
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.detail-item', { hasText: 'Sex' })).toContainText('M');
    await expect(page.locator('.detail-item', { hasText: 'Age' })).toContainText('33');

    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
    await confirmDialogAction(page, 'Delete');
    await expect(page).toHaveURL(/\/patients$/);

    await ensureAuthenticated(request);
    const deletedResponse = await request.get(`${apiBaseUrl}/patients/${nhc}`);
    expect(deletedResponse.status()).toBe(404);
    createdPatientNHC = null;
  } finally {
    if (createdPatientNHC) {
      await deletePatient(request, createdPatientNHC);
    }
  }
});
