"""Pydantic request/response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --------------------------------------------------------------------------- #
# Preferences & users
# --------------------------------------------------------------------------- #
class AvailabilityBlock(BaseModel):
    day: str = Field(..., description="mon/tue/wed/thu/fri/sat/sun")
    start: str = Field(..., description="HH:MM 24h")
    end: str = Field(..., description="HH:MM 24h")


class PreferencesIn(BaseModel):
    interests: list[str] = []
    ambiance: list[str] = []
    budget: str = "medio"
    lifestyle: dict = {}
    availability: list[AvailabilityBlock] = []


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    lat: float
    lng: float
    city: str | None = None
    photos: list[str] = []
    preferences: PreferencesIn = PreferencesIn()


class PreferencesOut(PreferencesIn):
    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    lat: float
    lng: float
    city: str | None
    photos: list[str]
    identity_verified: bool
    active: bool
    preferences: PreferencesOut | None = None


# --------------------------------------------------------------------------- #
# Matches
# --------------------------------------------------------------------------- #
class MatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_a_id: int
    user_b_id: int
    compatibility_score: float
    shared_interests: list[str]
    reasoning: str
    suggested_date_category: str
    status: str
    accepted_by_a: bool
    accepted_by_b: bool


class MatchDecision(BaseModel):
    user_id: int
    accept: bool = True


# --------------------------------------------------------------------------- #
# Date proposals
# --------------------------------------------------------------------------- #
class ProposalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_id: int
    venue_name: str
    venue_address: str
    datetime_utc: datetime
    why: str
    alternative: dict | None
    status: str
    accepted_by_a: bool
    accepted_by_b: bool


class ProposalDecision(BaseModel):
    user_id: int
    action: str = Field(..., description="accept | request_alternative | reject")


# --------------------------------------------------------------------------- #
# Feedback
# --------------------------------------------------------------------------- #
class FeedbackIn(BaseModel):
    user_id: int
    attended: bool
    wants_second_date: bool
