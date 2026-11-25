"""Tests for the visit routes."""

from datetime import date

from app.models.assignment import Assignment


def _day(scenario):
    return scenario["assignment_date"].isoformat()


def _assignment_url(scenario, tourist="tourist_id"):
    return f"{scenario['itinerary_id']}/{scenario[tourist]}/{_day(scenario)}"


def _url(scenario, activity=0, tourist="tourist_id"):
    return f"/api/visits/{_assignment_url(scenario, tourist)}/{scenario['activity_ids'][activity]}"


def _create(client, scenario, activity=0, tourist="tourist_id", **overrides):
    payload = {
        "itinerary_id": scenario["itinerary_id"],
        "tourist_id": scenario[tourist],
        "assignment_date": _day(scenario),
        "activity_id": scenario["activity_ids"][activity],
        "status": "done",
        "rating": 5,
        **overrides,
    }
    return client.post("/api/visits", json=payload)


def _assign_again(db_session, scenario, assignment_date):
    db_session.add(
        Assignment(
            itinerary_id=scenario["itinerary_id"],
            tourist_id=scenario["tourist_id"],
            assignment_date=assignment_date,
            admin_id=scenario["admin_id"],
        )
    )
    db_session.commit()


# create


def test_create_visit_returns_201(client, visit_scenario):
    response = _create(client, visit_scenario, comment="Great")

    assert response.status_code == 201
    assert response.json() == {
        "itinerary_id": visit_scenario["itinerary_id"],
        "tourist_id": visit_scenario["tourist_id"],
        "assignment_date": _day(visit_scenario),
        "activity_id": visit_scenario["activity_ids"][0],
        "status": "done",
        "comment": "Great",
        "rating": 5,
    }


def test_create_visit_returns_404_when_the_assignment_is_missing(client, visit_scenario):
    assert _create(client, visit_scenario, tourist="stranger_id").status_code == 404


def test_create_visit_returns_404_when_the_assignment_date_does_not_match(client, visit_scenario):
    assert _create(client, visit_scenario, assignment_date="2020-01-01").status_code == 404


def test_create_visit_returns_404_when_the_activity_is_not_in_the_itinerary(
    client, visit_scenario
):
    response = client.post(
        "/api/visits",
        json={
            "itinerary_id": visit_scenario["itinerary_id"],
            "tourist_id": visit_scenario["tourist_id"],
            "assignment_date": _day(visit_scenario),
            "activity_id": visit_scenario["outside_activity_id"],
            "status": "skipped",
        },
    )

    assert response.status_code == 404


def test_create_visit_twice_returns_409(client, visit_scenario):
    _create(client, visit_scenario)

    assert _create(client, visit_scenario).status_code == 409


def test_create_visit_without_assignment_date_returns_422(client, visit_scenario):
    response = client.post(
        "/api/visits",
        json={
            "itinerary_id": visit_scenario["itinerary_id"],
            "tourist_id": visit_scenario["tourist_id"],
            "activity_id": visit_scenario["activity_ids"][0],
            "status": "skipped",
        },
    )

    assert response.status_code == 422


def test_create_visit_with_invalid_assignment_date_returns_422(client, visit_scenario):
    assert _create(client, visit_scenario, assignment_date="not-a-date").status_code == 422


def test_create_done_visit_without_rating_returns_422(client, visit_scenario):
    assert _create(client, visit_scenario, rating=None).status_code == 422


def test_create_visit_with_unknown_status_returns_422(client, visit_scenario):
    assert _create(client, visit_scenario, status="pending").status_code == 422


def test_create_visit_with_rating_out_of_range_returns_422(client, visit_scenario):
    assert _create(client, visit_scenario, rating=6).status_code == 422


def test_the_same_activity_can_be_visited_on_two_assignment_dates(
    client, db_session, visit_scenario
):
    _assign_again(db_session, visit_scenario, date(2026, 4, 1))

    first = _create(client, visit_scenario)
    second = _create(client, visit_scenario, assignment_date="2026-04-01", rating=3)

    assert first.status_code == 201
    assert second.status_code == 201


