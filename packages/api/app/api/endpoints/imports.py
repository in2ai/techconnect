"""File import and export endpoints."""

from typing import Annotated

from fastapi import APIRouter, File, Response, UploadFile

from app.api.dependencies import AdminUserDep, SessionDep
from app.services.dataset_transfer import (
    DatasetImportSummary,
    build_dataset_export_csv_zip,
    build_dataset_export_workbook,
    build_dataset_template_csv_zip,
    build_dataset_template_workbook,
    import_dataset_csv_zip,
    import_dataset_workbook,
)
from app.services.pdx_import import PdxWorkbookImportSummary, import_pdx_workbook

router = APIRouter(prefix='/imports', tags=['Imports'])


@router.get('/dataset-template.xlsx', summary='Download dataset Excel template')
def download_dataset_template_workbook(_: AdminUserDep) -> Response:
    """Download an empty Excel workbook with one sheet per supported domain table."""
    return Response(
        content=build_dataset_template_workbook(),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename="techconnect-dataset-template.xlsx"'},
    )


@router.get('/dataset-template.zip', summary='Download dataset CSV templates')
def download_dataset_template_csv_zip(_: AdminUserDep) -> Response:
    """Download a ZIP archive with one CSV template per supported domain table."""
    return Response(
        content=build_dataset_template_csv_zip(),
        media_type='application/zip',
        headers={'Content-Disposition': 'attachment; filename="techconnect-dataset-template.zip"'},
    )


@router.get('/dataset.xlsx', summary='Export dataset as Excel workbook')
def download_dataset_export_workbook(session: SessionDep, _: AdminUserDep) -> Response:
    """Download the current domain dataset as an Excel workbook."""
    return Response(
        content=build_dataset_export_workbook(session),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheet.sheet',
        headers={'Content-Disposition': 'attachment; filename="techconnect-dataset.xlsx"'},
    )


@router.get('/dataset.zip', summary='Export dataset as CSV ZIP')
def download_dataset_export_csv_zip(session: SessionDep, _: AdminUserDep) -> Response:
    """Download the current domain dataset as a ZIP archive with one CSV per table."""
    return Response(
        content=build_dataset_export_csv_zip(session),
        media_type='application/zip',
        headers={'Content-Disposition': 'attachment; filename="techconnect-dataset.zip"'},
    )


@router.post('/dataset-workbook', response_model=DatasetImportSummary, summary='Import dataset workbook')
async def import_dataset_workbook_endpoint(
    file: Annotated[UploadFile, File(description='Dataset workbook in XLSX format')],
    session: SessionDep,
    _: AdminUserDep,
) -> DatasetImportSummary:
    """Import domain data from a workbook containing one sheet per supported table."""
    contents = await file.read()
    try:
        return import_dataset_workbook(session, contents, filename=file.filename)
    finally:
        await file.close()


@router.post('/dataset-csv-zip', response_model=DatasetImportSummary, summary='Import dataset CSV ZIP')
async def import_dataset_csv_zip_endpoint(
    file: Annotated[UploadFile, File(description='Dataset CSV archive in ZIP format')],
    session: SessionDep,
    _: AdminUserDep,
) -> DatasetImportSummary:
    """Import domain data from a ZIP archive containing one CSV per supported table."""
    contents = await file.read()
    try:
        return import_dataset_csv_zip(session, contents, filename=file.filename)
    finally:
        await file.close()


@router.post('/pdx-workbook', response_model=PdxWorkbookImportSummary, summary='Import PDX workbook')
async def import_pdx_workbook_endpoint(
    file: Annotated[UploadFile, File(description='Legacy PDX workbook in XLSX format')],
    session: SessionDep,
    _: AdminUserDep,
) -> PdxWorkbookImportSummary:
    """Import patient, tumor, and biomodel records from an XLSX workbook."""
    contents = await file.read()
    try:
        return import_pdx_workbook(session, contents, filename=file.filename)
    finally:
        await file.close()