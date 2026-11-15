"""Tests for the booking routes (PR 2)."""

from datetime import date
from uuid import uuid4

import pytest

from app.models.package import Package
from app.models.booking import Booking
from app.models.status import BookingStatus, ItineraryStatus, ReviewStatus
from app.models.user.user import UserRole
from app.schemas.itinerary import ItineraryCreate
from app.schemas.package import PackageCreate
from app.schemas.user import AdminCreate, GuideCreate, TouristCreate
from app.services import booking as booking_service
from app.services import itinerary as itinerary_service
from app.services import user as user_service


def _create_user(client, role: str, email: str, name: str, **extra):
    return client.post(
        "/api/users",
        json={"name": name, "role": role, "email": email, "password": "s3cret", **extra},
    ).json()


def _create_tourist(client, email="ada@example.com"):
    return _create_user(client, "tourist", email, "Ada", age=30)


def _create_admin(client):
    return _create_user(client, "admin", f"{uuid4().hex}@example.com", "Owner")


def _create_guide(db_session, email="gil@example.com"):
    return user_service.create_user(
        db_session,
        GuideCreate(name="Gil", role="guide", email=email, password="x", specialty="History"),
    )


def _create_package(client, db_session, name=None, destination="París", approve=False):
    admin = _create_admin(client)
    pkg = client.post(
        "/api/packages",
        json={
            "name": name or f"Pkg {uuid4().hex[:8]}",
            "destination": destination,
            "admin_id": admin["id"],
        },
    ).json()
    if approve:
        row = db_session.get(Package, pkg["id"])
        row.status = ReviewStatus.APPROVED
        db_session.commit()
    return pkg


def _approve(db_session, package):
    row = db_session.get(Package, package["id"])
    row.status = ReviewStatus.APPROVED
    db_session.commit()


def _create_itinerary(db_session, package, guide, status=ItineraryStatus.APPROVED):
    it = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(
            creation_date=date(2026, 1, 1),
            activity_count=2,
            package_id=package["id"],
            guide_id=guide.id,
        ),
    )
    it.status = status
    db_session.commit()
    db_session.refresh(it)
    return it


def _set_booking_date(db_session, tourist_id, package_id, d):
    row = db_session.get(Booking, (tourist_id, package_id))
    row.booking_date = d
    db_session.commit()


# ---------------------------------------------------------------------------
# Group 1 — POST /packages/{id}/bookings
# ---------------------------------------------------------------------------


def test_tourist_create_returns_201(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        response = client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01", "preferred_itinerary_id": None},
        )
    assert response.status_code == 201
    body = response.json()
    assert body["tourist_id"] == tourist["id"]
    assert body["package_id"] == package["id"]
    assert body["status"] == "pending"
    assert body["tourist_name"] == "Ada"
    assert body["package_name"] == package["name"]


def test_admin_create_returns_201(client, db_session):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    response = client.post(
        f"/api/packages/{package['id']}/bookings", json={"tourist_id": tourist["id"]}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["tourist_id"] == tourist["id"]
    assert body["status"] == "pending"


def test_non_approved_package_returns_409(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session)  # pending by default
    with as_user(tourist["id"]):
        response = client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    assert response.status_code == 409


def test_missing_package_returns_404(client, db_session, as_user):
    tourist = _create_tourist(client)
    with as_user(tourist["id"]):
        response = client.post(
            "/api/packages/999999/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    assert response.status_code == 404


def test_missing_requested_start_date_returns_422(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        response = client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"preferred_itinerary_id": None},
        )
    assert response.status_code == 422


def test_past_date_returns_422(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        response = client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-10-01"},
        )
    assert response.status_code == 422


def test_duplicate_pending_returns_409(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        assert client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        ).status_code == 201
        response = client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    assert response.status_code == 409
    assert response.json()["detail"] == "Booking for this tourist and package already exists"


def test_preferred_itinerary_wrong_package_returns_422(client, db_session, as_user):
    tourist = _create_tourist(client)
    guide = _create_guide(db_session)
    pkg_a = _create_package(client, db_session, approve=True, name="Paquete A")
    pkg_b = _create_package(client, db_session, approve=True, name="Paquete B")
    itinerary = _create_itinerary(db_session, pkg_b, guide)
    with as_user(tourist["id"]):
        response = client.post(
            f"/api/packages/{pkg_a['id']}/bookings",
            json={"requested_start_date": "2026-12-01", "preferred_itinerary_id": itinerary.id},
        )
    assert response.status_code == 422


def test_preferred_itinerary_not_approved_returns_422(client, db_session, as_user):
    tourist = _create_tourist(client)
    guide = _create_guide(db_session)
    package = _create_package(client, db_session, approve=True)
    itinerary = _create_itinerary(db_session, package, guide, status=ItineraryStatus.PENDING)
    with as_user(tourist["id"]):
        response = client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01", "preferred_itinerary_id": itinerary.id},
        )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Group 2 — Re-reserve
