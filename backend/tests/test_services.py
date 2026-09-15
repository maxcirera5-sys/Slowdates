"""Unit tests for the deterministic geo + availability logic."""

from datetime import datetime, timezone

from app.services import availability as avail
from app.services import geo


def test_haversine_known_distance():
    # Madrid Sol to Retiro is ~2 km.
    d = geo.haversine_km((40.4168, -3.7038), (40.4153, -3.6844))
    assert 1.0 < d < 3.0


def test_midpoint_is_between():
    a, b = (40.44, -3.70), (40.40, -3.72)
    mid = geo.midpoint(a, b)
    assert min(a[0], b[0]) <= mid[0] <= max(a[0], b[0])
    assert min(a[1], b[1]) <= mid[1] <= max(a[1], b[1])


def test_travel_minutes_symmetric_and_positive():
    a, b = (40.44, -3.70), (40.40, -3.72)
    assert geo.travel_minutes(a, b) == geo.travel_minutes(b, a)
    assert geo.travel_minutes(a, b) > 0


def test_fairness_penalty_prefers_balance():
    a, b = (40.50, -3.70), (40.40, -3.70)
    balanced = geo.midpoint(a, b)
    lopsided = (40.49, -3.70)  # right next to A, far from B
    assert geo.fairness_penalty(balanced, a, b) < geo.fairness_penalty(lopsided, a, b)


def test_intersect_blocks_overlap():
    a = [{"day": "sat", "start": "10:00", "end": "14:00"}]
    b = [{"day": "sat", "start": "11:00", "end": "16:00"}]
    out = avail.intersect_blocks(a, b)
    assert out == [{"day": "sat", "start": "11:00", "end": "14:00"}]


def test_intersect_blocks_rejects_short_overlap():
    a = [{"day": "sat", "start": "10:00", "end": "11:30"}]
    b = [{"day": "sat", "start": "11:00", "end": "16:00"}]  # only 30 min overlap
    assert avail.intersect_blocks(a, b) == []


def test_intersect_blocks_no_common_day():
    a = [{"day": "mon", "start": "10:00", "end": "14:00"}]
    b = [{"day": "sat", "start": "11:00", "end": "16:00"}]
    assert avail.intersect_blocks(a, b) == []


def test_next_datetime_is_future_and_correct_weekday():
    now = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)  # a Tuesday
    dt = avail.next_datetime_for_block(
        {"day": "sat", "start": "11:00", "end": "14:00"}, now=now
    )
    assert dt > now
    assert dt.weekday() == 5  # Saturday
    assert dt.hour == 11 and dt.minute == 30  # start + 30 min slack


def test_candidate_datetimes_offers_several_future_options():
    now = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)  # Tuesday
    blocks = [
        {"day": "sat", "start": "10:00", "end": "16:00"},
        {"day": "wed", "start": "19:00", "end": "23:00"},
    ]
    slots = avail.candidate_datetimes(blocks, now=now, limit=6)
    assert 2 <= len(slots) <= 6
    assert slots == sorted(slots)  # chronological
    assert all(s > now for s in slots)
    assert len(set(slots)) == len(slots)  # no duplicates
