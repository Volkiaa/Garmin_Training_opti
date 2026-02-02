#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="Training Optimizer"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! check_command "docker"; then
        missing_deps+=("docker")
    fi
    
    if ! check_command "docker-compose"; then
        missing_deps+=("docker-compose")
    fi
    
    if ! check_command "npm"; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All dependencies found"
}

check_env_file() {
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        log_warning ".env file not found. Creating from .env.example..."
        if [ -f "$SCRIPT_DIR/.env.example" ]; then
            cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
            log_info ".env file created. Please edit it with your Garmin credentials before running again."
            log_info "Required: GARMIN_EMAIL and GARMIN_PASSWORD"
            exit 1
        else
            log_error ".env.example not found. Cannot create .env file."
            exit 1
        fi
    fi
}

start_infrastructure() {
    log_info "Starting infrastructure (PostgreSQL + Backend)..."
    
    cd "$SCRIPT_DIR"
    
    log_info "Building and starting Docker services..."
    docker-compose up -d --build
    
    log_info "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U training_optimizer &> /dev/null; then
            log_success "PostgreSQL is ready"
            break
        fi
        sleep 1
    done
    
    log_info "Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/health &> /dev/null; then
            log_success "Backend is ready"
            return 0
        fi
        sleep 1
    done
    
    log_error "Backend failed to start within 30 seconds"
    log_info "Checking backend logs..."
    docker-compose logs backend
    exit 1
}

setup_frontend() {
    log_info "Setting up frontend..."
    
    cd "$SCRIPT_DIR/frontend"
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm install
    fi
    
    log_success "Frontend setup complete"
}

start_frontend() {
    log_info "Starting frontend development server..."
    
    cd "$SCRIPT_DIR/frontend"
    
    npm run dev &
    FRONTEND_PID=$!
    
    log_info "Waiting for frontend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 &> /dev/null; then
            log_success "Frontend running at http://localhost:5173"
            return 0
        fi
        sleep 1
    done
    
    log_warning "Frontend may still be starting... check http://localhost:5173 manually"
}

cleanup() {
    log_info "Shutting down services..."
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    cd "$SCRIPT_DIR"
    docker-compose down
    
    log_success "Shutdown complete"
}

trap cleanup EXIT INT TERM

show_help() {
    cat << EOF
$APP_NAME Startup Script

Usage: ./start.sh [OPTIONS]

Options:
    -h, --help          Show this help message
    --skip-deps         Skip dependency checks
    --frontend-only     Start only the frontend
    --setup-only        Run setup only, don't start services

Examples:
    ./start.sh                    Start everything
    ./start.sh --frontend-only    Start only frontend
    ./start.sh --setup-only       Run setup without starting

EOF
}

SKIP_DEPS=false
FRONTEND_ONLY=false
SETUP_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --setup-only)
            SETUP_ONLY=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

clear
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║           TRAINING OPTIMIZER - STARTUP SCRIPT          ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ "$FRONTEND_ONLY" = false ]; then
    if [ "$SKIP_DEPS" = false ]; then
        check_dependencies
    fi
    
    check_env_file
    
    if [ "$SETUP_ONLY" = true ]; then
        log_info "Running database migrations..."
        start_infrastructure
        log_success "Setup complete! Run without --setup-only to start services."
        exit 0
    fi
    
    start_infrastructure
fi

if [ "$FRONTEND_ONLY" = false ]; then
    setup_frontend
    
    if [ "$SETUP_ONLY" = true ]; then
        log_success "Setup complete!"
        exit 0
    fi
    
    start_frontend
else
    setup_frontend
    start_frontend
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ${GREEN}$APP_NAME is running!${NC}                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                        ${GREEN}║${NC}"

if [ "$FRONTEND_ONLY" = false ]; then
    echo -e "${GREEN}║${NC}  ${BLUE}Backend:${NC}  http://localhost:8000                     ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${BLUE}API:${NC}      http://localhost:8000/api/v1             ${GREEN}║${NC}"
fi

if [ "$BACKEND_ONLY" = false ]; then
    echo -e "${GREEN}║${NC}  ${BLUE}Frontend:${NC} http://localhost:5173                     ${GREEN}║${NC}"
fi

echo -e "${GREEN}║${NC}                                                        ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${YELLOW}Press Ctrl+C to stop all services${NC}                   ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$FRONTEND_ONLY" = false ]; then
    log_info "First time? Authenticate with Garmin:"
    log_info "  docker-compose exec backend python -c \"from app.services.garmin_sync import get_sync_service; s = get_sync_service(); s.authenticate()\""
    echo ""
fi

wait
