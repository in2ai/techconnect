import { expect, test } from '@playwright/test';
import {
  apiBaseUrl,
  createPatient,
  createTumor,
  deleteBiomodel,
  deletePatient,
  deleteTumor,
} from './helpers/api-fixtures';
import {
  clickFilteredRow,
  confirmDialogAction,
  goToList,
  selectMatOption,
  uniqueSuffix,
} from './helpers/ui-helpers';

test('biomodels CRUD flow', async ({ page, request }) => {
  const suffix = uniqueSuffix();
  const patientNHC = `E2E-BP-${suffix}`;
  const biobankCode = `E2E-BT-${suffix}`;
  const biomodelId = `E2E-BM-${suffix}`;

  let createdPatientNHC: string | null = null;
  let createdTumorCode: string | null = null;
  let createdBiomodelId: string | null = null;

  try {
    await createPatient(request, patientNHC);
    createdPatientNHC = patientNHC;
    await createTumor(request, biobankCode, patientNHC);
    createdTumorCode = biobankCode;

    await goToList(page, '/biomodels', 'Biomodels');

    await page.getByRole('button', { name: 'Add Biomodel' }).click();
    const createDialog = page.locator('mat-dialog-container');
    await createDialog.getByLabel('ID').fill(biomodelId);
    await selectMatOption(page, 'Tumor', biobankCode);
    await selectMatOption(page, 'Type', 'PDX');
    await selectMatOption(page, 'Status', 'Active');
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await clickFilteredRow(page, biomodelId);
    await expect(page).toHaveURL(/\/biomodels\/[^/]+$/);
    createdBiomodelId = new URL(page.url()).pathname.split('/').findLast(Boolean) ?? null;
    expect(createdBiomodelId).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`/biomodels/${createdBiomodelId}$`));
    await expect(page.locator('.detail-item', { hasText: 'Type' })).toContainText('PDX');

    await page.getByRole('button', { name: 'Edit' }).click();
    await selectMatOption(page, 'Status', 'Inactive');
    const editDialog = page.locator('mat-dialog-container');
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.detail-item', { hasText: 'Status' })).toContainText('inactive');

    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
    await confirmDialogAction(page, 'Delete');
    await expect(page).toHaveURL(/\/biomodels$/);

    const deletedResponse = await request.get(`${apiBaseUrl}/biomodels/${createdBiomodelId}`);
    expect(deletedResponse.status()).toBe(404);
    createdBiomodelId = null;
  } finally {
    if (createdBiomodelId) {
      await deleteBiomodel(request, createdBiomodelId);
    }
    if (createdTumorCode) {
      await deleteTumor(request, createdTumorCode);
    }
    if (createdPatientNHC) {
      await deletePatient(request, createdPatientNHC);
    }
  }
});
