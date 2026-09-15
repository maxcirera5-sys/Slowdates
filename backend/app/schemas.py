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
    bio: str = ""
    interests: list[str] = []
    ambiance: list[str] = []
    budget: str = "medio"
    # Brief §6: up to five favourite restaurants/venues.
    favorite_venues: list[str] = Field(default=[], max_length=5)
    values: list[str] = []
    ambitions: list[str] = []
    lifestyle: dict = {}
    communication_style: str = ""
    relationship_type: str = ""
    availability: list[AvailabilityBlock] = []


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    gender: str = Field("other", description="male | female | other")
    seeking: str | None = Field(None, description="male | female | other")
    lat: float
    lng: float
    city: str | None = None
    photos: list[str] = []
    preferences: PreferencesIn = PreferencesIn()


class ProfileOut(BaseModel):
    """The AI-derived deep profile surfaced back to clients (brief §1)."""

    personality_traits: list[str] = []
    values: list[str] = []
    ambitions: list[str] = []
    communication_style: str = ""
    relationship_type: str = ""
    ai_summary: str = ""
    profile_source: str = ""


class PreferencesOut(PreferencesIn):
    model_config = ConfigDict(from_attributes=True)

    personality_traits: list[str] = []
    ai_summary: str = ""
    profile_source: str = ""


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    gender: str
    seeking: str | None
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
    shared_values: list[str]
    shared_interests: list[str]
    breakdown: dict
    reasoning: str
    suggested_date_category: str
    status: str
    accepted_by_a: bool
    accepted_by_b: bool


class MatchDecision(BaseModel):
    user_id: int
    accept: bool = True


# --------------------------------------------------------------------------- #
# Date proposals (gendered acceptance flow, brief §5)
# --------------------------------------------------------------------------- #
class ProposalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_id: int
    proposer_id: int
    responder_id: int
    flow_type: str
    venue_name: str
    venue_address: str
    meeting_point: str
    why: str
    alternative: dict | None
    candidate_slots: list[datetime]
    time_options: list[datetime]
    selected_datetime: datetime | None
    counter_datetime: datetime | None
    status: str


class ProposerSlots(BaseModel):
    """The man accepts and picks (up to) 3 date/time options, or declines."""

    user_id: int
    accept: bool = True
    slots: list[datetime] = Field(default=[], max_length=3)


class ResponderDecision(BaseModel):
    """The woman selects one option, counters with her own time, or declines."""

    user_id: int
    action: str = Field(..., description="select | counter | reject")
    chosen_datetime: datetime | None = None


class CounterDecision(BaseModel):
    """The man accepts or declines the counter-proposed time."""

    user_id: int
    accept: bool = True


# --------------------------------------------------------------------------- #
# Feedback
# --------------------------------------------------------------------------- #
class FeedbackIn(BaseModel):
    user_id: int
    attended: bool
    wants_second_date: bool
