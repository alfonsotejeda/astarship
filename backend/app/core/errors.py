"""Handling of the exceptions that no endpoint handles."""

import logging
import traceback

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.background import BackgroundTask

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Discord rejects messages over 2000 characters; the end of the traceback is the useful part
_MAX_TRACEBACK_LENGTH = 1500


async def notify_error(method: str, path: str, exc: Exception) -> None:
    """Post the error to the configured webhook; a failure is logged and never raised."""
    webhook_url = get_settings().error_webhook_url
    if not webhook_url:
        return
    trace = "".join(traceback.format_exception(exc))[-_MAX_TRACEBACK_LENGTH:]
    text = f"**{type(exc).__name__}** en `{method} {path}`\n```\n{trace}\n```"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(webhook_url, json={"content": text})
            response.raise_for_status()
    except Exception:
        logger.exception("Could not send the error notification")


async def catch_unhandled_errors(request: Request, call_next):
    """Answer a generic 500 for the exceptions no endpoint handles."""
    try:
        return await call_next(request)
    except Exception as exc:
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"},
            background=BackgroundTask(notify_error, request.method, request.url.path, exc),
        )
