"""Runtime configuration.

Every external dependency is optional so the MVP runs offline:
  * No ANTHROPIC_API_KEY  -> AI engines fall back to deterministic heuristics.
  * No GOOGLE_PLACES_API_KEY -> venue lookup uses the seeded in-DB catalogue.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Storage. SQLite by default so the MVP needs no Postgres to boot;
    # swap DATABASE_URL for a postgresql:// URL in any real deployment.
    database_url: str = "sqlite:///./slowdates.db"

    # Claude powers both AI engines. Absent key -> heuristic fallback.
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5"
    anthropic_max_tokens: int = 1024

    # Google Places for venue data. Absent key -> seeded catalogue only.
    google_places_api_key: str = ""

    # Matching search radius, in kilometres.
    match_radius_km: float = 25.0

    # A match is only surfaced above this compatibility score.
    match_score_threshold: float = 0.55


@lru_cache
def get_settings() -> Settings:
    return Settings()
