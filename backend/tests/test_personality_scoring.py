"""Unit tests for the pure compatibility scoring module."""

import pytest

from app.personality import config
from app.personality.scoring import (
    ScoringProfile,
    calculate_attachment_compatibility,
    calculate_big_five_similarity,
    calculate_communication_score,
    calculate_compatibility_score,
    calculate_soft_values_score,
    calculate_trait_score,
    check_hard_filters,
    classify_attachment_style,
    combine_subscores,
    normalize_answer,
)

BIG_FIVE = ("openness", "conscientiousness", "extraversion", "agreeableness", "emotional_stability")


def _bf(value: float) -> dict:
    return {t: value for t in BIG_FIVE}


def _profile(bf=0.5, anx=0.2, avo=0.2, values=None, comm=None) -> ScoringProfile:
    return ScoringProfile(
        big_five=_bf(bf) if isinstance(bf, (int, float)) else bf,
        attachment_anxiety=anx,
        attachment_avoidance=avo,
        values=values or {},
        communication=comm or {},
    )


# --------------------------------------------------------------------------- #
# normalize_answer
# --------------------------------------------------------------------------- #
def test_normalize_answer_basic():
    assert normalize_answer(5) == 1.0
    assert normalize_answer(1) == 0.0
    assert normalize_answer(3) == 0.5


def test_normalize_answer_reverse():
    assert normalize_answer(1, is_reverse=True) == 1.0  # 6-1=5 -> 1.0
    assert normalize_answer(5, is_reverse=True) == 0.0  # 6-5=1 -> 0.0
    assert normalize_answer(2, is_reverse=True) == normalize_answer(4, is_reverse=False)


def test_calculate_trait_score():
    assert calculate_trait_score([1.0, 0.0, 0.5]) == pytest.approx(0.5)
    assert calculate_trait_score([]) == 0.0


# --------------------------------------------------------------------------- #
# Big Five
# --------------------------------------------------------------------------- #
def test_big_five_identical_is_one():
    res = calculate_big_five_similarity(_bf(0.7), _bf(0.7))
    assert res["weighted"] == pytest.approx(1.0)
    assert set(res["per_trait"]) == set(BIG_FIVE)
    assert all(v == pytest.approx(1.0) for v in res["per_trait"].values())


def test_big_five_opposite_is_zero():
    res = calculate_big_five_similarity(_bf(0.0), _bf(1.0))
    assert res["weighted"] == pytest.approx(0.0)


def test_big_five_uses_configured_weights():
    a = _bf(1.0)
    b = dict(a)
    b["emotional_stability"] = 0.0  # only the 0.30-weighted trait differs fully
    res = calculate_big_five_similarity(a, b)
    # weighted = 1 - 0.30*(1) = 0.70
    assert res["weighted"] == pytest.approx(0.70)


# --------------------------------------------------------------------------- #
# Attachment
# --------------------------------------------------------------------------- #
def test_classify_attachment_style():
    assert classify_attachment_style(0.2, 0.2) == "secure"
    assert classify_attachment_style(0.8, 0.2) == "anxious"
    assert classify_attachment_style(0.2, 0.8) == "avoidant"
    assert classify_attachment_style(0.8, 0.8) == "anxious_avoidant"
    assert classify_attachment_style(0.5, 0.5) == "anxious_avoidant"  # cutoff inclusive


def test_attachment_compatibility_is_symmetric():
    assert calculate_attachment_compatibility("secure", "secure") == 1.0
    assert calculate_attachment_compatibility("anxious", "avoidant") == 0.25
    assert calculate_attachment_compatibility("avoidant", "anxious") == 0.25
    assert calculate_attachment_compatibility("secure", "anxious_avoidant") == 0.5


# --------------------------------------------------------------------------- #
# Hard filters
# --------------------------------------------------------------------------- #
def test_hard_filter_children_conflict_fails():
    a = _profile(values={"children": "no_quiero"})
    b = _profile(values={"children": "quiero_futuro"})
    res = check_hard_filters(a, b)
    assert res["passes"] is False
    assert "children" in res["failed_on"]


def test_hard_filter_children_flexible_passes():
    a = _profile(values={"children": "no_quiero"})
    b = _profile(values={"children": "no_seguro"})
    assert check_hard_filters(a, b)["passes"] is True


