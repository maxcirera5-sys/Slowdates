"""Date proposals — the gendered acceptance flow and feedback (brief §5, §7).

Flow (heterosexual pair):
  1. Mutual match accept -> a proposal is created with an AI-chosen venue,
     meeting point and a set of candidate time slots. It is routed to the man.
  2. POST /proposals/{id}/slots  (the man): accept + pick up to 3 options.
  3. POST /proposals/{id}/respond (the woman): select one, counter, or reject.
  4. POST /proposals/{id}/counter (the man): accept/decline her counter.

For non-hetero pairs the same machinery runs "generic": the match initiator
(user_a) is the proposer, the other is the responder.
"""

from __future__ import annotations

from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai import date_planner
from ..database import get_db
from ..models import (
    DateFeedback,
    DateProposal,
    Gender,
    Match,
    ProposalStatus,
    User,
    Venue,
)
from ..schemas import (
    CounterDecision,
    FeedbackIn,
    ProposalOut,
    ProposerSlots,
    ResponderDecision,
)

router = APIRouter(prefix="/proposals", tags=["dates"])


def _roles(user_a: User, user_b: User) -> tuple[User, User, str]:
    """Decide proposer (fields the date first) and responder (brief §5).

    Heterosexual pair -> the man proposes, the woman responds.
    Otherwise -> user_a proposes (generic flow).
    """
    genders = {user_a.gender, user_b.gender}
    if genders == {Gender.male, Gender.female}:
        man = user_a if user_a.gender == Gender.male else user_b
        woman = user_b if man is user_a else user_a
        return man, woman, "hetero"
    return user_a, user_b, "generic"


