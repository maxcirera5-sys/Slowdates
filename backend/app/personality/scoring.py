"""Pure, infra-free compatibility scoring.

Every function here is deterministic and unit-testable in isolation: it takes
plain numbers / dicts / dataclasses and returns numbers / dicts. No DB, no I/O.
All tunables come from ``config`` — nothing is hard-coded in the logic.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import config


# --------------------------------------------------------------------------- #
# Input container (built by the DB layer, but pure here)
# --------------------------------------------------------------------------- #
@dataclass
class ScoringProfile:
    """The derived, comparable profile of one user."""

    big_five: dict[str, float] = field(default_factory=dict)  # 5 traits, 0-1
    attachment_anxiety: float = 0.0  # 0-1
    attachment_avoidance: float = 0.0  # 0-1
    values: dict[str, object] = field(default_factory=dict)  # block 3 selections
    communication: dict[str, object] = field(default_factory=dict)  # block 4 selections


# --------------------------------------------------------------------------- #
# Primitives
# --------------------------------------------------------------------------- #
def normalize_answer(raw_value: float, is_reverse: bool = False) -> float:
    """Convert a 1-5 Likert answer to 0-1, inverting the item first if needed."""
    value = float(raw_value)
    if is_reverse:
        value = 6 - value
    return (value - 1) / 4


def calculate_trait_score(answers: list[float]) -> float:
    """Average of a trait's already-normalized (0-1) answers."""
    if not answers:
        return 0.0
    return sum(answers) / len(answers)


# --------------------------------------------------------------------------- #
# Big Five
# --------------------------------------------------------------------------- #
def calculate_big_five_similarity(profile_a: dict[str, float], profile_b: dict[str, float]) -> dict:
    """Per-trait similarity (1 - |a - b|) plus the weighted Big Five score."""
    per_trait: dict[str, float] = {}
    weighted = 0.0
    for trait, weight in config.BIG_FIVE_WEIGHTS.items():
        a = float(profile_a.get(trait, 0.0))
        b = float(profile_b.get(trait, 0.0))
        sim = 1 - abs(a - b)
        per_trait[trait] = sim
        weighted += weight * sim
    return {"per_trait": per_trait, "weighted": weighted}


# --------------------------------------------------------------------------- #
# Attachment
# --------------------------------------------------------------------------- #
def classify_attachment_style(anxiety: float, avoidance: float) -> str:
    """Classify into secure | anxious | avoidant | anxious_avoidant (0.5 cutoff)."""
    high_anx = anxiety >= config.ATTACHMENT_CUTOFF
    high_avo = avoidance >= config.ATTACHMENT_CUTOFF
    if not high_anx and not high_avo:
        return "secure"
    if high_anx and not high_avo:
        return "anxious"
    if high_avo and not high_anx:
        return "avoidant"
    return "anxious_avoidant"


def calculate_attachment_compatibility(style_a: str, style_b: str) -> float:
    """Symmetric lookup in the configured attachment matrix."""
    key = (style_a, style_b)
    if key in config.ATTACHMENT_MATRIX:
        return config.ATTACHMENT_MATRIX[key]
    if (style_b, style_a) in config.ATTACHMENT_MATRIX:
        return config.ATTACHMENT_MATRIX[(style_b, style_a)]
    return 0.0


# --------------------------------------------------------------------------- #
# Hard filters (block 3)
# --------------------------------------------------------------------------- #
def check_hard_filters(user_a: ScoringProfile, user_b: ScoringProfile) -> dict:
    """Return {'passes': bool, 'failed_on': [...]} for the mutually-exclusive rules."""
    failed_on: list[str] = []
    va, vb = user_a.values, user_b.values

    # Children: incompatible only when one clearly doesn't want them and the other
    # wants/has them, and neither marked explicit flexibility.
    ca = str(va.get("children", ""))
    cb = str(vb.get("children", ""))
    flexible = ca in config.CHILDREN_FLEXIBLE or cb in config.CHILDREN_FLEXIBLE
    if not flexible:
        conflict = (
            (ca in config.CHILDREN_DONT and cb in config.CHILDREN_WANT)
            or (cb in config.CHILDREN_DONT and ca in config.CHILDREN_WANT)
        )
        if conflict:
            failed_on.append("children")

    # Relationship intent: configured incompatible pairs.
    ia = str(va.get("relationship_intent", ""))
    ib = str(vb.get("relationship_intent", ""))
    if ia and ib and frozenset({ia, ib}) in config.RELATIONSHIP_INTENT_INCOMPATIBLE:
        failed_on.append("relationship_intent")

    return {"passes": len(failed_on) == 0, "failed_on": failed_on}


# --------------------------------------------------------------------------- #
# Simple-similarity sub-scores (soft values + communication)
# --------------------------------------------------------------------------- #
def _jaccard(a: object, b: object) -> float:
    set_a = {str(x) for x in (a or [])}
    set_b = {str(x) for x in (b or [])}
    if not set_a and not set_b:
        return 1.0
    union = set_a | set_b
    if not union:
        return 0.0
    return len(set_a & set_b) / len(union)


def _field_similarity(field_name: str, a: object, b: object) -> float:
    if field_name in config.MULTI_FIELDS:
        return _jaccard(a, b)
    if a is None or b is None or a == "" or b == "":
        return 0.0
    if a == b:
        return 1.0
    table = config.CLOSENESS.get(field_name, {})
    return table.get(frozenset({str(a), str(b)}), 0.0)


def _average_similarity(fields: tuple[str, ...], a: dict, b: dict) -> float:
    if not fields:
        return 0.0
    return sum(_field_similarity(f, a.get(f), b.get(f)) for f in fields) / len(fields)


def calculate_soft_values_score(user_a: ScoringProfile, user_b: ScoringProfile) -> float:
    """Average simple-similarity across the soft value fields of block 3."""
    return _average_similarity(config.SOFT_VALUE_FIELDS, user_a.values, user_b.values)


def calculate_communication_score(user_a: ScoringProfile, user_b: ScoringProfile) -> float:
    """Average simple-similarity across the block-4 communication fields."""
    return _average_similarity(config.COMMUNICATION_FIELDS, user_a.communication, user_b.communication)


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def combine_subscores(big_five: float, attachment: float, soft_values: float, communication: float) -> float:
    """Blend the four 0-1 sub-scores into a 0-100 score using the configured weights."""
    w = config.FINAL_WEIGHTS
    combined = (
        w["big_five"] * big_five
        + w["attachment"] * attachment
        + w["soft_values"] * soft_values
        + w["communication"] * communication
    )
    return round(combined * 100, 1)


def calculate_compatibility_score(user_a: ScoringProfile, user_b: ScoringProfile) -> dict:
    """Full pipeline: hard filters, then the weighted blend of the four sub-scores."""
    hard = check_hard_filters(user_a, user_b)
    if not hard["passes"]:
        return {"eligible": False, "failed_on": hard["failed_on"], "score": None}

    big_five = calculate_big_five_similarity(user_a.big_five, user_b.big_five)
    style_a = classify_attachment_style(user_a.attachment_anxiety, user_a.attachment_avoidance)
    style_b = classify_attachment_style(user_b.attachment_anxiety, user_b.attachment_avoidance)
    attachment = calculate_attachment_compatibility(style_a, style_b)
    soft_values = calculate_soft_values_score(user_a, user_b)
    communication = calculate_communication_score(user_a, user_b)

    score = combine_subscores(big_five["weighted"], attachment, soft_values, communication)
    return {
        "eligible": True,
        "score": score,
        "failed_on": [],
        "breakdown": {
            "big_five": round(big_five["weighted"], 4),
            "big_five_per_trait": {k: round(v, 4) for k, v in big_five["per_trait"].items()},
            "attachment": round(attachment, 4),
            "attachment_style_a": style_a,
            "attachment_style_b": style_b,
            "soft_values": round(soft_values, 4),
            "communication": round(communication, 4),
        },
    }
