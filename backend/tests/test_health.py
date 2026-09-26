"""Pruebas de las rutas de diagnostico.

No necesitan PostgreSQL: solo comprueban que la aplicacion se construye y que
`/api/health` responde. La prueba de `/api/health/db` llegara cuando montemos
los fixtures con base de datos de test.
"""

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
