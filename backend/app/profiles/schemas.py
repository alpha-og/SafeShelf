from pydantic import BaseModel


class BackupRequest(BaseModel):
    encrypted_payload: str


class BackupResponse(BaseModel):
    id: str
    created_at: str
    encrypted_payload: str | None = None
