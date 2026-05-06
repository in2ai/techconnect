"""File import endpoints."""

from typing import Annotated

from fastapi import APIRouter, File, UploadFile

from app.api.dependencies import AdminUserDep, SessionDep
from app.services.pdx_import import PdxWorkbookImportSummary, import_pdx_workbook

router = APIRouter(prefix='/imports', tags=['Imports'])


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