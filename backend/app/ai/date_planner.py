"""Motor de Planificación de Citas — the second core AI engine.

Deterministic code does the objective work (midpoint, travel time, schedule
overlap, candidate venues near the midpoint). Claude does the subjective work:
picking, from that shortlist, the venue that best fits the shared interests
and writing the "why". A deterministic ranking is the fallback.

The engine always returns a primary plan plus one alternative.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime

from ..services import availability as avail
from ..services import geo
from . import client

SYSTEM_PROMPT = (
    "Eres el motor de planificación de citas de una app sin chat. "
    "Recibes una lista corta de lugares candidatos (ya filtrados por cercanía "
    "al punto medio de ambos usuarios) y los intereses compartidos. "
    "Eliges el MEJOR lugar y una alternativa, razonando por gustos compartidos, "
    "ambiente y practicidad. Devuelves EXCLUSIVAMENTE un objeto JSON con: "
    "venue_id (int del candidato elegido), why (string breve en español), "
    "alternative_id (int de la alternativa), alternative_why (string). "
    "No inventes lugares: usa solo los venue_id de la lista."
)


@dataclass
class DatePlan:
    venue: object  # Venue model or None
    datetime_utc: datetime | None
    why: str
    alternative: dict | None
    source: str  # "claude" | "heuristic" | "no_slot" | "no_venue"

    def is_plannable(self) -> bool:
        return self.venue is not None and self.datetime_utc is not None


def _candidates_near(
    venues: list, mid: tuple[float, float], shared_interests: set[str], limit: int = 6
) -> list:
    """Rank venues by interest match first, then by distance to the midpoint."""
    ranked = sorted(
        venues,
        key=lambda v: (
            -_interest_hits(v, shared_interests),
            geo.haversine_km(v.location, mid),
        ),
    )
    return ranked[:limit]


def _interest_hits(v, shared_interests: set[str]) -> int:
    tags = {str(t).strip().lower() for t in v.tags}
    tags.add(str(v.category).strip().lower())
    tags |= {str(a).strip().lower() for a in v.ambiance}
    return len(tags & shared_interests)


def _venue_summary(v, loc_a, loc_b) -> dict:
    return {
        "venue_id": v.id,
        "name": v.name,
        "category": v.category,
        "tags": list(v.tags),
        "ambiance": list(v.ambiance),
        "price_level": v.price_level,
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
    """Produce a concrete date plan (venue + datetime + why + alternative)."""
    pa, pb = user_a.preferences, user_b.preferences

    # 1. Deterministic: when can they both meet?
    overlap = avail.intersect_blocks(
        list(pa.availability) if pa else [],
        list(pb.availability) if pb else [],
    )
    if not overlap:
        return DatePlan(None, None, "Sin horarios en común por ahora.", None, "no_slot")
    when = avail.next_datetime_for_block(overlap[0], now=now)

    # 2. Deterministic: where is fair to both, and near their tastes?
    mid = geo.midpoint(user_a.location, user_b.location)
    shared = {str(i).strip().lower() for i in (shared_interests or [])}
    if suggested_category:
        shared.add(suggested_category.strip().lower())

    nearby = [v for v in venues if geo.haversine_km(v.location, mid) <= 15.0]
    if not nearby:  # widen if the midpoint is sparse
        nearby = sorted(venues, key=lambda v: geo.haversine_km(v.location, mid))[:8]
    if not nearby:
        return DatePlan(None, when, "No hay lugares en la zona.", None, "no_venue")

    candidates = _candidates_near(nearby, mid, shared)

    # 3. AI: pick the best fit and an alternative from the shortlist.
    plan = _pick_with_claude(candidates, shared, user_a, user_b, when)
    if plan is not None:
        return plan
    return _pick_heuristic(candidates, shared, user_a, user_b, when)


def _pick_with_claude(candidates, shared, user_a, user_b, when) -> DatePlan | None:
    payload = {
        "shared_interests": sorted(shared),
        "date_datetime_utc": when.isoformat(),
        "candidates": [
            _venue_summary(v, user_a.location, user_b.location) for v in candidates
        ],
    }
    data = client.complete_json(
        SYSTEM_PROMPT, json.dumps(payload, ensure_ascii=False)
    )
    if not data or "venue_id" not in data:
        return None

    by_id = {v.id: v for v in candidates}
    primary = by_id.get(_as_int(data.get("venue_id")))
    if primary is None:
        return None
    alt_venue = by_id.get(_as_int(data.get("alternative_id")))
    alternative = _alt_dict(alt_venue, str(data.get("alternative_why", "")))

    return DatePlan(
        venue=primary,
        datetime_utc=when,
        why=str(data.get("why", "")) or _auto_why(primary, shared, user_a, user_b),
        alternative=alternative,
        source="claude",
    )


def _pick_heuristic(candidates, shared, user_a, user_b, when) -> DatePlan:
    primary = candidates[0]
    alt_venue = candidates[1] if len(candidates) > 1 else None
    return DatePlan(
        venue=primary,
        datetime_utc=when,
        why=_auto_why(primary, shared, user_a, user_b),
        alternative=_alt_dict(
            alt_venue, _auto_why(alt_venue, shared, user_a, user_b) if alt_venue else ""
        ),
        source="heuristic",
    )


def _auto_why(v, shared, user_a, user_b) -> str:
    if v is None:
        return ""
    ta = geo.travel_minutes(user_a.location, v.location)
    tb = geo.travel_minutes(user_b.location, v.location)
    tags = {str(t).strip().lower() for t in v.tags} | {str(v.category).strip().lower()}
    hit = sorted(tags & shared)
    parts = [f"A {ta} min de uno y {tb} min del otro"]
    if v.ambiance:
        parts.append(f"ambiente {', '.join(v.ambiance)}")
    if hit:
        parts.append(f"coincide con el interés compartido en {hit[0]}")
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
