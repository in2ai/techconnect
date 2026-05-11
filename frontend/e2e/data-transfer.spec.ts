import { expect, test } from '@playwright/test';

import { loginIfNeeded, uniqueSuffix } from './helpers/ui-helpers';

test.describe('dataset transfer', () => {
  test('admin can export a workbook and import it to restore exported values', async ({ page }, testInfo) => {
    const suffix = uniqueSuffix();
    const patientId = `E2E-PAT-${suffix}`;
    const tumorId = `E2E-TUM-${suffix}`;
    const originalAge = 47;
    const exportedDiagnosis = 'Roundtrip diagnosis';

    await page.goto('/admin/data-transfer');
    await loginIfNeeded(page);
    await page.waitForURL(/\/admin\/data-transfer$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Dataset Transfer' })).toBeVisible();

    const api = page.context().request;
    let response = await api.post('/api/patients', {
      data: { nhc: patientId, sex: 'F', age: originalAge },
    });
    expect(response.ok()).toBeTruthy();

    response = await api.post('/api/tumors', {
      data: {
        biobank_code: tumorId,
        patient_nhc: patientId,
        organ: 'Lung',
        classification: 'Adenocarcinoma',
        ap_diagnosis: exportedDiagnosis,
      },
    });
    expect(response.ok()).toBeTruthy();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export current dataset as Excel' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('techconnect-dataset.xlsx');
    const downloadPath = testInfo.outputPath('techconnect-dataset.xlsx');
    await download.saveAs(downloadPath);

    response = await api.patch(`/api/patients/${patientId}`, {
      data: { nhc: patientId, sex: 'F', age: 99 },
    });
    expect(response.ok()).toBeTruthy();

    response = await api.patch(`/api/tumors/${tumorId}`, {
      data: {
        biobank_code: tumorId,
        patient_nhc: patientId,
        organ: 'Lung',
        classification: 'Adenocarcinoma',
        ap_diagnosis: 'Changed after export',
      },
    });
    expect(response.ok()).toBeTruthy();

    await page.locator('#datasetTransferUpload').setInputFiles(downloadPath);
    await expect(page.getByText(/Workbook upload detected/i)).toBeVisible();
    await page.getByRole('button', { name: 'Import package' }).click();

    const summary = page.locator('.results-card');
    await expect(summary).toBeVisible({ timeout: 15000 });
    await expect(summary).toContainText('Transfer summary');
    await expect(page.locator('.summary-pill')).toContainText(/Completed/i);
    await expect(page.locator('.entity-card').filter({ hasText: 'Patient' })).toContainText(
      /[1-9]\d*\s*updated/i,
    );
    const tumorCard = page
      .locator('.entity-card')
      .filter({ has: page.locator('.entity-card__title', { hasText: /^Tumor$/ }) });
    await expect(tumorCard).toContainText(/[1-9]\d*\s*updated/i);

    const errorReportButton = page.getByRole('button', { name: 'Download error report' });
    if (await errorReportButton.count()) {
      const errorDownloadPromise = page.waitForEvent('download');
      await errorReportButton.click();
      const errorDownload = await errorDownloadPromise;
      expect(errorDownload.suggestedFilename()).toContain('techconnect-dataset-import-errors-');
    }

    const restoredPatientResponse = await api.get(`/api/patients/${patientId}`);
    const restoredTumorResponse = await api.get(`/api/tumors/${tumorId}`);
    expect(restoredPatientResponse.ok()).toBeTruthy();
    expect(restoredTumorResponse.ok()).toBeTruthy();

    const restoredPatient = await restoredPatientResponse.json();
    const restoredTumor = await restoredTumorResponse.json();
    expect(restoredPatient.age).toBe(originalAge);
    expect(restoredTumor.ap_diagnosis).toBe(exportedDiagnosis);
  });
});
