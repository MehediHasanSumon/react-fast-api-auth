# ==============================================================================
# Hospital Management System - Backend Production Dockerfile
# Base Image: Official Python 3.12 Slim
# ==============================================================================

FROM python:3.12-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Set working directory
WORKDIR /app

# Install system runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install build dependencies, compile wheels, and cleanup
FROM base as builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Final runtime image
FROM base as runner

# Create non-root system user for security
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash -m appuser

# Copy installed python packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy backend codebase
COPY . /app

# Set permissions
RUN mkdir -p /app/uploads/avatars && \
    chmod +x /app/entrypoint.sh && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose FastAPI application port
EXPOSE 8000

# Entrypoint runs migrations before starting uvicorn
ENTRYPOINT ["/app/entrypoint.sh"]

# Default launch command with reverse proxy headers enabled
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
