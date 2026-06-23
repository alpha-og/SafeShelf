import os
import tarfile
import tempfile
from pathlib import Path

import httpx
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.products.models import Product
from app.shared.config import settings
from app.suggestion.embeddings import upsert_products_batch
from scripts.lib.logger import error, header, info, success


async def run_setup_data(
    remote: bool = False,
    guidelines: bool = True,
    embeddings: bool = True,
):
    if remote and not settings.SUPABASE_DATABASE_URL:
        error('SUPABASE_DATABASE_URL is not set')
        raise SystemExit(1)

    if guidelines:
        header('Importing Guidelines')
        await _run_guidelines(remote)

    if embeddings:
        header('Generating Product Embeddings')
        await _run_embeddings(remote)

    if remote and embeddings:
        header('Uploading ChromaDB to HF Space')
        _upload_chroma()


async def _run_guidelines(remote: bool):
    session = await _make_session(remote)
    try:
        from app.guidelines.service import import_guidelines

        result = await import_guidelines(session)
        success(f'Guidelines imported: {result}')
    finally:
        await session.close()


async def _run_embeddings(remote: bool):
    session = await _make_session(remote)
    try:
        products = (
            await session.exec(select(Product).options(selectinload(Product.categories)))
        ).all()
        info(f'Found {len(products)} products')
        if products:
            await upsert_products_batch(products)
            success(f'Embedded {len(products)} products')
        else:
            info('No products to embed')
    finally:
        await session.close()


async def _make_session(remote: bool) -> AsyncSession:
    if remote:
        engine = create_async_engine(
            settings.SUPABASE_DATABASE_URL,
            echo=settings.DB_ECHO,
        )
        maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        return maker()
    from app.shared.db import async_session

    return async_session()


def _upload_chroma():
    chroma_path = Path(settings.CHROMA_PERSIST_DIR or './chroma_db')
    if not chroma_path.is_dir():
        error(f'ChromaDB directory not found: {chroma_path}')
        raise SystemExit(1)

    tarball = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.tar.gz', delete=False) as tmp:
            tarball = tmp.name
            with tarfile.open(tarball, 'w:gz') as tar:
                tar.add(chroma_path, arcname='.')

        url = os.environ.get('HF_SPACE_URL', 'https://alpha0g-safe-shelf.hf.space')
        admin_key = settings.ADMIN_API_KEY

        info(f'Uploading to {url}/v1/admin/chroma/upload ...')
        with httpx.Client(timeout=httpx.Timeout(120.0, write=120.0)) as client:
            with open(tarball, 'rb') as f:
                resp = client.post(
                    f'{url}/v1/admin/chroma/upload',
                    headers={'X-Admin-Key': admin_key},
                    files={'file': (f'{chroma_path.name}.tar.gz', f)},
                )
            if resp.is_success:
                success(f'ChromaDB uploaded: {resp.json()}')
            else:
                error(f'Upload failed ({resp.status_code}): {resp.text}')
    finally:
        if tarball and os.path.exists(tarball):
            os.unlink(tarball)
