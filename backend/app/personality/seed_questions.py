"""Seed data for the 32-question onboarding test (exact Spanish wording).

Idempotent: ``seed_questions`` only inserts when the table is empty.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import QuestionType, TestQuestion


def _likert(block: int, trait: str, text: str, reverse: bool = False) -> dict:
    return {
        "block": block, "trait": trait, "text": text,
        "qtype": QuestionType.likert, "is_reverse": reverse,
        "options": [], "is_hard_filter": False,
    }


def _choice(block, trait, text, options, qtype=QuestionType.single_choice, hard=False) -> dict:
    return {
        "block": block, "trait": trait, "text": text, "qtype": qtype,
        "is_reverse": False,
        "options": [{"value": v, "label": lbl} for v, lbl in options],
        "is_hard_filter": hard,
    }


# --- BLOCK 1 — BIG FIVE (likert 1-5) --------------------------------------- #
_QUESTIONS: list[dict] = [
    _likert(1, "openness", "Me atraen las ideas nuevas y poco convencionales, aunque me saquen de mi zona de confort."),
    _likert(1, "openness", "Disfruto conversaciones sobre temas abstractos o filosóficos."),
    _likert(1, "openness", "Prefiero rutinas conocidas antes que planes improvisados.", reverse=True),

    _likert(1, "conscientiousness", "Suelo planificar con anticipación en vez de dejar las cosas para último momento."),
    _likert(1, "conscientiousness", "Cumplo lo que prometo, incluso cuando me cuesta esfuerzo."),
    _likert(1, "conscientiousness", "Me cuesta mantener el orden o terminar lo que empiezo.", reverse=True),

    _likert(1, "extraversion", "Gano energía estando rodeado/a de gente, más que estando solo/a."),
    _likert(1, "extraversion", "Me resulta fácil iniciar conversación con desconocidos."),
    _likert(1, "extraversion", "Prefiero planes tranquilos y en grupos pequeños antes que salidas grandes.", reverse=True),

    _likert(1, "agreeableness", "Cuando hay un conflicto, priorizo entender al otro antes de defender mi postura."),
    _likert(1, "agreeableness", "Confío en las personas hasta que me den un motivo para no hacerlo."),
    _likert(1, "agreeableness", "Me cuesta ceder en una discusión, aunque sepa que el otro tiene razón.", reverse=True),

    _likert(1, "emotional_stability", "Me altero con facilidad ante contratiempos pequeños.", reverse=True),
    _likert(1, "emotional_stability", "Recupero la calma rápido después de una discusión o un mal momento."),
    _likert(1, "emotional_stability", "Suelo anticipar el peor escenario posible en situaciones inciertas.", reverse=True),

    # --- BLOCK 2 — APEGO (likert 1-5) --- #
    _likert(2, "attachment_anxiety", "Me preocupa que a la persona que me gusta no le importe tanto como a mí."),
    _likert(2, "attachment_anxiety", "Necesito señales frecuentes de que le importo a mi pareja."),
    _likert(2, "attachment_anxiety", "Cuando no tengo noticias de alguien que me gusta, tiendo a imaginar lo peor."),
    _likert(2, "attachment_anxiety", "Me cuesta relajarme del todo en una relación hasta sentirme muy seguro/a de ella."),

    _likert(2, "attachment_avoidance", "Prefiero mantener cierta independencia emocional, incluso en pareja."),
    _likert(2, "attachment_avoidance", "Me incomoda cuando alguien quiere conocerme muy rápido o muy profundo."),
    _likert(2, "attachment_avoidance", "Me resulta más fácil resolver las cosas solo/a que apoyarme en mi pareja."),
    _likert(2, "attachment_avoidance", "Compartir mis sentimientos con alguien nuevo me genera vulnerabilidad incómoda."),

    # --- BLOCK 3 — VALORES --- #
    _choice(3, "relationship_intent", "¿Qué buscás en este momento?", [
        ("casual", "Algo casual"),
        ("sin_apuro", "Conocer gente sin apuro"),
        ("seria", "Una relación seria"),
        ("no_se", "Todavía no lo sé"),
    ], hard=True),
    _choice(3, "children", "¿Y con respecto a hijos?", [
        ("quiero_futuro", "Los quiero en el futuro"),
        ("ya_tengo", "Ya los tengo"),
        ("no_quiero", "No los quiero"),
        ("no_seguro", "No estoy seguro/a"),
    ], hard=True),
    _choice(3, "spirituality", "¿Qué lugar ocupa la espiritualidad o religión en tu vida?", [
        ("central", "Central"),
        ("importante_flexible", "Importante pero flexible"),
        ("poco_relevante", "Poco relevante"),
        ("ninguno", "Ninguno"),
    ]),
    _choice(3, "ambition", "¿Cómo describirías tu relación con el trabajo/ambición?", [
        ("carrera_prioridad", "Mi carrera es prioridad clara"),
        ("equilibrio", "Busco equilibrio"),
        ("vida_personal", "Prefiero priorizar mi vida personal"),
    ]),
    _choice(3, "habits", "Hábitos", [
        ("fumo", "Fumo"),
        ("alcohol_social", "Tomo alcohol socialmente"),
        ("no_tomo", "No tomo"),
        ("entreno", "Entreno regularmente"),
        ("dieta", "Sigo una dieta particular"),
    ], qtype=QuestionType.multi_choice),
    _choice(3, "hobbies_importance", "¿Qué tan importante es que tu pareja comparta tus hobbies?", [
        ("muy_importante", "Muy importante"),
        ("algo_importante", "Algo importante"),
        ("no_necesario", "No es necesario"),
    ]),

    # --- BLOCK 4 — COMUNICACIÓN --- #
    _choice(4, "conflict_style", "Cuando algo te molesta en una relación...", [
        ("hablo_apenas", "Lo hablo apenas puedo"),
        ("proceso_antes", "Necesito procesarlo antes"),
        ("evito", "Evito el conflicto si puedo"),
    ]),
    _choice(4, "love_languages", "¿Qué te hace sentir más querido/a?", [
        ("palabras", "Palabras de afirmación"),
        ("tiempo", "Tiempo de calidad"),
        ("actos", "Actos de servicio"),
        ("regalos", "Regalos"),
        ("contacto", "Contacto físico"),
    ], qtype=QuestionType.ranking),
    _choice(4, "contact_frequency", "¿Qué tan seguido esperás tener contacto al empezar a conocerse?", [
        ("todos_los_dias", "Todos los días"),
        ("cada_pocos_dias", "Cada pocos días está bien"),
        ("sin_presion", "Sin presión de frecuencia fija"),
    ]),
]


def seed_questions(db: Session) -> None:
    """Insert the 32 questions if none exist yet (idempotent)."""
    if db.scalar(select(TestQuestion)) is not None:
        return
    order_by_block: dict[int, int] = {}
    for q in _QUESTIONS:
        order_by_block[q["block"]] = order_by_block.get(q["block"], 0) + 1
        db.add(TestQuestion(**q, active=True, order=order_by_block[q["block"]]))
    db.commit()
