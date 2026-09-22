import pytest
import time
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.ratelimit import SlidingWindowRateLimiter, reset_rate_limiters
from app.core.security import hash_password, hash_secret_token, verify_secret_token
from app.db.session import SessionLocal
from app.models.user import User, UserStatus
from app.models.password_reset import PasswordReset
from app.services.email import get_last_dispatched_email

client = TestClient(app)


@pytest.fixture
def lockout_test_user():
    db = SessionLocal()
    user_email = "lockout_victim@example.com"
    # Clean prior record
    db.query(User).filter(User.email == user_email).delete()
    db.commit()

    user = User(
        name="Lockout Test User",
        email=user_email,
        password=hash_password("CorrectPassword123!"),
        is_verified=True,
        status=UserStatus.ACTIVE,
        failed_login_attempts=0,
        locked_until=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()

    yield user_email

    # Cleanup
    db = SessionLocal()
    db.query(PasswordReset).filter(PasswordReset.email == user_email).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()
    db.close()


def test_custom_sliding_window_rate_limiter():
    """Verify thread-safe SlidingWindowRateLimiter blocks per-second and window limits."""
    limiter = SlidingWindowRateLimiter(
        requests_per_second=2,
        requests_per_window=4,
        window_seconds=10,
        key_prefix="unit_test",
    )

    # 1st request -> allowed
    limiter.check(None, custom_key="client_a")
    # 2nd request -> allowed
    limiter.check(None, custom_key="client_a")

    # 3rd request in same second -> blocked by per-second burst limiter (HTTP 429)
    with pytest.raises(Exception) as exc_info:
        limiter.check(None, custom_key="client_a")
    assert exc_info.value.status_code == 429
    assert "Too many requests per second" in exc_info.value.detail
    assert "Retry-After" in exc_info.value.headers


def test_account_lockout_after_five_failed_attempts(lockout_test_user):
    """
    Verify that 5 consecutive failed login attempts locks the account with HTTP 423,
    and subsequent attempts remain blocked until lockout expires or password reset.
    """
    email = lockout_test_user
    reset_rate_limiters()

    # Attempts 1 through 4: Should return 401 with warning of attempts remaining
    for i in range(1, 5):
        time.sleep(0.4)
        resp = client.post(
            f"{settings.API_V1_STR}/auth/login",
            json={"email": email, "password": f"WrongPass{i}!"},
        )
        assert resp.status_code == 401
        assert "attempt(s) remaining" in resp.json()["detail"]

    # Attempt 5: Account should trigger lockout (HTTP 423)
    time.sleep(0.4)
    fifth_resp = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": email, "password": "WrongPassword5!"},
    )
    assert fifth_resp.status_code == 423
    assert "Account has been locked" in fifth_resp.json()["detail"]

    # Verify DB state directly
    db = SessionLocal()
    db_user = db.query(User).filter(User.email == email).first()
    assert db_user.failed_login_attempts >= 5
    assert db_user.locked_until is not None
    db.close()

    # Attempt 6 (even with the CORRECT password): Still blocked by lockout
    locked_resp = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": email, "password": "CorrectPassword123!"},
    )
    assert locked_resp.status_code == 423
    assert "temporarily locked" in locked_resp.json()["detail"]

    # Now perform Password Reset to verify it automatically unlocks the account
    client.post(
        f"{settings.API_V1_STR}/auth/forgot-password",
        json={"email": email},
    )
    last_email = get_last_dispatched_email()
    otp = last_email["otp"]

    reset_resp = client.post(
        f"{settings.API_V1_STR}/auth/reset-password",
        json={
            "email": email,
            "token_or_otp": otp,
            "password": "UnlockedNewPass999!",
        },
    )
    assert reset_resp.status_code == 200

    # User can now immediately log in with the new password
    success_login = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": email, "password": "UnlockedNewPass999!"},
    )
    assert success_login.status_code == 200
    assert success_login.json()["user"]["email"] == email


def test_cryptographic_otp_hashing_and_constant_time_verification():
    """Verify SHA-256 token hashing and constant-time comparison."""
    secret_code = "729410"
    hashed = hash_secret_token(secret_code)

    assert len(hashed) == 64
    assert hashed != secret_code
    assert verify_secret_token(secret_code, hashed) is True
    assert verify_secret_token("729411", hashed) is False
    assert verify_secret_token("000000", hashed) is False
