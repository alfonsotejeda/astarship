"""Tests for the category-package routes."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.package import Package

BASE = "/api/categories_packages"  # quita "/api" si tus otras rutas no lo usan


@pytest.fixture
def sample_data(db_session: Session) -> dict:
    """Create two categories and two packages."""
    cat1 = Category(name="Aventura")
    cat2 = Category(name="Playa")
    pkg1 = Package(name="Excursión Montaña", destination="Alpes")
    pkg2 = Package(name="Caribe Todo Incluido", destination="Cancún")
    db_session.add_all([cat1, cat2, pkg1, pkg2])
    db_session.commit()
    for obj in (cat1, cat2, pkg1, pkg2):
        db_session.refresh(obj)
    return {"cat1": cat1, "cat2": cat2, "pkg1": pkg1, "pkg2": pkg2}


def link(client: TestClient, category: Category, package: Package):
    """Create a category-package relation through the API."""
    return client.post(
        f"{BASE}/create_rows",
        json={"category_id": category.id, "package_id": package.id},
    )


# ---------- POST /create_rows ----------


def test_create_relation(client: TestClient, sample_data: dict) -> None:
    """Creating a new relation returns 201 with both ids."""
    response = link(client, sample_data["cat1"], sample_data["pkg1"])

    assert response.status_code == 201
    assert response.json() == {
        "category_id": sample_data["cat1"].id,
        "package_id": sample_data["pkg1"].id,
    }


def test_create_relation_duplicate(client: TestClient, sample_data: dict) -> None:
    """Creating the same relation twice returns 409."""
    link(client, sample_data["cat1"], sample_data["pkg1"])

    response = link(client, sample_data["cat1"], sample_data["pkg1"])

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()


def test_create_relation_category_not_found(
    client: TestClient, sample_data: dict
) -> None:
    """A category that does not exist returns 404."""
    response = client.post(
        f"{BASE}/create_rows",
        json={"category_id": 99999, "package_id": sample_data["pkg1"].id},
    )

    assert response.status_code == 404
    assert "category not found" in response.json()["detail"].lower()


def test_create_relation_package_not_found(
    client: TestClient, sample_data: dict
) -> None:
    """A package that does not exist returns 404."""
    response = client.post(
        f"{BASE}/create_rows",
        json={"category_id": sample_data["cat1"].id, "package_id": 99999},
    )

    assert response.status_code == 404
    assert "package not found" in response.json()["detail"].lower()


def test_create_relation_invalid_types(client: TestClient) -> None:
    """Ids with the wrong type are rejected with 422."""
    response = client.post(
        f"{BASE}/create_rows", json={"category_id": "texto", "package_id": 1}
    )

    assert response.status_code == 422


# ---------- GET /relation ----------


def test_get_relations_empty(client: TestClient) -> None:
    """With no relations, the list is empty."""
    response = client.get(f"{BASE}/relation")

    assert response.status_code == 200
    assert response.json() == []


def test_get_relations(client: TestClient, sample_data: dict) -> None:
    """All created relations are listed."""
    link(client, sample_data["cat1"], sample_data["pkg1"])
    link(client, sample_data["cat2"], sample_data["pkg2"])

    response = client.get(f"{BASE}/relation")

    assert response.status_code == 200
    pairs = {(r["category_id"], r["package_id"]) for r in response.json()}
    assert pairs == {
        (sample_data["cat1"].id, sample_data["pkg1"].id),
        (sample_data["cat2"].id, sample_data["pkg2"].id),
    }


# ---------- GET /categories_by_package/{package_id} ----------


def test_categories_by_package(client: TestClient, sample_data: dict) -> None:
    """Only the categories linked to the package are returned."""
    link(client, sample_data["cat1"], sample_data["pkg1"])
    link(client, sample_data["cat2"], sample_data["pkg2"])

    response = client.get(f"{BASE}/categories_by_package/{sample_data['pkg1'].id}")

    assert response.status_code == 200
    assert [c["name"] for c in response.json()] == ["Aventura"]


def test_categories_by_package_without_relations(
    client: TestClient, sample_data: dict
) -> None:
    """A package without categories returns an empty list."""
    response = client.get(f"{BASE}/categories_by_package/{sample_data['pkg1'].id}")

    assert response.status_code == 200
    assert response.json() == []


def test_categories_by_package_not_found(client: TestClient) -> None:
    """A package that does not exist returns 404."""
    response = client.get(f"{BASE}/categories_by_package/99999")

    assert response.status_code == 404


# ---------- GET /packages_by_category/{category_id} ----------


def test_packages_by_category(client: TestClient, sample_data: dict) -> None:
    """Only the packages linked to the category are returned."""
    link(client, sample_data["cat2"], sample_data["pkg2"])
    link(client, sample_data["cat1"], sample_data["pkg1"])

    response = client.get(f"{BASE}/packages_by_category/{sample_data['cat2'].id}")

    assert response.status_code == 200
    assert [p["name"] for p in response.json()] == ["Caribe Todo Incluido"]


def test_packages_by_category_without_relations(
    client: TestClient, sample_data: dict
) -> None:
    """A category without packages returns an empty list."""
    response = client.get(f"{BASE}/packages_by_category/{sample_data['cat1'].id}")

    assert response.status_code == 200
    assert response.json() == []


def test_packages_by_category_not_found(client: TestClient) -> None:
    """A category that does not exist returns 404."""
    response = client.get(f"{BASE}/packages_by_category/99999")

    assert response.status_code == 404


# ---------- DELETE /rows/{category_id}/{package_id} ----------


def test_delete_relation(client: TestClient, sample_data: dict) -> None:
    """Deleting an existing relation returns 204 and it disappears."""
    cat, pkg = sample_data["cat1"], sample_data["pkg1"]
    link(client, cat, pkg)

    response = client.delete(f"{BASE}/rows/{cat.id}/{pkg.id}")

    assert response.status_code == 204
    assert client.get(f"{BASE}/relation").json() == []


def test_delete_relation_not_found(client: TestClient, sample_data: dict) -> None:
    """Deleting a relation that was never created returns 404."""
    cat, pkg = sample_data["cat1"], sample_data["pkg1"]

    response = client.delete(f"{BASE}/rows/{cat.id}/{pkg.id}")

    assert response.status_code == 404
    assert "relation not found" in response.json()["detail"].lower()


def test_delete_relation_unknown_category(client: TestClient, sample_data: dict) -> None:
    """A category that does not exist returns 404."""
    response = client.delete(f"{BASE}/rows/99999/{sample_data['pkg1'].id}")

    assert response.status_code == 404