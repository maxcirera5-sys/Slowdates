"""Seed the DB with demo users and a small Madrid-centred venue catalogue.

Lets the whole end-to-end flow be demoed offline with no keys. The demo users
carry deep-profile answers (values, ambitions, personality signals), a gender
(so the acceptance flow can route man -> woman), and five favourite venues.
Idempotent: running twice will not duplicate rows.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .ai import profiler
from .database import SessionLocal, init_db
from .models import Gender, Preferences, User, Venue

# Rough Madrid coordinates for a believable midpoint/venue demo.
_VENUES = [
    {
        "name": "Café Nube",
        "address": "Calle de la Palma 12, Madrid",
        "lat": 40.4265, "lng": -3.7075,
        "ambiance": ["tranquilo", "interior"],
        "category": "café", "price_level": "medio",
        "tags": ["café de especialidad", "café de origen"],
    },
    {
        "name": "Sendero Casa de Campo",
        "address": "Casa de Campo, Madrid",
        "lat": 40.4190, "lng": -3.7480,
        "ambiance": ["exterior", "tranquilo"],
        "category": "senderismo", "price_level": "bajo",
        "tags": ["senderismo", "naturaleza", "caminata"],
    },
    {
        "name": "Museo del Prado",
        "address": "Paseo del Prado s/n, Madrid",
        "lat": 40.4138, "lng": -3.6921,
        "ambiance": ["tranquilo", "interior"],
        "category": "museos", "price_level": "medio",
        "tags": ["arte", "museos", "cultura"],
    },
    {
        "name": "Ramen Kagura",
        "address": "Calle de Fuencarral 40, Madrid",
        "lat": 40.4245, "lng": -3.7010,
        "ambiance": ["animado", "interior"],
        "category": "gastronomía asiática", "price_level": "medio",
        "tags": ["gastronomía asiática", "ramen", "cena"],
    },
    {
        "name": "Bar de Juegos Meeple",
        "address": "Calle del Espíritu Santo 8, Madrid",
        "lat": 40.4258, "lng": -3.7040,
        "ambiance": ["animado", "interior"],
        "category": "juegos de mesa", "price_level": "bajo",
        "tags": ["juegos de mesa", "cerveza artesanal"],
    },
    {
        "name": "Terraza Las Vistas",
        "address": "Ronda de Segovia 20, Madrid",
        "lat": 40.4110, "lng": -3.7160,
        "ambiance": ["animado", "exterior"],
        "category": "gastronomía", "price_level": "alto",
        "tags": ["cócteles", "vino", "atardecer"],
    },
    {
        "name": "Cafetería La Bicicleta",
        "address": "Plaza de San Ildefonso 9, Madrid",
        "lat": 40.4252, "lng": -3.7018,
        "ambiance": ["tranquilo", "interior"],
        "category": "café", "price_level": "medio",
        "tags": ["café de especialidad", "brunch", "coworking"],
    },
]

_USERS = [
    {
        "name": "Ana",
        "email": "ana@example.com",
        "gender": Gender.female, "seeking": Gender.male,
        "lat": 40.4400, "lng": -3.7000, "city": "Madrid",
        "bio": "Diseñadora que vive entre cuadernos, senderos y buen café.",
        "interests": ["café de especialidad", "senderismo", "museos"],
        "ambiance": ["tranquilo", "exterior"],
        "budget": "medio",
        "favorite_venues": ["Café Nube", "Museo del Prado", "Sendero Casa de Campo",
                            "Cafetería La Bicicleta", "Terraza Las Vistas"],
        "values": ["honestidad", "crecimiento personal", "naturaleza"],
        "ambitions": ["viajar", "montar un estudio propio"],
        "communication_style": "cercana y pausada",
        "relationship_type": "algo serio y con calma",
        "lifestyle": {"smoker": False, "pets": True, "early_riser": True},
        "availability": [
            {"day": "sat", "start": "10:00", "end": "14:00"},
            {"day": "wed", "start": "18:00", "end": "22:00"},
        ],
    },
    {
        "name": "Bruno",
        "email": "bruno@example.com",
        "gender": Gender.male, "seeking": Gender.female,
        "lat": 40.4050, "lng": -3.7100, "city": "Madrid",
        "bio": "Ingeniero curioso, adicto al café de origen y a las rutas de montaña.",
        "interests": ["café de especialidad", "senderismo", "juegos de mesa"],
        "ambiance": ["tranquilo", "exterior"],
        "budget": "medio",
        "favorite_venues": ["Café Nube", "Sendero Casa de Campo",
                            "Bar de Juegos Meeple", "Cafetería La Bicicleta"],
        "values": ["honestidad", "crecimiento personal", "curiosidad"],
        "ambitions": ["viajar", "aprender a cocinar de todo"],
        "communication_style": "cercana y pausada",
        "relationship_type": "algo serio y con calma",
        "lifestyle": {"smoker": False, "pets": True, "early_riser": True},
        "availability": [
            {"day": "sat", "start": "11:00", "end": "16:00"},
            {"day": "wed", "start": "19:00", "end": "23:00"},
        ],
    },
    {
        "name": "Carla",
        "email": "carla@example.com",
        "gender": Gender.female, "seeking": Gender.male,
        "lat": 40.4180, "lng": -3.6950, "city": "Madrid",
        "bio": "De cenas largas, cine de autor y conciertos hasta tarde.",
        "interests": ["gastronomía asiática", "cine", "música"],
        "ambiance": ["animado", "interior"],
        "budget": "alto",
        "favorite_venues": ["Ramen Kagura", "Terraza Las Vistas"],
        "values": ["ambición", "disfrute", "lealtad"],
        "ambitions": ["crecer en su carrera", "ver el mundo"],
        "communication_style": "directa y expresiva",
        "relationship_type": "algo sin prisas, ver cómo fluye",
        "lifestyle": {"smoker": True, "pets": False, "early_riser": False},
        "availability": [
            {"day": "fri", "start": "20:00", "end": "23:30"},
            {"day": "sat", "start": "21:00", "end": "23:59"},
        ],
    },
    {
        "name": "David",
        "email": "david@example.com",
        "gender": Gender.male, "seeking": Gender.female,
        "lat": 40.4210, "lng": -3.7020, "city": "Madrid",
        "bio": "Cocinero de vocación, foodie de ramen y cócteles con vistas.",
        "interests": ["gastronomía asiática", "música", "cócteles"],
        "ambiance": ["animado", "interior"],
        "budget": "alto",
        "favorite_venues": ["Ramen Kagura", "Terraza Las Vistas", "Bar de Juegos Meeple"],
        "values": ["ambición", "disfrute", "creatividad"],
        "ambitions": ["abrir un restaurante", "ver el mundo"],
        "communication_style": "directa y expresiva",
        "relationship_type": "algo sin prisas, ver cómo fluye",
        "lifestyle": {"smoker": False, "pets": False, "early_riser": False},
        "availability": [
            {"day": "fri", "start": "20:00", "end": "23:30"},
            {"day": "sat", "start": "20:30", "end": "23:59"},
        ],
    },
]


def seed(db: Session) -> None:
    # Seed the onboarding-test question catalogue (idempotent).
    from .personality.seed_questions import seed_questions

    seed_questions(db)

    if db.scalar(select(Venue)) is None:
        db.add_all([Venue(**v) for v in _VENUES])

    for u in _USERS:
        if db.scalar(select(User).where(User.email == u["email"])):
            continue
        user = User(
            name=u["name"], email=u["email"],
            gender=u["gender"], seeking=u["seeking"],
            lat=u["lat"], lng=u["lng"], city=u["city"], identity_verified=True,
        )
        user.preferences = Preferences(
            bio=u["bio"],
            interests=u["interests"], ambiance=u["ambiance"], budget=u["budget"],
            favorite_venues=u["favorite_venues"],
            values=u["values"], ambitions=u["ambitions"],
            communication_style=u["communication_style"],
            relationship_type=u["relationship_type"],
            lifestyle=u["lifestyle"], availability=u["availability"],
        )
        # Derive the deep AI profile up front so the demo has rich data (brief §1).
        result = profiler.build_profile(user.preferences)
        user.preferences.personality_traits = result.personality_traits
        user.preferences.ai_summary = result.summary
        user.preferences.profile_source = result.source
        db.add(user)
    db.commit()


def main() -> None:
    init_db()
    with SessionLocal() as db:
        seed(db)
    print("Seeded demo users and venues.")


if __name__ == "__main__":
    main()
