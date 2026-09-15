"""Tests for the two AI engines' heuristic (offline) path."""

from datetime import datetime, timezone
from types import SimpleNamespace

from app.ai import compatibility, date_planner


def _user(name, interests, ambiance, budget="medio", lifestyle=None, avail_blocks=None):
    prefs = SimpleNamespace(
        interests=interests,
        ambiance=ambiance,
        budget=budget,
        lifestyle=lifestyle or {},
        availability=avail_blocks or [],
    )
    return SimpleNamespace(
        id=abs(hash(name)) % 1000,
        name=name,
        lat=40.44,
        lng=-3.70,
        location=(40.44, -3.70),
        preferences=prefs,
    )


def _venue(vid, name, category, tags, ambiance, lat=40.42, lng=-3.70):
    return SimpleNamespace(
        id=vid, name=name, address=f"{name} addr", lat=lat, lng=lng,
        location=(lat, lng), category=category, tags=tags,
        ambiance=ambiance, price_level="medio",
    )


def test_compatibility_high_for_aligned_profiles():
    a = _user("Ana", ["senderismo", "café de especialidad"], ["tranquilo", "exterior"])
    b = _user("Bruno", ["senderismo", "café de especialidad"], ["tranquilo", "exterior"])
    result = compatibility.score_pair(a, b)
    assert result.compatibility_score > 0.7
    assert "senderismo" in [s.lower() for s in result.shared_interests]
    assert result.suggested_date_category  # non-empty


def test_compatibility_low_for_disjoint_profiles():
    a = _user("Ana", ["senderismo"], ["tranquilo", "exterior"], budget="bajo")
    b = _user("Carla", ["ópera"], ["animado", "interior"], budget="alto")
    result = compatibility.score_pair(a, b)
    assert result.compatibility_score < 0.4


def test_compatibility_output_shape():
    a = _user("Ana", ["cine"], ["animado"])
    b = _user("Bruno", ["cine"], ["animado"])
    d = compatibility.score_pair(a, b).as_dict()
    assert set(d) == {
        "compatibility_score", "shared_interests", "reasoning",
        "suggested_date_category", "source",
    }
    assert 0.0 <= d["compatibility_score"] <= 1.0


def test_date_planner_picks_interest_matched_venue():
    a = _user(
        "Ana", ["senderismo"], ["exterior"],
        avail_blocks=[{"day": "sat", "start": "10:00", "end": "14:00"}],
    )
    b = _user(
        "Bruno", ["senderismo"], ["exterior"],
        avail_blocks=[{"day": "sat", "start": "11:00", "end": "16:00"}],
    )
    venues = [
        _venue(1, "Ramen Kagura", "gastronomía asiática", ["ramen"], ["animado"]),
        _venue(2, "Sendero", "senderismo", ["senderismo", "caminata"], ["exterior"]),
    ]
    now = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)
    plan = date_planner.plan_date(
        a, b, venues, shared_interests=["senderismo"], now=now
    )
    assert plan.is_plannable()
    assert plan.venue.id == 2  # the senderismo venue, not ramen
    assert plan.datetime_utc.weekday() == 5  # Saturday
    assert plan.alternative is not None
    assert plan.why


def test_date_planner_no_common_schedule():
    a = _user("Ana", ["senderismo"], ["exterior"],
              avail_blocks=[{"day": "mon", "start": "10:00", "end": "14:00"}])
    b = _user("Bruno", ["senderismo"], ["exterior"],
              avail_blocks=[{"day": "sat", "start": "11:00", "end": "16:00"}])
    venues = [_venue(1, "Sendero", "senderismo", ["senderismo"], ["exterior"])]
    plan = date_planner.plan_date(a, b, venues, shared_interests=["senderismo"])
    assert not plan.is_plannable()
    assert plan.source == "no_slot"
