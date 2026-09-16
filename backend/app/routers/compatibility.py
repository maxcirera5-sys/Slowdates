"""Compatibility endpoint: score two users from their derived profiles."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PersonalityProfile
from ..personality.profile_builder import profile_to_scoring
from ..personality.schemas import CompatibilityOut
from ..personality.scoring import calculate_compatibility_score

router = APIRouter(prefix="/compatibility", tags=["compatibility"])


def _profile(db: Session, user_id: int) -> PersonalityProfile:
    profile = db.scalar(
        select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
    )
    if profile is None:
        raise HTTPException(404, f"no personality profile for user {user_id} — complete the test first")
    return profile


@router.get("/{user_a_id}/{user_b_id}", response_model=CompatibilityOut)
def get_compatibility(user_a_id: int, user_b_id: int, db: Session = Depends(get_db)):
    """Run the deterministic compatibility pipeline for two users."""
    if user_a_id == user_b_id:
        raise HTTPException(422, "cannot score a user against themselves")
    a = profile_to_scoring(_profile(db, user_a_id))
    b = profile_to_scoring(_profile(db, user_b_id))
    return calculate_compatibility_score(a, b)
