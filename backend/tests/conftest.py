"""Shared test setup.

Point the app at a throwaway SQLite DB *before* any app module is imported,
so the engine is built against it. Each test that needs the API gets a fresh,
freshly-seeded database via the `client` fixture.
"""

import os
import tempfile

import pytest

_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"


def pytest_unconfigure(config):
    if os.path.exists(_db_path):
        os.remove(_db_path)


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    from app.database import Base, SessionLocal, engine, init_db
    from app.main import app
    from app.seed import seed

    # Fresh schema + demo data per test for isolation.
    Base.metadata.drop_all(bind=engine)
    init_db()
    with SessionLocal() as db:
        seed(db)

    with TestClient(app) as c:
        yield c
