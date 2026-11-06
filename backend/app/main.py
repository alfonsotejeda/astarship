"""Astarship API entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import catch_unhandled_errors

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
)

# Added before CORS so it stays inside it: the last middleware added is the outermost,
# and a 500 answered outside CORS would have no headers for the browser to read it
app.add_middleware(BaseHTTPMiddleware, dispatch=catch_unhandled_errors)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
