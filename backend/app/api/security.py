import asyncio
import hmac
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Header, HTTPException, status

from app.config import settings


async def require_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    """Rejects requests without the shared API key. Disabled when API_KEY is empty."""
    expected = settings.API_KEY
    if not expected:
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid API key")


_run_slots = asyncio.Semaphore(max(1, settings.MAX_CONCURRENT_RUNS))


@asynccontextmanager
async def run_slot():
    """Caps concurrent sandbox runs so the API cannot be used to flood the host with containers."""
    if _run_slots.locked():
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Too many runs in progress, try again shortly")
    async with _run_slots:
        yield
