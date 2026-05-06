from collections.abc import Iterator
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.core.config import get_settings
from app.core.database import get_engine
from app.main import create_application


@pytest.fixture
def client(tmp_path, monkeypatch) -> Iterator[TestClient]:
    database_path = tmp_path / 'imports-test.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{database_path}')
    monkeypatch.setenv('AUTH_BOOTSTRAP_EMAIL', 'admin@example.com')
    monkeypatch.setenv('AUTH_BOOTSTRAP_PASSWORD', 'super-secret-password')
    monkeypatch.setenv('AUTH_BOOTSTRAP_FULL_NAME', 'Test Admin')
    monkeypatch.setenv('AUTH_COOKIE_SECURE', 'false')

    get_settings.cache_clear()
    get_engine.cache_clear()

    try:
        with TestClient(create_application()) as test_client:
            yield test_client
    finally:
        get_engine.cache_clear()
        get_settings.cache_clear()


def test_import_pdx_workbook_creates_and_updates_records(client: TestClient):
    login_response = client.post(
        '/api/auth/login',
        json={'email': 'admin@example.com', 'password': 'super-secret-password'},
    )
    assert login_response.status_code == 200

    first_workbook = _build_workbook(age=63, diagnosis='Adenocarcinoma de pulmón')

    first_response = client.post(
        '/api/imports/pdx-workbook',
        files={
            'file': (
                'PDXs.xlsx',
                first_workbook.getvalue(),
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
        },
    )

    assert first_response.status_code == 200
    assert first_response.json() == {
        'filename': 'PDXs.xlsx',
        'sheets_processed': 1,
        'rows_imported': 1,
        'rows_skipped': 0,
        'rows_failed': 0,
        'patients': {'created': 1, 'updated': 0},
        'tumors': {'created': 1, 'updated': 0},
        'biomodels': {'created': 1, 'updated': 0},
        'passages': {'created': 2, 'updated': 0},
        'pdx_trials': {'created': 2, 'updated': 0},
        'images': {'created': 2, 'updated': 0},
        'errors': [],
    }

    patient_response = client.get('/api/patients/88888')
    assert patient_response.status_code == 200
    assert patient_response.json()['sex'] == 'F'
    assert patient_response.json()['age'] == 63

    tumor_response = client.get('/api/tumors/BIOBPRQ1246')
    assert tumor_response.status_code == 200
    assert tumor_response.json()['tube_code'] == '44000008'
    assert tumor_response.json()['ap_diagnosis'] == 'Adenocarcinoma de pulmón'
    assert tumor_response.json()['intervention_date'] == '2021-02-09'

    biomodel_response = client.get('/api/biomodels/LUNG 090221')
    assert biomodel_response.status_code == 200
    assert biomodel_response.json()['type'] == 'PDX'
    assert biomodel_response.json()['tumor_biobank_code'] == 'BIOBPRQ1246'

    passages_response = client.get('/api/passages')
    assert passages_response.status_code == 200
    assert {passage['id'] for passage in passages_response.json()} == {
        'LUNG 090221-P1',
        'LUNG 090221-P2',
    }

    pdx_trials_response = client.get('/api/pdx-trials')
    assert pdx_trials_response.status_code == 200
    assert {trial['id'] for trial in pdx_trials_response.json()} == {
        'LUNG 090221-P1',
        'LUNG 090221-P2',
    }

    images_response = client.get('/api/images')
    assert images_response.status_code == 200
    images = sorted(images_response.json(), key=lambda image: image['passage_id'])
    assert len(images) == 2
    assert images[0]['passage_id'] == 'LUNG 090221-P1'
    assert images[0]['type'] == 'H&E'
    assert images[0]['scanner_magnification'] == 40
    assert images[0]['image_date'] == '2021-10-14'
    assert images[1]['passage_id'] == 'LUNG 090221-P2'
    assert images[1]['type'] == 'H&E'
    assert images[1]['scanner_magnification'] == 40
    assert images[1]['image_date'] == '2022-04-21'

    second_workbook = _build_workbook(age=64, diagnosis='Diagnóstico actualizado')
    second_response = client.post(
        '/api/imports/pdx-workbook',
        files={
            'file': (
                'PDXs.xlsx',
                second_workbook.getvalue(),
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
        },
    )

    assert second_response.status_code == 200
    assert second_response.json()['patients'] == {'created': 0, 'updated': 1}
    assert second_response.json()['tumors'] == {'created': 0, 'updated': 1}
    assert second_response.json()['biomodels'] == {'created': 0, 'updated': 1}
    assert second_response.json()['passages'] == {'created': 0, 'updated': 2}
    assert second_response.json()['pdx_trials'] == {'created': 0, 'updated': 2}
    assert second_response.json()['images'] == {'created': 0, 'updated': 2}

    updated_patient = client.get('/api/patients/88888')
    assert updated_patient.status_code == 200
    assert updated_patient.json()['age'] == 64

    updated_tumor = client.get('/api/tumors/BIOBPRQ1246')
    assert updated_tumor.status_code == 200
    assert updated_tumor.json()['ap_diagnosis'] == 'Diagnóstico actualizado'


def test_import_pdx_workbook_supports_legacy_sheet_layout(client: TestClient):
    login_response = client.post(
        '/api/auth/login',
        json={'email': 'admin@example.com', 'password': 'super-secret-password'},
    )
    assert login_response.status_code == 200

    workbook = _build_legacy_workbook()
    response = client.post(
        '/api/imports/pdx-workbook',
        files={
            'file': (
                'legacy.xlsx',
                workbook.getvalue(),
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
        },
    )

    assert response.status_code == 200
    assert response.json()['rows_imported'] == 1
    assert response.json()['passages'] == {'created': 2, 'updated': 0}
    assert response.json()['images'] == {'created': 1, 'updated': 0}

    biomodel_response = client.get('/api/biomodels/SAR011124')
    assert biomodel_response.status_code == 200
    assert biomodel_response.json()['tumor_biobank_code'] == 'BIOBSAR0007'

    passages_response = client.get('/api/passages')
    assert passages_response.status_code == 200
    passages = sorted(passages_response.json(), key=lambda passage: passage['id'])
    assert passages[0]['id'] == 'SAR011124-P1'
    assert passages[0]['success'] is False
    assert passages[1]['id'] == 'SAR011124-P2'
    assert passages[1]['success'] is True

    images_response = client.get('/api/images')
    assert images_response.status_code == 200
    images = images_response.json()
    assert len(images) == 1
    assert images[0]['passage_id'] == 'SAR011124-P2'
    assert images[0]['type'] == 'H&E'
    assert images[0]['scanner_magnification'] == 40
    assert images[0]['image_date'] == '2024-12-05'


def _build_workbook(*, age: int, diagnosis: str) -> BytesIO:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = 'LUNG'

    worksheet.append(
        [
            'TUMOR',
            None,
            None,
            None,
            None,
            'BIOBANCO CODE',
            'DATE SURGERY',
            'NHC',
            'CÓDIGO',
            'DIAGNÓSTICO AP BIOPSIA',
            'SEXO',
            'EDAD',
            None,
            None,
            None,
            None,
            'px0',
            'SAMPLES',
            'FFPE',
            'Slides',
            'Scanner',
            'BB SAMPLES',
            'px1',
            'SAMPLES',
            'FFPE',
            'Slides',
            'Scanner',
            'BB SAMPLES',
        ]
    )
    worksheet.append(
        [
            'BIOMODEL. ID BIOMODELOS',
            'NUEVO TUMOR. Grado',
            'NUEVO TUMOR. Órgano',
            'NUEVO TUMOR. Estadio',
            'NUEVO TUMOR. TNM',
            'NUEVO TUMOR. codigo de tubo',
            'NUEVO TUMOR. Fecha de operación.',
            'PACIENTE. NHC',
            'NUEVO TUMOR. Código de Biobanco',
            'NUEVO TUMOR. Diagnóstico AP',
            'PACIENTE. SEXO',
            'PACIENTE. EDAD',
        ]
    )
    worksheet.append(
        [
            'LUNG 090221',
            None,
            'Lung',
            'IIIA',
            'T2N2M0',
            '44000008',
            '09/02/2021',
            '88888',
            'BIOBPRQ1246',
            diagnosis,
            'M',
            age,
            None,
            None,
            None,
            None,
            '✅',
            'CV',
            '✅',
            'H&E',
            '40x',
            '14/10/2021',
            '✅',
            None,
            '✅',
            'H&E',
            '40x',
            '21/04/2022',
        ]
    )

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    workbook.close()
    return output


def _build_legacy_workbook() -> BytesIO:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = 'SAR'

    worksheet.append(
        [
            'TUMOR',
            'BIOBANCO CODE',
            'DATE SURGERY',
            'NHC',
            'CÓDIGO',
            'DIAGNÓSTICO AP BIOPSIA',
            'SEXO',
            'EDAD',
            'INCIDENCIAS',
            'px0',
            'SAMPLES',
            'FFPE',
            'Slides',
            'Scanner',
            'BB SAMPLES',
            'px1',
            'SAMPLES',
            'FFPE',
            'Slides',
            'Scanner',
            'BB SAMPLES',
        ]
    )
    worksheet.append(
        [
            'SAR011124',
            4400006,
            '01/11/2024',
            33333,
            'BIOBSAR0007',
            'Liposarcoma mixoide de bajo grado',
            'V',
            46,
            'implantado el 05/12/24',
            '❌',
            None,
            None,
            None,
            None,
            None,
            '✅',
            'CV',
            '✅',
            'H&E',
            '40x',
            '05/12/2024',
        ]
    )

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    workbook.close()
    return output