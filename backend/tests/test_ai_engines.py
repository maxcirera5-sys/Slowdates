"""Tests for the three AI engines' heuristic (offline) path."""

from datetime import datetime, timezone
from types import SimpleNamespace

from app.ai import compatibility, date_planner, profiler


def _prefs(**kw):
    base = dict(
        bio="",
        interests=[],
        ambiance=[],
        budget="medio",
        favorite_venues=[],
        values=[],
        ambitions=[],
        lifestyle={},
        communication_style="",
        relationship_type="",
        personality_traits=[],
        availability=[],
    )
    base.update(kw)
    return SimpleNamespace(**base)


def _user(name, **kw):
    return SimpleNamespace(
        id=abs(hash(name)) % 1000,
        name=name,
        lat=40.44,
        lng=-3.70,
        location=(40.44, -3.70),
        preferences=_prefs(**kw),
    )


def _venue(vid, name, category, tags, ambiance, lat=40.42, lng=-3.70):
    return SimpleNamespace(
        id=vid, name=name, address=f"{name} addr", lat=lat, lng=lng,
        location=(lat, lng), category=category, tags=tags,
        ambiance=ambiance, price_level="medio",
    )


# --------------------------------------------------------------------------- #
# Profiler
# --------------------------------------------------------------------------- #
def test_profiler_infers_traits_and_summary():
    prefs = _prefs(
        interests=["senderismo", "arte"],
        values=["honestidad"],
        ambitions=["viajar"],
        lifestyle={"pets": True},
    )
    result = profiler.build_profile(prefs)
    assert result.personality_traits  # non-empty
    assert result.summary
    assert result.source == "heuristic"


def test_profiler_output_shape():
    d = profiler.build_profile(_prefs()).as_dict()
    assert set(d) == {
        "personality_traits", "values", "ambitions", "communication_style",
        "relationship_type", "summary", "source",
    }


# --------------------------------------------------------------------------- #
# Compatibility — driven by values/ambitions, not hobbies (brief §2)
# --------------------------------------------------------------------------- #
def test_compatibility_high_for_aligned_values_and_goals():
    a = _user(
        "Ana",
        values=["honestidad", "crecimiento personal"],
        ambitions=["viajar"],
        personality_traits=["curiosa", "serena"],
        communication_style="cercana y pausada",
        interests=["senderismo"],
    )
    b = _user(
        "Bruno",
        values=["honestidad", "crecimiento personal"],
        ambitions=["viajar"],
        personality_traits=["curiosa", "serena"],
        communication_style="cercana y pausada",
        interests=["juegos de mesa"],  # different hobby on purpose
    )
    result = compatibility.score_pair(a, b)
    assert result.compatibility_score > 0.7
    assert "honestidad" in [s.lower() for s in result.shared_values]
    assert result.suggested_date_category  # non-empty


def test_compatibility_low_for_disjoint_profiles():
    a = _user(
        "Ana", values=["naturaleza"], ambitions=["vida tranquila"],
        personality_traits=["serena"], communication_style="pausada",
        interests=["senderismo"], budget="bajo",
    )
    b = _user(
        "Carla", values=["ambición"], ambitions=["fama"],
        personality_traits=["intensa"], communication_style="directa",
        interests=["ópera"], budget="alto",
    )
    result = compatibility.score_pair(a, b)
    assert result.compatibility_score < 0.4


def test_compatibility_output_shape():
    a = _user("Ana", values=["x"], interests=["cine"])
    b = _user("Bruno", values=["x"], interests=["cine"])
    d = compatibility.score_pair(a, b).as_dict()
    assert set(d) == {
        "compatibility_score", "shared_values", "shared_interests",
        "breakdown", "reasoning", "suggested_date_category", "source",
    }
    assert 0.0 <= d["compatibility_score"] <= 1.0
    assert set(d["breakdown"]) == {
        "values", "ambitions", "personality", "communication",
        "lifestyle", "interests",
    }


# --------------------------------------------------------------------------- #
# Date planner
# --------------------------------------------------------------------------- #
def test_date_planner_picks_interest_matched_venue_with_slots():
    a = _user(
        "Ana", interests=["senderismo"], ambiance=["exterior"],
        availability=[{"day": "sat", "start": "10:00", "end": "14:00"}],
    )
    b = _user(
        "Bruno", interests=["senderismo"], ambiance=["exterior"],
        availability=[{"day": "sat", "start": "11:00", "end": "16:00"}],
    )
    venues = [
        _venue(1, "Ramen Kagura", "gastronomía asiática", ["ramen"], ["animado"]),
        _venue(2, "Sendero", "senderismo", ["senderismo", "caminata"], ["exterior"]),
    ]
    now = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)
    plan = date_planner.plan_date(a, b, venues, shared_interests=["senderismo"], now=now)
    assert plan.is_plannable()
    assert plan.venue.id == 2  # the senderismo venue, not ramen
    assert plan.candidate_slots  # multiple date/time options offered
    assert all(s.weekday() == 5 for s in plan.candidate_slots)  # all on Saturday
    assert plan.meeting_point
    assert plan.alternative is not None
    assert plan.why


def test_date_planner_boosts_shared_favorite_venue():
    a = _user(
        "Ana", interests=["café"], favorite_venues=["Café Nube"],
        availability=[{"day": "sat", "start": "10:00", "end": "14:00"}],
    )
    b = _user(
        "Bruno", interests=["café"], favorite_venues=["Café Nube"],
        availability=[{"day": "sat", "start": "11:00", "end": "16:00"}],
    )
    venues = [
        _venue(1, "Ramen Kagura", "gastronomía asiática", ["ramen"], ["animado"]),
        _venue(2, "Café Nube", "café", ["café de especialidad"], ["tranquilo"]),
    ]
    now = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)
    plan = date_planner.plan_date(a, b, venues, shared_interests=["café"], now=now)
    assert plan.venue.name == "Café Nube"  # the shared favourite wins


def test_date_planner_no_common_schedule():
    a = _user("Ana", interests=["senderismo"],
              availability=[{"day": "mon", "start": "10:00", "end": "14:00"}])
    b = _user("Bruno", interests=["senderismo"],
              availability=[{"day": "sat", "start": "11:00", "end": "16:00"}])
    venues = [_venue(1, "Sendero", "senderismo", ["senderismo"], ["exterior"])]
    plan = date_planner.plan_date(a, b, venues, shared_interests=["senderismo"])
    assert not plan.is_plannable()
    assert plan.source == "no_slot"
