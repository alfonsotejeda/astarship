"""Tests for the handling of unhandled errors."""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core import errors
from app.core.config import get_settings
from app.main import app

WEBHOOK_URL = "https://discord.test/api/webhooks/1/token"
ORIGIN = "http://localhost:5173"


def _boom():
    raise RuntimeError("database password is hunter2")


@pytest.fixture
def client():
    # On the real app, so the tests also cover the order of the middlewares
    app.add_api_route("/boom", _boom)
    yield TestClient(app)
    app.router.routes.pop()


@pytest.fixture
def notifications(monkeypatch):
    """Replace the notification so the route tests don't post anything."""
    calls = []

    async def fake_notify(method, path, exc):
        calls.append((method, path, exc))

    monkeypatch.setattr(errors, "notify_error", fake_notify)
    return calls


@pytest.fixture
def webhook(monkeypatch):
    """Point the notifications at a fake webhook and return the requests it receives."""
    monkeypatch.setattr(get_settings(), "error_webhook_url", WEBHOOK_URL)
    received = []

    def handler(request):
        received.append(request)
        return httpx.Response(204)

    _use_transport(monkeypatch, httpx.MockTransport(handler))
    return received


def _use_transport(monkeypatch, transport):
    async_client = httpx.AsyncClient
    monkeypatch.setattr(
        errors.httpx, "AsyncClient", lambda **kwargs: async_client(transport=transport, **kwargs)
    )


def test_unhandled_error_returns_a_generic_500(client, notifications):
    response = client.get("/boom")

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal Server Error"}
    assert "hunter2" not in response.text


def test_unhandled_error_has_cors_headers(client, notifications):
    response = client.get("/boom", headers={"Origin": ORIGIN})

    assert response.headers["access-control-allow-origin"] == ORIGIN


def test_unhandled_error_is_logged_with_its_traceback(client, notifications, caplog):
    client.get("/boom")

    [record] = caplog.records
    assert "GET /boom" in record.getMessage()
    assert isinstance(record.exc_info[1], RuntimeError)


def test_unhandled_error_is_notified(client, notifications):
    client.get("/boom")

    [(method, path, exc)] = notifications
    assert (method, path) == ("GET", "/boom")
    assert isinstance(exc, RuntimeError)


def test_handled_errors_are_not_notified(client, notifications):
    response = client.get("/a-route-that-does-not-exist")

    assert response.status_code == 404
    assert notifications == []


async def test_notification_has_the_error_type_route_and_message(webhook):
    await errors.notify_error("GET", "/boom", RuntimeError("something broke"))

    [request] = webhook
    assert str(request.url) == WEBHOOK_URL
    content = json.loads(request.content)["content"]
    assert "RuntimeError" in content
    assert "GET /boom" in content
    assert "something broke" in content


async def test_notification_title_marks_production_errors(webhook, monkeypatch):
    monkeypatch.setattr(get_settings(), "environment", "production")

    await errors.notify_error("GET", "/boom", RuntimeError("something broke"))

    [request] = webhook
    assert json.loads(request.content)["content"].startswith("**Error en producción**\n")


async def test_notification_title_names_the_machine_outside_production(webhook, monkeypatch):
    monkeypatch.setattr(get_settings(), "environment", "development")
    monkeypatch.setattr(errors.socket, "gethostname", lambda: "alfonso-mac")

    await errors.notify_error("GET", "/boom", RuntimeError("something broke"))

    [request] = webhook
    assert json.loads(request.content)["content"].startswith("**Error en local de alfonso-mac**\n")


async def test_long_errors_fit_in_a_discord_message(webhook):
    await errors.notify_error("GET", "/boom", RuntimeError("x" * 5000))

    [request] = webhook
    assert len(json.loads(request.content)["content"]) <= 2000


async def test_without_a_webhook_nothing_is_sent(monkeypatch):
    monkeypatch.setattr(get_settings(), "error_webhook_url", None)
    sent = []
    _use_transport(monkeypatch, httpx.MockTransport(lambda request: sent.append(request)))

    await errors.notify_error("GET", "/boom", RuntimeError("x"))

    assert sent == []


async def test_a_failed_notification_is_logged_and_not_raised(monkeypatch, caplog):
    monkeypatch.setattr(get_settings(), "error_webhook_url", WEBHOOK_URL)
    _use_transport(monkeypatch, httpx.MockTransport(lambda request: httpx.Response(500)))

    await errors.notify_error("GET", "/boom", RuntimeError("x"))

    assert "Could not send the error notification" in caplog.text
