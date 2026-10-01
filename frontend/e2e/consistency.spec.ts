import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  apiBaseUrl,
  createBiomodel,
  createPassage,
  createPatient,
  createTumor,
  deleteBiomodel,
  deletePassage,
  deletePatient,
  deleteTumor,
} from './helpers/api-fixtures';
import { goToList, selectMatOption, uniqueSuffix } from './helpers/ui-helpers';

async function checkAccessibility(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => {
    const finiteAnimations = document
      .getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(
      finiteAnimations.map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
  ).toEqual([]);
}

test('PDX details preserve research values and pass accessibility checks', async ({
  page,
  request,
}) => {
  page.setDefaultTimeout(5000);
  const suffix = uniqueSuffix();
  const patient = await createPatient(request, `CONS-PAT-${suffix}`);
  const tumor = await createTumor(request, `CONS-TUM-${suffix}`, patient.nhc);
  const biomodel = await createBiomodel(request, tumor.biobank_code, 'PDX');
  const passage = await createPassage(request, biomodel.id);
  try {
    expect(
      (
        await request.patch(`${apiBaseUrl}/pdx-trials/${passage.id}`, {
          data: { similarity: 88.5, has_ihq_data: true, ffpe: false, he_slide: null },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.patch(`${apiBaseUrl}/passages/${passage.id}`, {
          data: { status: false },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post(`${apiBaseUrl}/mice`, {
          data: { pdx_trial_id: passage.id, sex: 'M', strain: 'NSG', proex: 'PROEX-CONSISTENCY' },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post(`${apiBaseUrl}/trial-genomic-sequencings`, {
          data: { passage_id: passage.id, has_data: null },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post(`${apiBaseUrl}/trial-molecular-data`, {
          data: { passage_id: passage.id, has_data: null },
        })
      ).ok(),
    ).toBeTruthy();

    await goToList(page, '/passages', 'Passages');
    await page.goto(`/passages/${passage.id}`);
    const pdx = page.locator('mat-card').filter({ hasText: 'PDX Trial Details' });
    await expect(pdx.locator('.detail-item').filter({ hasText: 'Similarity' })).toContainText(
      '88.5',
    );
    await expect(pdx.locator('.detail-item').filter({ hasText: 'Has IHQ Data' })).toContainText(
      'Yes',
    );
    await expect(page.locator('.detail-item').filter({ hasText: 'Status' })).toContainText(
      'Inactive',
    );
    await page.getByRole('tab', { name: 'In Vivo Data', exact: true }).click();
    await expect(page.locator('.mouse-detail-item').filter({ hasText: 'Sex' })).toHaveText(
      /Sex\s*M/,
    );
    await expect(page.locator('.mouse-detail-item').filter({ hasText: 'Strain' })).toContainText(
      'NSG',
    );
    await expect(page.locator('.mouse-detail-item').filter({ hasText: 'PROEX' })).toContainText(
      'PROEX-CONSISTENCY',
    );
    await checkAccessibility(page);

    await pdx.getByRole('button', { name: 'Edit', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await checkAccessibility(page);
    await dialog.getByLabel('Similarity').fill('0');
    await selectMatOption(page, 'Has IHQ Data', '—');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(pdx.locator('.detail-item').filter({ hasText: 'Similarity' })).toContainText('0');
    const saved = await request.get(`${apiBaseUrl}/pdx-trials/${passage.id}`);
    expect(await saved.json()).toMatchObject({
      similarity: 0,
      has_ihq_data: null,
      ffpe: false,
      he_slide: null,
    });

    for (const tab of ['Genomic Sequencing', 'Molecular Data']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      const hasData = page
        .locator('[role="tabpanel"] .detail-item')
        .filter({ hasText: 'Has Data' });
      await expect(hasData).toHaveText(/Has Data\s*—/);
      await checkAccessibility(page);
    }

    await page.goto(`/biomodels/${biomodel.id}`);
    await expect(page.locator('tr.clickable-row').filter({ hasText: passage.id })).toContainText(
      'Inactive',
    );
    await checkAccessibility(page);
    const passageAction = page.getByRole('button', { name: passage.id, exact: true });
    await passageAction.focus();
    await passageAction.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/passages/${passage.id}$`));
    await page.goto(`/biomodels/${biomodel.id}`);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(
      page.getByRole('dialog').getByRole('combobox', { name: 'Type', exact: true }),
    ).toBeDisabled();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  } finally {
    await deletePassage(request, passage.id);
    await deleteBiomodel(request, biomodel.id);
    await deleteTumor(request, tumor.biobank_code);
    await deletePatient(request, patient.nhc);
  }
});

test('editing autocomplete text cannot submit an old relationship', async ({ page, request }) => {
  page.setDefaultTimeout(5000);
  const suffix = uniqueSuffix();
  const patient = await createPatient(request, `SELECT-PAT-${suffix}`);
  const tumor = await createTumor(request, `SELECT-TUM-${suffix}`, patient.nhc);
  const biomodel = await createBiomodel(request, tumor.biobank_code, 'PDX');
  const passage = await createPassage(request, biomodel.id);
  try {
    await goToList(page, '/biomodels', 'Biomodels');
    await page.getByRole('button', { name: 'Add Biomodel' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('ID', { exact: true }).fill(`SELECT-NEW-${suffix}`);
    const create = dialog.getByRole('button', { name: 'Create', exact: true });
    await selectMatOption(page, 'Tumor', tumor.biobank_code);
    await checkAccessibility(page);
    await expect(create).toBeEnabled();
    await dialog.getByRole('combobox', { name: 'Tumor', exact: true }).fill('');
    await expect(create).toBeDisabled();
    await selectMatOption(page, 'Tumor', tumor.biobank_code);
    await selectMatOption(page, 'Parent Passage (Optional)', passage.id);
    const parent = dialog.getByRole('combobox', { name: 'Parent Passage (Optional)', exact: true });
    await parent.fill('unmatched passage');
    await expect(create).toBeDisabled();
    await parent.fill('');
    await expect(create).toBeEnabled();
    await parent.press('Escape');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  } finally {
    await deletePassage(request, passage.id);
    await deleteBiomodel(request, biomodel.id);
    await deleteTumor(request, tumor.biobank_code);
    await deletePatient(request, patient.nhc);
  }
});
