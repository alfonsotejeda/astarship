"""Tests for the health-check routes."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_apunta_a_la_documentacion():
    respuesta = client.get("/")

    assert respuesta.status_code == 200
    assert respuesta.json()["documentacion"] == "/docs"


def test_health_responde_ok():
    respuesta = client.get("/api/health")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"status": "ok"}
