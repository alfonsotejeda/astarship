"""Tests for the visit routes."""


def _url(scenario, activity=0, tourist="tourist_id"):
    return (
        f"/api/visits/{scenario['itinerary_id']}/{scenario[tourist]}"
        f"/{scenario['activity_ids'][activity]}"
    )


def _create(client, scenario, activity=0, tourist="tourist_id", **overrides):
    payload = {
        "itinerary_id": scenario["itinerary_id"],
        "tourist_id": scenario[tourist],
        "activity_id": scenario["activity_ids"][activity],
        "status": "done",
        "rating": 5,
        **overrides,
    }
    return client.post("/api/visits", json=payload)


# create


def test_create_visit_returns_201(client, visit_scenario):
    response = _create(client, visit_scenario, comment="Great")

    assert response.status_code == 201
    assert response.json() == {
        "itinerary_id": visit_scenario["itinerary_id"],
        "tourist_id": visit_scenario["tourist_id"],
        "activity_id": visit_scenario["activity_ids"][0],
        "status": "done",
        "comment": "Great",
        "rating": 5,
    }


def test_create_visit_returns_404_when_the_assignment_is_missing(client, visit_scenario):
    assert _create(client, visit_scenario, tourist="stranger_id").status_code == 404


def test_create_visit_returns_404_when_the_activity_is_not_in_the_itinerary(client, visit_scenario):
    response = client.post(
        "/api/visits",
        json={
            "itinerary_id": visit_scenario["itinerary_id"],
            "tourist_id": visit_scenario["tourist_id"],
            "activity_id": visit_scenario["outside_activity_id"],
            "status": "skipped",
        },
    )

    assert response.status_code == 404


def test_create_visit_twice_returns_409(client, visit_scenario):
    _create(client, visit_scenario)

    assert _create(client, visit_scenario).status_code == 409


def test_create_done_visit_without_rating_returns_422(client, visit_scenario):
    assert _create(client, visit_scenario, rating=None).status_code == 422


def test_create_visit_with_unknown_status_returns_422(client, visit_scenario):
    assert _create(client, visit_scenario, status="pending").status_code == 422


def test_create_visit_with_rating_out_of_range_returns_422(client, visit_scenario):
    assert _create(client, visit_scenario, rating=6).status_code == 422


# get


def test_get_visit_returns_it(client, visit_scenario):
    _create(client, visit_scenario, comment="Great")

    response = client.get(_url(visit_scenario))

    assert response.status_code == 200
    assert response.json()["comment"] == "Great"


def test_get_visit_returns_404_when_missing(client, visit_scenario):
    assert client.get(_url(visit_scenario)).status_code == 404


# list by assignment


def test_list_visits_by_assignment_returns_the_tourist_visits_in_order(client, visit_scenario):
    _create(client, visit_scenario, activity=1, rating=3)
    _create(client, visit_scenario, activity=0)
    _create(client, visit_scenario, activity=0, tourist="other_tourist_id")

    response = client.get(
        f"/api/visits/{visit_scenario['itinerary_id']}/{visit_scenario['tourist_id']}"
    )

    assert response.status_code == 200
    assert [v["activity_id"] for v in response.json()] == visit_scenario["activity_ids"]


def test_list_visits_by_assignment_returns_404_when_the_assignment_is_missing(
    client, visit_scenario
):
    response = client.get(
        f"/api/visits/{visit_scenario['itinerary_id']}/{visit_scenario['stranger_id']}"
    )

    assert response.status_code == 404


# update


def test_update_visit_changes_the_comment(client, visit_scenario):
    _create(client, visit_scenario)

    response = client.patch(_url(visit_scenario), json={"comment": "Great"})

    assert response.status_code == 200
    assert response.json()["comment"] == "Great"
    assert response.json()["rating"] == 5


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


# aggregates


def test_assignment_rating_returns_the_average(client, visit_scenario):
    _create(client, visit_scenario, activity=0, rating=5)
    _create(client, visit_scenario, activity=1, rating=4)

    response = client.get(
        f"/api/visits/assignment_rating/{visit_scenario['itinerary_id']}"
        f"/{visit_scenario['tourist_id']}"
    )

    assert response.status_code == 200
    assert response.json() == 4.5


def test_assignment_rating_is_null_without_ratings(client, visit_scenario):
    response = client.get(
        f"/api/visits/assignment_rating/{visit_scenario['itinerary_id']}"
        f"/{visit_scenario['tourist_id']}"
    )

    assert response.status_code == 200
    assert response.json() is None


def test_assignment_rating_returns_404_when_the_assignment_is_missing(client, visit_scenario):
    response = client.get(
        f"/api/visits/assignment_rating/{visit_scenario['itinerary_id']}"
        f"/{visit_scenario['stranger_id']}"
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


def test_assignment_progress_returns_the_counts_and_the_pending_activities(client, visit_scenario):
    _create(client, visit_scenario, activity=0)

    response = client.get(
        f"/api/visits/assignment_progress/{visit_scenario['itinerary_id']}"
        f"/{visit_scenario['tourist_id']}"
    )

    assert response.status_code == 200
    assert response.json() == {
        "done": 1,
        "skipped": 0,
        "pending_activity_ids": [visit_scenario["activity_ids"][1]],
    }


def test_assignment_progress_returns_404_when_the_assignment_is_missing(client, visit_scenario):
    response = client.get(
        f"/api/visits/assignment_progress/{visit_scenario['itinerary_id']}"
        f"/{visit_scenario['stranger_id']}"
    )

    assert response.status_code == 404
