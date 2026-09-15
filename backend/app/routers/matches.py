"""Match feed and mutual-accept flow (brief screen 2).

When both users accept a match, the date-planning engine fires automatically
and the first proposal is created.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Match, MatchStatus, User, Venue
from ..schemas import MatchDecision, MatchOut, ProposalOut
from ..services import matching
from .dates import build_proposal

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=list[MatchOut])
def list_matches(user_id: int, db: Session = Depends(get_db)):
    return matching.matches_for_user(db, user_id)


@router.get("/{match_id}", response_model=MatchOut)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.get(Match, match_id)
    if match is None:
        raise HTTPException(404, "match not found")
    return match


@router.post("/{match_id}/decision")
def decide_match(
    match_id: int, decision: MatchDecision, db: Session = Depends(get_db)
):
    """Record one user's accept/pass. Mutual accept triggers date planning."""
    match = db.get(Match, match_id)
    if match is None:
        raise HTTPException(404, "match not found")
    if decision.user_id not in (match.user_a_id, match.user_b_id):
        raise HTTPException(403, "user is not part of this match")

    accept = decision.accept
    if decision.user_id == match.user_a_id:
        match.accepted_by_a = accept
    else:
        match.accepted_by_b = accept

    if not accept:
        match.status = MatchStatus.expired
        db.commit()
        return {"status": match.status.value, "proposal": None}

    proposal_out = None
    if match.accepted_by_a and match.accepted_by_b:
        match.status = MatchStatus.accepted
        proposal = _ensure_proposal(db, match)
        if proposal is not None:
            proposal_out = ProposalOut.model_validate(proposal).model_dump(mode="json")

    db.commit()
    return {"status": match.status.value, "proposal": proposal_out}


def _ensure_proposal(db: Session, match: Match):
    """Create the first date proposal if the match has none yet."""
    if match.proposals:
        return match.proposals[-1]

    user_a = db.get(User, match.user_a_id)
    user_b = db.get(User, match.user_b_id)
    venues = db.scalars(select(Venue)).all()
    return build_proposal(db, match, user_a, user_b, venues)
