import { expect, test } from '@playwright/test';
import {
  apiBaseUrl,
  createBiomodel,
  createPatient,
  createTumor,
  deleteBiomodel,
  deletePassage,
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

test('passages CRUD flow', async ({ page, request }) => {
  const suffix = uniqueSuffix();
  const patientNHC = `E2E-PP-${suffix}`;
  const biobankCode = `E2E-PT-${suffix}`;
  const biomodelType = `PASS-BM-${suffix}`;
  const description = `Passage description ${suffix}`;

  let createdPatientNHC: string | null = null;
  let createdTumorCode: string | null = null;
  let createdBiomodelId: string | null = null;
  let createdPassageId: string | null = null;

  try {
    await createPatient(request, patientNHC);
    createdPatientNHC = patientNHC;
    await createTumor(request, biobankCode, patientNHC);
    createdTumorCode = biobankCode;
    const biomodel = await createBiomodel(request, biobankCode, biomodelType);
    createdBiomodelId = biomodel.id;

    await goToList(page, '/passages', 'Passages');

    await page.getByRole('button', { name: 'Add Passage' }).click();
    const createDialog = page.locator('mat-dialog-container');
    await selectMatOption(page, 'Biomodel', biomodel.id);
    await createDialog.getByLabel('Description').fill(description);
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await clickFilteredRow(page, biomodel.id);
    await expect(page).toHaveURL(/\/passages\/[^/]+$/);
    createdPassageId = new URL(page.url()).pathname.split('/').filter(Boolean).pop() ?? null;
    expect(createdPassageId).toBeTruthy();
    await expect(page.locator('.detail-item', { hasText: 'Description' })).toContainText(
      description,
    );
    expect(createdPassageId).toBe(`${biomodel.id}-P1`);

    const deleteRequestPromise = page.waitForResponse(
      (res) =>
        res.request().method() === 'DELETE' && res.url().includes(`/passages/${createdPassageId}`),
    );
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
    await confirmDialogAction(page, 'Delete');
    const deleteResponse = await deleteRequestPromise;
    expect(deleteResponse.status(), `DELETE /passages/${createdPassageId} response`).toBeLessThan(
      400,
    );
    await expect(page).toHaveURL(/\/passages$/);

    const deletedResponse = await request.get(`${apiBaseUrl}/passages/${createdPassageId}`);
    expect(deletedResponse.status(), `GET /passages/${createdPassageId} after delete`).toBe(404);
    createdPassageId = null;
  } finally {
    if (createdPassageId) {
      await deletePassage(request, createdPassageId);
    }
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
