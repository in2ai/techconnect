import { expect, test } from '@playwright/test';
import {
  apiBaseUrl,
  createPatient,
  deletePatient,
  deleteTumor,
} from './helpers/api-fixtures';
import { clickFilteredRow, confirmDialogAction, goToList, selectMatOption, uniqueSuffix } from './helpers/ui-helpers';

test('tumors CRUD flow', async ({ page, request }) => {
  const suffix = uniqueSuffix();
  const patientNHC = `E2E-TP-${suffix}`;
  const biobankCode = `E2E-T-${suffix}`;

  let createdPatientNHC: string | null = null;
  let createdTumorCode: string | null = null;

  try {
    await createPatient(request, patientNHC);
    createdPatientNHC = patientNHC;

    await goToList(page, '/tumors', 'Tumors');

    await page.getByRole('button', { name: 'Add Tumor' }).click();
    const createDialog = page.locator('mat-dialog-container');
    await createDialog.getByLabel('Biobank Code').fill(biobankCode);
    await selectMatOption(page, 'Patient', patientNHC);
    await createDialog.getByLabel('Diagnosis').fill('Initial Diagnosis');
    await createDialog.getByRole('button', { name: 'Create' }).click();
    createdTumorCode = biobankCode;

    await clickFilteredRow(page, biobankCode);
    await expect(page).toHaveURL(new RegExp(`/tumors/${biobankCode}$`));
    await expect(page.locator('.detail-item', { hasText: 'Diagnosis' })).toContainText('Initial Diagnosis');

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.locator('mat-dialog-container');
    await editDialog.getByLabel('Diagnosis').fill('Updated Diagnosis');
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.detail-item', { hasText: 'Diagnosis' })).toContainText('Updated Diagnosis');

    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
    await confirmDialogAction(page, 'Delete');
    await expect(page).toHaveURL(/\/tumors$/);

    const deletedResponse = await request.get(`${apiBaseUrl}/tumors/${biobankCode}`);
    expect(deletedResponse.status()).toBe(404);
    createdTumorCode = null;
  } finally {
    if (createdTumorCode) {
      await deleteTumor(request, createdTumorCode);
    }
    if (createdPatientNHC) {
      await deletePatient(request, createdPatientNHC);
    }
  }
});
