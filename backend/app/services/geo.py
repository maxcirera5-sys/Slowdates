"""Deterministic geography — no AI here (brief section 3.2).

Great-circle distance, geographic midpoint, and a crude travel-time estimate.
The midpoint is where we search for a venue that is fair to both people.
"""

from __future__ import annotations

import math

EARTH_RADIUS_KM = 6371.0
# Rough door-to-door city speed incl. stops; good enough to compare venues.
AVG_CITY_SPEED_KMH = 22.0


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Great-circle distance between two (lat, lng) points, in km."""
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def midpoint(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    """Spherical midpoint of two (lat, lng) points."""
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    dlng = lng2 - lng1

    bx = math.cos(lat2) * math.cos(dlng)
    by = math.cos(lat2) * math.sin(dlng)
    lat_m = math.atan2(
        math.sin(lat1) + math.sin(lat2),
        math.sqrt((math.cos(lat1) + bx) ** 2 + by**2),
    )
    lng_m = lng1 + math.atan2(by, math.cos(lat1) + bx)
    return (math.degrees(lat_m), math.degrees(lng_m))


def travel_minutes(a: tuple[float, float], b: tuple[float, float]) -> int:
    """Estimated one-way travel time between two points, in minutes.

    A straight-line distance scaled up ~30% to approximate real road paths,
    then divided by an average city speed. A stand-in for a routing API.
    """
    road_km = haversine_km(a, b) * 1.3
    return round(road_km / AVG_CITY_SPEED_KMH * 60)


def fairness_penalty(
    venue: tuple[float, float],
    a: tuple[float, float],
    b: tuple[float, float],
) -> float:
    """How lopsided a venue is: total travel time plus an imbalance tax.

    Lower is better. Two people travelling 15 min each beats one travelling
    5 and the other 40, even though the totals are close.
    """
    ta = travel_minutes(a, venue)
    tb = travel_minutes(b, venue)
    return (ta + tb) + abs(ta - tb) * 1.5
