import os
import tarfile
import tempfile

from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.shared.config import settings
from app.shared.deps import get_session

router = APIRouter(prefix='/admin', tags=['admin'])


async def verify_admin_key(x_admin_key: str = Header(...)):
    if not settings.ADMIN_API_KEY:
        raise HTTPException(status_code=503, detail='Admin API key not configured')
    if x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail='Invalid admin key')
    return True


@router.post('/seed')
async def admin_seed(_=Depends(verify_admin_key)):
    from scripts.lib.seed import run_seed
    await run_seed()
    return {'status': 'ok'}


@router.post('/guidelines/import')
async def admin_import_guidelines(
    session: AsyncSession = Depends(get_session),
    _=Depends(verify_admin_key),
):
    from app.guidelines.service import import_guidelines
    return await import_guidelines(session)


@router.post('/embeddings/products')
async def admin_embed_products(
    session: AsyncSession = Depends(get_session),
    _=Depends(verify_admin_key),
):
    from app.products.models import Product
    from app.suggestion.embeddings import upsert_products_batch
    products = (await session.exec(select(Product))).all()
    await upsert_products_batch(products)
    return {'status': 'ok', 'count': len(products)}


@router.post('/chroma/upload')
async def admin_upload_chroma(
    file: UploadFile,
    _=Depends(verify_admin_key),
):
    dest = settings.CHROMA_PERSIST_DIR or './chroma_db'
    os.makedirs(dest, exist_ok=True)

    with tempfile.NamedTemporaryFile(suffix='.tar.gz', delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        with tarfile.open(tmp_path, 'r:gz') as tar:
            tar.extractall(path=dest)
    finally:
        os.unlink(tmp_path)

    return {'status': 'ok', 'path': dest}