# ---------------------------------------------------------------------------


def test_cancel_then_re_reserve_reuses_row(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        created = client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        ).json()
        assert client.patch(
            f"/api/packages/{package['id']}/bookings/{tourist['id']}",
            json={"status": "cancelled"},
        ).status_code == 200
        rebooked = client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-05"},
        ).json()
    assert rebooked["tourist_id"] == tourist["id"]
    assert rebooked["package_id"] == package["id"]
    assert rebooked["status"] == "pending"
    # Same row: only one booking for the pair.
    rows = booking_service.get_booking(db_session, tourist["id"], package["id"])
    assert rows is not None
    assert rows.status is BookingStatus.PENDING


# ---------------------------------------------------------------------------
# Group 3 — PATCH
# ---------------------------------------------------------------------------


def test_tourist_cancels_returns_200(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
        response = client.patch(
            f"/api/packages/{package['id']}/bookings/{tourist['id']}",
            json={"status": "cancelled"},
        )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


def test_admin_rejects_with_reason_returns_200(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    response = client.patch(
        f"/api/packages/{package['id']}/bookings/{tourist['id']}",
        json={"status": "rejected", "rejection_reason": "Sin cupos"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert response.json()["rejection_reason"] == "Sin cupos"


def test_patch_non_pending_returns_409(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    # Reject first, so it is no longer pending.
    client.patch(
        f"/api/packages/{package['id']}/bookings/{tourist['id']}",
        json={"status": "rejected", "rejection_reason": "Sin cupos"},
    )
    response = client.patch(
        f"/api/packages/{package['id']}/bookings/{tourist['id']}",
        json={"status": "cancelled"},
    )
    assert response.status_code == 409


def test_invalid_status_returns_422(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    response = client.patch(
        f"/api/packages/{package['id']}/bookings/{tourist['id']}",
        json={"status": "assigned"},
    )
    assert response.status_code == 422


def test_rejected_without_reason_returns_422(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    response = client.patch(
        f"/api/packages/{package['id']}/bookings/{tourist['id']}",
        json={"status": "rejected"},
    )
    assert response.status_code == 422


def test_non_owner_cannot_cancel_returns_403(client, db_session, as_user):
    owner = _create_tourist(client, email="owner@example.com")
    other = _create_tourist(client, email="other@example.com")
    package = _create_package(client, db_session, approve=True)
    with as_user(owner["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    with as_user(other["id"]):
        response = client.patch(
            f"/api/packages/{package['id']}/bookings/{owner['id']}",
            json={"status": "cancelled"},
        )
    assert response.status_code == 403


def test_non_tourist_non_admin_returns_403(client, db_session, as_user):
    tourist = _create_tourist(client)
    guide = _create_guide(db_session)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    with as_user(guide.id):
        response = client.patch(
            f"/api/packages/{package['id']}/bookings/{tourist['id']}",
            json={"status": "cancelled"},
        )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Group 4 — DELETE
# ---------------------------------------------------------------------------


def test_admin_deletes_without_itinerary_returns_204(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    response = client.delete(f"/api/packages/{package['id']}/bookings/{tourist['id']}")
    assert response.status_code == 204


def test_admin_delete_with_itinerary_returns_409(client, db_session, as_user):
    tourist = _create_tourist(client)
    guide = _create_guide(db_session)
    package = _create_package(client, db_session, approve=True)
    itinerary = _create_itinerary(db_session, package, guide)
    with as_user(tourist["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    _set_booking_date(db_session, tourist["id"], package["id"], date(2026, 12, 1))
    row = db_session.get(Booking, (tourist["id"], package["id"]))
    row.itinerary_id = itinerary.id
    db_session.commit()
    response = client.delete(f"/api/packages/{package['id']}/bookings/{tourist['id']}")
    assert response.status_code == 409


def test_non_admin_delete_returns_403(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        client.post(
            f"/api/packages/{package['id']}/bookings",
            json={"requested_start_date": "2026-12-01"},
        )
    with as_user(tourist["id"]):
        response = client.delete(f"/api/packages/{package['id']}/bookings/{tourist['id']}")
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Group 5 — GET /me/bookings
# ---------------------------------------------------------------------------


def test_me_bookings_no_token_returns_401(anonymous_client):
    response = anonymous_client.get("/api/me/bookings")
    assert response.status_code == 401


def test_me_bookings_tourist_own_desc_returns_200(client, db_session, as_user):
    tourist = _create_tourist(client)
    pkg_a = _create_package(client, db_session, approve=True, name="Pkg A")
    pkg_b = _create_package(client, db_session, approve=True, name="Pkg B")
    with as_user(tourist["id"]):
        client.post(f"/api/packages/{pkg_a['id']}/bookings", json={"requested_start_date": "2026-12-01"})
        client.post(f"/api/packages/{pkg_b['id']}/bookings", json={"requested_start_date": "2026-12-01"})
    _set_booking_date(db_session, tourist["id"], pkg_a["id"], date(2026, 12, 1))
    _set_booking_date(db_session, tourist["id"], pkg_b["id"], date(2026, 12, 2))
    with as_user(tourist["id"]):
        response = client.get("/api/me/bookings")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert [b["package_id"] for b in body] == [pkg_b["id"], pkg_a["id"]]


# ---------------------------------------------------------------------------
# Group 6 — GET /bookings?status=
# ---------------------------------------------------------------------------


def test_bookings_filter_status_admin_pending_asc_returns_200(client, db_session):
    tourist_a = _create_tourist(client, email="fa@example.com")
    tourist_b = _create_tourist(client, email="fb@example.com")
    pkg_a = _create_package(client, db_session, approve=True, name="Fa")
    pkg_b = _create_package(client, db_session, approve=True, name="Fb")
    client.post(f"/api/packages/{pkg_a['id']}/bookings", json={"tourist_id": tourist_a["id"]})
    client.post(f"/api/packages/{pkg_b['id']}/bookings", json={"tourist_id": tourist_b["id"]})
    _set_booking_date(db_session, tourist_a["id"], pkg_a["id"], date(2026, 12, 2))
    _set_booking_date(db_session, tourist_b["id"], pkg_b["id"], date(2026, 12, 1))
    response = client.get("/api/bookings?status=pending")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert all(b["status"] == "pending" for b in body)
    assert [b["package_id"] for b in body] == [pkg_b["id"], pkg_a["id"]]


def test_bookings_filter_status_non_admin_returns_403(client, db_session, as_user):
    tourist = _create_tourist(client)
    package = _create_package(client, db_session, approve=True)
    with as_user(tourist["id"]):
        client.post(f"/api/packages/{package['id']}/bookings", json={"tourist_id": tourist["id"]})
    with as_user(tourist["id"]):
        response = client.get("/api/bookings?status=pending")
    assert response.status_code == 403