# get


def test_get_visit_returns_it(client, visit_scenario):
    _create(client, visit_scenario, comment="Great")

    response = client.get(_url(visit_scenario))

    assert response.status_code == 200
    assert response.json()["comment"] == "Great"
    assert response.json()["assignment_date"] == _day(visit_scenario)


def test_get_visit_returns_404_when_missing(client, visit_scenario):
    assert client.get(_url(visit_scenario)).status_code == 404


def test_get_visit_returns_404_for_another_date(client, visit_scenario):
    _create(client, visit_scenario)
    url = (
        f"/api/visits/{visit_scenario['itinerary_id']}/{visit_scenario['tourist_id']}"
        f"/2020-01-01/{visit_scenario['activity_ids'][0]}"
    )

    assert client.get(url).status_code == 404


def test_get_visit_with_invalid_date_returns_422(client, visit_scenario):
    url = (
        f"/api/visits/{visit_scenario['itinerary_id']}/{visit_scenario['tourist_id']}"
        f"/not-a-date/{visit_scenario['activity_ids'][0]}"
    )

    assert client.get(url).status_code == 422


# list by assignment


def test_list_visits_by_assignment_returns_the_tourist_visits_in_order(client, visit_scenario):
    _create(client, visit_scenario, activity=1, rating=3)
    _create(client, visit_scenario, activity=0)
    _create(client, visit_scenario, activity=0, tourist="other_tourist_id")

    response = client.get(f"/api/visits/{_assignment_url(visit_scenario)}")

    assert response.status_code == 200
    assert [v["activity_id"] for v in response.json()] == visit_scenario["activity_ids"]


def test_list_visits_by_assignment_only_returns_that_date(client, db_session, visit_scenario):
    _assign_again(db_session, visit_scenario, date(2026, 4, 1))
    _create(client, visit_scenario)
    _create(client, visit_scenario, assignment_date="2026-04-01", rating=3)

    response = client.get(f"/api/visits/{_assignment_url(visit_scenario)}")

    assert [v["assignment_date"] for v in response.json()] == [_day(visit_scenario)]


def test_list_visits_by_assignment_returns_404_when_the_assignment_is_missing(
    client, visit_scenario
):
    response = client.get(f"/api/visits/{_assignment_url(visit_scenario, 'stranger_id')}")

    assert response.status_code == 404


# update


def test_update_visit_changes_the_comment(client, visit_scenario):
    _create(client, visit_scenario)

    response = client.patch(_url(visit_scenario), json={"comment": "Great"})

    assert response.status_code == 200
    assert response.json()["comment"] == "Great"
    assert response.json()["rating"] == 5


def test_update_visit_only_changes_the_visit_of_that_date(client, db_session, visit_scenario):
    _assign_again(db_session, visit_scenario, date(2026, 4, 1))
    _create(client, visit_scenario, rating=5)
    _create(client, visit_scenario, assignment_date="2026-04-01", rating=3)

    client.patch(_url(visit_scenario), json={"rating": 1})

    other_url = (
        f"/api/visits/{visit_scenario['itinerary_id']}/{visit_scenario['tourist_id']}"
        f"/2026-04-01/{visit_scenario['activity_ids'][0]}"
    )
    assert client.get(other_url).json()["rating"] == 3


def test_update_visit_returns_409_when_a_done_visit_loses_its_rating(client, visit_scenario):
    _create(client, visit_scenario)

    response = client.patch(_url(visit_scenario), json={"rating": None})

    assert response.status_code == 409


def test_update_visit_returns_422_for_a_null_status(client, visit_scenario):
    _create(client, visit_scenario)

    assert client.patch(_url(visit_scenario), json={"status": None}).status_code == 422


def test_update_visit_returns_404_when_missing(client, visit_scenario):
    assert client.patch(_url(visit_scenario), json={"comment": "x"}).status_code == 404


