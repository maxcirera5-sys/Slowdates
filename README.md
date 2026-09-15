# 🐌 Slowdates

App de citas **sin chat** donde la IA es el producto. En vez de conversar durante
días antes de quedar, cada persona completa un onboarding y **tres motores de IA**
hacen el trabajo pesado:

1. **Motor de Perfil** — construye un perfil *profundo* (personalidad, valores,
   ambiciones, estilo de vida, tipo de relación) a partir de las respuestas.
2. **Motor de Compatibilidad** — decide si dos personas encajan y **por qué**,
   pesando valores y objetivos de vida, no solo hobbies.
3. **Motor de Planificación de Citas** — decide **dónde, cuándo y en qué punto de
   encuentro** se ven, a partir de gustos, restaurantes favoritos, ubicación y
   disponibilidad de ambos.

Este repositorio es el MVP que valida el concepto end-to-end.

---

## Los 7 conceptos del brief → cómo se implementan

| # | Concepto | Dónde vive |
|---|----------|-----------|
| 1 | **Perfil generado por IA** (personalidad, valores, ambiciones, estilo de vida, tipo de relación) | `app/ai/profiler.py`; campos derivados en `Preferences` |
| 2 | **Compatibilidad inteligente** (valores, objetivos, personalidad, comunicación, estilo de vida — no solo hobbies) | `app/ai/compatibility.py` (pesos: valores 28%, ambiciones 22%, personalidad 18%, comunicación 12%, estilo de vida 12%, intereses **solo 8%**) |
| 3 | **Sin chat** | No existe ningún endpoint de mensajería. La confianza se genera con la compatibilidad explicada (`breakdown` + `reasoning`) y el perfil |
| 4 | **Propuesta de encuentro** | Feed de matches: se ve el perfil, fotos, intereses y afinidades, y se decide `POST /matches/{id}/decision` |
| 5 | **Sistema de aceptación** (hetero: primero él elige 3 horarios → ella elige o contrapropone) | `app/routers/dates.py`: `/slots`, `/respond`, `/counter` |
| 6 | **Restaurantes favoritos** (5 en el onboarding) | `Preferences.favorite_venues` (máx. 5); bonifican la elección de lugar |
| 7 | **Cita sugerida por IA** (lugar, fecha, hora, punto de encuentro) | `app/ai/date_planner.py` — venue + `meeting_point` + franjas horarias candidatas |

### Los motores funcionan online **y** offline

Cada motor usa la **API de Claude** cuando `ANTHROPIC_API_KEY` está configurada; si
no, cae a un **heurístico determinista** equivalente. Así el MVP arranca, se
demuestra y se testea sin depender de servicios externos, y la ruta real de Claude
está lista para activarse con solo poner la clave. Igual con **Google Places**: sin
clave se usa el catálogo de venues sembrado en la base de datos.

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

La base de datos SQLite y los datos de demo (2 mujeres y 2 hombres compatibles) se
crean solos al arrancar.

Para activar Claude / Google Places, copia `.env.example` a `backend/.env` y rellena
las claves.

### Tests

```bash
cd backend
pytest -q
```

---

## Los tres motores

### 1. Motor de Perfil — `app/ai/profiler.py`

Entrada: las respuestas de onboarding (bio, intereses, valores, ambiciones,
lifestyle, estilo de comunicación, tipo de relación, restaurantes favoritos).
Salida: un perfil **profundo**.

```json
{
  "personality_traits": ["curiosa", "reflexiva", "serena"],
  "values": ["honestidad", "crecimiento personal"],
  "ambitions": ["viajar", "montar un estudio propio"],
  "communication_style": "cercana y pausada",
  "relationship_type": "algo serio y con calma",
  "summary": "Persona curiosa y reflexiva; le mueven la honestidad y el crecimiento…"
}
```

### 2. Motor de Compatibilidad — `app/ai/compatibility.py`

Entrada: dos perfiles profundos. Salida: score, valores/intereses compartidos, un
**desglose por dimensión** (transparencia del concepto 3) y el porqué.

