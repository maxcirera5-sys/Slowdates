"""Derive/recalculate a user's PersonalityProfile from their raw test responses.

This is the only place that bridges the DB and the pure scoring module: it reads
``TestResponse`` + ``TestQuestion`` and upserts a ``PersonalityProfile``.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (
    PersonalityProfile,
    QuestionType,
    TestQuestion,
    TestResponse,
)
from .scoring import calculate_trait_score, normalize_answer

BIG_FIVE_TRAITS = (
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "emotional_stability",
)
ATTACHMENT_TRAITS = ("attachment_anxiety", "attachment_avoidance")
SINGLE_VALUE_FIELDS = (
    "relationship_intent",
    "children",
    "spirituality",
    "ambition",
    "hobbies_importance",
    "conflict_style",
    "contact_frequency",
)
LIST_VALUE_FIELDS = ("habits", "love_languages")


def build_personality_profile(db: Session, user_id: int) -> PersonalityProfile:
    """Recompute and persist the derived profile for ``user_id``."""
    questions = {q.id: q for q in db.scalars(select(TestQuestion)).all()}
    responses = db.scalars(
        select(TestResponse).where(TestResponse.user_id == user_id)
    ).all()

    likert_buckets: dict[str, list[float]] = {}
    single_fields: dict[str, str | None] = {}
    list_fields: dict[str, list] = {}

    for resp in responses:
        q = questions.get(resp.question_id)
        if q is None:
            continue
        if q.qtype == QuestionType.likert:
            value = normalize_answer(resp.raw_value, q.is_reverse)
            likert_buckets.setdefault(q.trait, []).append(value)
        elif q.qtype in (QuestionType.multi_choice, QuestionType.ranking):
            list_fields[q.trait] = list(resp.raw_value or [])
        else:  # single_choice
            single_fields[q.trait] = resp.raw_value

    def trait(name: str) -> float:
        return round(calculate_trait_score(likert_buckets.get(name, [])), 6)

    profile = db.scalar(
        select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
    )
    if profile is None:
        profile = PersonalityProfile(user_id=user_id)
        db.add(profile)

    for t in BIG_FIVE_TRAITS + ATTACHMENT_TRAITS:
        setattr(profile, t, trait(t))
    for f in SINGLE_VALUE_FIELDS:
        setattr(profile, f, single_fields.get(f))
    for f in LIST_VALUE_FIELDS:
        setattr(profile, f, list_fields.get(f, []))
    profile.recalculated_at = datetime.now(timezone.utc)

    db.flush()
    return profile


def profile_to_scoring(profile: PersonalityProfile):
    """Adapt a persisted profile into the pure ``ScoringProfile`` input."""
    from .scoring import ScoringProfile

    return ScoringProfile(
        big_five={t: getattr(profile, t) for t in BIG_FIVE_TRAITS},
        attachment_anxiety=profile.attachment_anxiety,
        attachment_avoidance=profile.attachment_avoidance,
        values={
            "relationship_intent": profile.relationship_intent,
            "children": profile.children,
            "spirituality": profile.spirituality,
            "ambition": profile.ambition,
            "habits": list(profile.habits or []),
            "hobbies_importance": profile.hobbies_importance,
        },
        communication={
            "conflict_style": profile.conflict_style,
            "love_languages": list(profile.love_languages or []),
            "contact_frequency": profile.contact_frequency,
        },
    )