# delete


def test_delete_visit_returns_204_and_removes_it(client, visit_scenario):
    _create(client, visit_scenario)

    assert client.delete(_url(visit_scenario)).status_code == 204
    assert client.get(_url(visit_scenario)).status_code == 404


def test_delete_visit_keeps_the_visit_of_another_date(client, db_session, visit_scenario):
    _assign_again(db_session, visit_scenario, date(2026, 4, 1))
    _create(client, visit_scenario)
    _create(client, visit_scenario, assignment_date="2026-04-01", rating=3)

    client.delete(_url(visit_scenario))

    other_url = (
        f"/api/visits/{visit_scenario['itinerary_id']}/{visit_scenario['tourist_id']}"
        f"/2026-04-01/{visit_scenario['activity_ids'][0]}"
    )
    assert client.get(other_url).status_code == 200


def test_delete_visit_returns_404_when_missing(client, visit_scenario):
    assert client.delete(_url(visit_scenario)).status_code == 404


# queries by other axes


def test_list_visits_by_activity_filters_by_status(client, visit_scenario):
    _create(client, visit_scenario)
    _create(client, visit_scenario, tourist="other_tourist_id", status="skipped", rating=None)
    activity_id = visit_scenario["activity_ids"][0]

    everything = client.get(f"/api/visits/by_activity/{activity_id}")
    skipped = client.get(f"/api/visits/by_activity/{activity_id}?status=skipped")

    assert everything.status_code == 200
    assert len(everything.json()) == 2
    assert [v["status"] for v in skipped.json()] == ["skipped"]


def test_list_visits_by_activity_returns_404_when_the_activity_is_missing(client):
    assert client.get("/api/visits/by_activity/999").status_code == 404


def test_list_visits_by_activity_rejects_an_unknown_status(client, visit_scenario):
    activity_id = visit_scenario["activity_ids"][0]

    assert client.get(f"/api/visits/by_activity/{activity_id}?status=banana").status_code == 422


def test_list_visits_by_tourist_returns_that_tourist_visits(client, visit_scenario):
    _create(client, visit_scenario, activity=0)
    _create(client, visit_scenario, activity=1, status="skipped", rating=None)
    _create(client, visit_scenario, activity=0, tourist="other_tourist_id")

    response = client.get(f"/api/visits/by_tourist/{visit_scenario['tourist_id']}")

    assert response.status_code == 200
    assert {v["tourist_id"] for v in response.json()} == {visit_scenario["tourist_id"]}
    assert len(response.json()) == 2


def test_list_visits_by_tourist_filters_by_status(client, visit_scenario):
    _create(client, visit_scenario, activity=0)
    _create(client, visit_scenario, activity=1, status="skipped", rating=None)

    response = client.get(f"/api/visits/by_tourist/{visit_scenario['tourist_id']}?status=done")

    assert [v["status"] for v in response.json()] == ["done"]


def test_list_visits_by_tourist_returns_404_when_the_tourist_is_missing(client):
    assert client.get("/api/visits/by_tourist/999").status_code == 404


def test_list_visits_by_itinerary_filters_by_status(client, visit_scenario):
    _create(client, visit_scenario)
    _create(client, visit_scenario, tourist="other_tourist_id", status="skipped", rating=None)
    itinerary_id = visit_scenario["itinerary_id"]

    everything = client.get(f"/api/visits/by_itinerary/{itinerary_id}")
    done = client.get(f"/api/visits/by_itinerary/{itinerary_id}?status=done")

    assert len(everything.json()) == 2
    assert [v["status"] for v in done.json()] == ["done"]


def test_list_visits_by_itinerary_returns_404_when_the_itinerary_is_missing(client):
    assert client.get("/api/visits/by_itinerary/999").status_code == 404


# between dates


