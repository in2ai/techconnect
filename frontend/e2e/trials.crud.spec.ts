import { expect, test } from '@playwright/test';
import {
  createBiomodel,
  createPassage,
  createPatient,
  createTumor,
  deleteBiomodel,
  deletePassage,
  deletePatient,
  deletePdxTrial,
  deleteTrial,
  deleteTumor,
} from './helpers/api-fixtures';
import { clickFilteredRow, goToList, selectMatOption, uniqueSuffix } from './helpers/ui-helpers';

test('trials CRUD flow', async ({ page, request }) => {
  const suffix = uniqueSuffix();
  const patientNHC = `E2E-TP-${suffix}`;
  const biobankCode = `E2E-TT-${suffix}`;
  const biomodelType = `TRIAL-BM-${suffix}`;
  const trialDescription = `Trial description ${suffix}`;
  const updatedDescription = `Updated trial description ${suffix}`;

  let createdPatientNHC: string | null = null;
  let createdTumorCode: string | null = null;
  let createdBiomodelId: string | null = null;
  let createdPassageId: string | null = null;
  let createdTrialId: string | null = null;

  try {
    await createPatient(request, patientNHC);
    createdPatientNHC = patientNHC;
    await createTumor(request, biobankCode, patientNHC);
    createdTumorCode = biobankCode;

    const biomodel = await createBiomodel(request, biobankCode, biomodelType);
    createdBiomodelId = biomodel.id;

    const passage = await createPassage(request, biomodel.id, 1);
    createdPassageId = passage.id;

    await goToList(page, '/trials', 'Trials');

    await page.getByRole('button', { name: 'Add Trial' }).click();
    const createDialog = page.locator('mat-dialog-container');
    await selectMatOption(page, 'Passage', new RegExp(passage.id.slice(0, 8)));
    await selectMatOption(page, 'Trial Type', 'PDX');
    await createDialog.getByLabel('Description').fill(trialDescription);
    await createDialog.getByLabel('Creation Date').fill('2025-01-15');
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await clickFilteredRow(page, passage.id);
    await expect(page).toHaveURL(/\/trials\/[^/]+$/);
    createdTrialId = new URL(page.url()).pathname.split('/').findLast(Boolean) ?? null;
    expect(createdTrialId).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`/trials/${createdTrialId}$`));
    await expect(page.locator('.detail-item', { hasText: 'Description' })).toContainText(
      trialDescription,
    );

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.locator('mat-dialog-container');
    await editDialog.getByLabel('Description').fill(updatedDescription);
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.detail-item', { hasText: 'Description' })).toContainText(
      updatedDescription,
    );
  } finally {
    if (createdTrialId) {
      await deletePdxTrial(request, createdTrialId);
      await deleteTrial(request, createdTrialId);
    }
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
