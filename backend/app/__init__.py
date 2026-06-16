import uvicorn

from app.shared.config import settings


def run_cli() -> None:
    uvicorn.run(
        'app.main:app',
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
