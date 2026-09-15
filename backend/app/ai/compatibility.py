"""Motor de Compatibilidad — the first of the two core AI engines.

Given two user profiles it returns a compatibility score, the shared
interests, a short human reason, and a suggested date category.

Primary path: Claude with a structured JSON prompt.
Fallback path: a deterministic heuristic so the product works offline and
so scores are explainable and testable.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import client

SYSTEM_PROMPT = (
    "Eres el motor de compatibilidad de una app de citas sin chat. "
    "Analizas dos perfiles y decides qué tan compatibles son para una cita. "
    "Devuelves EXCLUSIVAMENTE un objeto JSON con las claves: "
    "compatibility_score (float 0-1), shared_interests (array de strings), "
    "reasoning (string breve en español), suggested_date_category (string). "
    "Valora intereses compartidos, ambiente, presupuesto y estilo de vida. "
    "No incluyas texto fuera del JSON."
)


@dataclass
class CompatibilityResult:
    compatibility_score: float
    shared_interests: list[str] = field(default_factory=list)
    reasoning: str = ""
    suggested_date_category: str = ""
    source: str = "heuristic"  # "claude" | "heuristic"

    def as_dict(self) -> dict:
        return {
            "compatibility_score": round(self.compatibility_score, 3),
            "shared_interests": self.shared_interests,
            "reasoning": self.reasoning,
            "suggested_date_category": self.suggested_date_category,
            "source": self.source,
        }


def _profile_payload(user) -> dict:
    p = user.preferences
    return {
        "name": user.name,
        "interests": list(p.interests) if p else [],
        "ambiance": list(p.ambiance) if p else [],
        "budget": p.budget if p else "medio",
        "lifestyle": dict(p.lifestyle) if p else {},
    }


# --------------------------------------------------------------------------- #
# Heuristic fallback
# --------------------------------------------------------------------------- #
_BUDGET_RANK = {"bajo": 0, "medio": 1, "alto": 2}

# Maps a shared interest to a natural date category.
_CATEGORY_BY_INTEREST = {
    "senderismo": "café + caminata",
    "café de especialidad": "café de especialidad",
    "café": "café",
    "museos": "museo + paseo",
    "arte": "museo + paseo",
    "gastronomía asiática": "cena asiática",
    "gastronomía": "gastronomía",
    "juegos de mesa": "café de juegos de mesa",
    "música": "concierto o bar con música en vivo",
    "cine": "cine",
    "vino": "cata de vino",
}


def _norm(items) -> set[str]:
    return {str(i).strip().lower() for i in items if str(i).strip()}


def _heuristic(user_a, user_b) -> CompatibilityResult:
    pa, pb = _profile_payload(user_a), _profile_payload(user_b)

    ia, ib = _norm(pa["interests"]), _norm(pb["interests"])
    shared = ia & ib
    union = ia | ib
    interest_score = len(shared) / len(union) if union else 0.0  # Jaccard

    amb_a, amb_b = _norm(pa["ambiance"]), _norm(pb["ambiance"])
    ambiance_score = (
        len(amb_a & amb_b) / len(amb_a | amb_b) if (amb_a | amb_b) else 0.5
    )

    ba = _BUDGET_RANK.get(pa["budget"], 1)
    bb = _BUDGET_RANK.get(pb["budget"], 1)
    budget_score = 1.0 - abs(ba - bb) / 2.0

    lifestyle_score = _lifestyle_score(pa["lifestyle"], pb["lifestyle"])

    # Weighted blend; interests dominate, then ambiance, budget, lifestyle.
    score = (
        0.50 * interest_score
        + 0.20 * ambiance_score
        + 0.15 * budget_score
        + 0.15 * lifestyle_score
    )

    # Preserve original casing of shared interests for display.
    shared_display = sorted(
        {i for i in pa["interests"] if str(i).strip().lower() in shared}
    )
    category = _category_for(shared_display)
    reason = _reason(shared_display, ambiance_score, budget_score)

    return CompatibilityResult(
        compatibility_score=score,
        shared_interests=shared_display,
        reasoning=reason,
        suggested_date_category=category,
        source="heuristic",
    )


def _lifestyle_score(la: dict, lb: dict) -> float:
    keys = set(la) & set(lb)
    if not keys:
        return 0.5  # unknown -> neutral
    agree = sum(1 for k in keys if la[k] == lb[k])
    return agree / len(keys)


def _category_for(shared: list[str]) -> str:
    for interest in shared:
        key = interest.strip().lower()
        if key in _CATEGORY_BY_INTEREST:
            return _CATEGORY_BY_INTEREST[key]
    return "café"  # low-pressure default first date


def _reason(shared: list[str], ambiance_score: float, budget_score: float) -> str:
    if shared:
        head = "Alta afinidad en " + ", ".join(shared[:3])
    else:
        head = "Sin intereses idénticos, pero perfiles complementarios"
    if ambiance_score >= 0.5:
        head += "; coinciden en el ambiente preferido"
    if budget_score >= 0.75:
        head += " y en presupuesto"
    return head + "."


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #
def score_pair(user_a, user_b) -> CompatibilityResult:
    """Score two users. Uses Claude when available, heuristic otherwise."""
    payload = {
        "user_a": _profile_payload(user_a),
        "user_b": _profile_payload(user_b),
    }
    import json

    data = client.complete_json(SYSTEM_PROMPT, json.dumps(payload, ensure_ascii=False))
    if data and "compatibility_score" in data:
        try:
            return CompatibilityResult(
                compatibility_score=float(data["compatibility_score"]),
                shared_interests=list(data.get("shared_interests", [])),
                reasoning=str(data.get("reasoning", "")),
                suggested_date_category=str(data.get("suggested_date_category", "")),
                source="claude",
            )
        except (TypeError, ValueError):
            pass  # malformed -> fall through to heuristic
    return _heuristic(user_a, user_b)
