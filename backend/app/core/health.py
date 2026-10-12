"""Small, dependency-free helpers for health responses."""


def build_health_payload(app_name: str, environment: str) -> dict[str, str]:
    return {
        "status": "ok",
        "app": app_name,
        "version": "2.0.0",
        "env": environment,
    }
