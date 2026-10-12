from app.core.health import build_health_payload


def test_health_payload_is_stable():
    payload = build_health_payload("Shanghai Travel Agent", "test")
    assert payload == {
        "status": "ok",
        "app": "Shanghai Travel Agent",
        "version": "2.0.0",
        "env": "test",
    }
