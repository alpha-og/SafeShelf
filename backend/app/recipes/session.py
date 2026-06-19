import time
import uuid

_SESSION_TTL = 300  # 5 minutes


class _ClarificationSession:
    def __init__(
        self,
        query: str,
        raw_categories: list[str],
        raw_areas: list[str],
        round_num: int = 0,
    ):
        self.session_id = str(uuid.uuid4())[:12]
        self.created_at = time.time()
        self.query = query
        self.raw_categories = raw_categories
        self.raw_areas = raw_areas
        self.round = round_num
        self.collected_answers: dict[str, object] = {}

    def is_expired(self) -> bool:
        return time.time() - self.created_at > _SESSION_TTL


_sessions: dict[str, _ClarificationSession] = {}


def _prune() -> None:
    expired = [sid for sid, s in _sessions.items() if s.is_expired()]
    for sid in expired:
        del _sessions[sid]


def create_session(
    query: str,
    categories: list[str] | None = None,
    areas: list[str] | None = None,
) -> _ClarificationSession:
    _prune()
    session = _ClarificationSession(query, categories or [], areas or [])
    _sessions[session.session_id] = session
    return session


def get_session(session_id: str) -> _ClarificationSession | None:
    _prune()
    session = _sessions.get(session_id)
    if session is None or session.is_expired():
        if session_id in _sessions:
            del _sessions[session_id]
        return None
    return session


def advance_round(session_id: str, answers: dict[str, object]) -> _ClarificationSession | None:
    session = get_session(session_id)
    if session is None:
        return None
    session.collected_answers.update(answers)
    session.round += 1
    return session
