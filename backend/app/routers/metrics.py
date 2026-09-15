"""MVP success metrics (brief section 8) and health/status."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..ai import client
from ..database import get_db
from ..models import (
    DateFeedback,
    DateProposal,
    Match,
    MatchStatus,
    ProposalStatus,
)

router = APIRouter(tags=["meta"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "compatibility_engine": "claude" if client.is_live() else "heuristic",
        "date_planner_engine": "claude" if client.is_live() else "heuristic",
    }


@router.get("/metrics")
def metrics(db: Session = Depends(get_db)):
    """The three KPIs that validate the value prop."""
    accepted_matches = db.scalar(
        select(func.count()).select_from(Match).where(
            Match.status == MatchStatus.accepted
        )
    )
    confirmed = db.scalar(
        select(func.count()).select_from(DateProposal).where(
            DateProposal.status == ProposalStatus.confirmed
        )
    )
    second_date_yes = db.scalar(
        select(func.count()).select_from(DateFeedback).where(
            DateFeedback.wants_second_date.is_(True)
        )
    )
    feedback_total = db.scalar(select(func.count()).select_from(DateFeedback))

    return {
        "accepted_matches": accepted_matches,
        "confirmed_dates": confirmed,
        "match_to_confirmed_rate": _ratio(confirmed, accepted_matches),
        "second_date_rate": _ratio(second_date_yes, feedback_total),
    }


def _ratio(num: int | None, den: int | None) -> float:
    num, den = num or 0, den or 0
    return round(num / den, 3) if den else 0.0
