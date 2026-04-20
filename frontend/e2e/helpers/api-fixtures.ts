import { APIRequestContext, APIResponse } from '@playwright/test';

export const apiBaseUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api';
const authEmail = process.env.E2E_AUTH_EMAIL ?? 'admin@techconnect.local';
const authPassword = process.env.E2E_AUTH_PASSWORD ?? 'techconnect-dev-password';

interface PatientPayload {
  nhc: string;
  sex: string | null;
  birth_date: string | null;
}

interface TumorPayload {
  biobank_code: string;
  patient_nhc: string;
  lab_code: string | null;
  diagnosis: string | null;
  ap_observation: string | null;
  grade: string | null;
  organ: string | null;
  status: string | null;
  tnm: string | null;
  registration_date: string | null;
  operation_date: string | null;
}

interface SamplePayload {
  id: string;
  has_serum: boolean | null;
  has_buffy: boolean | null;
  has_plasma: boolean | null;
  has_tumor_tissue: boolean | null;
  has_non_tumor_tissue: boolean | null;
  obtain_date: string | null;
  organ: string | null;
  is_metastasis: boolean | null;
  tumor_biobank_code: string;
}

interface BiomodelPayload {
  id: string;
  type: string | null;
  description: string | null;
  creation_date: string | null;
  status: string | null;
  progresses: boolean | null;
  viability: number | null;
  tumor_biobank_code: string;
  parent_trial_id: string | null;
}

interface PassagePayload {
  id: string;
  number: number | null;
  description: string | null;
  biomodel_id: string;
  parent_trial_id: string | null;
}

interface TrialPayload {
  id: string;
  success: boolean | null;
  description: string | null;
  status: boolean | null;
  preclinical_trials: string | null;
  creation_date: string | null;
  biobank_shipment: boolean | null;
  biobank_arrival_date: string | null;
  passage_id: string;
}

async function ensureOk(response: APIResponse, action: string): Promise<void> {
  if (response.ok()) {
    return;
  }

  const body = await response.text();
  throw new Error(`${action} failed (${response.status()}): ${body}`);
}

async function ensureAuthenticated(request: APIRequestContext): Promise<void> {
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

async function deleteIgnoreNotFound(
  request: APIRequestContext,
  path: string,
): Promise<void> {
  await ensureAuthenticated(request);
  const response = await request.delete(`${apiBaseUrl}${path}`);
  if (response.status() === 404) {
    return;
  }

  await ensureOk(response, `DELETE ${path}`);
}

export async function listCollection<T>(
  request: APIRequestContext,
  path: string,
): Promise<T[]> {
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
    birth_date: '1990-01-01',
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
    lab_code: null,
    diagnosis: null,
    ap_observation: null,
    grade: null,
    organ: null,
    status: null,
    tnm: null,
    registration_date: null,
    operation_date: null,
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
    has_tumor_tissue: false,
    has_non_tumor_tissue: false,
    obtain_date: obtainDate,
    organ: 'Lung',
    is_metastasis: false,
    tumor_biobank_code: tumorBiobankCode,
  });
}

export async function createBiomodel(
  request: APIRequestContext,
  tumorBiobankCode: string,
  type: string,
): Promise<BiomodelPayload> {
  return postJson<BiomodelPayload>(request, '/biomodels', {
    type,
    description: 'fixture',
    creation_date: '2024-01-01',
    status: 'active',
    progresses: true,
    viability: 75,
    tumor_biobank_code: tumorBiobankCode,
    parent_trial_id: null,
  });
}

export async function createPassage(
  request: APIRequestContext,
  biomodelId: string,
  number: number,
): Promise<PassagePayload> {
  return postJson<PassagePayload>(request, '/passages', {
    number,
    description: 'fixture',
    biomodel_id: biomodelId,
    parent_trial_id: null,
  });
}

export async function createTrial(
  request: APIRequestContext,
  passageId: string,
  description: string,
): Promise<TrialPayload> {
  return postJson<TrialPayload>(request, '/trials', {
    success: true,
    description,
    status: null,
    preclinical_trials: null,
    creation_date: '2025-01-01',
    biobank_shipment: false,
    biobank_arrival_date: null,
    passage_id: passageId,
  });
}

export async function deletePatient(request: APIRequestContext, nhc: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/patients/${nhc}`);
}

export async function deleteTumor(
  request: APIRequestContext,
  biobankCode: string,
): Promise<void> {
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

export async function deleteTrial(request: APIRequestContext, id: string): Promise<void> {
  await deleteIgnoreNotFound(request, `/trials/${id}`);
}
