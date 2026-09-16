"""Onboarding test endpoints: fetch questions, submit responses (recompute profile)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import TestQuestion, TestResponse, User
from ..personality.profile_builder import build_personality_profile
from ..personality.schemas import (
    PersonalityProfileOut,
    TestQuestionOut,
    TestResponsesIn,
)

router = APIRouter(prefix="/test", tags=["personality-test"])


@router.get("/questions", response_model=list[TestQuestionOut])
def list_questions(db: Session = Depends(get_db)):
    """Active questions, ordered by block then within-block order."""
    rows = db.scalars(
        select(TestQuestion)
        .where(TestQuestion.active.is_(True))
        .order_by(TestQuestion.block, TestQuestion.order, TestQuestion.id)
    ).all()
    return rows


@router.post("/responses", response_model=PersonalityProfileOut, status_code=201)
def submit_responses(payload: TestResponsesIn, db: Session = Depends(get_db)):
    """Persist a user's answers (upsert per question) and recompute their profile."""
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(404, "user not found")

    valid_ids = set(db.scalars(select(TestQuestion.id)).all())

    existing = {
        r.question_id: r
        for r in db.scalars(
            select(TestResponse).where(TestResponse.user_id == payload.user_id)
        ).all()
    }

    for item in payload.responses:
        if item.question_id not in valid_ids:
            raise HTTPException(422, f"unknown question_id {item.question_id}")
        if item.question_id in existing:
            existing[item.question_id].raw_value = item.raw_value
        else:
            db.add(
                TestResponse(
                    user_id=payload.user_id,
                    question_id=item.question_id,
                    raw_value=item.raw_value,
                )
            )
    db.flush()

    profile = build_personality_profile(db, payload.user_id)
    db.commit()
    db.refresh(profile)
    return profile
