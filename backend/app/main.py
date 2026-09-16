"""Slowdates API — FastAPI application entry point.

Run:  uvicorn app.main:app --reload   (from the backend/ directory)
Docs: http://localhost:8000/docs
"""

from __future__ import annotations

import pathlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import SessionLocal, init_db
from .routers import compatibility, dates, matches, metrics, test, users
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with SessionLocal() as db:
        seed(db)  # idempotent demo data
    yield


app = FastAPI(
    title="Slowdates API",
    version="0.1.0",
    description="App de citas con IA, sin chat: dos motores deciden el match y el plan.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # MVP; tighten for production.
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics.router)
app.include_router(users.router)
app.include_router(matches.router)
app.include_router(dates.router)
app.include_router(test.router)
app.include_router(compatibility.router)


# Serve the vanilla-JS frontend at / when it is present.
_frontend = pathlib.Path(__file__).resolve().parents[2] / "frontend"
if _frontend.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="frontend")
