"""Seed the DB with demo users and a small Madrid-centred venue catalogue.

Lets the whole end-to-end flow (screens 1-5) be demoed offline with no keys.
Idempotent: running twice will not duplicate rows.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from .models import Preferences, User, Venue

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
]

_USERS = [
    {
        "name": "Ana",
        "email": "ana@example.com",
        "lat": 40.4400, "lng": -3.7000, "city": "Madrid",
        "interests": ["café de especialidad", "senderismo", "museos"],
        "ambiance": ["tranquilo", "exterior"],
        "budget": "medio",
        "lifestyle": {"smoker": False, "pets": True, "preferred_time": "mañana"},
        "availability": [
            {"day": "sat", "start": "10:00", "end": "14:00"},
            {"day": "wed", "start": "18:00", "end": "22:00"},
        ],
    },
    {
        "name": "Bruno",
        "email": "bruno@example.com",
        "lat": 40.4050, "lng": -3.7100, "city": "Madrid",
        "interests": ["café de especialidad", "senderismo", "juegos de mesa"],
        "ambiance": ["tranquilo", "exterior"],
        "budget": "medio",
        "lifestyle": {"smoker": False, "pets": True, "preferred_time": "mañana"},
        "availability": [
            {"day": "sat", "start": "11:00", "end": "16:00"},
            {"day": "wed", "start": "19:00", "end": "23:00"},
        ],
    },
    {
        "name": "Carla",
        "email": "carla@example.com",
        "lat": 40.4180, "lng": -3.6950, "city": "Madrid",
        "interests": ["gastronomía asiática", "cine", "música"],
        "ambiance": ["animado", "interior"],
        "budget": "alto",
        "lifestyle": {"smoker": True, "pets": False, "preferred_time": "noche"},
        "availability": [
            {"day": "fri", "start": "20:00", "end": "23:30"},
            {"day": "sat", "start": "21:00", "end": "23:59"},
        ],
    },
]


def seed(db: Session) -> None:
    if db.scalar(select(Venue)) is None:
        db.add_all([Venue(**v) for v in _VENUES])

    for u in _USERS:
        if db.scalar(select(User).where(User.email == u["email"])):
            continue
        user = User(
            name=u["name"], email=u["email"], lat=u["lat"], lng=u["lng"],
            city=u["city"], identity_verified=True,
        )
        user.preferences = Preferences(
            interests=u["interests"], ambiance=u["ambiance"], budget=u["budget"],
            lifestyle=u["lifestyle"], availability=u["availability"],
        )
        db.add(user)
    db.commit()


def main() -> None:
    init_db()
    with SessionLocal() as db:
        seed(db)
    print("Seeded demo users and venues.")


if __name__ == "__main__":
    main()
