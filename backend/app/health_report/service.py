import os
import tempfile

import fitz
from fastapi import HTTPException, UploadFile, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.health_report.agent import extract_health_data
from app.health_report.models import HealthReport

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def upload_and_extract_report(
    file: UploadFile,
    user_id: int,
    session: AsyncSession,
) -> dict:
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Only PDF files are accepted',
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail='File size exceeds 10MB limit',
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        doc = fitz.open(tmp_path)
        pdf_text = ''
        for page in doc:
            pdf_text += page.get_text()
        doc.close()

        if not pdf_text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail='Could not extract any text from the PDF',
            )

        extracted = await extract_health_data(pdf_text)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to process PDF: {str(e)}',
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    metadata = extracted.get('metadata', {}) or {}
    report = HealthReport(
        user_id=user_id,
        file_name=file.filename,
        extracted_data=extracted,
        report_date=metadata.get('reportDate'),
        laboratory=metadata.get('laboratory'),
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)

    return {
        'id': report.id,
        'extractedData': extracted,
    }


async def list_reports(user_id: int, session: AsyncSession) -> list[dict]:
    result = await session.exec(
        select(HealthReport)
        .where(HealthReport.user_id == user_id)
        .order_by(HealthReport.created_at.desc())
    )
    reports = result.all()
    return [
        {
            'id': r.id,
            'fileName': r.file_name,
            'reportDate': r.report_date,
            'laboratory': r.laboratory,
            'createdAt': r.created_at,
        }
        for r in reports
    ]
