"""Database entities — mirrors section 4 of the brief.

User, Preferences, Match, DateProposal, DateFeedback, Venue.
Structured lists (interests, availability blocks) are stored as JSON columns;
that keeps the MVP schema-light while staying Postgres-compatible (JSONB).
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


class MatchStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"


class ProposalStatus(str, enum.Enum):
    proposed = "proposed"
    confirmed = "confirmed"
    rejected = "rejected"
    alternative_requested = "alternative_requested"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    photos: Mapped[list] = mapped_column(JSON, default=list)

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
    __tablename__ = "preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )

    interests: Mapped[list] = mapped_column(JSON, default=list)  # e.g. ["senderismo"]
    ambiance: Mapped[list] = mapped_column(JSON, default=list)  # ["tranquilo","exterior"]
    budget: Mapped[str] = mapped_column(String(20), default="medio")  # bajo/medio/alto
    lifestyle: Mapped[dict] = mapped_column(JSON, default=dict)  # smoker, pets, ...

    # Availability: list of {"day": "mon", "start": "18:00", "end": "22:00"}.
    availability: Mapped[list] = mapped_column(JSON, default=list)

    user: Mapped["User"] = relationship(back_populates="preferences")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("user_a_id", "user_b_id", name="uq_match_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_a_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    user_b_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    compatibility_score: Mapped[float] = mapped_column(Float, default=0.0)
    shared_interests: Mapped[list] = mapped_column(JSON, default=list)
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
    __tablename__ = "date_proposals"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"))

    venue_name: Mapped[str] = mapped_column(String(200))
    venue_address: Mapped[str] = mapped_column(String(300), default="")
    venue_id: Mapped[int | None] = mapped_column(
        ForeignKey("venues.id"), nullable=True
    )
    datetime_utc: Mapped[datetime] = mapped_column(DateTime)
    why: Mapped[str] = mapped_column(Text, default="")

    # Second-choice venue kept alongside the primary (brief: always offer one).
    alternative: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    status: Mapped[ProposalStatus] = mapped_column(
        Enum(ProposalStatus), default=ProposalStatus.proposed
    )
    accepted_by_a: Mapped[bool] = mapped_column(default=False)
    accepted_by_b: Mapped[bool] = mapped_column(default=False)
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
