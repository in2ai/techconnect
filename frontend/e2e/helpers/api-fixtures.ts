import { APIRequestContext, APIResponse } from '@playwright/test';

export const apiBaseUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api';
const authEmail = process.env.E2E_AUTH_EMAIL ?? 'admin@techconnect.local';
const authPassword = process.env.E2E_AUTH_PASSWORD ?? 'techconnect-dev-password';

interface PatientPayload {
  nhc: string;
  sex: string | null;
  age: number | null;
}

interface TumorPayload {
  biobank_code: string;
  patient_nhc: string;
  tube_code: string | null;
  classification: string | null;
  ap_diagnosis: string | null;
  grade: string | null;
  organ: string | null;
  stage: string | null;
  tnm: string | null;
  intervention_date: string | null;
}

interface SamplePayload {
  id: string;
  has_serum: boolean | null;
  has_buffy: boolean | null;
  has_plasma: boolean | null;
  has_tumor_tissue_oct: boolean | null;
  has_non_tumor_tissue_oct: boolean | null;
  obtain_date: string | null;
  organ: string | null;
  tumor_biobank_code: string;
}

interface BiomodelPayload {
  id: string;
  type: string | null;
  description: string | null;
  creation_date: string | null;
  status: string | null;
  success: boolean | null;
  tumor_biobank_code: string;
  parent_passage_id: string | null;
}

interface PassagePayload {
  id: string;
  description: string | null;
  success: boolean | null;
  status: boolean | null;
  preclinical_trials: string | null;
  creation_date: string | null;
  biobank_shipment: boolean | null;
  biobank_arrival_date: string | null;
  biomodel_id: string;
}

async function ensureOk(response: APIResponse, action: string): Promise<void> {
  if (response.ok()) {
    return;
  }

  const body = await response.text();
  throw new Error(`${action} failed (${response.status()}): ${body}`);
}

export async function ensureAuthenticated(request: APIRequestContext): Promise<void> {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: {
      email: authEmail,
      password: authPassword,
    },
  });
  await ensureOk(response, 'POST /auth/login');
}

async function postJson<T>(request: APIRequestContext, path: string, payload: unknown): Promise<T> {
  await ensureAuthenticated(request);
  const response = await request.post(`${apiBaseUrl}${path}`, { data: payload });
  await ensureOk(response, `POST ${path}`);
  return (await response.json()) as T;
}

async function deleteIgnoreNotFound(request: APIRequestContext, path: string): Promise<void> {
  await ensureAuthenticated(request);
  const response = await request.delete(`${apiBaseUrl}${path}`);
  if (response.status() === 404) {
    return;
  }

  await ensureOk(response, `DELETE ${path}`);
}

export async function listCollection<T>(request: APIRequestContext, path: string): Promise<T[]> {
  await ensureAuthenticated(request);
  const response = await request.get(`${apiBaseUrl}${path}?offset=0&limit=1000`);
  await ensureOk(response, `GET ${path}`);
  return (await response.json()) as T[];
}

export async function createPatient(
  request: APIRequestContext,
  nhc: string,
): Promise<PatientPayload> {
  return postJson<PatientPayload>(request, '/patients', {
    nhc,
    sex: 'F',
    age: 36,
  });
}

export async function createTumor(
  request: APIRequestContext,
  biobankCode: string,
  patientNhc: string,
): Promise<TumorPayload> {
  return postJson<TumorPayload>(request, '/tumors', {
    biobank_code: biobankCode,
    patient_nhc: patientNhc,
    tube_code: null,
    classification: null,
    ap_diagnosis: null,
    grade: null,
    organ: null,
    stage: null,
    tnm: null,
    intervention_date: null,
  });
}

export async function createSample(
  request: APIRequestContext,
  tumorBiobankCode: string,
  obtainDate: string,
): Promise<SamplePayload> {
  return postJson<SamplePayload>(request, '/samples', {
    has_serum: true,
    has_buffy: false,
    has_plasma: true,
    has_tumor_tissue_oct: false,
    has_non_tumor_tissue_oct: false,
    obtain_date: obtainDate,
    organ: 'Lung',
    tumor_biobank_code: tumorBiobankCode,
  });
}

export async function createBiomodel(
  request: APIRequestContext,
  tumorBiobankCode: string,
  type: string,
): Promise<BiomodelPayload> {
  return postJson<BiomodelPayload>(request, '/biomodels', {
    id: `${tumorBiobankCode}-${type}`,
    type,
    description: 'fixture',
    creation_date: '2024-01-01',
    status: 'active',
    success: true,
    tumor_biobank_code: tumorBiobankCode,
    parent_passage_id: null,
  });
}

export async function createPassage(
  request: APIRequestContext,
  biomodelId: string,
): Promise<PassagePayload> {
  return postJson<PassagePayload>(request, '/passages', {
    description: 'fixture',
    success: true,
    status: true,
    preclinical_trials: null,
    creation_date: '2025-01-01',
    biobank_shipment: false,
    biobank_arrival_date: null,
    biomodel_id: biomodelId,
  });
}

export async function deletePatient(request: APIRequestContext, nhc: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/patients/${nhc}`);
}

export async function deleteTumor(request: APIRequestContext, biobankCode: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/tumors/${biobankCode}`);
}

export async function deleteSample(request: APIRequestContext, id: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/samples/${id}`);
}

export async function deleteBiomodel(request: APIRequestContext, id: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/biomodels/${id}`);
}

export async function deletePassage(request: APIRequestContext, id: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/passages/${id}`);
}

export async function deletePdxTrial(request: APIRequestContext, id: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/pdx-trials/${id}`);
}

export async function deletePdoTrial(request: APIRequestContext, id: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/pdo-trials/${id}`);
}

export async function deleteLcTrial(request: APIRequestContext, id: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/lc-trials/${id}`);
}
