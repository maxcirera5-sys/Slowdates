"""Thin wrapper around the Claude Messages API.

Both engines call `complete_json`: it sends a structured prompt, asks Claude
to reply with a single JSON object, and parses it. When no API key is set (or
the SDK is missing, or a call fails) it returns None so the caller can fall
back to its deterministic heuristic — the app never hard-depends on the API.
"""

from __future__ import annotations

import json
import logging

from ..config import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()

try:  # SDK is optional at import time.
    from anthropic import Anthropic

    _client: "Anthropic | None" = (
        Anthropic(api_key=_settings.anthropic_api_key)
        if _settings.anthropic_api_key
        else None
    )
except Exception:  # pragma: no cover - only when SDK unavailable
    Anthropic = None  # type: ignore
    _client = None


def is_live() -> bool:
    """True when a real Claude call can be made."""
    return _client is not None


def _extract_json(text: str) -> dict | None:
    """Pull the first JSON object out of a model reply."""
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        logger.warning("Claude reply was not valid JSON")
        return None


def complete_json(system: str, user: str) -> dict | None:
    """Ask Claude for a JSON object. Returns None on any failure."""
    if _client is None:
        return None
    try:
        resp = _client.messages.create(
            model=_settings.anthropic_model,
            max_tokens=_settings.anthropic_max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = "".join(
            block.text for block in resp.content if getattr(block, "type", "") == "text"
        )
        return _extract_json(text)
    except Exception as exc:  # network, auth, rate limit, ...
        logger.warning("Claude call failed, using heuristic fallback: %s", exc)
        return None