```json
{
  "compatibility_score": 0.82,
  "shared_values": ["honestidad", "crecimiento personal"],
  "shared_interests": ["café de especialidad"],
  "breakdown": {
    "values": 0.9, "ambitions": 0.8, "personality": 0.7,
    "communication": 1.0, "lifestyle": 0.9, "interests": 0.5
  },
  "reasoning": "Comparten valores como honestidad y crecimiento personal, y objetivos de vida…",
  "suggested_date_category": "café + caminata"
}
```

### 3. Motor de Planificación de Citas — `app/ai/date_planner.py`

Combina **código determinista** con **IA**:

- *Determinista* (`app/services/geo.py`, `app/services/availability.py`): punto medio
  esférico, tiempo de traslado, intersección de horarios y sus **franjas candidatas**.
- *IA*: de la lista corta de venues cercanos al punto medio elige el mejor (con
  preferencia a un **favorito compartido**), define el **punto de encuentro** y escribe
  el porqué. El heurístico rankea por favorito → interés → cercanía como fallback.

---

## El sistema de aceptación (concepto 5)

Cuando **ambos** aceptan un match, el Motor de Planificación fija el lugar y ofrece
franjas horarias. A partir de ahí, en una pareja heterosexual:

```
1. La propuesta llega primero al HOMBRE.        POST /proposals/{id}/slots
   → acepta y elige 3 opciones de fecha/hora.
2. La propuesta llega a la MUJER.               POST /proposals/{id}/respond
   → elige una opción  (action: "select")
   → o contrapropone   (action: "counter")
3. Si contrapropone, vuelve al hombre.          POST /proposals/{id}/counter
   → acepta la contrapropuesta → cita confirmada.
```

En parejas no heterosexuales se usa el mismo mecanismo en modo *generic*: quien
inició el match (`user_a`) es el proponente.

---

## Flujo end-to-end (pantallas del MVP)

| # | Pantalla | Endpoints |
|---|----------|-----------|
| 1 | Onboarding + perfil IA | `POST /users`, `GET /users/{id}/profile` |
| 2 | Feed de compatibilidad | `POST /users/{id}/generate-matches`, `GET /matches?user_id=`, `POST /matches/{id}/decision` |
| 3 | Acuerdo de cita (flujo por género) | `GET /proposals/{id}`, `POST …/slots`, `POST …/respond`, `POST …/counter` |
| 4 | Confirmación + check-in | (la selección/contrapropuesta aceptada confirma la cita) |
| 5 | Feedback post-cita | `POST /proposals/{id}/feedback` |

### Métricas del MVP — `GET /metrics`

- `match_to_confirmed_rate` — % de matches que llegan a cita confirmada.
- `second_date_rate` — % de citas con feedback "quiero segunda cita".
- (y conteos de matches aceptados y citas confirmadas)

---

## Modelo de datos — `app/models.py`

`User` (con `gender`/`seeking`), `Preferences` (respuestas + perfil IA derivado),
`Match` (score + `breakdown` + valores compartidos), `DateProposal` (flujo por género:
`proposer`/`responder`, `candidate_slots`, `time_options`, `selected_datetime`,
`counter_datetime`, `meeting_point`), `DateFeedback`, `Venue`. SQLite por defecto;
cambia `DATABASE_URL` a una URL `postgresql://` para producción — las columnas JSON
pasan a `JSONB`.

## Estructura

```
backend/
  app/
    ai/          # profiler.py, compatibility.py, date_planner.py, client.py  ← núcleo IA
    services/    # geo.py, availability.py, matching.py                        ← lógica determinista
    routers/     # users, matches, dates, metrics                              ← API
    models.py schemas.py database.py config.py seed.py main.py
  tests/         # servicios, motores IA, API end-to-end
frontend/        # index.html, app.js, styles.css                             ← 5 pantallas, sin build
```

## Fuera de alcance de v1 (por diseño)

Videollamada previa, chat de soporte en vivo, recomendaciones de outfit, y un modelo de
IA propio entrenado. La API de Claude es suficiente para validar el concepto.
