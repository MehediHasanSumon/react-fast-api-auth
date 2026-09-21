import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User, UserStatus
from app.models.password_reset import PasswordReset

client = TestClient(app)


@pytest.fixture
def test_user():
    db = SessionLocal()
    # Clean up prior test users
    db.query(User).filter(User.email.in_(["auth_test@example.com", "updated_test@example.com"])).delete(synchronize_session=False)
    db.commit()

    user = User(
        name="Auth Test User",
        email="auth_test@example.com",
        mobile_number="+1-555-9876",
        password=hash_password("SecretPassword123!"),
        status=UserStatus.ACTIVE,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()

    yield user_id

    db = SessionLocal()
    db.query(PasswordReset).filter(PasswordReset.email == "auth_test@example.com").delete(synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
    db.commit()
    db.close()


def test_login_with_email(test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "auth_test@example.com", "password": "SecretPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Signed in successfully."
    assert data["user"]["email"] == "auth_test@example.com"
    assert "access_token" in data


def test_login_with_mobile_number(test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "+1-555-9876", "password": "SecretPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Signed in successfully."
    assert data["user"]["email"] == "auth_test@example.com"


def test_forgot_and_reset_password_with_otp(test_user):
    # 1. Request forgot password
    resp = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "auth_test@example.com"},
    )
    assert resp.status_code == 200

    # 2. Retrieve OTP from DB
    db = SessionLocal()
    record = (
        db.query(PasswordReset)
        .filter(PasswordReset.email == "auth_test@example.com", PasswordReset.is_used == False)
        .first()
    )
    assert record is not None
    assert len(record.otp) == 6
    otp = record.otp
    db.close()

    # 3. Verify OTP
    verify_resp = client.post(
        "/api/v1/auth/verify-reset-token",
        json={"email": "auth_test@example.com", "token_or_otp": otp},
    )
    assert verify_resp.status_code == 200

    # 4. Reset password using OTP
    reset_resp = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": "auth_test@example.com",
            "token_or_otp": otp,
            "password": "NewSecretPassword456!",
        },
    )
    assert reset_resp.status_code == 200
    assert "access_token" in reset_resp.json()
    assert reset_resp.json()["user"]["email"] == "auth_test@example.com"

    # 5. Verify old password fails
    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": "auth_test@example.com", "password": "SecretPassword123!"},
    )
    assert old_login.status_code == 401

    # 6. Verify new password succeeds
    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": "auth_test@example.com", "password": "NewSecretPassword456!"},
    )
    assert new_login.status_code == 200


def test_reset_password_with_token(test_user):
    # Request forgot password
    client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "auth_test@example.com"},
    )

    db = SessionLocal()
    record = (
        db.query(PasswordReset)
        .filter(PasswordReset.email == "auth_test@example.com", PasswordReset.is_used == False)
        .first()
    )
    assert record is not None
    token = record.token
    db.close()

    # Reset with token
    reset_resp = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": "auth_test@example.com",
            "token_or_otp": token,
            "password": "TokenResetPassword789!",
        },
    )
    assert reset_resp.status_code == 200
    assert "access_token" in reset_resp.json()

    # Verify login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "auth_test@example.com", "password": "TokenResetPassword789!"},
    )
    assert login_resp.status_code == 200


def test_change_password_and_update_profile(test_user):
    # Login to get access token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "auth_test@example.com", "password": "SecretPassword123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update profile
    prof_resp = client.put(
        "/api/v1/auth/profile",
        json={"name": "Updated Test User", "mobile_number": "+1-555-4321"},
        headers=headers,
    )
    assert prof_resp.status_code == 200
    assert prof_resp.json()["name"] == "Updated Test User"
    assert prof_resp.json()["mobile_number"] == "+1-555-4321"

    # Change password
    change_resp = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "SecretPassword123!",
            "new_password": "BrandNewPassword999!",
            "confirm_new_password": "BrandNewPassword999!",
        },
        headers=headers,
    )
    assert change_resp.status_code == 200


def test_avatar_upload_with_pillow(test_user):
    # Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "auth_test@example.com", "password": "SecretPassword123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate a small in-memory test image
    img = Image.new("RGB", (200, 100), color=(73, 109, 137))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    # Upload avatar
    files = {"file": ("test_avatar.png", img_byte_arr, "image/png")}
    upload_resp = client.post("/api/v1/auth/avatar", files=files, headers=headers)
    assert upload_resp.status_code == 200
    data = upload_resp.json()
    assert "avatar_url" in data
    assert data["avatar_url"].startswith("/uploads/avatars/")
    assert data["avatar_url"].endswith(".webp")

    # Verify static file serving
    avatar_static_resp = client.get(data["avatar_url"])
    assert avatar_static_resp.status_code == 200
    # Verify image dimensions are 400x400
    saved_img = Image.open(io.BytesIO(avatar_static_resp.content))
    assert saved_img.size == (400, 400)
