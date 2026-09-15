"""Motor de Planificación de Citas — concept 7 of the brief.

Deterministic code does the objective work (midpoint, travel time, schedule
overlap and its candidate time slots, venues near the midpoint). Claude does
the subjective work: picking, from that shortlist, the venue that best fits both
profiles and writing the "why" and the meeting point. A deterministic ranking is
the fallback.

The engine returns:
  * a chosen venue + address + meeting point (brief §7),
  * an alternative venue,
  * a list of candidate datetimes (the man later picks 3 of these, brief §5).

Favourite venues (brief §6) get a strong boost so a date can land at a place one
of them already loves.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime

from ..services import availability as avail
from ..services import geo
from . import client

SYSTEM_PROMPT = (
    "Eres el motor de planificación de citas de una app sin chat. "
    "Recibes una lista corta de lugares candidatos (ya filtrados por cercanía "
    "al punto medio de ambos usuarios), los intereses/valores compartidos y "
    "los restaurantes favoritos de cada persona. "
    "Eliges el MEJOR lugar y una alternativa, y defines un punto de encuentro "
    "claro. Razonas por gustos compartidos, ambiente y practicidad, y das "
    "preferencia a un favorito compartido si lo hay. "
    "Devuelves EXCLUSIVAMENTE un objeto JSON con: venue_id (int del elegido), "
    "why (string breve en español), meeting_point (string), "
    "alternative_id (int), alternative_why (string). "
    "No inventes lugares: usa solo los venue_id de la lista."
)


@dataclass
class DatePlan:
    venue: object  # Venue model or None
    meeting_point: str = ""
    why: str = ""
    alternative: dict | None = None
    candidate_slots: list[datetime] = field(default_factory=list)
    source: str = "heuristic"  # claude | heuristic | no_slot | no_venue

    def is_plannable(self) -> bool:
        return self.venue is not None and bool(self.candidate_slots)


def _favorite_names(user) -> set[str]:
    p = user.preferences
    fav = getattr(p, "favorite_venues", []) if p else []
    return {str(f).strip().lower() for f in (fav or [])}


def _candidates_near(
    venues: list,
    mid: tuple[float, float],
    shared: set[str],
    favorites: set[str],
    limit: int = 6,
) -> list:
    """Rank venues: shared favourite first, then interest match, then distance."""
    ranked = sorted(
        venues,
        key=lambda v: (
            0 if str(v.name).strip().lower() in favorites else 1,
            -_interest_hits(v, shared),
            geo.haversine_km(v.location, mid),
        ),
    )
    return ranked[:limit]


def _interest_hits(v, shared: set[str]) -> int:
    tags = {str(t).strip().lower() for t in v.tags}
    tags.add(str(v.category).strip().lower())
    tags |= {str(a).strip().lower() for a in v.ambiance}
    return len(tags & shared)


def _venue_summary(v, loc_a, loc_b, favorites) -> dict:
    return {
        "venue_id": v.id,
        "name": v.name,
        "category": v.category,
        "tags": list(v.tags),
        "ambiance": list(v.ambiance),
        "price_level": v.price_level,
        "is_favorite": str(v.name).strip().lower() in favorites,
        "travel_minutes_user_a": geo.travel_minutes(loc_a, v.location),
        "travel_minutes_user_b": geo.travel_minutes(loc_b, v.location),
    }


def plan_date(
    user_a,
    user_b,
    venues: list,
    *,
    suggested_category: str = "",
    shared_interests: list[str] | None = None,
    now: datetime | None = None,
) -> DatePlan:
    """Produce a concrete date plan (venue + meeting point + candidate slots)."""
    pa, pb = user_a.preferences, user_b.preferences

    # 1. Deterministic: when can they both meet? Offer several options.
    overlap = avail.intersect_blocks(
        list(pa.availability) if pa else [],
        list(pb.availability) if pb else [],
    )
    slots = avail.candidate_datetimes(overlap, now=now)
    if not slots:
        return DatePlan(None, source="no_slot", why="Sin horarios en común por ahora.")

    # 2. Deterministic: where is fair to both, and near their tastes?
    mid = geo.midpoint(user_a.location, user_b.location)
    shared = {str(i).strip().lower() for i in (shared_interests or [])}
    if suggested_category:
        shared.add(suggested_category.strip().lower())
    favorites = _favorite_names(user_a) | _favorite_names(user_b)

    nearby = [v for v in venues if geo.haversine_km(v.location, mid) <= 15.0]
    if not nearby:  # widen if the midpoint is sparse
        nearby = sorted(venues, key=lambda v: geo.haversine_km(v.location, mid))[:8]
    if not nearby:
        return DatePlan(None, source="no_venue", why="No hay lugares en la zona.")

    candidates = _candidates_near(nearby, mid, shared, favorites)

    # 3. AI: pick the best fit, an alternative, and the meeting point.
    plan = _pick_with_claude(candidates, shared, favorites, user_a, user_b)
    if plan is None:
        plan = _pick_heuristic(candidates, shared, favorites, user_a, user_b)
    plan.candidate_slots = slots
    return plan


def _pick_with_claude(candidates, shared, favorites, user_a, user_b) -> DatePlan | None:
    payload = {
        "shared_interests": sorted(shared),
        "favorites": sorted(favorites),
        "candidates": [
            _venue_summary(v, user_a.location, user_b.location, favorites)
            for v in candidates
        ],
    }
    data = client.complete_json(SYSTEM_PROMPT, json.dumps(payload, ensure_ascii=False))
    if not data or "venue_id" not in data:
        return None

    by_id = {v.id: v for v in candidates}
    primary = by_id.get(_as_int(data.get("venue_id")))
    if primary is None:
        return None
    alt_venue = by_id.get(_as_int(data.get("alternative_id")))
    return DatePlan(
        venue=primary,
        meeting_point=str(data.get("meeting_point", "")) or _auto_meeting_point(primary),
        why=str(data.get("why", "")) or _auto_why(primary, shared, favorites, user_a, user_b),
        alternative=_alt_dict(alt_venue, str(data.get("alternative_why", ""))),
        source="claude",
    )


def _pick_heuristic(candidates, shared, favorites, user_a, user_b) -> DatePlan:
    primary = candidates[0]
    alt_venue = candidates[1] if len(candidates) > 1 else None
    return DatePlan(
        venue=primary,
        meeting_point=_auto_meeting_point(primary),
        why=_auto_why(primary, shared, favorites, user_a, user_b),
        alternative=_alt_dict(
            alt_venue,
            _auto_why(alt_venue, shared, favorites, user_a, user_b) if alt_venue else "",
        ),
        source="heuristic",
    )


def _auto_meeting_point(v) -> str:
    if v is None:
        return ""
    return f"En la entrada de {v.name}" + (f" ({v.address})" if v.address else "")


def _auto_why(v, shared, favorites, user_a, user_b) -> str:
    if v is None:
        return ""
    ta = geo.travel_minutes(user_a.location, v.location)
    tb = geo.travel_minutes(user_b.location, v.location)
    tags = {str(t).strip().lower() for t in v.tags} | {str(v.category).strip().lower()}
    hit = sorted(tags & shared)
    parts = [f"A {ta} min de uno y {tb} min del otro"]
    if str(v.name).strip().lower() in favorites:
        parts.append("es uno de vuestros lugares favoritos")
    if v.ambiance:
        parts.append(f"ambiente {', '.join(v.ambiance)}")
    if hit:
        parts.append(f"encaja con el interés compartido en {hit[0]}")
    return " — ".join(parts) + "."


def _alt_dict(v, why: str) -> dict | None:
    if v is None:
        return None
    return {"venue": v.name, "address": v.address, "reasoning": why}


def _as_int(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
