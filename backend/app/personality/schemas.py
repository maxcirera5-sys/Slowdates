"""Pydantic request/response schemas for the personality test + compatibility API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class QuestionOption(BaseModel):
    value: str
    label: str


class TestQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    block: int
    trait: str
    text: str
    qtype: str
    is_reverse: bool
    options: list[QuestionOption]
    is_hard_filter: bool
    order: int


class ResponseItem(BaseModel):
    question_id: int
    # int (likert) | str (single) | list[str] (multi / ranking)
    raw_value: Any


class TestResponsesIn(BaseModel):
    user_id: int
    responses: list[ResponseItem] = Field(..., min_length=1)


class PersonalityProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    openness: float
    conscientiousness: float
    extraversion: float
    agreeableness: float
    emotional_stability: float
    attachment_anxiety: float
    attachment_avoidance: float
    relationship_intent: str | None
    children: str | None
    spirituality: str | None
    ambition: str | None
    habits: list[str]
    hobbies_importance: str | None
    conflict_style: str | None
    love_languages: list[str]
    contact_frequency: str | None


class CompatibilityOut(BaseModel):
    eligible: bool
    score: float | None
    failed_on: list[str] = []
    breakdown: dict | None = None
