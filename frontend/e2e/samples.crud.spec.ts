import { expect, test } from '@playwright/test';
import {
  apiBaseUrl,
  createPatient,
  createTumor,
  deletePatient,
  deleteSample,
  deleteTumor,
} from './helpers/api-fixtures';
import {
  clickFilteredRow,
  confirmDialogAction,
  goToList,
  selectMatOption,
  uniqueSuffix,
} from './helpers/ui-helpers';

test('samples CRUD flow', async ({ page, request }) => {
  const suffix = uniqueSuffix();
  const patientNHC = `E2E-SP-${suffix}`;
  const biobankCode = `E2E-ST-${suffix}`;
  const createdDate = '2024-07-10';
  const updatedDate = '2024-08-11';

  let createdPatientNHC: string | null = null;
  let createdTumorCode: string | null = null;
  let createdSampleId: string | null = null;

  try {
    await createPatient(request, patientNHC);
    createdPatientNHC = patientNHC;
    await createTumor(request, biobankCode, patientNHC);
    createdTumorCode = biobankCode;

    await goToList(page, '/samples', 'Samples');

    await page.getByRole('button', { name: 'Add Sample' }).click();
    const createDialog = page.locator('mat-dialog-container');
    await selectMatOption(page, 'Tumor', biobankCode);
    await createDialog.getByLabel('Obtain Date').fill(createdDate);
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await clickFilteredRow(page, biobankCode);
    await expect(page).toHaveURL(/\/samples\/[^/]+$/);
    createdSampleId = new URL(page.url()).pathname.split('/').findLast(Boolean) ?? null;
    expect(createdSampleId).toBeTruthy();
    expect(createdSampleId).toBe(`${biobankCode}-M1`);
    await expect(page).toHaveURL(new RegExp(`/samples/${createdSampleId}$`));
    await expect(page.locator('.detail-item', { hasText: 'Obtain Date' })).toContainText(
      createdDate,
    );

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.locator('mat-dialog-container');
    await editDialog.getByLabel('Obtain Date').fill(updatedDate);
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.detail-item', { hasText: 'Obtain Date' })).toContainText(
      updatedDate,
    );

    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
    await confirmDialogAction(page, 'Delete');
    await expect(page).toHaveURL(/\/samples$/);

    const deletedResponse = await request.get(`${apiBaseUrl}/samples/${createdSampleId}`);
    expect(deletedResponse.status()).toBe(404);
    createdSampleId = null;
  } finally {
    if (createdSampleId) {
      await deleteSample(request, createdSampleId);
    }
    if (createdTumorCode) {
      await deleteTumor(request, createdTumorCode);
    }
    if (createdPatientNHC) {
      await deletePatient(request, createdPatientNHC);
    }
  }
});
