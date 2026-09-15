"""Match generation — runs the compatibility engine across nearby users.

In the brief this runs in the background; here it is a callable the API can
trigger on demand (e.g. right after a user finishes onboarding).
"""

from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..ai import compatibility
from ..config import get_settings
from ..models import Match, MatchStatus, User
from . import geo

settings = get_settings()


def _ordered_pair(a_id: int, b_id: int) -> tuple[int, int]:
    """Store pairs in a stable order so (a,b) and (b,a) are one row."""
    return (a_id, b_id) if a_id < b_id else (b_id, a_id)


def find_existing(db: Session, a_id: int, b_id: int) -> Match | None:
    lo, hi = _ordered_pair(a_id, b_id)
    return db.scalar(
        select(Match).where(Match.user_a_id == lo, Match.user_b_id == hi)
    )


def generate_matches_for(db: Session, user: User) -> list[Match]:
    """Score `user` against every active user within the match radius.

    Persists a Match row (above the score threshold) for each candidate and
    returns the surfaced matches, best score first.
    """
    candidates = db.scalars(
        select(User).where(User.id != user.id, User.active.is_(True))
    ).all()

    surfaced: list[Match] = []
    for other in candidates:
        distance = geo.haversine_km(user.location, other.location)
        if distance > settings.match_radius_km:
            continue

        result = compatibility.score_pair(user, other)
        if result.compatibility_score < settings.match_score_threshold:
            continue

        match = find_existing(db, user.id, other.id)
        if match is None:
            lo, hi = _ordered_pair(user.id, other.id)
            match = Match(user_a_id=lo, user_b_id=hi)
            db.add(match)

        match.compatibility_score = result.compatibility_score
        match.shared_values = result.shared_values
        match.shared_interests = result.shared_interests
        match.breakdown = result.breakdown
        match.reasoning = result.reasoning
        match.suggested_date_category = result.suggested_date_category
        if match.status == MatchStatus.expired:
            match.status = MatchStatus.pending
        surfaced.append(match)

    db.commit()
    surfaced.sort(key=lambda m: m.compatibility_score, reverse=True)
    return surfaced


def matches_for_user(db: Session, user_id: int) -> list[Match]:
    rows = db.scalars(
        select(Match)
        .where(or_(Match.user_a_id == user_id, Match.user_b_id == user_id))
        .order_by(Match.compatibility_score.desc())
    ).all()
    return list(rows)
