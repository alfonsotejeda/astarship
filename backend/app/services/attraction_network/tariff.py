"""Distance and travel tariff of the attraction network (RF-32).

Everything is in SI units (meters, seconds, meters per second) and costs in USD; values are
not rounded, the frontend converts and rounds them for display.

Times and costs are estimates, not real data: the distance is the straight line between two
points (Haversine) and the tariff is an assumption of the project. Buses are not modelled,
because they need lines and stops that the system doesn't have.
"""

from dataclasses import dataclass
from enum import StrEnum
from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_M = 6_371_000


class TravelMode(StrEnum):
    """How to go from one attraction to another."""

    WALK = "walk"
    TAXI = "taxi"


@dataclass(frozen=True)
class Travel:
    """Distance (m), time (s), cost (USD) and mode of going between two attractions."""

    meters: float
    seconds: float
    cost: float
    mode: TravelMode


@dataclass(frozen=True)
class Tariff:
    """Rules that turn a distance into a travel."""

    max_meters: float = 50_000  # farther apart, two attractions are not connected
    walk_max_meters: float = 1_200  # up to here people walk
    walk_speed: float = 1.0  # m/s, a tourist group with older people, stops and chatting
    taxi_wait_seconds: float = 360  # waiting for the taxi and getting out of it
    taxi_speed: float = 20 / 3.6  # m/s, 20 km/h on average in city traffic
    taxi_base_cost: float = 2  # USD, fixed fare of every ride
    taxi_cost_per_meter: float = 0.0015  # USD, 1.5 per km

    def travel(self, meters: float) -> Travel | None:
        """Return how to cover the distance, or None if it is beyond the network's reach."""
        if meters > self.max_meters:
            return None
        if meters <= self.walk_max_meters:
            return Travel(
                meters=meters, seconds=meters / self.walk_speed, cost=0, mode=TravelMode.WALK
            )
        return Travel(
            meters=meters,
            seconds=self.taxi_wait_seconds + meters / self.taxi_speed,
            cost=self.taxi_base_cost + meters * self.taxi_cost_per_meter,
            mode=TravelMode.TAXI,
        )


def distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the straight-line distance in meters between two points on the Earth (Haversine)."""
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    h = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(sqrt(h))
