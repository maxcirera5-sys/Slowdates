"""User onboarding and profile endpoints (brief screen 1)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Preferences, User
from ..schemas import UserCreate, UserOut
from ..services import matching

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(409, "email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        lat=payload.lat,
        lng=payload.lng,
        city=payload.city,
        photos=payload.photos,
    )
    user.preferences = Preferences(
        interests=payload.preferences.interests,
        ambiance=payload.preferences.ambiance,
        budget=payload.preferences.budget,
        lifestyle=payload.preferences.lifestyle,
        availability=[b.model_dump() for b in payload.preferences.availability],
    )
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
            "shared_interests": m.shared_interests,
            "reasoning": m.reasoning,
            "suggested_date_category": m.suggested_date_category,
        }
        for m in matches
    ]
