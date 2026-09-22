from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, roles, permissions

api_router = APIRouter()

# Authentication & Session router
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Users router
api_router.include_router(users.router, prefix="/users", tags=["Users"])

# Roles router
api_router.include_router(roles.router, prefix="/roles", tags=["Roles"])

# Permissions router
api_router.include_router(permissions.router, prefix="/permissions", tags=["Permissions"])

