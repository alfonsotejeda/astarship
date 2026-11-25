"""Tests for the Visit model."""

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.visit import Visit


def _visit(scenario, **overrides):
    values = {
        "itinerary_id": scenario["itinerary_id"],
        "tourist_id": scenario["tourist_id"],
        "assignment_date": scenario["assignment_date"],
        "activity_id": scenario["activity_ids"][0],
        "status": "done",
        "rating": 5,
        **overrides,
    }
    return Visit(**values)


def test_table_name():
    assert Visit.__tablename__ == "visits"


def test_primary_key_includes_the_assignment_date():
    assert {c.name for c in Visit.__table__.primary_key} == {
        "itinerary_id",
        "tourist_id",
        "assignment_date",
        "activity_id",
    }


def test_foreign_keys_are_the_two_composite_ones():
    fks = {
        (tuple(fk.column_keys), tuple(e.target_fullname for e in fk.elements))
        for fk in Visit.__table__.foreign_key_constraints
    }

    assert fks == {
        (
            ("itinerary_id", "tourist_id", "assignment_date"),
            (
                "assignments.itinerary_id",
                "assignments.tourist_id",
                "assignments.assignment_date",
            ),
        ),
        (
            ("itinerary_id", "activity_id"),
            ("itinerary_compositions.itinerary_id", "itinerary_compositions.activity_id"),
        ),
    }


def test_foreign_keys_cascade_delete_and_update():
    for fk in Visit.__table__.foreign_key_constraints:
        assert fk.ondelete == "CASCADE"
        assert fk.onupdate == "CASCADE"


@pytest.mark.parametrize(
    "column, nullable",
    [("assignment_date", False), ("status", False), ("rating", True), ("comment", True)],
)
def test_nullability(column, nullable):
    assert Visit.__table__.c[column].nullable is nullable


def test_a_done_visit_with_rating_is_stored(db_session, visit_scenario):
    visit = _visit(visit_scenario, comment="Great")
    db_session.add(visit)
    db_session.flush()

    key = (visit.itinerary_id, visit.tourist_id, visit.assignment_date, visit.activity_id)
    assert db_session.get(Visit, key) is visit


def test_a_skipped_visit_needs_no_rating(db_session, visit_scenario):
    visit = _visit(visit_scenario, status="skipped", rating=None)
    db_session.add(visit)
    db_session.flush()

    assert visit.rating is None
    assert visit.comment is None


@pytest.mark.parametrize("rating", [-1, 0, 6])
def test_rating_out_of_range_is_rejected(db_session, visit_scenario, rating):
    db_session.add(_visit(visit_scenario, rating=rating))

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_a_done_visit_without_rating_is_rejected(db_session, visit_scenario):
    db_session.add(_visit(visit_scenario, status="done", rating=None))

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_unknown_status_is_rejected(db_session, visit_scenario):
    db_session.add(_visit(visit_scenario, status="pending", rating=None))

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_relationships_point_to_the_assignment_and_the_composition(db_session, visit_scenario):
    visit = _visit(visit_scenario)
    db_session.add(visit)
    db_session.flush()

    assert visit.assignment.tourist_id == visit_scenario["tourist_id"]
    assert visit.assignment.assignment_date == visit_scenario["assignment_date"]
    assert visit.itinerary_composition.activity_id == visit_scenario["activity_ids"][0]
    assert visit in visit.assignment.visits
    assert visit in visit.itinerary_composition.visits