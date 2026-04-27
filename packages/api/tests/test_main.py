from sqlmodel import Session, select
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.database import get_engine
from app.main import app
from app.seed import seed_database
from models import Implant, Mouse, Patient, Sample, Tumor

client = TestClient(app)


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "TechConnect API is running"}


def test_read_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_seed_database_is_rerunnable(tmp_path, monkeypatch):
    database_path = tmp_path / "seed-test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{database_path}")

    get_settings.cache_clear()
    get_engine.cache_clear()

    try:
        first_run = seed_database()
        second_run = seed_database()

        assert first_run.created > 0
        assert second_run.updated > 0

        with Session(get_engine()) as session:
            mouse = session.exec(select(Mouse)).first()
            implant = session.exec(select(Implant)).first()
            patient = session.exec(select(Patient)).first()
            tumor = session.exec(select(Tumor)).first()
            sample = session.exec(select(Sample)).first()

        assert mouse is not None
        assert implant is not None
        assert implant.mouse_id == mouse.id
        assert patient is not None
        assert patient.sex in {"M", "F"}
        assert patient.age is not None
        assert tumor is not None
        assert tumor.tube_code == "TUBE-TC-001"
        assert sample is not None
        assert sample.id == f"{tumor.biobank_code}-M1"
    finally:
        get_engine.cache_clear()
        get_settings.cache_clear()
