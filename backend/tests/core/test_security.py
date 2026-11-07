"""Tests for password hashing and access tokens."""

from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_verify_password_accepts_the_right_password():
    password_hash = hash_password("s3cret")

    assert verify_password("s3cret", password_hash)
    assert not verify_password("wrong", password_hash)


def test_access_token_round_trips_the_user_id():
    assert decode_access_token(create_access_token(42)) == 42


def test_decode_access_token_rejects_expired_tokens():
    settings = get_settings()
    token = jwt.encode(
        {"sub": "42", "exp": datetime.now(UTC) - timedelta(minutes=1)},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    assert decode_access_token(token) is None


def test_decode_access_token_rejects_tokens_signed_with_another_key():
    token = jwt.encode({"sub": "42"}, "another-key-with-at-least-32-bytes", algorithm="HS256")

    assert decode_access_token(token) is None
