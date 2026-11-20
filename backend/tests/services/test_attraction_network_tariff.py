"""Tests for the distance and tariff of the attraction network."""

import math

import pytest

from app.services.attraction_network.tariff import (
    EARTH_RADIUS_M,
    Tariff,
    TravelMode,
    distance_m,
)


def test_distance_between_the_same_point_is_zero():
    assert distance_m(23.1404, -82.35, 23.1404, -82.35) == 0


def test_distance_matches_a_known_value():
    # One degree of latitude is about 111.2 km anywhere on the Earth
    assert distance_m(23.0, -82.0, 24.0, -82.0) == pytest.approx(111_195, abs=1)


def test_distance_is_symmetric():
    there = distance_m(23.1404, -82.35, 23.1352, -82.3590)
    back = distance_m(23.1352, -82.3590, 23.1404, -82.35)

    assert there == pytest.approx(back)


def test_distance_between_almost_opposite_points_is_half_the_earth():
    # Rounding makes sqrt(h) 1.0000000000000002 for these two points, and asin fails above 1
    half_the_earth = math.pi * EARTH_RADIUS_M

    distance = distance_m(
        65.45160237952763, -78.44521025235821, -65.45160249658095, 101.5547905576211
    )

    assert distance == pytest.approx(half_the_earth)


def test_short_distance_is_walked_for_free_at_walking_speed():
    travel = Tariff().travel(1_000)

    assert travel.mode is TravelMode.WALK
    assert travel.meters == 1_000
    assert travel.seconds == pytest.approx(1_000)  # 1 m/s
    assert travel.cost == 0


def test_walk_limit_is_inclusive():
    assert Tariff().travel(1_200).mode is TravelMode.WALK


def test_longer_distance_takes_a_taxi():
    travel = Tariff().travel(4_000)

    assert travel.mode is TravelMode.TAXI
    assert travel.seconds == pytest.approx(360 + 4_000 / (20 / 3.6))  # 18 min
    assert travel.cost == pytest.approx(8)


def test_distance_beyond_the_reach_has_no_travel():
    assert Tariff().travel(50_001) is None
    assert Tariff().travel(50_000) is not None


def test_tariff_can_be_changed():
    tariff = Tariff(max_meters=5_000, taxi_cost_per_meter=0.003)

    assert tariff.travel(4_000).cost == pytest.approx(14)
    assert tariff.travel(6_000) is None
