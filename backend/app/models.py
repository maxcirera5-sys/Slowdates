"""Database entities — mirrors the product brief.

User, Preferences, Match, DateProposal, DateFeedback, Venue.

Structured data (interests, values, availability blocks, candidate time
options) live in JSON columns; that keeps the MVP schema-light while staying
Postgres-compatible (JSONB).
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class MatchStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"


class ProposalStatus(str, enum.Enum):
    # Brief section 5: the proposal walks a gendered path.
    awaiting_proposer = "awaiting_proposer"   # the man picks 3 date/time options
    awaiting_responder = "awaiting_responder"  # the woman picks one, or counters
    counter_proposed = "counter_proposed"      # she countered; back to him
    confirmed = "confirmed"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    photos: Mapped[list] = mapped_column(JSON, default=list)

    # Drives the gendered acceptance flow (brief section 5).
    gender: Mapped[Gender] = mapped_column(Enum(Gender), default=Gender.other)
    seeking: Mapped[Gender | None] = mapped_column(Enum(Gender), nullable=True)

    # Location for midpoint / radius maths.
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)

    identity_verified: Mapped[bool] = mapped_column(default=False)
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    preferences: Mapped["Preferences"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def location(self) -> tuple[float, float]:
        return (self.lat, self.lng)


class Preferences(Base):
    """The raw onboarding answers PLUS the deep profile the AI derives from them.

    Concepts 1 and 2 of the brief: the profile is not just hobbies — it captures
    personality, values, ambitions, lifestyle, communication style and the kind
    of relationship the person is looking for.
    """

    __tablename__ = "preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )

    # --- Raw onboarding answers ------------------------------------------- #
    bio: Mapped[str] = mapped_column(Text, default="")  # free-text intro
    interests: Mapped[list] = mapped_column(JSON, default=list)  # ["senderismo"]
    ambiance: Mapped[list] = mapped_column(JSON, default=list)  # ["tranquilo"]
    budget: Mapped[str] = mapped_column(String(20), default="medio")  # bajo/medio/alto

    # The five favourite restaurants/venues chosen at onboarding (brief §6).
    favorite_venues: Mapped[list] = mapped_column(JSON, default=list)

    # Free-text or list answers the profiler turns into structured traits.
    values: Mapped[list] = mapped_column(JSON, default=list)  # ["honestidad"]
    ambitions: Mapped[list] = mapped_column(JSON, default=list)  # ["viajar"]
    lifestyle: Mapped[dict] = mapped_column(JSON, default=dict)  # smoker, pets, ...
    communication_style: Mapped[str] = mapped_column(String(60), default="")
    relationship_type: Mapped[str] = mapped_column(String(60), default="")  # §1

    # Availability: list of {"day": "mon", "start": "18:00", "end": "22:00"}.
    availability: Mapped[list] = mapped_column(JSON, default=list)

    # --- AI-derived deep profile (brief §1) ------------------------------- #
    # personality_traits: ["curiosa", "reflexiva", ...]
    personality_traits: Mapped[list] = mapped_column(JSON, default=list)
    # A short human-readable narrative the AI writes about the person.
    ai_summary: Mapped[str] = mapped_column(Text, default="")
    profile_source: Mapped[str] = mapped_column(String(20), default="")  # claude|heuristic

    user: Mapped["User"] = relationship(back_populates="preferences")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("user_a_id", "user_b_id", name="uq_match_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_a_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    user_b_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    compatibility_score: Mapped[float] = mapped_column(Float, default=0.0)
    shared_values: Mapped[list] = mapped_column(JSON, default=list)
    shared_interests: Mapped[list] = mapped_column(JSON, default=list)
    # Per-dimension breakdown so the "why" is transparent (brief §3).
    breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    reasoning: Mapped[str] = mapped_column(Text, default="")
    suggested_date_category: Mapped[str] = mapped_column(String(120), default="")

    status: Mapped[MatchStatus] = mapped_column(
        Enum(MatchStatus), default=MatchStatus.pending
    )
    # Each side's opt-in; both true promotes the match to accepted.
    accepted_by_a: Mapped[bool] = mapped_column(default=False)
    accepted_by_b: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    proposals: Mapped[list["DateProposal"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )


class DateProposal(Base):
    """A concrete date, negotiated through the gendered flow (brief §5).

    The AI fixes the *place* and *meeting point*; the *time* is settled between
    the two people without chat: the man picks 3 options, the woman chooses one
    or counters with her own.
    """

    __tablename__ = "date_proposals"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"))

    # Who fields the proposal first (the man, or user_a in a non-hetero pair).
    proposer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    responder_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    flow_type: Mapped[str] = mapped_column(String(20), default="hetero")  # hetero|generic

    # AI-decided place (brief §7).
    venue_name: Mapped[str] = mapped_column(String(200))
    venue_address: Mapped[str] = mapped_column(String(300), default="")
    venue_id: Mapped[int | None] = mapped_column(
        ForeignKey("venues.id"), nullable=True
    )
    meeting_point: Mapped[str] = mapped_column(String(300), default="")
    why: Mapped[str] = mapped_column(Text, default="")
    alternative: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Candidate slots the AI derived from the shared availability, offered to
    # the man to choose from.
    candidate_slots: Mapped[list] = mapped_column(JSON, default=list)  # ISO strings
    # The 3 options the man selected.
    time_options: Mapped[list] = mapped_column(JSON, default=list)  # ISO strings
    # The final agreed time (chosen by the woman or via an accepted counter).
    selected_datetime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    counter_datetime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    status: Mapped[ProposalStatus] = mapped_column(
        Enum(ProposalStatus), default=ProposalStatus.awaiting_proposer
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    match: Mapped["Match"] = relationship(back_populates="proposals")
    feedback: Mapped[list["DateFeedback"]] = relationship(
        back_populates="proposal", cascade="all, delete-orphan"
    )


class DateFeedback(Base):
    __tablename__ = "date_feedback"
    __table_args__ = (
        UniqueConstraint("proposal_id", "user_id", name="uq_feedback_once"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    proposal_id: Mapped[int] = mapped_column(
        ForeignKey("date_proposals.id", ondelete="CASCADE")
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    attended: Mapped[bool] = mapped_column(default=False)
    wants_second_date: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    proposal: Mapped["DateProposal"] = relationship(back_populates="feedback")


class Venue(Base):
    """Cached venue catalogue (Google Places in production, seed data here)."""

    __tablename__ = "venues"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(300), default="")
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)

    ambiance: Mapped[list] = mapped_column(JSON, default=list)  # ["tranquilo",...]
    category: Mapped[str] = mapped_column(String(120), default="")  # café, senderismo
    tags: Mapped[list] = mapped_column(JSON, default=list)  # ["café de especialidad"]
    price_level: Mapped[str] = mapped_column(String(20), default="medio")

    @property
    def location(self) -> tuple[float, float]:
        return (self.lat, self.lng)
