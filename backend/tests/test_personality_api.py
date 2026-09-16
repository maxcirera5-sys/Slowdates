"""End-to-end API tests for the personality test + compatibility endpoints."""


def _seeded_user_ids(client):
    users = client.get("/users").json()
    return users[0]["id"], users[1]["id"]


def _build_responses(questions, *, overrides=None):
    """Build a full answer set from the question catalogue.

    overrides maps a trait -> value (str for single, list for multi/ranking, int for likert).
    Attachment likert defaults to 1 (low -> secure); other likert default to 5.
    """
    overrides = overrides or {}
    out = []
    for q in questions:
        trait = q["trait"]
        if trait in overrides:
            out.append({"question_id": q["id"], "raw_value": overrides[trait]})
            continue
        if q["qtype"] == "likert":
            value = 1 if trait.startswith("attachment") else 5
            out.append({"question_id": q["id"], "raw_value": value})
        elif q["qtype"] == "multi_choice":
            out.append({"question_id": q["id"], "raw_value": [q["options"][0]["value"]]})
        elif q["qtype"] == "ranking":
            vals = [o["value"] for o in q["options"][:2]]
            out.append({"question_id": q["id"], "raw_value": vals})
        else:  # single_choice
            out.append({"question_id": q["id"], "raw_value": q["options"][0]["value"]})
    return out


def test_get_questions_returns_32_ordered_by_block(client):
    r = client.get("/test/questions")
    assert r.status_code == 200
    qs = r.json()
    assert len(qs) == 32
    blocks = [q["block"] for q in qs]
    assert blocks == sorted(blocks)  # ordered by block
    assert {q["block"] for q in qs} == {1, 2, 3, 4}
    # hard filters flagged in block 3
    hard = [q for q in qs if q["is_hard_filter"]]
    assert {q["trait"] for q in hard} == {"relationship_intent", "children"}


def test_submit_responses_builds_profile(client):
    uid, _ = _seeded_user_ids(client)
    questions = client.get("/test/questions").json()
    payload = {"user_id": uid, "responses": _build_responses(questions)}
    r = client.post("/test/responses", json=payload)
    assert r.status_code == 201
    profile = r.json()
    assert profile["user_id"] == uid
    # block1 non-reverse answered 5 -> high; reverse items pull the trait down.
    for trait in ("openness", "conscientiousness", "extraversion", "agreeableness", "emotional_stability"):
        assert 0.0 <= profile[trait] <= 1.0
    # attachment answered 1 -> low
    assert profile["attachment_anxiety"] < 0.5
    assert profile["relationship_intent"] is not None


def test_identical_users_are_highly_compatible(client):
    a, b = _seeded_user_ids(client)
    questions = client.get("/test/questions").json()
    resp = _build_responses(questions)
    client.post("/test/responses", json={"user_id": a, "responses": resp})
    client.post("/test/responses", json={"user_id": b, "responses": resp})

    r = client.get(f"/compatibility/{a}/{b}")
    assert r.status_code == 200
    body = r.json()
    assert body["eligible"] is True
    assert body["score"] >= 90
    assert body["breakdown"]["attachment_style_a"] == "secure"


def test_hard_filter_children_blocks_match(client):
    a, b = _seeded_user_ids(client)
    questions = client.get("/test/questions").json()
    client.post("/test/responses", json={
        "user_id": a,
        "responses": _build_responses(questions, overrides={"children": "no_quiero"}),
    })
    client.post("/test/responses", json={
        "user_id": b,
        "responses": _build_responses(questions, overrides={"children": "quiero_futuro"}),
    })
    body = client.get(f"/compatibility/{a}/{b}").json()
    assert body["eligible"] is False
    assert body["score"] is None
    assert "children" in body["failed_on"]


def test_compatibility_requires_completed_test(client):
    a, b = _seeded_user_ids(client)
    # neither has responses yet
    assert client.get(f"/compatibility/{a}/{b}").status_code == 404
