import json
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

from app.shared.config import settings


class ResponseEnvelopeMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        body_chunks: list[bytes] = []
        status_code = 200
        response_headers: list[tuple[bytes, bytes]] = []
        content_type = ""

        async def send_wrapper(message: dict[str, Any]) -> None:
            nonlocal body_chunks, status_code, response_headers, content_type

            if message["type"] == "http.response.start":
                status_code = message["status"]
                response_headers = message.get("headers", [])
                for k, v in response_headers:
                    if k.lower() == b"content-type":
                        content_type = v.decode()
                        break
                return

            if message["type"] == "http.response.body":
                chunk = message.get("body", b"")
                more_body = message.get("more_body", False)

                if more_body:
                    body_chunks.append(chunk)
                    return

                body_chunks.append(chunk)
                raw_body = b"".join(body_chunks)

                if status_code != 204 and "application/json" in content_type and status_code < 400:
                    try:
                        data = json.loads(raw_body)
                        meta: dict[str, object] = {"timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
                        req_meta = scope.get("_envelope_meta")
                        if isinstance(req_meta, dict):
                            meta.update(req_meta)
                        wrapped = json.dumps({"success": True, "data": data, "metadata": meta}).encode()
                    except Exception:
                        wrapped = raw_body
                else:
                    wrapped = raw_body

                new_headers = [(k, v) for k, v in response_headers if k.lower() not in {b"content-length", b"content-encoding", b"transfer-encoding"}]
                new_headers.append((b"content-length", str(len(wrapped)).encode()))
                await send({"type": "http.response.start", "status": status_code, "headers": new_headers})
                await send({"type": "http.response.body", "body": wrapped})

        await self.app(scope, receive, send_wrapper)


def setup_middleware(app: FastAPI) -> None:
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(ResponseEnvelopeMiddleware)
