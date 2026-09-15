"""Deterministic availability logic — no AI here (brief section 3.2).

Turns each user's free blocks into the overlap where they can both meet,
and projects that overlap onto real calendar datetimes.
"""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
_DAY_INDEX = {d: i for i, d in enumerate(DAYS)}


def _to_minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _minutes_to_time(minutes: int) -> time:
    return time(hour=minutes // 60, minute=minutes % 60)


def intersect_blocks(blocks_a: list[dict], blocks_b: list[dict]) -> list[dict]:
    """Per-weekday overlap of two availability lists.

    Each block is {"day","start","end"}. Returns overlapping windows that are
    at least 60 minutes long (no point proposing a 20-minute date).
    """
    overlaps: list[dict] = []
    for a in blocks_a:
        for b in blocks_b:
            if a["day"] != b["day"]:
                continue
            start = max(_to_minutes(a["start"]), _to_minutes(b["start"]))
            end = min(_to_minutes(a["end"]), _to_minutes(b["end"]))
            if end - start >= 60:
                overlaps.append(
                    {
                        "day": a["day"],
                        "start": f"{start // 60:02d}:{start % 60:02d}",
                        "end": f"{end // 60:02d}:{end % 60:02d}",
                    }
                )
    # Earliest weekday first, then earliest start.
    overlaps.sort(key=lambda o: (_DAY_INDEX[o["day"]], _to_minutes(o["start"])))
    return overlaps


def next_datetime_for_block(block: dict, *, now: datetime | None = None) -> datetime:
    """First UTC datetime matching a weekly block, offset ~30 min into it.

    Picks the next occurrence of the block's weekday, starting the date a
    little after the window opens so both people have arrival slack.
    """
    now = now or datetime.now(timezone.utc)
    target_dow = _DAY_INDEX[block["day"]]
    days_ahead = (target_dow - now.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7  # always propose a future day
    day = (now + timedelta(days=days_ahead)).date()

    start_min = _to_minutes(block["start"]) + 30
    return datetime.combine(day, _minutes_to_time(start_min), tzinfo=timezone.utc)


def candidate_datetimes(
    blocks: list[dict], *, now: datetime | None = None, limit: int = 6
) -> list[datetime]:
    """Concrete UTC datetimes the man can choose 3 options from (brief §5).

    Walks the overlapping blocks (already sorted earliest-first) and, within
    each, offers a couple of start times spaced ~2h apart. Returns up to
    `limit` future datetimes, de-duplicated and chronologically ordered.
    """
    out: list[datetime] = []
    for block in blocks:
        base = next_datetime_for_block(block, now=now)
        window_end = _to_minutes(block["end"])
        offset_hours = 0
        # Offer start times while they still leave >= 60 min inside the window.
        while True:
            slot = base + timedelta(hours=offset_hours)
            slot_min = slot.hour * 60 + slot.minute
            if slot_min + 60 > window_end and offset_hours > 0:
                break
            if slot not in out:
                out.append(slot)
            offset_hours += 2
            if offset_hours > 8:  # safety guard
                break
    out.sort()
    return out[:limit]
