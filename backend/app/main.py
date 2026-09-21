from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Trust forwarded headers from reverse proxies (X-Forwarded-Proto, X-Forwarded-For, X-Forwarded-Host)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

import os
from fastapi.staticfiles import StaticFiles

# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount uploads directory for static user avatar serving
upload_dir_path = settings.uploads_path
os.makedirs(os.path.join(upload_dir_path, "avatars"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir_path), name="uploads")


@app.get("/", tags=["Root"])
def root():
    """
    Root entry point providing API overview and documentation links.
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "api_v1": settings.API_V1_STR,
    }
