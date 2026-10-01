"""Regressions for schema, API, and dataset consistency."""

import csv
from collections.abc import Iterator
from io import BytesIO, StringIO
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import get_settings
from app.core.database import get_engine
from app.main import create_application
from app.services import crud
from models import FACS


@pytest.fixture
def client(tmp_path, monkeypatch) -> Iterator[TestClient]:
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'consistency.db'}")
    monkeypatch.setenv("AUTH_BOOTSTRAP_EMAIL", "admin@example.com")
    monkeypatch.setenv("AUTH_BOOTSTRAP_PASSWORD", "super-secret-password")
    monkeypatch.setenv("AUTH_COOKIE_SECURE", "false")
    get_settings.cache_clear()
    get_engine.cache_clear()
    try:
        with TestClient(create_application()) as client:
            assert (
                client.post(
                    "/api/auth/login",
                    json={"email": "admin@example.com", "password": "super-secret-password"},
                ).status_code
                == 200
            )
            assert client.post("/api/patients", json={"nhc": "PAT"}).status_code == 200
            assert (
                client.post(
                    "/api/tumors", json={"biobank_code": "TUM", "patient_nhc": "PAT"}
                ).status_code
                == 200
            )
            yield client
    finally:
        get_engine.cache_clear()
        get_settings.cache_clear()


def create_biomodel(client: TestClient, model_type: str = "PDX") -> str:
    response = client.post(
        "/api/biomodels",
        json={"id": "BM", "type": model_type, "tumor_biobank_code": "TUM"},
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def create_passage(client: TestClient) -> str:
    response = client.post("/api/passages", json={"biomodel_id": "BM", "status": False})
    assert response.status_code == 200, response.text
    assert response.json()["biomodel_id"] == "BM"
    assert response.json()["status"] is False
    return response.json()["id"]


@pytest.mark.parametrize(
    "model_type,endpoint", [("PDX", "pdx-trials"), ("PDO", "pdo-trials"), ("LC", "lc-trials")]
)
def test_passage_creation_returns_record_and_subtype(client: TestClient, model_type, endpoint):
    create_biomodel(client, model_type)
    passage_id = create_passage(client)
    assert passage_id == "BM-P1"
    assert client.get(f"/api/{endpoint}/{passage_id}").status_code == 200
    if model_type == "LC":
        assert (
            len(
                [
                    item
                    for item in client.get("/api/facs").json()
                    if item["lc_trial_id"] == passage_id
                ]
            )
            == 1
        )


def test_multiple_mice_and_descendants_are_deleted_with_passage(client: TestClient):
    create_biomodel(client)
    passage_id = create_passage(client)
    descendants = []
    for sex in ["M", "F"]:
        mouse = client.post("/api/mice", json={"pdx_trial_id": passage_id, "sex": sex})
        assert mouse.status_code == 200
        implant = client.post("/api/implants", json={"mouse_id": mouse.json()["id"]})
        assert implant.status_code == 200
        measure = client.post(
            "/api/measures", json={"implant_id": implant.json()["id"], "length": 10, "width": 8}
        )
        assert measure.status_code == 200
        descendants.extend(
            [
                (name, response.json()["id"])
                for name, response in [
                    ("mice", mouse),
                    ("implants", implant),
                    ("measures", measure),
                ]
            ]
        )
    assert client.delete(f"/api/passages/{passage_id}").status_code == 200
    for endpoint, item_id in descendants:
        assert client.get(f"/api/{endpoint}/{item_id}").status_code == 404
    assert client.get(f"/api/pdx-trials/{passage_id}").status_code == 404


def test_biomodel_type_is_locked_after_passage_creation(client: TestClient):
    create_biomodel(client)
    assert client.patch("/api/biomodels/BM", json={"type": "PDO"}).status_code == 200
    passage_id = create_passage(client)
    response = client.patch("/api/biomodels/BM", json={"type": "PDX"})
    assert response.status_code == 409
    assert client.get("/api/biomodels/BM").json()["type"] == "PDO"
    assert client.get(f"/api/pdo-trials/{passage_id}").status_code == 200
    assert client.patch("/api/biomodels/BM", json={"description": "updated"}).status_code == 200


def test_sqlite_rejects_missing_foreign_keys_on_create_and_update(client: TestClient):
    with get_engine().connect() as connection:
        assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
    response = client.post("/api/samples", json={"tumor_biobank_code": "MISSING"})
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]
    response = client.patch("/api/tumors/TUM", json={"patient_nhc": "MISSING"})
    assert response.status_code == 400
    assert client.get("/api/tumors/TUM").json()["patient_nhc"] == "PAT"


def test_invalid_table_payloads_return_validation_errors(client: TestClient):
    response = client.post(
        "/api/biomodels", json={"id": "BM", "tumor_biobank_code": "TUM", "status": "active"}
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "status"]
    create_biomodel(client)
    assert client.patch("/api/biomodels/BM", json={"status": "active"}).status_code == 422
    assert client.get("/api/biomodels/BM").json()["status"] is None


def test_subtype_failure_rolls_back_passage_creation(client: TestClient, monkeypatch):
    create_biomodel(client, "LC")
    original = crud._create_passage_subtype_defaults

    def conflicting_defaults(session: Session, passage):
        original(session, passage)
        session.add(FACS(lc_trial_id=passage.id))

    monkeypatch.setattr(crud, "_create_passage_subtype_defaults", conflicting_defaults)
    response = client.post("/api/passages", json={"biomodel_id": "BM"})
    assert response.status_code == 400
    assert client.get("/api/passages/BM-P1").status_code == 404
    assert client.get("/api/lc-trials/BM-P1").status_code == 404
    assert not [item for item in client.get("/api/facs").json() if item["lc_trial_id"] == "BM-P1"]


def test_mouse_import_requires_id_when_trial_has_multiple_mice(client: TestClient):
    create_biomodel(client)
    passage_id = create_passage(client)
    mice = [
        client.post("/api/mice", json={"pdx_trial_id": passage_id, "strain": strain}).json()
        for strain in ["NSG", "NOD"]
    ]

    def import_mouse(mouse_id: str):
        archive_buffer = BytesIO()
        with ZipFile(archive_buffer, "w") as archive:
            template = client.get("/api/imports/dataset-template.zip")
            assert template.status_code == 200, template.text
            with ZipFile(BytesIO(template.content)) as template_zip:
                headers = next(
                    csv.reader(StringIO(template_zip.read("mouse.csv").decode("utf-8-sig")))
                )
            csv_buffer = StringIO()
            writer = csv.DictWriter(csv_buffer, fieldnames=headers)
            writer.writeheader()
            writer.writerow({"id": mouse_id, "passage_id": passage_id, "strain": "UPDATED"})
            archive.writestr("mouse.csv", csv_buffer.getvalue())
        response = client.post(
            "/api/imports/dataset-csv-zip",
            files={"file": ("dataset.zip", archive_buffer.getvalue(), "application/zip")},
        )
        assert response.status_code == 200
        return response.json()

    result = import_mouse("")
    assert result["rows_failed"] == 1
    assert "mouse ID" in str(result["errors"])
    assert client.get(f"/api/mice/{mice[0]['id']}").json()["strain"] == "NSG"
    result = import_mouse(mice[0]["id"])
    assert result["rows_failed"] == 0
    assert client.get(f"/api/mice/{mice[0]['id']}").json()["strain"] == "UPDATED"
    assert client.get(f"/api/mice/{mice[1]['id']}").json()["strain"] == "NOD"
