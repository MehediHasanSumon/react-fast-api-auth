#!/usr/bin/env bash
# ==============================================================================
# Access & User Management System - Automated Production Deployment Script
# ==============================================================================
set -e

# Terminal Colors
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
BLUE="\033[1;34m"
RESET="\033[0m"

echo -e "${BLUE}====================================================================${RESET}"
echo -e "${GREEN}  Access & User Management System - Production Deployment Runner     ${RESET}"
echo -e "${BLUE}====================================================================${RESET}"

# Working directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 1. Check environment file
echo -e "\n${YELLOW}[1/6] Verifying environment configuration (.env)...${RESET}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${RED}[ERROR] .env file not found in $PROJECT_DIR!${RESET}"
    echo -e "Please create .env by copying .env.example:"
    echo -e "  cp .env.example .env"
    exit 1
fi
echo -e "${GREEN}✓ .env configuration verified.${RESET}"

# 2. Pull latest git changes if in a git repository
if [ -d "$PROJECT_DIR/.git" ]; then
    echo -e "\n${YELLOW}[2/6] Pulling latest code changes from origin/main...${RESET}"
    git fetch origin main
    git reset --hard origin/main
    echo -e "${GREEN}✓ Codebase updated to latest commit $(git rev-parse --short HEAD).${RESET}"
else
    echo -e "\n${YELLOW}[2/6] Skipping git pull (not a git clone directory).${RESET}"
fi

# 3. Build Docker images
echo -e "\n${YELLOW}[3/6] Building production Docker images...${RESET}"
docker compose -f docker-compose.prod.yml build --pull
echo -e "${GREEN}✓ Docker images built successfully.${RESET}"

# 4. Start database and wait for health
echo -e "\n${YELLOW}[4/6] Ensuring PostgreSQL database is up...${RESET}"
docker compose -f docker-compose.prod.yml up -d postgres
echo -e "${GREEN}✓ PostgreSQL container started.${RESET}"

# 5. Launch all services
echo -e "\n${YELLOW}[5/6] Deploying application containers with zero-downtime rolling update...${RESET}"
docker compose -f docker-compose.prod.yml up -d --remove-orphans
echo -e "${GREEN}✓ Containers deployed.${RESET}"

# 6. Verify health
echo -e "\n${YELLOW}[6/6] Verifying application health...${RESET}"
MAX_RETRIES=20
RETRY_COUNT=0
HEALTHY=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if curl -s -f http://127.0.0.1:8080/nginx-health &>/dev/null || curl -s -f http://localhost/nginx-health &>/dev/null; then
        HEALTHY=1
        break
    fi
    echo -e "Waiting for services to become healthy (attempt $RETRY_COUNT/$MAX_RETRIES)..."
    sleep 3
done

if [ $HEALTHY -eq 1 ]; then
    echo -e "${GREEN}✓ Deployment successful! Application is live and healthy.${RESET}"
else
    echo -e "${RED}[WARNING] Health check timed out. Please inspect logs: docker compose -f docker-compose.prod.yml logs${RESET}"
    exit 1
fi

# 7. Cleanup dangling docker images to reclaim disk space
echo -e "\n${YELLOW}Cleaning up unused Docker images...${RESET}"
docker image prune -f || true

echo -e "\n${BLUE}====================================================================${RESET}"
echo -e "${GREEN}🎉 Deployment completed successfully!${RESET}"
echo -e "${BLUE}====================================================================${RESET}"
