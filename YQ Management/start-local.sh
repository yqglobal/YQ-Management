#!/bin/bash

# ==============================================================================
# YQ Queue Management - Local Development Environment
# ==============================================================================

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/log.txt"
FAIL_MODE=0

mkdir -p "$LOG_DIR"
> "$LOG_FILE"

# ------------------------------------------------------------------------------
# Utility Functions
# ------------------------------------------------------------------------------

log() {
    echo -e "$1"
    echo -e "$1" | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" >> "$LOG_FILE"
}

log_info() { log "${BLUE}ℹ${NC} $1"; }
log_success() { log "${GREEN}✓${NC} $1"; }
log_warning() { log "${YELLOW}⚠${NC} $1"; }
log_error() { log "${RED}✗${NC} $1"; }
log_step() { log "\n${CYAN}${BOLD}▶ $1${NC}"; }

check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it to continue."
        exit 1
    fi
}

check_env_file() {
    local dir=$1
    if [ ! -f "$SCRIPT_DIR/$dir/.env" ]; then
        if [ -f "$SCRIPT_DIR/$dir/.env.example" ]; then
            log_warning "No .env found in $dir. Copying .env.example..."
            cp "$SCRIPT_DIR/$dir/.env.example" "$SCRIPT_DIR/$dir/.env"
            log_success "Created .env for $dir"
        else
            log_warning "No .env or .env.example found in $dir. You may need to configure environment variables."
        fi
    fi
}

free_port() {
    local port=$1
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Port $port is in use. Attempting to free..."
        PIDS=$(lsof -ti ":$port")
        if [ -n "$PIDS" ]; then
            kill -9 $PIDS 2>/dev/null || true
            sleep 2
        fi
        if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_error "Port $port is still in use. Please free it manually."
            exit 1
        fi
        log_success "Freed port $port"
    fi
}

cleanup() {
    log "\n${YELLOW}🛑 Shutting down YQ local environment...${NC}"
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID 2>/dev/null
        wait $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID 2>/dev/null
        wait $FRONTEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$DOCKER_LOGS_PID" ] && kill -0 $DOCKER_LOGS_PID 2>/dev/null; then
        kill $DOCKER_LOGS_PID 2>/dev/null
        wait $DOCKER_LOGS_PID 2>/dev/null || true
    fi
    
    log_info "Stopping Docker containers..."
    docker compose stop >> "$LOG_FILE" 2>&1
    
    log_success "All services stopped gracefully. See you next time! 👋"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# Pre-flight Checks
# ------------------------------------------------------------------------------
clear
log "${BLUE}${BOLD}=======================================================${NC}"
log "${BLUE}${BOLD}          🚀 YQ MANAGEMENT - LOCAL DEV SERVER         ${NC}"
log "${BLUE}${BOLD}=======================================================${NC}"

log_step "Running pre-flight checks..."
check_dependency "docker"
check_dependency "node"
check_dependency "npm"

check_env_file "backend"
check_env_file "frontend"

log_success "All dependencies met."

# ------------------------------------------------------------------------------
# 1. Infrastructure (Docker)
# ------------------------------------------------------------------------------
log_step "Starting Infrastructure (PostgreSQL & Redis)..."
docker compose up -d >> "$LOG_FILE" 2>&1

log_info "Waiting for databases to initialize..."
sleep 3

for i in {1..15}; do
    if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        log_success "PostgreSQL is ready."
        break
    fi
    if [ $i -eq 15 ]; then log_error "PostgreSQL failed to start."; exit 1; fi
    sleep 1
done

for i in {1..15}; do
    if docker compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        log_success "Redis is ready."
        break
    fi
    if [ $i -eq 15 ]; then log_error "Redis failed to start."; exit 1; fi
    sleep 1
done

# ------------------------------------------------------------------------------
# 2. Backend Service
# ------------------------------------------------------------------------------
log_step "Bootstrapping Backend..."
free_port 3000
cd "$SCRIPT_DIR/backend"

if [ ! -d "node_modules" ]; then
    log_info "Installing backend dependencies..."
    npm install --silent >> "$LOG_FILE" 2>&1
fi

log_info "Syncing Prisma schema..."
npx prisma db push --accept-data-loss >> "$LOG_FILE" 2>&1
npx prisma generate >> "$LOG_FILE" 2>&1

log_info "Starting NestJS in development mode..."
# Using start:dev instead of build for faster dev startup
npm run start:dev >> "$LOG_FILE" 2>&1 &
BACKEND_PID=$!

sleep 4
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    log_error "Backend crashed immediately. Check logs."
    tail -15 "$LOG_FILE"
    exit 1
fi
log_success "Backend running (PID: $BACKEND_PID)"

# ------------------------------------------------------------------------------
# 3. Frontend Service
# ------------------------------------------------------------------------------
log_step "Bootstrapping Frontend..."
free_port 3001
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    log_info "Installing frontend dependencies..."
    npm install --silent >> "$LOG_FILE" 2>&1
fi

log_info "Starting Next.js development server..."
npm run dev -- -p 3001 >> "$LOG_FILE" 2>&1 &
FRONTEND_PID=$!

sleep 4
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    log_error "Frontend crashed immediately. Check logs."
    tail -15 "$LOG_FILE"
    exit 1
fi
log_success "Frontend running (PID: $FRONTEND_PID)"

# ------------------------------------------------------------------------------
# 4. Final Health Checks
# ------------------------------------------------------------------------------
log_step "Waiting for services to become healthy..."

# Wait for backend
for i in {1..90}; do
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:3000/health 2>/dev/null | grep -q "200"; then
        log_success "Backend API is healthy."
        break
    fi
    if [ $i -eq 90 ]; then log_warning "Backend health check timed out, but process is alive."; fi
    sleep 1
done

# Wait for frontend
for i in {1..90}; do
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:3001/ 2>/dev/null | grep -q "200"; then
        log_success "Frontend UI is healthy."
        break
    fi
    if [ $i -eq 90 ]; then log_warning "Frontend health check timed out, but process is alive."; fi
    sleep 1
done

# ------------------------------------------------------------------------------
# Dashboard
# ------------------------------------------------------------------------------
log "\n${GREEN}${BOLD}=======================================================${NC}"
log "${GREEN}${BOLD}             ✨ ENVIRONMENT IS READY ✨              ${NC}"
log "${GREEN}${BOLD}=======================================================${NC}"
log "${BOLD}🖥️  Frontend URL :${NC} ${CYAN}http://localhost:3001${NC}"
log "${BOLD}⚙️  Backend API  :${NC} ${CYAN}http://localhost:3000${NC}"
log "${BOLD}❤️  Health Check :${NC} ${CYAN}http://localhost:3000/health${NC}"
log "${BOLD}📄 Log File     :${NC} ${YELLOW}$LOG_FILE${NC}"
log "${GREEN}${BOLD}=======================================================${NC}"
log "${YELLOW}Press Ctrl+C to safely shut down all services.${NC}\n"

# Stream docker logs to log file in background
(docker compose logs -f --no-color >> "$LOG_FILE" 2>&1) &
DOCKER_LOGS_PID=$!

wait
