#!/usr/bin/env bash

# ==============================================================================
# Hospital Management System - Full Stack Development Server Runner
# Launches FastAPI (Backend) and Vite + React (Frontend) concurrently
# ==============================================================================

# Terminal Colors & Styling
BOLD="\033[1m"
RESET="\033[0m"
BLUE="\033[1;34m"
CYAN="\033[1;36m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
GRAY="\033[0;90m"

# Absolute project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Banner
echo -e "${BLUE}${BOLD}====================================================================${RESET}"
echo -e "${GREEN}${BOLD}     🏥 Hospital Management System - Full Stack Server Runner       ${RESET}"
echo -e "${BLUE}${BOLD}====================================================================${RESET}"

# Flag to kill existing processes if requested: ./run.sh -k or ./run.sh --kill
AUTO_KILL_EXISTING=0
if [[ "$1" == "-k" || "$1" == "--kill" || "$1" == "-f" || "$1" == "--force" ]]; then
    AUTO_KILL_EXISTING=1
fi

# 1. Check prerequisites
echo -e "\n${YELLOW}${BOLD}[1/4] Checking prerequisites...${RESET}"

if ! command -v python3 &>/dev/null; then
    echo -e "${RED}[ERROR] python3 is required but was not found in PATH.${RESET}"
    exit 1
fi

if ! command -v npm &>/dev/null; then
    echo -e "${RED}[ERROR] npm is required but was not found in PATH.${RESET}"
    exit 1
fi

# 2. Check Backend Virtual Environment
echo -e "${YELLOW}${BOLD}[2/4] Checking Python Virtual Environment (venv)...${RESET}"
if [ ! -d "$BACKEND_DIR/venv" ] || [ ! -f "$BACKEND_DIR/venv/bin/uvicorn" ]; then
    echo -e "${YELLOW}Virtual environment not found or incomplete. Creating backend/venv...${RESET}"
    python3 -m venv "$BACKEND_DIR/venv"
    echo -e "${YELLOW}Installing backend requirements...${RESET}"
    "$BACKEND_DIR/venv/bin/pip" install --upgrade pip
    "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
    echo -e "${GREEN}✓ Backend dependencies installed successfully.${RESET}"
else
    echo -e "${GREEN}✓ Backend virtual environment is ready.${RESET}"
fi

# 3. Check Frontend node_modules
echo -e "${YELLOW}${BOLD}[3/4] Checking Frontend dependencies (node_modules)...${RESET}"
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}node_modules not found in frontend. Installing dependencies...${RESET}"
    (cd "$FRONTEND_DIR" && npm install)
    echo -e "${GREEN}✓ Frontend dependencies installed successfully.${RESET}"
else
    echo -e "${GREEN}✓ Frontend dependencies are ready.${RESET}"
fi

# 4. Check Ports Availability
echo -e "${YELLOW}${BOLD}[4/4] Checking port availability (8000 & 5173)...${RESET}"

free_or_check_port() {
    local port=$1
    local name=$2
    if command -v lsof &>/dev/null; then
        local pids
        pids=$(lsof -Pi :"$port" -sTCP:LISTEN -t 2>/dev/null)
        if [ -n "$pids" ]; then
            if [ "$AUTO_KILL_EXISTING" -eq 1 ]; then
                echo -e "${YELLOW}Freeing port $port (killing PID(s): $pids)...${RESET}"
                echo "$pids" | xargs -r kill -9 2>/dev/null || true
                sleep 0.5
            else
                echo -e "${RED}[ERROR] Port $port ($name) is already in use by PID(s): $pids.${RESET}"
                echo -e "Tip: Run ${BOLD}./run.sh --kill${RESET} to automatically free occupied ports."
                exit 1
            fi
        fi
    fi
}

free_or_check_port 8000 "FastAPI Backend"
free_or_check_port 5173 "React Frontend"

echo -e "${GREEN}✓ Ports 8000 and 5173 are available.${RESET}"

# Display service connection info
echo -e "\n${BLUE}${BOLD}====================================================================${RESET}"
echo -e "${BOLD}🚀 Launching servers:${RESET}"
echo -e "   • ${CYAN}React Frontend:${RESET}  ${BOLD}http://localhost:5173${RESET}"
echo -e "   • ${BLUE}FastAPI Backend:${RESET} ${BOLD}http://localhost:8000${RESET}"
echo -e "   • ${BLUE}Swagger Docs:${RESET}    ${BOLD}http://localhost:8000/docs${RESET}"
echo -e "   • ${BLUE}ReDoc:${RESET}           ${BOLD}http://localhost:8000/redoc${RESET}"
echo -e "   • ${BLUE}Health Check:${RESET}    ${BOLD}http://localhost:8000/api/v1/health${RESET}"
echo -e "   • ${GRAY}Press Ctrl+C anytime to stop both servers safely.${RESET}"
echo -e "${BLUE}${BOLD}====================================================================${RESET}\n"

# Variable references for child processes
BACKEND_PID=""
FRONTEND_PID=""

# Graceful Shutdown Handler
cleanup() {
    trap - SIGINT SIGTERM EXIT
    echo ""
    echo -e "${YELLOW}${BOLD}[SHUTDOWN]${RESET} Stopping all servers (FastAPI & React)..."
    
    if [ -n "$BACKEND_PID" ]; then
        pkill -P "$BACKEND_PID" 2>/dev/null || true
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ]; then
        pkill -P "$FRONTEND_PID" 2>/dev/null || true
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    fi

    # Release ports if any lingering workers remain
    if command -v lsof &>/dev/null; then
        lsof -ti:8000 2>/dev/null | xargs -r kill -9 2>/dev/null || true
        lsof -ti:5173 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    fi

    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo -e "${GREEN}${BOLD}[DONE]${RESET} All servers stopped cleanly."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend Server in Background
(
    cd "$BACKEND_DIR"
    export PYTHONUNBUFFERED=1
    exec "$BACKEND_DIR/venv/bin/uvicorn" app.main:app --reload --host 0.0.0.0 --port 8000 2>&1 | while IFS= read -r line; do
        printf "${BLUE}[BACKEND]${RESET} %s\n" "$line"
    done
) &
BACKEND_PID=$!

# Start Frontend Server in Background
(
    cd "$FRONTEND_DIR"
    exec npm run dev 2>&1 | while IFS= read -r line; do
        printf "${CYAN}[FRONTEND]${RESET} %s\n" "$line"
    done
) &
FRONTEND_PID=$!

# Wait for background processes
wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
