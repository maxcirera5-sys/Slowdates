"""User onboarding and profile endpoints (brief screen 1, concepts 1 & 6)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai import profiler
from ..database import get_db
from ..models import Gender, Preferences, User
from ..schemas import ProfileOut, UserCreate, UserOut
from ..services import matching

router = APIRouter(prefix="/users", tags=["users"])


def _as_gender(value: str | None) -> Gender | None:
    if value is None:
        return None
    try:
        return Gender(value)
    except ValueError:
        raise HTTPException(422, "gender/seeking must be male|female|other")


def _apply_profile(prefs: Preferences) -> None:
    """Run the AI profile engine and store the derived deep profile (brief §1)."""
    result = profiler.build_profile(prefs)
    prefs.personality_traits = result.personality_traits
    # Enrich (don't clobber) the user's own answers with what the AI inferred.
    if result.values:
        prefs.values = result.values
    if result.ambitions:
        prefs.ambitions = result.ambitions
    if result.communication_style:
        prefs.communication_style = result.communication_style
    if result.relationship_type:
        prefs.relationship_type = result.relationship_type
    prefs.ai_summary = result.summary
    prefs.profile_source = result.source


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(409, "email already registered")

    p = payload.preferences
    if len(p.favorite_venues) > 5:
        raise HTTPException(422, "favorite_venues: máximo 5 (brief §6)")

    user = User(
        name=payload.name,
        email=payload.email,
        gender=_as_gender(payload.gender) or Gender.other,
        seeking=_as_gender(payload.seeking),
        lat=payload.lat,
        lng=payload.lng,
        city=payload.city,
        photos=payload.photos,
    )
    user.preferences = Preferences(
        bio=p.bio,
        interests=p.interests,
        ambiance=p.ambiance,
        budget=p.budget,
        favorite_venues=p.favorite_venues,
        values=p.values,
        ambitions=p.ambitions,
        lifestyle=p.lifestyle,
        communication_style=p.communication_style,
        relationship_type=p.relationship_type,
        availability=[b.model_dump() for b in p.availability],
    )
    _apply_profile(user.preferences)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "user not found")
    return user


@router.get("/{user_id}/profile", response_model=ProfileOut)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    """The AI-derived deep profile (brief §1)."""
    user = db.get(User, user_id)
    if user is None or user.preferences is None:
        raise HTTPException(404, "profile not found")
    p = user.preferences
    return ProfileOut(
        personality_traits=list(p.personality_traits or []),
        values=list(p.values or []),
        ambitions=list(p.ambitions or []),
        communication_style=p.communication_style or "",
        relationship_type=p.relationship_type or "",
        ai_summary=p.ai_summary or "",
        profile_source=p.profile_source or "",
    )


@router.post("/{user_id}/regenerate-profile", response_model=ProfileOut)
def regenerate_profile(user_id: int, db: Session = Depends(get_db)):
    """Re-run the profile engine over the user's current answers."""
    user = db.get(User, user_id)
    if user is None or user.preferences is None:
        raise HTTPException(404, "user not found")
    _apply_profile(user.preferences)
    db.commit()
    db.refresh(user)
    p = user.preferences
    return ProfileOut(
        personality_traits=list(p.personality_traits or []),
        values=list(p.values or []),
        ambitions=list(p.ambitions or []),
        communication_style=p.communication_style or "",
        relationship_type=p.relationship_type or "",
        ai_summary=p.ai_summary or "",
        profile_source=p.profile_source or "",
    )


@router.post("/{user_id}/generate-matches", response_model=list[dict])
def generate_matches(user_id: int, db: Session = Depends(get_db)):
    """Run the compatibility engine for this user against nearby actives."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "user not found")
    matches = matching.generate_matches_for(db, user)
    return [
        {
            "match_id": m.id,
            "other_user_id": m.user_b_id if m.user_a_id == user_id else m.user_a_id,
            "compatibility_score": m.compatibility_score,
            "shared_values": m.shared_values,
            "shared_interests": m.shared_interests,
            "breakdown": m.breakdown,
            "reasoning": m.reasoning,
            "suggested_date_category": m.suggested_date_category,
        }
        for m in matches
    ]
