"""Motor de Compatibilidad — concept 2 of the brief.

Given two *deep* profiles it returns a compatibility score, the shared values
and interests, a per-dimension breakdown, a short human reason, and a suggested
date category.

Crucially (brief §2) this does NOT centre on hobbies. The score is dominated by
shared values, life ambitions, personality fit, communication style and
lifestyle; interests are only a minor factor.

Primary path: Claude with a structured JSON prompt.
Fallback path: a deterministic weighted heuristic so the product works offline
and scores stay explainable and testable.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from . import client

SYSTEM_PROMPT = (
    "Eres el motor de compatibilidad de una app de citas sin chat. "
    "Analizas dos perfiles PROFUNDOS y decides qué tan compatibles son. "
    "NO te centres en hobbies: prioriza valores compartidos, objetivos de vida "
    "(ambiciones), personalidad, estilo de comunicación y estilo de vida. "
    "Los intereses son un factor menor. "
    "Devuelves EXCLUSIVAMENTE un objeto JSON con las claves: "
    "compatibility_score (float 0-1), shared_values (array), "
    "shared_interests (array), "
    "breakdown (objeto con values/ambitions/personality/communication/"
    "lifestyle/interests, cada uno float 0-1), "
    "reasoning (string breve en español que explique POR QUÉ encajan), "
    "suggested_date_category (string). No incluyas texto fuera del JSON."
)


@dataclass
class CompatibilityResult:
    compatibility_score: float
    shared_values: list[str] = field(default_factory=list)
    shared_interests: list[str] = field(default_factory=list)
    breakdown: dict = field(default_factory=dict)
    reasoning: str = ""
    suggested_date_category: str = ""
    source: str = "heuristic"  # "claude" | "heuristic"

    def as_dict(self) -> dict:
        return {
            "compatibility_score": round(self.compatibility_score, 3),
            "shared_values": self.shared_values,
            "shared_interests": self.shared_interests,
            "breakdown": {k: round(v, 3) for k, v in self.breakdown.items()},
            "reasoning": self.reasoning,
            "suggested_date_category": self.suggested_date_category,
            "source": self.source,
        }


def _profile_payload(user) -> dict:
    p = user.preferences
    g = lambda attr, default: getattr(p, attr, default) if p else default
    return {
        "name": user.name,
        "personality_traits": list(g("personality_traits", [])),
        "values": list(g("values", [])),
        "ambitions": list(g("ambitions", [])),
        "communication_style": g("communication_style", ""),
        "relationship_type": g("relationship_type", ""),
        "lifestyle": dict(g("lifestyle", {})),
        "interests": list(g("interests", [])),
        "ambiance": list(g("ambiance", [])),
        "budget": g("budget", "medio"),
    }


# --------------------------------------------------------------------------- #
# Heuristic fallback
# --------------------------------------------------------------------------- #
_BUDGET_RANK = {"bajo": 0, "medio": 1, "alto": 2}

# Brief §2: values and life goals dominate; interests are minor.
_WEIGHTS = {
    "values": 0.28,
    "ambitions": 0.22,
    "personality": 0.18,
    "communication": 0.12,
    "lifestyle": 0.12,
    "interests": 0.08,
}

_CATEGORY_BY_INTEREST = {
    "senderismo": "café + caminata",
    "café de especialidad": "café de especialidad",
    "café": "café",
    "museos": "museo + paseo",
    "arte": "museo + paseo",
    "gastronomía asiática": "cena asiática",
    "gastronomía": "cena tranquila",
    "juegos de mesa": "café de juegos de mesa",
    "música": "concierto o bar con música en vivo",
    "cine": "cine",
    "vino": "cata de vino",
}


def _norm(items) -> set[str]:
    return {str(i).strip().lower() for i in items if str(i).strip()}


def _jaccard(a: set[str], b: set[str], *, empty: float = 0.5) -> float:
    union = a | b
    if not union:
        return empty
    return len(a & b) / len(union)


def _shared_display(source_items, shared_lower: set[str]) -> list[str]:
    return sorted({i for i in source_items if str(i).strip().lower() in shared_lower})


def _heuristic(user_a, user_b) -> CompatibilityResult:
    pa, pb = _profile_payload(user_a), _profile_payload(user_b)

    va, vb = _norm(pa["values"]), _norm(pb["values"])
    aa, ab = _norm(pa["ambitions"]), _norm(pb["ambitions"])
    ta, tb = _norm(pa["personality_traits"]), _norm(pb["personality_traits"])
    ia, ib = _norm(pa["interests"]), _norm(pb["interests"])

    breakdown = {
        "values": _jaccard(va, vb),
        "ambitions": _jaccard(aa, ab),
        "personality": _jaccard(ta, tb),
        "communication": _comm_score(pa, pb),
        "lifestyle": _lifestyle_score(pa["lifestyle"], pb["lifestyle"]),
        "interests": _jaccard(ia, ib, empty=0.0),
    }
    score = sum(_WEIGHTS[k] * breakdown[k] for k in _WEIGHTS)

    shared_values = _shared_display(pa["values"], va & vb)
    shared_interests = _shared_display(pa["interests"], ia & ib)
    category = _category_for(shared_interests, aa & ab)
    reason = _reason(shared_values, aa & ab, breakdown)

    return CompatibilityResult(
        compatibility_score=score,
        shared_values=shared_values,
        shared_interests=shared_interests,
        breakdown=breakdown,
        reasoning=reason,
        suggested_date_category=category,
        source="heuristic",
    )


def _comm_score(pa: dict, pb: dict) -> float:
    ca = str(pa["communication_style"]).strip().lower()
    cb = str(pb["communication_style"]).strip().lower()
    if not ca or not cb:
        return 0.5
    if ca == cb:
        return 1.0
    # Overlap of the words used to describe the style.
    wa, wb = set(ca.split()), set(cb.split())
    return _jaccard(wa, wb, empty=0.4)


def _lifestyle_score(la: dict, lb: dict) -> float:
    keys = set(la) & set(lb)
    if not keys:
        return 0.5  # unknown -> neutral
    agree = sum(1 for k in keys if la[k] == lb[k])
    return agree / len(keys)


def _category_for(shared_interests: list[str], shared_ambitions: set[str]) -> str:
    for interest in shared_interests:
        key = interest.strip().lower()
        if key in _CATEGORY_BY_INTEREST:
            return _CATEGORY_BY_INTEREST[key]
    return "café"  # low-pressure default first date


def _reason(shared_values, shared_ambitions, breakdown) -> str:
    parts: list[str] = []
    if shared_values:
        parts.append("Comparten valores como " + ", ".join(shared_values[:3]))
    if shared_ambitions:
        parts.append("y objetivos de vida (" + ", ".join(sorted(shared_ambitions)[:2]) + ")")
    if breakdown["personality"] >= 0.5:
        parts.append("con personalidades que encajan")
    if breakdown["communication"] >= 0.6:
        parts.append("y un estilo de comunicación afín")
    if not parts:
        parts.append("Perfiles complementarios en valores y estilo de vida")
    return ", ".join(parts).replace(", y ", " y ") + "."


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #
def score_pair(user_a, user_b) -> CompatibilityResult:
    """Score two users. Uses Claude when available, heuristic otherwise."""
    payload = {
        "user_a": _profile_payload(user_a),
        "user_b": _profile_payload(user_b),
    }
    data = client.complete_json(SYSTEM_PROMPT, json.dumps(payload, ensure_ascii=False))
    if data and "compatibility_score" in data:
        try:
            return CompatibilityResult(
                compatibility_score=float(data["compatibility_score"]),
                shared_values=list(data.get("shared_values", [])),
                shared_interests=list(data.get("shared_interests", [])),
                breakdown=dict(data.get("breakdown", {})),
                reasoning=str(data.get("reasoning", "")),
                suggested_date_category=str(data.get("suggested_date_category", "")),
                source="claude",
            )
        except (TypeError, ValueError):
            pass  # malformed -> fall through to heuristic
    return _heuristic(user_a, user_b)
