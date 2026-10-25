"""Tests for the tourist routes."""


def _create_tourist(client, email="ada@example.com"):
    return client.post(
        "/api/users",
        json={
            "name": "Ada",
            "role": "tourist",
            "email": email,
            "password": "s3cret",
            "age": 30,
        },
    ).json()


def _create_package(client, name="Europa Capitales", destination="París"):
    return client.post(
        "/api/packages", json={"name": name, "destination": destination}
    ).json()


def _create_booking(client, tourist_id, package_id):
    return client.post(
        "/api/bookings", json={"tourist_id": tourist_id, "package_id": package_id}
    )


def test_get_tourist_packages_returns_booked_packages(client):
    tourist = _create_tourist(client, email="viajera@example.com")
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    response = client.get(f"/api/tourists/{tourist['id']}/packages")

    assert response.status_code == 200
    assert [p["id"] for p in response.json()] == [package["id"]]


def test_get_tourist_packages_returns_404_when_tourist_missing(client):
    response = client.get("/api/tourists/999999/packages")

    assert response.status_code == 404


def test_get_tourist_packages_empty_when_no_bookings(client):
    tourist = _create_tourist(client, email="sola@example.com")

    response = client.get(f"/api/tourists/{tourist['id']}/packages")

    assert response.status_code == 200
    assert response.json() == []
