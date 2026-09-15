"""End-to-end API tests walking the full brief flow.

The `client` fixture (conftest.py) hands back a TestClient backed by a fresh,
seeded SQLite database.
"""


def _seeded(client):
    users = client.get("/users").json()
    return {u["name"]: u for u in users}


def test_health_reports_engines(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["compatibility_engine"] in ("claude", "heuristic")
    assert body["profile_engine"] in ("claude", "heuristic")


def test_onboarding_generates_deep_profile(client):
    r = client.post("/users", json={
        "name": "Nora", "email": "nora@example.com",
        "gender": "female", "seeking": "male",
        "lat": 40.42, "lng": -3.70, "city": "Madrid",
        "preferences": {
            "bio": "Amante del arte y los senderos.",
            "interests": ["arte", "senderismo"],
            "values": ["honestidad"],
            "ambitions": ["viajar"],
            "favorite_venues": ["Café Nube", "Museo del Prado"],
            "lifestyle": {"pets": True},
            "relationship_type": "algo serio",
            "availability": [{"day": "sat", "start": "10:00", "end": "14:00"}],
        },
    })
    assert r.status_code == 201
    uid = r.json()["id"]

    profile = client.get(f"/users/{uid}/profile").json()
    assert profile["personality_traits"]  # AI inferred traits
    assert profile["ai_summary"]
    assert profile["profile_source"] in ("claude", "heuristic")


def test_favorite_venues_capped_at_five(client):
    r = client.post("/users", json={
        "name": "Overshare", "email": "over@example.com", "gender": "male",
        "lat": 40.42, "lng": -3.70,
        "preferences": {"favorite_venues": ["a", "b", "c", "d", "e", "f"]},
    })
    assert r.status_code == 422


def test_compatibility_is_value_driven(client):
    people = _seeded(client)
    ana, bruno = people["Ana"], people["Bruno"]
    matches = client.post(f"/users/{ana['id']}/generate-matches").json()
    pair = next(m for m in matches if m["other_user_id"] == bruno["id"])
    assert pair["compatibility_score"] > 0.5
    assert pair["shared_values"]  # match explained by shared values
    assert "values" in pair["breakdown"]


def test_full_flow_gendered_acceptance_to_feedback(client):
    people = _seeded(client)
    ana, bruno = people["Ana"], people["Bruno"]  # Ana female, Bruno male

    matches = client.post(f"/users/{ana['id']}/generate-matches").json()
    pair = next(m for m in matches if m["other_user_id"] == bruno["id"])
    match_id = pair["match_id"]

    # Both show mutual interest -> proposal created, routed to the man.
    client.post(f"/matches/{match_id}/decision",
                json={"user_id": ana["id"], "accept": True})
    body = client.post(f"/matches/{match_id}/decision",
                       json={"user_id": bruno["id"], "accept": True}).json()
    assert body["status"] == "accepted"
    proposal = body["proposal"]
    assert proposal["status"] == "awaiting_proposer"
    assert proposal["proposer_id"] == bruno["id"]  # the man fields it first
    assert proposal["responder_id"] == ana["id"]
    assert proposal["venue_name"] and proposal["meeting_point"]
    assert len(proposal["candidate_slots"]) >= 1
    pid = proposal["id"]

    # The woman cannot jump the queue before the man picks options.
    early = client.post(f"/proposals/{pid}/respond",
                        json={"user_id": ana["id"], "action": "select",
                              "chosen_datetime": proposal["candidate_slots"][0]})
    assert early.status_code == 409

    # Step 2: the man accepts and picks 3 options.
    slots = proposal["candidate_slots"][:3]
    r = client.post(f"/proposals/{pid}/slots",
                    json={"user_id": bruno["id"], "accept": True, "slots": slots})
    out = r.json()
    assert out["status"] == "awaiting_responder"
    assert len(out["proposal"]["time_options"]) == len(slots)

    # Only the man may pick options.
    forbidden = client.post(f"/proposals/{pid}/slots",
                            json={"user_id": ana["id"], "accept": True, "slots": slots})
    assert forbidden.status_code == 409 or forbidden.status_code == 403

    # Step 3: the woman selects one of the offered options -> confirmed.
    chosen = out["proposal"]["time_options"][0]
    r = client.post(f"/proposals/{pid}/respond",
                    json={"user_id": ana["id"], "action": "select",
                          "chosen_datetime": chosen})
    out = r.json()
    assert out["confirmed"] is True
    assert out["proposal"]["selected_datetime"] is not None

    # Feedback feeds the metrics.
    client.post(f"/proposals/{pid}/feedback",
                json={"user_id": ana["id"], "attended": True, "wants_second_date": True})
    client.post(f"/proposals/{pid}/feedback",
                json={"user_id": bruno["id"], "attended": True, "wants_second_date": True})
    m = client.get("/metrics").json()
    assert m["confirmed_dates"] >= 1
    assert m["second_date_rate"] > 0


def test_counter_proposal_flow(client):
    people = _seeded(client)
    ana, bruno = people["Ana"], people["Bruno"]
    matches = client.post(f"/users/{ana['id']}/generate-matches").json()
    match_id = next(m["match_id"] for m in matches if m["other_user_id"] == bruno["id"])

    client.post(f"/matches/{match_id}/decision", json={"user_id": ana["id"], "accept": True})
    body = client.post(f"/matches/{match_id}/decision",
                       json={"user_id": bruno["id"], "accept": True}).json()
    pid = body["proposal"]["id"]
    slots = body["proposal"]["candidate_slots"][:3]
    client.post(f"/proposals/{pid}/slots",
                json={"user_id": bruno["id"], "accept": True, "slots": slots})

    # The woman counters with a time of her own.
    counter_time = body["proposal"]["candidate_slots"][-1]
    r = client.post(f"/proposals/{pid}/respond",
                    json={"user_id": ana["id"], "action": "counter",
                          "chosen_datetime": counter_time})
    assert r.json()["status"] == "counter_proposed"

    # The man accepts the counter -> confirmed at her time.
    r = client.post(f"/proposals/{pid}/counter",
                    json={"user_id": bruno["id"], "accept": True})
    out = r.json()
    assert out["confirmed"] is True
    assert out["proposal"]["selected_datetime"] is not None


def test_proposer_reject_generates_new_proposal(client):
    people = _seeded(client)
    ana, bruno = people["Ana"], people["Bruno"]
    matches = client.post(f"/users/{ana['id']}/generate-matches").json()
    match_id = next(m["match_id"] for m in matches if m["other_user_id"] == bruno["id"])

    client.post(f"/matches/{match_id}/decision", json={"user_id": ana["id"], "accept": True})
    body = client.post(f"/matches/{match_id}/decision",
                       json={"user_id": bruno["id"], "accept": True}).json()
    first = body["proposal"]

    r = client.post(f"/proposals/{first['id']}/slots",
                    json={"user_id": bruno["id"], "accept": False})
    out = r.json()
    assert out["status"] == "rejected"
    assert out["new_proposal"] is not None
    assert out["new_proposal"]["venue_name"] != first["venue_name"]
