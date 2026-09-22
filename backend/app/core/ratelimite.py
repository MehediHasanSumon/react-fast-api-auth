"""
Alias module for ratelimit.py
Supports both app.core.ratelimit and app.core.ratelimite imports seamlessly.
"""
from app.core.ratelimit import (
    SlidingWindowRateLimiter,
    login_limiter,
    forgot_password_limiter,
    verify_otp_limiter,
    reset_password_limiter,
)

__all__ = [
    "SlidingWindowRateLimiter",
    "login_limiter",
    "forgot_password_limiter",
    "verify_otp_limiter",
    "reset_password_limiter",
]
