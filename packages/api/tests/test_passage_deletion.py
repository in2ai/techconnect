from collections.abc import Iterator
from fastapi.testclient import TestClient
import pytest

from app.core.config import get_settings
from app.core.database import get_engine
from app.main import create_application


@pytest.fixture
def client(tmp_path, monkeypatch) -> Iterator[TestClient]:
    database_path = tmp_path / "passage-test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{database_path}")
    monkeypatch.setenv("AUTH_BOOTSTRAP_EMAIL", "admin@example.com")
    monkeypatch.setenv("AUTH_BOOTSTRAP_PASSWORD", "super-secret-password")
    monkeypatch.setenv("AUTH_BOOTSTRAP_FULL_NAME", "Test Admin")
    monkeypatch.setenv("AUTH_COOKIE_SECURE", "false")

    get_settings.cache_clear()
    get_engine.cache_clear()

    try:
        with TestClient(create_application()) as test_client:
            yield test_client
    finally:
        get_settings.cache_clear()
        get_engine.cache_clear()


def test_delete_passage_cascade_deletes_associated_trial_data(client: TestClient):
    # Log in
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "super-secret-password"},
    )
    assert login_res.status_code == 200

    # Create patient
    client.post("/api/patients", json={"nhc": "TEST-PATIENT-1", "sex": "F", "age": 50})

    # Create tumor
    client.post("/api/tumors", json={"biobank_code": "TEST-TUMOR-1", "patient_nhc": "TEST-PATIENT-1"})

    # Create biomodel (PDX type)
    client.post(
        "/api/biomodels",
        json={
            "id": "PDX-MODEL-1",
            "type": "PDX",
            "tumor_biobank_code": "TEST-TUMOR-1",
        },
    )

    # Create passage
    passage_res = client.post(
        "/api/passages",
        json={
            "id": "PDX-MODEL-1-p1",
            "biomodel_id": "PDX-MODEL-1",
            "description": "Test Passage",
        },
    )
    assert passage_res.status_code == 200

    # Verify PDXTrial auto-created
    pdx_res = client.get("/api/pdx-trials/PDX-MODEL-1-p1")
    assert pdx_res.status_code == 200

    # Delete passage
    del_res = client.delete("/api/passages/PDX-MODEL-1-p1")
    assert del_res.status_code == 200
    assert del_res.json() == {"ok": True}

    # Verify passage and PDXTrial are deleted
    assert client.get("/api/passages/PDX-MODEL-1-p1").status_code == 404
    assert client.get("/api/pdx-trials/PDX-MODEL-1-p1").status_code == 404


def test_delete_passage_with_mouse_implant_measures_cascade(client: TestClient):
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "super-secret-password"},
    )
    assert login_res.status_code == 200

    client.post("/api/patients", json={"nhc": "TEST-PATIENT-2", "sex": "M", "age": 60})
    client.post("/api/tumors", json={"biobank_code": "TEST-TUMOR-2", "patient_nhc": "TEST-PATIENT-2"})
    client.post("/api/biomodels", json={"id": "LUNG090221", "type": "PDX", "tumor_biobank_code": "TEST-TUMOR-2"})
    passage_id = "LUNG090221-LUNG090221-px1"
    client.post("/api/passages", json={"id": passage_id, "biomodel_id": "LUNG090221", "description": "Passage 1"})

    # Create mouse tied to pdx_trial
    mouse_res = client.post(
        "/api/mice",
        json={"pdx_trial_id": passage_id, "strain": "NSG", "sex": "F"},
    )
    assert mouse_res.status_code == 200
    mouse_id = mouse_res.json()["id"]

    # Create implant
    implant_res = client.post(
        "/api/implants",
        json={"mouse_id": mouse_id, "implant_location": "Flank", "type": "Subcutaneous"},
    )
    assert implant_res.status_code == 200
    implant_id = implant_res.json()["id"]

    # Create measure
    measure_res = client.post(
        "/api/measures",
        json={"implant_id": implant_id, "length": 10.5, "width": 8.0},
    )
    assert measure_res.status_code == 200

    # Now delete passage (matching exact endpoint in user prompt!)
    del_res = client.delete(f"/api/passages/{passage_id}")
    assert del_res.status_code == 200
    assert del_res.json() == {"ok": True}

    # Verify everything was deleted cleanly without 500 error
    assert client.get(f"/api/passages/{passage_id}").status_code == 404
    assert client.get(f"/api/pdx-trials/{passage_id}").status_code == 404


def test_delete_pdo_passage_cascade_deletes_pdo_trial(client: TestClient):
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "super-secret-password"},
    )
    assert login_res.status_code == 200

    client.post("/api/patients", json={"nhc": "TEST-PATIENT-PDO", "sex": "F", "age": 45})
    client.post("/api/tumors", json={"biobank_code": "TEST-TUMOR-PDO", "patient_nhc": "TEST-PATIENT-PDO"})
    client.post("/api/biomodels", json={"id": "PDO-MODEL-1", "type": "PDO", "tumor_biobank_code": "TEST-TUMOR-PDO"})
    
    passage_id = "PDO-MODEL-1-p1"
    passage_res = client.post("/api/passages", json={"id": passage_id, "biomodel_id": "PDO-MODEL-1", "description": "PDO Passage 1"})
    assert passage_res.status_code == 200

    # Verify PDOTrial was auto-created
    pdo_res = client.get(f"/api/pdo-trials/{passage_id}")
    assert pdo_res.status_code == 200

    # Delete passage
    del_res = client.delete(f"/api/passages/{passage_id}")
    assert del_res.status_code == 200
    assert del_res.json() == {"ok": True}

    # Verify passage and PDOTrial are both deleted
    assert client.get(f"/api/passages/{passage_id}").status_code == 404
    assert client.get(f"/api/pdo-trials/{passage_id}").status_code == 404


def test_delete_lc_passage_cascade_deletes_lc_trial_and_facs(client: TestClient):
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "super-secret-password"},
    )
    assert login_res.status_code == 200

    client.post("/api/patients", json={"nhc": "TEST-PATIENT-LC", "sex": "M", "age": 55})
    client.post("/api/tumors", json={"biobank_code": "TEST-TUMOR-LC", "patient_nhc": "TEST-PATIENT-LC"})
    client.post("/api/biomodels", json={"id": "LC-MODEL-1", "type": "LC", "tumor_biobank_code": "TEST-TUMOR-LC"})
    
    passage_id = "LC-MODEL-1-p1"
    passage_res = client.post("/api/passages", json={"id": passage_id, "biomodel_id": "LC-MODEL-1", "description": "LC Passage 1"})
    assert passage_res.status_code == 200

    # Verify LCTrial and FACS auto-created
    lc_res = client.get(f"/api/lc-trials/{passage_id}")
    assert lc_res.status_code == 200

    facs_list_res = client.get("/api/facs")
    assert facs_list_res.status_code == 200
    facs_items = [f for f in facs_list_res.json() if f.get("lc_trial_id") == passage_id]
    assert len(facs_items) == 1

    # Delete passage
    del_res = client.delete(f"/api/passages/{passage_id}")
    assert del_res.status_code == 200
    assert del_res.json() == {"ok": True}

    # Verify passage, LCTrial, and FACS are deleted
    assert client.get(f"/api/passages/{passage_id}").status_code == 404
    assert client.get(f"/api/lc-trials/{passage_id}").status_code == 404
    updated_facs = [f for f in client.get("/api/facs").json() if f.get("lc_trial_id") == passage_id]
    assert len(updated_facs) == 0

