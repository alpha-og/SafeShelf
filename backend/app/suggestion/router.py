from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.shared.deps import get_session
from app.suggestion.service import get_product_suggestions
from app.products.schemas import ProductResponse, CategoryResponse

router = APIRouter(prefix="/suggestion", tags=["suggestion"])

@router.get("/{barcode}", response_model=list[ProductResponse])
async def get_suggestions(
    barcode: str,
    n: int = Query(default=5, ge=1, le=20),
    session: AsyncSession = Depends(get_session)
):
    """
    Get top N similar products based on embedding similarity of name, brand, category, and description.
    """
    try:
        products = await get_product_suggestions(barcode, session, n=n)
        
        # Convert to ProductResponse schema
        response = []
        for p in products:
            categories_res = []
            for c in getattr(p, "categories", []):
                categories_res.append(
                    CategoryResponse(
                        id=str(c.uuid),
                        name=c.name,
                        off_tag=c.off_tag
                    )
                )
            
            response.append(
                ProductResponse(
                    id=str(p.uuid),
                    barcode=p.barcode,
                    product_name=p.product_name,
                    product_image=p.product_image,
                    brand=p.brand,
                    quantity=p.quantity,
                    categories=categories_res
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get product suggestions: {str(e)}"
        )