def test_hard_filter_relationship_intent():
    a = _profile(values={"relationship_intent": "casual"})
    b = _profile(values={"relationship_intent": "seria"})
    assert check_hard_filters(a, b)["passes"] is False
    a2 = _profile(values={"relationship_intent": "casual"})
    b2 = _profile(values={"relationship_intent": "sin_apuro"})
    assert check_hard_filters(a2, b2)["passes"] is True


# --------------------------------------------------------------------------- #
# Soft values + communication
# --------------------------------------------------------------------------- #
def test_soft_values_identical_is_one():
    v = {"spirituality": "central", "ambition": "equilibrio", "habits": ["entreno"], "hobbies_importance": "muy_importante"}
    assert calculate_soft_values_score(_profile(values=v), _profile(values=dict(v))) == pytest.approx(1.0)


def test_soft_values_partial_closeness():
    a = _profile(values={"spirituality": "central", "ambition": "carrera_prioridad", "habits": [], "hobbies_importance": "muy_importante"})
    b = _profile(values={"spirituality": "importante_flexible", "ambition": "equilibrio", "habits": [], "hobbies_importance": "algo_importante"})
    # (0.5 + 0.5 + jaccard([],[])=1.0 + 0.5) / 4
    assert calculate_soft_values_score(a, b) == pytest.approx((0.5 + 0.5 + 1.0 + 0.5) / 4)


def test_communication_love_languages_jaccard():
    a = _profile(comm={"conflict_style": "hablo_apenas", "love_languages": ["palabras", "tiempo"], "contact_frequency": "todos_los_dias"})
    b = _profile(comm={"conflict_style": "hablo_apenas", "love_languages": ["tiempo", "actos"], "contact_frequency": "todos_los_dias"})
    # conflict 1.0, love jaccard {tiempo}/{palabras,tiempo,actos}=1/3, contact 1.0
    assert calculate_communication_score(a, b) == pytest.approx((1.0 + (1 / 3) + 1.0) / 3)


# --------------------------------------------------------------------------- #
# Combination + orchestration
# --------------------------------------------------------------------------- #
def test_combine_subscores_reference_example():
    # Big Five 0.78, attachment 0.80, soft values 0.65, communication 0.70 -> 75.6
    assert combine_subscores(0.78, 0.80, 0.65, 0.70) == 75.6


def test_final_weights_are_configurable_and_sum_to_one():
    assert sum(config.FINAL_WEIGHTS.values()) == pytest.approx(1.0)
    assert sum(config.BIG_FIVE_WEIGHTS.values()) == pytest.approx(1.0)


def test_identical_users_score_high():
    v = {"spirituality": "central", "ambition": "equilibrio", "habits": ["entreno"], "hobbies_importance": "muy_importante", "children": "quiero_futuro", "relationship_intent": "seria"}
    c = {"conflict_style": "hablo_apenas", "love_languages": ["palabras", "tiempo"], "contact_frequency": "cada_pocos_dias"}
    a = _profile(bf=0.8, anx=0.2, avo=0.2, values=v, comm=c)
    b = _profile(bf=0.8, anx=0.2, avo=0.2, values=dict(v), comm=dict(c))
    res = calculate_compatibility_score(a, b)
    assert res["eligible"] is True
    assert res["score"] == 100.0  # all sub-scores 1.0
    assert res["breakdown"]["attachment_style_a"] == "secure"


def test_opposite_users_score_low():
    a = _profile(
        bf=0.0, anx=0.1, avo=0.1,
        values={"children": "no_seguro", "relationship_intent": "no_se", "spirituality": "central", "ambition": "carrera_prioridad", "habits": ["fumo"], "hobbies_importance": "muy_importante"},
        comm={"conflict_style": "hablo_apenas", "love_languages": ["palabras"], "contact_frequency": "todos_los_dias"},
    )
    b = _profile(
        bf=1.0, anx=0.9, avo=0.9,
        values={"children": "no_seguro", "relationship_intent": "no_se", "spirituality": "ninguno", "ambition": "vida_personal", "habits": ["entreno"], "hobbies_importance": "no_necesario"},
        comm={"conflict_style": "evito", "love_languages": ["contacto"], "contact_frequency": "sin_presion"},
    )
    res = calculate_compatibility_score(a, b)
    assert res["eligible"] is True
    assert res["score"] < 40


def test_hard_filter_short_circuits_score():
    a = _profile(values={"children": "no_quiero"})
    b = _profile(values={"children": "ya_tengo"})
    res = calculate_compatibility_score(a, b)
    assert res["eligible"] is False
    assert res["score"] is None
    assert "children" in res["failed_on"]
