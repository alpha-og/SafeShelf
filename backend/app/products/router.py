from fastapi import APIRouter, Query

from app.products.schemas import BarcodeResponse, IdentifyRequest, IdentifyResponse, SearchResponse
from app.products.service import get_product_by_barcode, identify_product, search_products

router = APIRouter(prefix='/products', tags=['products'])


@router.get('/{barcode}', response_model=BarcodeResponse)
async def product_by_barcode(barcode: str):
    return await get_product_by_barcode(barcode)


@router.get('/search', response_model=SearchResponse)
async def search(q: str = Query(min_length=1)):
    return await search_products(q)


@router.post('/identify', response_model=IdentifyResponse)
async def identify(req: IdentifyRequest):
    return await identify_product(req)
