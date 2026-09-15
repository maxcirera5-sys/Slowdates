"""Motor de Perfil — concept 1 of the brief.

Takes a user's onboarding answers (free-text bio, chosen interests, values,
ambitions, lifestyle flags, communication and relationship preferences) and
builds a *deep* profile: personality traits, a normalised set of values and
ambitions, and a short human-readable narrative that explains who this person
is beyond their hobbies.

Primary path: Claude with a structured JSON prompt.
Fallback path: a deterministic heuristic so onboarding works offline and the
derived profile is explainable and testable.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from . import client

SYSTEM_PROMPT = (
    "Eres el motor de perfil de una app de citas sin chat. A partir de las "
    "respuestas de onboarding de una persona construyes un perfil PROFUNDO que "
    "va más allá de los hobbies: personalidad, valores, ambiciones, estilo de "
    "vida, estilo de comunicación y el tipo de relación que busca. "
    "Devuelves EXCLUSIVAMENTE un objeto JSON con las claves: "
    "personality_traits (array de 3-6 adjetivos en español), "
    "values (array de valores normalizados), "
    "ambitions (array de ambiciones normalizadas), "
    "communication_style (string breve), "
    "relationship_type (string breve), "
    "summary (string de 1-2 frases en español, cálido y concreto). "
    "No incluyas texto fuera del JSON."
)


@dataclass
class ProfileResult:
    personality_traits: list[str] = field(default_factory=list)
    values: list[str] = field(default_factory=list)
    ambitions: list[str] = field(default_factory=list)
    communication_style: str = ""
    relationship_type: str = ""
    summary: str = ""
    source: str = "heuristic"  # "claude" | "heuristic"

    def as_dict(self) -> dict:
        return {
            "personality_traits": self.personality_traits,
            "values": self.values,
            "ambitions": self.ambitions,
            "communication_style": self.communication_style,
            "relationship_type": self.relationship_type,
            "summary": self.summary,
            "source": self.source,
        }


def _answers_payload(prefs) -> dict:
    """Everything the profiler is allowed to reason over."""
    return {
        "bio": getattr(prefs, "bio", "") or "",
        "interests": list(getattr(prefs, "interests", []) or []),
        "ambiance": list(getattr(prefs, "ambiance", []) or []),
        "budget": getattr(prefs, "budget", "medio"),
        "values": list(getattr(prefs, "values", []) or []),
        "ambitions": list(getattr(prefs, "ambitions", []) or []),
        "lifestyle": dict(getattr(prefs, "lifestyle", {}) or {}),
        "communication_style": getattr(prefs, "communication_style", "") or "",
        "relationship_type": getattr(prefs, "relationship_type", "") or "",
        "favorite_venues": list(getattr(prefs, "favorite_venues", []) or []),
    }


# --------------------------------------------------------------------------- #
# Heuristic fallback
# --------------------------------------------------------------------------- #
# Maps lifestyle / interest signals to inferred personality adjectives.
_TRAIT_SIGNALS = {
    "senderismo": "aventurera",
    "naturaleza": "aventurera",
    "viajar": "curiosa",
    "arte": "sensible",
    "museos": "reflexiva",
    "música": "expresiva",
    "lectura": "reflexiva",
    "café de especialidad": "detallista",
    "juegos de mesa": "sociable",
    "gastronomía": "hedonista",
    "deporte": "disciplinada",
    "voluntariado": "empática",
}


def _norm_list(items) -> list[str]:
    seen: list[str] = []
    for it in items:
        s = str(it).strip()
        if s and s.lower() not in {x.lower() for x in seen}:
            seen.append(s)
    return seen


def _heuristic(prefs) -> ProfileResult:
    a = _answers_payload(prefs)

    traits: list[str] = []
    for source in (a["interests"], a["values"], a["ambitions"]):
        for item in source:
            key = str(item).strip().lower()
            trait = _TRAIT_SIGNALS.get(key)
            if trait and trait not in traits:
                traits.append(trait)

    life = a["lifestyle"]
    if life.get("pets"):
        traits.append("cariñosa")
    if life.get("early_riser"):
        traits.append("madrugadora")
    if a["ambiance"] and "tranquilo" in {str(x).lower() for x in a["ambiance"]}:
        traits.append("serena")
    if not traits:
        traits = ["auténtica", "abierta"]
    traits = _norm_list(traits)[:6]

    values = _norm_list(a["values"]) or _values_from_lifestyle(life)
    ambitions = _norm_list(a["ambitions"])
    comm = a["communication_style"] or _infer_comm(a)
    rel = a["relationship_type"] or "una conexión con proyección"

    summary = _summary(a, traits, values, ambitions, rel)
    return ProfileResult(
        personality_traits=traits,
        values=values,
        ambitions=ambitions,
        communication_style=comm,
        relationship_type=rel,
        summary=summary,
        source="heuristic",
    )


def _values_from_lifestyle(life: dict) -> list[str]:
    inferred = []
    if life.get("pets"):
        inferred.append("cuidado")
    if life.get("smoker") is False:
        inferred.append("vida sana")
    return inferred or ["honestidad"]


def _infer_comm(a: dict) -> str:
    amb = {str(x).lower() for x in a["ambiance"]}
    if "tranquilo" in amb:
        return "cercana y pausada"
    if "animado" in amb:
        return "directa y expresiva"
    return "abierta"


def _summary(a, traits, values, ambitions, rel) -> str:
    bits = []
    if traits:
        bits.append("Persona " + ", ".join(traits[:3]))
    if values:
        bits.append("le mueven " + ", ".join(values[:2]))
    if ambitions:
        bits.append("aspira a " + ", ".join(ambitions[:2]))
    head = "; ".join(bits) if bits else "Perfil por descubrir"
    return f"{head}. Busca {rel}."


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #
def build_profile(prefs) -> ProfileResult:
    """Derive a deep profile. Uses Claude when available, heuristic otherwise."""
    payload = _answers_payload(prefs)
    data = client.complete_json(SYSTEM_PROMPT, json.dumps(payload, ensure_ascii=False))
    if data and ("personality_traits" in data or "summary" in data):
        try:
            return ProfileResult(
                personality_traits=_norm_list(data.get("personality_traits", [])),
                values=_norm_list(data.get("values", [])),
                ambitions=_norm_list(data.get("ambitions", [])),
                communication_style=str(data.get("communication_style", "")),
                relationship_type=str(data.get("relationship_type", "")),
                summary=str(data.get("summary", "")),
                source="claude",
            )
        except (TypeError, ValueError):
            pass  # malformed -> heuristic
    return _heuristic(prefs)
