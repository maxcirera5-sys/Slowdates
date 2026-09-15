"""Date proposals, confirmation, and post-date feedback (brief screens 3-5)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai import date_planner
from ..database import get_db
from ..models import (
    DateFeedback,
    DateProposal,
    Match,
    MatchStatus,
    ProposalStatus,
    User,
    Venue,
)
from ..schemas import FeedbackIn, ProposalDecision, ProposalOut

router = APIRouter(prefix="/proposals", tags=["dates"])


def build_proposal(
    db: Session, match: Match, user_a: User, user_b: User, venues: list[Venue]
) -> DateProposal | None:
    """Run the planning engine and persist a proposal. Returns None if unplannable."""
    plan = date_planner.plan_date(
        user_a,
        user_b,
        venues,
        suggested_category=match.suggested_date_category,
        shared_interests=match.shared_interests,
    )
    if not plan.is_plannable():
        return None

    proposal = DateProposal(
        match_id=match.id,
        venue_id=plan.venue.id,
        venue_name=plan.venue.name,
        venue_address=plan.venue.address,
        datetime_utc=plan.datetime_utc,
        why=plan.why,
        alternative=plan.alternative,
        status=ProposalStatus.proposed,
    )
    db.add(proposal)
    db.flush()  # assign id without ending the caller's transaction
    return proposal


@router.get("/{proposal_id}", response_model=ProposalOut)
def get_proposal(proposal_id: int, db: Session = Depends(get_db)):
    proposal = db.get(DateProposal, proposal_id)
    if proposal is None:
        raise HTTPException(404, "proposal not found")
    return proposal


@router.post("/{proposal_id}/decision")
def decide_proposal(
    proposal_id: int, decision: ProposalDecision, db: Session = Depends(get_db)
):
    """Accept, reject, or ask for an alternative (brief screen 3)."""
    proposal = db.get(DateProposal, proposal_id)
    if proposal is None:
        raise HTTPException(404, "proposal not found")
    match = proposal.match
    if decision.user_id not in (match.user_a_id, match.user_b_id):
        raise HTTPException(403, "user is not part of this match")

    is_a = decision.user_id == match.user_a_id

    if decision.action == "accept":
        if is_a:
            proposal.accepted_by_a = True
        else:
            proposal.accepted_by_b = True
        if proposal.accepted_by_a and proposal.accepted_by_b:
            proposal.status = ProposalStatus.confirmed  # brief step 5: check-in unlocks
    elif decision.action == "reject":
        proposal.status = ProposalStatus.rejected
    elif decision.action == "request_alternative":
        proposal.status = ProposalStatus.alternative_requested
    else:
        raise HTTPException(422, "action must be accept|reject|request_alternative")

    new_proposal = None
    if proposal.status in (
        ProposalStatus.rejected,
        ProposalStatus.alternative_requested,
    ):
        new_proposal = _replan(db, match, exclude_venue_id=proposal.venue_id)

    db.commit()
    return {
        "status": proposal.status.value,
        "checkin_enabled": proposal.status == ProposalStatus.confirmed,
        "new_proposal": (
            ProposalOut.model_validate(new_proposal).model_dump(mode="json")
            if new_proposal
            else None
        ),
    }


def _replan(db: Session, match: Match, *, exclude_venue_id: int | None) -> DateProposal | None:
    """Generate a fresh proposal, avoiding the venue that was just declined."""
    user_a = db.get(User, match.user_a_id)
    user_b = db.get(User, match.user_b_id)
    venues = [
        v for v in db.scalars(select(Venue)).all() if v.id != exclude_venue_id
    ]
    if not venues:
        return None
    return build_proposal(db, match, user_a, user_b, venues)


@router.post("/{proposal_id}/feedback")
def submit_feedback(
    proposal_id: int, payload: FeedbackIn, db: Session = Depends(get_db)
):
    """Post-date feedback (brief screen 5) — feeds future compatibility scoring."""
    proposal = db.get(DateProposal, proposal_id)
    if proposal is None:
        raise HTTPException(404, "proposal not found")
    match = proposal.match
    if payload.user_id not in (match.user_a_id, match.user_b_id):
        raise HTTPException(403, "user is not part of this match")

    existing = db.scalar(
        select(DateFeedback).where(
            DateFeedback.proposal_id == proposal_id,
            DateFeedback.user_id == payload.user_id,
        )
    )
    if existing:
        existing.attended = payload.attended
        existing.wants_second_date = payload.wants_second_date
    else:
        db.add(
            DateFeedback(
                proposal_id=proposal_id,
                user_id=payload.user_id,
                attended=payload.attended,
                wants_second_date=payload.wants_second_date,
            )
        )
    db.commit()
    return {"ok": True}
