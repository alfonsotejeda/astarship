"""Tests for the permission API router"""


def test_list_permissions(client):
    """Test listing permissions"""
    created = client.post("/api/permissions", json={"name": "Test Permission"})
    assert created.status_code == 201, created.json()

    response = client.get("/api/permissions")
    assert response.status_code == 200, response.json()
    assert any(u["name"] == "Test Permission" for u in response.json())


def test_get_permission(client):
    """Test getting a specific permission"""
    client.post("/api/permissions", json={"name": "Test Permission"})
    response = client.get("/api/permissions/Test Permission")
    assert response.status_code == 200
    assert response.json() == {"name": "Test Permission"}


def test_create_permission(client):
    """Test creating a new permission"""
    response = client.post("/api/permissions", json={"name": "Test Permission"})
    assert response.status_code == 201
    assert response.json() == {"name": "Test Permission"}


def test_create_permission_duplicate(client):
    """Test creating a duplicate permission"""
    client.post("/api/permissions", json={"name": "Test Permission"})
    response = client.post("/api/permissions", json={"name": "Test Permission"})
    assert response.status_code == 409


def test_delete_permission(client):
    """Test deleting a permission"""
    client.post("/api/permissions", json={"name": "Test Permission"})
    response = client.delete("/api/permissions/Test Permission")
    assert response.status_code == 204
    assert client.get("/api/permissions/Test Permission").status_code == 404


def test_delete_permission_not_found(client):
    """Test deleting a permission that does not exist"""
    response = client.delete("/api/permissions/Not Found Permission")
    assert response.status_code == 404
