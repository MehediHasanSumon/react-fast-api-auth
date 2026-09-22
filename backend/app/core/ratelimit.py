import time
import threading
from collections import defaultdict, deque
from typing import Optional, Callable
from fastapi import Request, HTTPException, status
from app.core.config import settings


class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding-window rate limiter.
    Supports both per-second burst limiting and longer window limiting (e.g., per minute).
    """

    def __init__(
        self,
        requests_per_second: Optional[int] = None,
        requests_per_window: int = 60,
        window_seconds: int = 60,
        key_prefix: str = "default",
        key_func: Optional[Callable[[Request], str]] = None,
    ):
        self.requests_per_second = requests_per_second
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix
        self.key_func = key_func or self._default_client_key

        # Storage: key -> deque of timestamps
        self._second_windows = defaultdict(deque)
        self._window_records = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_cleanup = time.time()

    @staticmethod
    def _default_client_key(request: Request) -> str:
        """
        Extract client IP address, respecting X-Forwarded-For if behind a proxy.
        """
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
            if client_ip:
                return client_ip
        if request.client and request.client.host:
            return request.client.host
        return "127.0.0.1"

    def _cleanup_expired(self, now: float) -> None:
        """
        Periodically remove stale client keys from memory every 5 minutes.
        """
        if now - self._last_cleanup < 300:
            return

        self._last_cleanup = now
        stale_cutoff = now - max(self.window_seconds, 60)

        keys_to_remove = []
        for key, dq in list(self._window_records.items()):
            while dq and dq[0] < stale_cutoff:
                dq.popleft()
            if not dq:
                keys_to_remove.append(key)

        for key in keys_to_remove:
            self._window_records.pop(key, None)
            self._second_windows.pop(key, None)

    def check(self, request: Request, custom_key: Optional[str] = None) -> None:
        """
        Check if request is permitted. If exceeded, raises HTTP 429 Too Many Requests.
        """
        if not settings.RATE_LIMIT_ENABLED:
            return

        now = time.time()
        client_key = custom_key or self.key_func(request)
        composite_key = f"{self.key_prefix}:{client_key}"

        with self._lock:
            self._cleanup_expired(now)

            # 1. Per-Second Burst Limiting (if configured)
            if self.requests_per_second is not None and self.requests_per_second > 0:
                second_dq = self._second_windows[composite_key]
                second_cutoff = now - 1.0
                while second_dq and second_dq[0] < second_cutoff:
                    second_dq.popleft()

                if len(second_dq) >= self.requests_per_second:
                    retry_after = max(1, int(1.0 - (now - second_dq[0])))
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many requests per second. Please slow down and try again in {retry_after} second(s).",
                        headers={
                            "Retry-After": str(retry_after),
                            "X-RateLimit-Limit-Second": str(self.requests_per_second),
                            "X-RateLimit-Remaining-Second": "0",
                        },
                    )

            # 2. Window-Based Limiting (e.g. 1 minute or 15 minutes)
            window_dq = self._window_records[composite_key]
            window_cutoff = now - self.window_seconds
            while window_dq and window_dq[0] < window_cutoff:
                window_dq.popleft()

            if len(window_dq) >= self.requests_per_window:
                oldest = window_dq[0]
                retry_after = max(1, int(self.window_seconds - (now - oldest)))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Please wait {retry_after} second(s) before trying again.",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(self.requests_per_window),
                        "X-RateLimit-Remaining": "0",
                    },
                )

            # Record current timestamp
            if self.requests_per_second is not None:
                self._second_windows[composite_key].append(now)
            window_dq.append(now)

    def reset(self) -> None:
        """Reset all recorded windows in this limiter."""
        with self._lock:
            self._second_windows.clear()
            self._window_records.clear()

    def __call__(self, request: Request) -> None:
        """FastAPI Dependency interface"""
        self.check(request)


# -----------------------------------------------------------------------------
# Pre-configured Rate Limiters for Authentication & Critical Endpoints
# -----------------------------------------------------------------------------

# 1. Login Rate Limiter: Max 3 requests/sec burst, max 10 attempts/minute
login_limiter = SlidingWindowRateLimiter(
    requests_per_second=settings.RATE_LIMIT_AUTH_PER_SECOND,
    requests_per_window=settings.RATE_LIMIT_LOGIN_PER_MINUTE,
    window_seconds=60,
    key_prefix="auth:login",
)

# 2. Forgot Password Rate Limiter: Max 1 request/sec burst, max 3 requests/minute
forgot_password_limiter = SlidingWindowRateLimiter(
    requests_per_second=1,
    requests_per_window=settings.RATE_LIMIT_OTP_PER_MINUTE,
    window_seconds=60,
    key_prefix="auth:forgot_password",
)

# 3. OTP Verification Rate Limiter: Max 2 requests/sec burst, max 5 attempts/minute
verify_otp_limiter = SlidingWindowRateLimiter(
    requests_per_second=settings.RATE_LIMIT_AUTH_PER_SECOND,
    requests_per_window=settings.RATE_LIMIT_OTP_VERIFY_PER_MINUTE,
    window_seconds=60,
    key_prefix="auth:verify_otp",
)

# 4. Reset Password Rate Limiter: Max 2 requests/sec burst, max 5 attempts/minute
reset_password_limiter = SlidingWindowRateLimiter(
    requests_per_second=settings.RATE_LIMIT_AUTH_PER_SECOND,
    requests_per_window=settings.RATE_LIMIT_OTP_VERIFY_PER_MINUTE,
    window_seconds=60,
    key_prefix="auth:reset_password",
)


def reset_rate_limiters() -> None:
    """Reset all active rate limiters (useful for test fixtures to start fresh)."""
    login_limiter.reset()
    forgot_password_limiter.reset()
    verify_otp_limiter.reset()
    reset_password_limiter.reset()

