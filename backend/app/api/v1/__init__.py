from fastapi import APIRouter

from app.analysis.router import router as analysis_router
from app.auth.router import router as auth_router
from app.cart.router import router as cart_router
from app.conditions.router import router as conditions_router
from app.guidelines.router import router as guidelines_router
from app.products.router import router as products_router
from app.profiles.router import router as profiles_router
from app.recipes.router import router as recipes_router
from app.sessions.router import router as sessions_router
from app.stores.router import router as stores_router

v1_router = APIRouter(prefix='/v1')
v1_router.include_router(analysis_router)
v1_router.include_router(auth_router)
v1_router.include_router(cart_router)
v1_router.include_router(conditions_router)
v1_router.include_router(guidelines_router)
v1_router.include_router(products_router)
v1_router.include_router(profiles_router)
v1_router.include_router(recipes_router)
v1_router.include_router(sessions_router)
v1_router.include_router(stores_router)
