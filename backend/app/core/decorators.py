import functools
import inspect
from contextvars import ContextVar
from typing import Any, Callable, List, Optional, Union
from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session as OrmSession

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import User, UserStatus


# Request-scoped ContextVar to hold the currently authenticated User
_current_user_ctx: ContextVar[Optional[User]] = ContextVar("current_user", default=None)


def current_user() -> Optional[User]:
    """
    Retrieve the authenticated user from the current request context.
    Available anywhere inside any endpoint or function called during
    an endpoint decorated with @require_auth.
    
    Usage:
        @router.get("/my-records")
        @require_auth
        def get_records():
            user = current_user()
            ...
    """
    return _current_user_ctx.get()


def _find_request(args: tuple, kwargs: dict) -> Optional[Request]:
    """Find FastAPI Request instance from positional args or kwargs."""
    for arg in args:
        if isinstance(arg, Request):
            return arg
    for val in kwargs.values():
        if isinstance(val, Request):
            return val
    return None


def _prepare_call_args(sig: inspect.Signature, args: tuple, kwargs: dict) -> tuple[tuple, dict]:
    """
    Filter args and kwargs so they only pass what the wrapped handler accepts.
    If the function accepts **kwargs, pass all kwargs.
    """
    has_var_keyword = any(p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values())
    if has_var_keyword:
        return args, kwargs

    filtered_kwargs = {k: v for k, v in kwargs.items() if k in sig.parameters}
    num_positional = sum(
        1
        for p in sig.parameters.values()
        if p.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)
    )
    filtered_args = args[:num_positional]
    return filtered_args, filtered_kwargs


def require_auth(
    _func: Optional[Callable] = None,
    *,
    roles: Optional[List[str]] = None,
    permissions: Optional[List[str]] = None,
):
    """
    Decorator for FastAPI endpoint handlers to enforce authentication and authorization.
    Supports role and permission checks.
    """
    def decorator(func: Callable) -> Callable:
        sig = inspect.signature(func)
        params = list(sig.parameters.values())

        # If func does not accept request, add request to the wrapper's signature
        has_request = any(p.name == "request" or p.annotation is Request for p in params)
        if not has_request:
            new_params = [
                inspect.Parameter(
                    "request",
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    annotation=Request,
                )
            ] + params
        else:
            new_params = params

        wrapper_sig = sig.replace(parameters=new_params)
        is_coroutine = inspect.iscoroutinefunction(func)

        def _authorize_user(user: User) -> None:
            from app.api.deps import ENABLE_PERMISSION_ENFORCEMENT
            if not ENABLE_PERMISSION_ENFORCEMENT:
                return

            user_roles = [r.lower() for r in user.get_role_names()]
            # Super Admin bypasses all restrictions
            if "super admin" in user_roles or "admin" in user_roles:
                return

            if roles:
                user_role_str = getattr(user, "role", "")
                if user_role_str not in roles and not any(r in roles for r in user.get_role_names()):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have permission to access this resource.",
                    )

            if permissions:
                user_perms = user.get_all_permissions()
                if not any(p in user_perms for p in permissions):
                    perms_str = ", ".join(f"'{p}'" for p in permissions)
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied: Missing required permission ({perms_str}).",
                    )

        if is_coroutine:
            @functools.wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                request = _find_request(args, kwargs)
                if not request:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Request object could not be resolved for @require_auth decorator",
                    )

                user = _authenticate_request(request)
                _authorize_user(user)

                request.state.user = user
                token = _current_user_ctx.set(user)
                try:
                    c_args, c_kwargs = _prepare_call_args(sig, args, kwargs)
                    result = await func(*c_args, **c_kwargs)
                    if result is None:
                        return user
                    return result
                finally:
                    _current_user_ctx.reset(token)

            async_wrapper.__signature__ = wrapper_sig
            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                request = _find_request(args, kwargs)
                if not request:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Request object could not be resolved for @require_auth decorator",
                    )

                user = _authenticate_request(request)
                _authorize_user(user)

                request.state.user = user
                token = _current_user_ctx.set(user)
                try:
                    c_args, c_kwargs = _prepare_call_args(sig, args, kwargs)
                    result = func(*c_args, **c_kwargs)
                    if result is None:
                        return user
                    return result
                finally:
                    _current_user_ctx.reset(token)

            sync_wrapper.__signature__ = wrapper_sig
            return sync_wrapper

    if _func is None:
        return decorator
    else:
        return decorator(_func)


def require_permission(*permission_names: str):
    """
    Convenience decorator for FastAPI endpoint handlers to enforce specific permissions.
    Usage:
        @router.post("/roles")
        @require_permission("roles.create")
        def create_role(...):
            ...
    """
    return require_auth(permissions=list(permission_names))


def _authenticate_request(request: Request) -> User:
    """Validate HttpOnly cookie or Authorization Bearer header and return User."""
    # 1. Check HttpOnly cookie
    token = request.cookies.get(settings.COOKIE_NAME_ACCESS)

    # 2. Check Authorization Bearer header fallback
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            parts = auth_header.split(" ", 1)
            if len(parts) == 2 and parts[1].strip():
                token = parts[1].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Decode JWT
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Verify user in database
    db: OrmSession = SessionLocal()
    try:
        user = db.query(User).filter(User.id == str(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or removed.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if user.status == UserStatus.BANED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been banned. Please contact administration.",
            )
        if user.status == UserStatus.BLOCKED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account is temporarily blocked for security reasons.",
            )
        if user.status == UserStatus.DEACTIVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated.",
            )

        return user
    finally:
        db.close()
