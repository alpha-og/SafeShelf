import logging
from http import HTTPStatus

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def _rfc7807(status: int, detail: str, instance: str, type_url: str | None = None) -> dict:
    return {
        "success": False,
        "type": type_url or f"https://api.safeshelf.app/errors/{status}",
        "title": HTTPStatus(status).phrase,
        "status": status,
        "detail": detail,
        "instance": instance,
    }


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_rfc7807(exc.status_code, exc.detail, str(request.url.path)),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=_rfc7807(422, str(exc.errors()), str(request.url.path)),
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_rfc7807(500, "Internal server error", str(request.url.path)),
    )