def build_proposal(
    db: Session, match: Match, user_a: User, user_b: User, venues: list[Venue]
) -> DateProposal | None:
    """Run the planning engine and persist a proposal routed to the proposer."""
    plan = date_planner.plan_date(
        user_a,
        user_b,
        venues,
        suggested_category=match.suggested_date_category,
        shared_interests=match.shared_interests,
    )
    if not plan.is_plannable():
        return None

    proposer, responder, flow = _roles(user_a, user_b)
    proposal = DateProposal(
        match_id=match.id,
        proposer_id=proposer.id,
        responder_id=responder.id,
        flow_type=flow,
        venue_id=plan.venue.id,
        venue_name=plan.venue.name,
        venue_address=plan.venue.address,
        meeting_point=plan.meeting_point,
        why=plan.why,
        alternative=plan.alternative,
        candidate_slots=[dt.isoformat() for dt in plan.candidate_slots],
        status=ProposalStatus.awaiting_proposer,
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


@router.post("/{proposal_id}/slots")
def choose_slots(
    proposal_id: int, payload: ProposerSlots, db: Session = Depends(get_db)
):
    """Step 2 — the man accepts and selects up to 3 date/time options."""
    proposal = _load(db, proposal_id)
    if payload.user_id != proposal.proposer_id:
        raise HTTPException(403, "solo el proponente elige las opciones de fecha")
    if proposal.status != ProposalStatus.awaiting_proposer:
        raise HTTPException(409, f"proposal is {proposal.status.value}")

    if not payload.accept:
        proposal.status = ProposalStatus.rejected
        new_proposal = _replan(db, proposal.match, exclude_venue_id=proposal.venue_id)
        db.commit()
        return _decision_response(proposal, new_proposal)

    chosen = [dt.astimezone(timezone.utc).replace(tzinfo=None) for dt in payload.slots]
    valid = {_iso(s) for s in proposal.candidate_slots}
    picked = [dt for dt in chosen if dt.replace(microsecond=0).isoformat() in valid]
    if not picked:
        # Fall back to the first 3 AI candidates if the client sent none/invalid.
        picked = [_parse(s) for s in proposal.candidate_slots[:3]]
    if not picked:
        raise HTTPException(422, "no hay opciones de fecha válidas")

    proposal.time_options = [dt.isoformat() for dt in picked[:3]]
    proposal.status = ProposalStatus.awaiting_responder
    db.commit()
    return _decision_response(proposal, None)


@router.post("/{proposal_id}/respond")
def responder_decision(
    proposal_id: int, payload: ResponderDecision, db: Session = Depends(get_db)
):
    """Step 3 — the woman selects an option, counters, or rejects."""
    proposal = _load(db, proposal_id)
    if payload.user_id != proposal.responder_id:
        raise HTTPException(403, "solo quien recibe la propuesta puede responder")
    if proposal.status != ProposalStatus.awaiting_responder:
        raise HTTPException(409, f"proposal is {proposal.status.value}")

    if payload.action == "reject":
        proposal.status = ProposalStatus.rejected
        new_proposal = _replan(db, proposal.match, exclude_venue_id=proposal.venue_id)
        db.commit()
        return _decision_response(proposal, new_proposal)

    if payload.action == "select":
        if payload.chosen_datetime is None:
            raise HTTPException(422, "datetime requerido para 'select'")
        chosen = payload.chosen_datetime.astimezone(timezone.utc).replace(tzinfo=None)
        options = {_iso(o) for o in proposal.time_options}
        if chosen.replace(microsecond=0).isoformat() not in options:
            raise HTTPException(422, "esa opción no está entre las ofrecidas")
        proposal.selected_datetime = chosen
        proposal.status = ProposalStatus.confirmed
        db.commit()
        return _decision_response(proposal, None)

    if payload.action == "counter":
        if payload.chosen_datetime is None:
            raise HTTPException(422, "datetime requerido para 'counter'")
        proposal.counter_datetime = (
            payload.chosen_datetime.astimezone(timezone.utc).replace(tzinfo=None)
        )
        proposal.status = ProposalStatus.counter_proposed
        db.commit()
        return _decision_response(proposal, None)

    raise HTTPException(422, "action must be select|counter|reject")


@router.post("/{proposal_id}/counter")
def counter_decision(
    proposal_id: int, payload: CounterDecision, db: Session = Depends(get_db)
):
    """Step 4 — the man accepts or declines the counter-proposed time."""
    proposal = _load(db, proposal_id)
    if payload.user_id != proposal.proposer_id:
        raise HTTPException(403, "solo el proponente responde a la contrapropuesta")
    if proposal.status != ProposalStatus.counter_proposed:
        raise HTTPException(409, f"proposal is {proposal.status.value}")

    if payload.accept:
        proposal.selected_datetime = proposal.counter_datetime
        proposal.status = ProposalStatus.confirmed
        db.commit()
        return _decision_response(proposal, None)

    # Declined: bounce back to the woman to pick from the original options.
    proposal.counter_datetime = None
    proposal.status = ProposalStatus.awaiting_responder
    db.commit()
    return _decision_response(proposal, None)


@router.post("/{proposal_id}/feedback")
def submit_feedback(
    proposal_id: int, payload: FeedbackIn, db: Session = Depends(get_db)
):
    """Post-date feedback — feeds future compatibility scoring."""
    proposal = _load(db, proposal_id)
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


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _load(db: Session, proposal_id: int) -> DateProposal:
    proposal = db.get(DateProposal, proposal_id)
    if proposal is None:
        raise HTTPException(404, "proposal not found")
    return proposal


def _replan(db: Session, match: Match, *, exclude_venue_id: int | None) -> DateProposal | None:
    """Generate a fresh proposal, avoiding the venue that was just declined."""
    user_a = db.get(User, match.user_a_id)
    user_b = db.get(User, match.user_b_id)
    venues = [v for v in db.scalars(select(Venue)).all() if v.id != exclude_venue_id]
    if not venues:
        return None
    return build_proposal(db, match, user_a, user_b, venues)


def _decision_response(proposal: DateProposal, new_proposal: DateProposal | None) -> dict:
    return {
        "status": proposal.status.value,
        "confirmed": proposal.status == ProposalStatus.confirmed,
        "proposal": ProposalOut.model_validate(proposal).model_dump(mode="json"),
        "new_proposal": (
            ProposalOut.model_validate(new_proposal).model_dump(mode="json")
            if new_proposal
            else None
        ),
    }


def _iso(value) -> str:
    """Normalise a stored ISO string to second precision for comparison."""
    return _parse(value).replace(microsecond=0).isoformat()


def _parse(value):
    from datetime import datetime

    dt = datetime.fromisoformat(str(value))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt
