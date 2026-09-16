"""Single source of truth for every tunable constant in the compatibility engine.

Everything the scoring logic reads (weights, the attachment matrix, hard-filter
rules and the soft-value closeness tables) lives here so it can be recalibrated
with real data later without touching the logic in ``scoring.py``.
"""

from __future__ import annotations

# --------------------------------------------------------------------------- #
# Final blend: how the four sub-scores combine into the 0-100 compatibility.
# --------------------------------------------------------------------------- #
FINAL_WEIGHTS: dict[str, float] = {
    "big_five": 0.45,
    "attachment": 0.30,
    "soft_values": 0.20,
    "communication": 0.05,
}

# Big Five: per-trait weight inside the Big Five similarity sub-score.
BIG_FIVE_WEIGHTS: dict[str, float] = {
    "emotional_stability": 0.30,
    "agreeableness": 0.25,
    "conscientiousness": 0.25,
    "openness": 0.15,
    "extraversion": 0.05,
}

BIG_FIVE_TRAITS: tuple[str, ...] = tuple(BIG_FIVE_WEIGHTS.keys())

# --------------------------------------------------------------------------- #
# Attachment
# --------------------------------------------------------------------------- #
ATTACHMENT_CUTOFF = 0.5  # threshold on each axis (anxiety / avoidance)

ATTACHMENT_STYLES = ("secure", "anxious", "avoidant", "anxious_avoidant")

# Symmetric compatibility matrix. Stored with sorted-tuple keys so lookup works
# in either order; use `attachment_pair_score` in scoring.py to read it.
ATTACHMENT_MATRIX: dict[tuple[str, str], float] = {
    ("secure", "secure"): 1.0,
    ("anxious", "secure"): 0.8,
    ("avoidant", "secure"): 0.75,
    ("anxious_avoidant", "secure"): 0.5,
    ("anxious", "anxious"): 0.5,
    ("anxious", "avoidant"): 0.25,
    ("anxious", "anxious_avoidant"): 0.3,
    ("avoidant", "avoidant"): 0.55,
    ("avoidant", "anxious_avoidant"): 0.35,
    ("anxious_avoidant", "anxious_avoidant"): 0.3,
}

# --------------------------------------------------------------------------- #
# Hard filters (block 3). Configurable so "what kills a match" can be tuned.
# --------------------------------------------------------------------------- #
# Children canonical values.
CHILDREN_WANT = {"quiero_futuro", "ya_tengo"}
CHILDREN_DONT = {"no_quiero"}
CHILDREN_FLEXIBLE = {"no_seguro"}  # explicit flexibility -> never a hard fail

# Relationship intent: pairs that are mutually incompatible (order-independent).
# "no_se" is treated as flexible and never conflicts.
RELATIONSHIP_INTENT_INCOMPATIBLE: set[frozenset[str]] = {
    frozenset({"casual", "seria"}),
}

# --------------------------------------------------------------------------- #
# Soft values / communication closeness tables.
# similarity: exact match = 1.0; a configured near-pair = its value; else 0.0.
# Multi/ranking fields (habits, love_languages) use Jaccard overlap instead.
# --------------------------------------------------------------------------- #
def _pairs(entries: list[tuple[str, str, float]]) -> dict[frozenset[str], float]:
    return {frozenset({a, b}): v for a, b, v in entries}


CLOSENESS: dict[str, dict[frozenset[str], float]] = {
    "spirituality": _pairs([
        ("central", "importante_flexible", 0.5),
        ("importante_flexible", "poco_relevante", 0.5),
        ("poco_relevante", "ninguno", 0.5),
        ("central", "poco_relevante", 0.3),
        ("importante_flexible", "ninguno", 0.3),
    ]),
    "ambition": _pairs([
        ("carrera_prioridad", "equilibrio", 0.5),
        ("equilibrio", "vida_personal", 0.5),
        ("carrera_prioridad", "vida_personal", 0.3),
    ]),
    "hobbies_importance": _pairs([
        ("muy_importante", "algo_importante", 0.5),
        ("algo_importante", "no_necesario", 0.5),
        ("muy_importante", "no_necesario", 0.3),
    ]),
    "conflict_style": _pairs([
        ("hablo_apenas", "proceso_antes", 0.5),
        ("proceso_antes", "evito", 0.3),
        ("hablo_apenas", "evito", 0.3),
    ]),
    "contact_frequency": _pairs([
        ("todos_los_dias", "cada_pocos_dias", 0.5),
        ("cada_pocos_dias", "sin_presion", 0.5),
        ("todos_los_dias", "sin_presion", 0.3),
    ]),
}

# Which profile fields feed each simple-similarity sub-score.
SOFT_VALUE_FIELDS = ("spirituality", "ambition", "habits", "hobbies_importance")
COMMUNICATION_FIELDS = ("conflict_style", "love_languages", "contact_frequency")

# Fields that are lists (compared with Jaccard overlap rather than closeness).
MULTI_FIELDS = {"habits", "love_languages"}
