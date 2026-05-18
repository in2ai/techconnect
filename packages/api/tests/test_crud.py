from app.services.crud import _format_database_error
from models import Patient, Sample, Tumor


def test_format_database_error_humanizes_unique_constraint_details():
    message = _format_database_error(
        Patient,
        'UNIQUE constraint failed: patient.nhc',
        action='save',
    )

    assert message == 'A patient with this NHC already exists.'


def test_format_database_error_humanizes_required_field_details():
    message = _format_database_error(
        Sample,
        'NOT NULL constraint failed: sample.tumor_biobank_code',
        action='save',
    )

    assert message == 'Tumor biobank code is required.'


def test_format_database_error_humanizes_delete_foreign_key_details():
    message = _format_database_error(
        Tumor,
        'FOREIGN KEY constraint failed',
        action='delete',
    )

    assert message == 'This tumor cannot be deleted because related records still exist.'


def test_format_database_error_falls_back_to_generic_save_message():
    message = _format_database_error(
        Tumor,
        'sqlite3.OperationalError: database is locked',
        action='save',
    )

    assert message == 'Could not save this tumor. Please review the input and try again.'