"""End-to-end API test walking the full brief flow (screens 1-5).

The `client` fixture lives in conftest.py and hands back a TestClient backed
by a fresh, seeded SQLite database.
"""


def test_health_reports_engine(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["compatibility_engine"] in ("claude", "heuristic")


def test_full_flow_match_to_feedback(client):
    # Seeded Ana and Bruno are highly compatible.
    users = client.get("/users").json()
    ana = next(u for u in users if u["name"] == "Ana")
    bruno = next(u for u in users if u["name"] == "Bruno")

    # 1-2. Compatibility engine -> match feed.
    matches = client.post(f"/users/{ana['id']}/generate-matches").json()
    pair = next(m for m in matches if m["other_user_id"] == bruno["id"])
    assert pair["compatibility_score"] > 0.5
    match_id = pair["match_id"]

    # 3. Both accept -> date-planning engine fires.
    client.post(f"/matches/{match_id}/decision",
                json={"user_id": ana["id"], "accept": True})
    r = client.post(f"/matches/{match_id}/decision",
                    json={"user_id": bruno["id"], "accept": True})
    body = r.json()
    assert body["status"] == "accepted"
    proposal = body["proposal"]
    assert proposal is not None
    assert proposal["venue_name"]
    assert proposal["why"]
    proposal_id = proposal["id"]

    # 4. Both confirm the proposal -> check-in unlocks.
    client.post(f"/proposals/{proposal_id}/decision",
                json={"user_id": ana["id"], "action": "accept"})
    r = client.post(f"/proposals/{proposal_id}/decision",
                    json={"user_id": bruno["id"], "action": "accept"})
    assert r.json()["checkin_enabled"] is True

    # 5. Post-date feedback feeds the metrics.
    client.post(f"/proposals/{proposal_id}/feedback",
                json={"user_id": ana["id"], "attended": True,
                      "wants_second_date": True})
    client.post(f"/proposals/{proposal_id}/feedback",
                json={"user_id": bruno["id"], "attended": True,
                      "wants_second_date": True})

    m = client.get("/metrics").json()
    assert m["confirmed_dates"] >= 1
    assert m["second_date_rate"] > 0


def test_request_alternative_generates_new_proposal(client):
    users = client.get("/users").json()
    ana = next(u for u in users if u["name"] == "Ana")
    bruno = next(u for u in users if u["name"] == "Bruno")

    client.post(f"/users/{ana['id']}/generate-matches")
    matches = client.get(f"/matches?user_id={ana['id']}").json()
    match_id = next(
        m["id"] for m in matches
        if bruno["id"] in (m["user_a_id"], m["user_b_id"])
    )

    client.post(f"/matches/{match_id}/decision",
                json={"user_id": ana["id"], "accept": True})
    body = client.post(f"/matches/{match_id}/decision",
                       json={"user_id": bruno["id"], "accept": True}).json()
    first = body["proposal"]

    r = client.post(f"/proposals/{first['id']}/decision",
                    json={"user_id": ana["id"], "action": "request_alternative"})
    out = r.json()
    assert out["status"] == "alternative_requested"
    assert out["new_proposal"] is not None
    assert out["new_proposal"]["venue_name"] != first["venue_name"]
