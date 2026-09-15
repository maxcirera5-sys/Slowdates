# 🐌 Slowdates

App de citas **sin chat**. En vez de conversar durante días antes de quedar, cada
persona completa un perfil de gustos y disponibilidad, y **dos motores de IA** hacen
el trabajo pesado:

1. **Motor de Compatibilidad** — decide si dos personas hacen match y por qué.
2. **Motor de Planificación de Citas** — decide **dónde y cuándo** se ven, a partir de
   gustos compartidos, ubicación y disponibilidad de ambos.

La IA no es una función accesoria: es el producto. Este repositorio es el MVP que
valida el concepto.

---

## Qué incluye este MVP

- **Backend FastAPI** con los dos motores de IA como núcleo, más la lógica
  determinista (punto medio geográfico, intersección de horarios) que los alimenta.
- **Frontend vanilla JS** (sin build) que recorre las 5 pantallas del brief.
- **Datos sembrados** (usuarios y venues de Madrid) para demostrar el flujo completo
  end-to-end sin ninguna clave de API.
- **Tests** de la lógica determinista, los motores de IA y la API end-to-end.

### Los motores funcionan online **y** offline

Cada motor usa la **API de Claude** cuando `ANTHROPIC_API_KEY` está configurada; si no,
cae a un **heurístico determinista** equivalente. Así el MVP arranca, se demuestra y se
testea sin depender de servicios externos, y la ruta real de Claude está lista para
activarse con solo poner la clave. Igual con **Google Places**: sin clave se usa el
catálogo de venues sembrado en la base de datos.

---

## Arranque rápido

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Luego abre:

- **App:** http://localhost:8000/
- **API docs (Swagger):** http://localhost:8000/docs

La base de datos SQLite y los datos de demo se crean solos al arrancar.

Para activar Claude / Google Places, copia `.env.example` a `backend/.env` y rellena
las claves.

### Tests

```bash
cd backend
pytest -q
```

---

## Los dos motores

### 1. Motor de Compatibilidad — `app/ai/compatibility.py`

Entrada: dos perfiles (intereses, ambiente, presupuesto, estilo de vida).
Salida:

```json
{
  "compatibility_score": 0.82,
  "shared_interests": ["café de especialidad", "senderismo"],
  "reasoning": "Alta afinidad en gastronomía y actividades al aire libre",
  "suggested_date_category": "café + caminata"
}
```

- **Ruta Claude:** prompt estructurado que devuelve ese JSON.
- **Ruta heurística:** Jaccard sobre intereses (50%) + ambiente (20%) + presupuesto
  (15%) + estilo de vida (15%), con razonamiento y categoría explicables.

### 2. Motor de Planificación de Citas — `app/ai/date_planner.py`

Combina **código determinista** con **IA**:

- *Determinista* (`app/services/geo.py`, `app/services/availability.py`): punto medio
  esférico, estimación de tiempo de traslado, e intersección de bloques horarios.
- *IA*: de la lista corta de venues cercanos al punto medio, Claude elige el que mejor
  encaja con los gustos compartidos y escribe el porqué. El heurístico rankea por
  coincidencia de intereses y cercanía como fallback.

Siempre devuelve una **alternativa** por si se rechaza la primera propuesta:

```json
{
  "venue_name": "Café Nube",
  "datetime_utc": "2026-09-16T19:30:00Z",
  "why": "A 6 min de uno y 9 min del otro — ambiente tranquilo — coincide con café de especialidad",
  "alternative": { "venue": "Sendero Casa de Campo", "reasoning": "..." }
}
```

---

## Flujo end-to-end (pantallas del MVP)

| # | Pantalla | Endpoints |
|---|----------|-----------|
| 1 | Onboarding / perfil | `POST /users`, `POST /users/{id}/generate-matches` |
| 2 | Feed de matches | `GET /matches?user_id=`, `POST /matches/{id}/decision` |
| 3 | Propuesta de cita | `GET /proposals/{id}`, `POST /proposals/{id}/decision` |
| 4 | Confirmación + check-in | (aceptación mutua confirma la cita) |
| 5 | Feedback post-cita | `POST /proposals/{id}/feedback` |

Cuando **ambos** aceptan un match, el Motor de Planificación se dispara automáticamente
y crea la primera propuesta. Si se pide alternativa, se genera otra evitando el venue
rechazado.

### Métricas del MVP — `GET /metrics`

Los tres KPIs que validan la propuesta de valor:

- `match_to_confirmed_rate` — % de matches que llegan a cita confirmada.
- `second_date_rate` — % de citas con feedback "quiero segunda cita".
- (y conteos de matches aceptados y citas confirmadas)

---

## Modelo de datos — `app/models.py`

`User`, `Preferences`, `Match`, `DateProposal`, `DateFeedback`, `Venue`
(mapea la sección 4 del brief). SQLite por defecto; cambia `DATABASE_URL` a una URL
`postgresql://` para producción — las columnas JSON pasan a `JSONB`.

## Estructura

```
backend/
  app/
    ai/          # compatibility.py, date_planner.py, client.py  ← núcleo IA
    services/    # geo.py, availability.py, matching.py          ← lógica determinista
    routers/     # users, matches, dates, metrics                ← API
    models.py schemas.py database.py config.py seed.py main.py
  tests/         # servicios, motores IA, API end-to-end
frontend/        # index.html, app.js, styles.css                ← 5 pantallas, sin build
```

## Fuera de alcance de v1 (por diseño)

Videollamada previa, chat de soporte en vivo, recomendaciones de outfit, y un modelo de
IA propio entrenado. La API de Claude es suficiente para validar el concepto.
