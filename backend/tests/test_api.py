import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.security import create_access_token


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_check(client: TestClient):
    """Verify health endpoint responds with healthy status."""
    response = client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == settings.VERSION
    assert "timestamp" in data


def test_auth_me_unauthenticated(client: TestClient):
    """Verify unauthenticated access to /me returns 401."""
    response = client.get(f"{settings.API_V1_STR}/auth/me")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_auth_sessions_unauthenticated(client: TestClient):
    """Verify unauthenticated access to /sessions returns 401."""
    response = client.get(f"{settings.API_V1_STR}/auth/sessions")
    assert response.status_code == 401




def test_auth_me_with_cookie(client: TestClient):
    """Verify authenticated access to /me returns user profile using zero-param decorator."""
    from app.db.session import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    try:
        user = db.query(User).first()
        if user:
            token = create_access_token(subject=user.id)
            client.cookies.set(settings.COOKIE_NAME_ACCESS, token)
            response = client.get(f"{settings.API_V1_STR}/auth/me")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == str(user.id)
            assert data["email"] == user.email
            # Clear cookie after test
            client.cookies.clear()
    finally:
        db.close()


def test_users_list_and_filter(client: TestClient):
    """Verify users endpoint returns paginated users and respects filtering."""
    response = client.get(f"{settings.API_V1_STR}/users?page=1&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1
    assert data["limit"] == 5
    assert len(data["users"]) <= 5


def test_users_create_and_status_update(client: TestClient):
    """Verify admin can create a user and update their status."""
    import uuid
    import random
    unique_suffix = uuid.uuid4().hex[:6]
    test_email = f"test_{unique_suffix}@example.com"
    test_phone = f"01711{random.randint(100000, 999999)}"
    payload = {
        "name": "Automated Test User",
        "email": test_email,
        "password": "Password123!",
        "role": "Manager",
        "department": "Operations",
        "mobile_number": test_phone,
        "status": "active",
    }
    create_res = client.post(f"{settings.API_V1_STR}/users/", json=payload)
    assert create_res.status_code == 201
    user_data = create_res.json()
    user_id = user_data["id"]
    assert user_data["email"] == test_email
    assert user_data["role"] == "Manager"
    assert user_data["department"] == "Operations"
    assert user_data["status"] == "active"

    # Update status to deactived
    update_res = client.patch(
        f"{settings.API_V1_STR}/users/{user_id}/status",
        json={"status": "deactived"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "deactived"

    # Update user details (name, phone) via PUT
    put_res = client.put(
        f"{settings.API_V1_STR}/users/{user_id}",
        json={"name": "Updated User Name", "is_verified": False},
    )
    assert put_res.status_code == 200
    assert put_res.json()["name"] == "Updated User Name"
    assert put_res.json()["is_verified"] is False

    # Clean up created user
    delete_res = client.delete(f"{settings.API_V1_STR}/users/{user_id}")
    assert delete_res.status_code == 200


def test_users_server_side_validation_errors(client: TestClient):
    """Verify server-side validation rejects invalid payloads with 422 and field details."""
    invalid_payload = {
        "name": "A",  # Too short (< 2 chars)
        "email": "not-an-email",  # Invalid email format
        "password": "123",  # Too short (< 6 chars)
        "mobile_number": "invalid-chars!",  # Fails phone regex pattern
    }
    res = client.post(f"{settings.API_V1_STR}/users/", json=invalid_payload)
    assert res.status_code == 422
    data = res.json()
    assert "detail" in data
    # Verify field-level error locations
    field_errors = {
        item["loc"][-1]: item["msg"] for item in data["detail"] if "loc" in item
    }
    assert "name" in field_errors
    assert "email" in field_errors
    assert "password" in field_errors
    assert "mobile_number" in field_errors

def test_users_trailing_slash_no_redirect(client: TestClient):
    """
    Verify that GET requests without trailing slash return 200 directly
    without issuing a 307 redirect that causes HTTPS Mixed Content errors in production.
    """
    # Test /users without trailing slash
    res_users_no_slash = client.get(f"{settings.API_V1_STR}/users?page=1&limit=10", follow_redirects=False)
    assert res_users_no_slash.status_code == 200

    # Test /users/ with trailing slash
    res_users_slash = client.get(f"{settings.API_V1_STR}/users/?page=1&limit=10", follow_redirects=False)
    assert res_users_slash.status_code == 200