def test_list_visits_by_dates_returns_the_visits_inside_the_range(
    client, db_session, visit_scenario
):
    _assign_again(db_session, visit_scenario, date(2026, 4, 1))
    _create(client, visit_scenario)
    _create(client, visit_scenario, assignment_date="2026-04-01", rating=3)

    response = client.get("/api/visits/by_dates/2026-03-01/2026-03-31")

    assert response.status_code == 200
    assert [v["assignment_date"] for v in response.json()] == [_day(visit_scenario)]


def test_list_visits_by_dates_includes_both_limits(client, db_session, visit_scenario):
    _assign_again(db_session, visit_scenario, date(2026, 4, 1))
    _create(client, visit_scenario)
    _create(client, visit_scenario, assignment_date="2026-04-01", rating=3)

    response = client.get("/api/visits/by_dates/2026-03-01/2026-04-01")

    assert len(response.json()) == 2


def test_list_visits_by_dates_returns_an_empty_list_outside_the_range(client, visit_scenario):
    _create(client, visit_scenario)

    response = client.get("/api/visits/by_dates/2025-01-01/2025-12-31")

    assert response.status_code == 200
    assert response.json() == []


def test_list_visits_by_dates_rejects_an_inverted_range(client):
    assert client.get("/api/visits/by_dates/2026-04-01/2026-03-01").status_code == 422


def test_list_visits_by_dates_rejects_invalid_dates(client):
    assert client.get("/api/visits/by_dates/not-a-date/2026-03-01").status_code == 422


# aggregates


def test_assignment_rating_returns_the_average(client, visit_scenario):
    _create(client, visit_scenario, activity=0, rating=5)
    _create(client, visit_scenario, activity=1, rating=4)

    response = client.get(f"/api/visits/assignment_rating/{_assignment_url(visit_scenario)}")

    assert response.status_code == 200
    assert response.json() == 4.5


def test_assignment_rating_is_null_without_ratings(client, visit_scenario):
    response = client.get(f"/api/visits/assignment_rating/{_assignment_url(visit_scenario)}")

    assert response.status_code == 200
    assert response.json() is None


def test_assignment_rating_returns_404_when_the_assignment_is_missing(client, visit_scenario):
    response = client.get(
        f"/api/visits/assignment_rating/{_assignment_url(visit_scenario, 'stranger_id')}"
    )

    assert response.status_code == 404


def test_activity_satisfaction_returns_the_average_and_the_count(client, visit_scenario):
    _create(client, visit_scenario, rating=5)
    _create(client, visit_scenario, tourist="other_tourist_id", rating=4)

    response = client.get(f"/api/visits/activity_satisfaction/{visit_scenario['activity_ids'][0]}")

    assert response.status_code == 200
    assert response.json() == [4.5, 2]


def test_activity_satisfaction_returns_404_when_the_activity_is_missing(client):
    assert client.get("/api/visits/activity_satisfaction/999").status_code == 404


def test_activity_visit_stats_lists_every_activity(client, visit_scenario):
    _create(client, visit_scenario, rating=5)
    _create(client, visit_scenario, tourist="other_tourist_id", status="skipped", rating=None)

    response = client.get("/api/visits/activity_visit_stats")

    assert response.status_code == 200
    stats = {row["activity_id"]: row for row in response.json()}
    assert stats[visit_scenario["activity_ids"][0]]["abandonment_rate"] == 50.0
    assert stats[visit_scenario["activity_ids"][1]]["total_visits"] == 0


def test_assignment_progress_returns_the_counts_and_the_pending_activities(
    client, visit_scenario
):
    _create(client, visit_scenario, activity=0)

    response = client.get(f"/api/visits/assignment_progress/{_assignment_url(visit_scenario)}")

    assert response.status_code == 200
    assert response.json() == {
        "done": 1,
        "skipped": 0,
        "pending_activity_ids": [visit_scenario["activity_ids"][1]],
    }


def test_assignment_progress_returns_404_when_the_assignment_is_missing(client, visit_scenario):
    response = client.get(
        f"/api/visits/assignment_progress/{_assignment_url(visit_scenario, 'stranger_id')}"
    )

    assert response.status_code == 404