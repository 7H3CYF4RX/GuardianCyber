#!/usr/bin/env bash

# ==============================================================================
# CyberCrews AI Security Lab - Complete Startup Script
# ==============================================================================

set -e

# Color formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Change directory to script root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

banner() {
    echo -e "${CYAN}${BOLD}"
    echo "================================================================="
    echo "       🛡️   CyberCrews AI Security Lab - System Startup   🛡️"
    echo "================================================================="
    echo -e "${NC}"
}

usage() {
    echo -e "${BOLD}Usage:${NC} ./start.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  --dev         Start local development mode (Node dev servers + Docker DB/Redis)"
    echo "  --docker      Start full production stack using Docker Compose"
    echo "  --skip-seed   Skip database migration and seeding steps"
    echo "  --help        Show this help message"
    echo ""
}

# Parse Command Line Arguments
MODE=""
SKIP_SEED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            MODE="dev"
            shift
            ;;
        --docker)
            MODE="docker"
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --help|-h)
            banner
            usage
            exit 0
            ;;
        *)
            warn "Unknown argument: $1"
            shift
            ;;
    esac
done

banner

# 1. System Requirements Check
info "Checking system requirements..."

if ! command -v node >/dev/null 2>&1; then
    error "Node.js is not installed. Please install Node.js 20+."
    exit 1
fi
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
    warn "Node.js version is $NODE_VER. Recommended version is 20+"
else
    success "Node.js $(node -v) detected"
fi

if ! command -v npm >/dev/null 2>&1; then
    error "npm is not installed."
    exit 1
fi
success "npm $(npm -v) detected"

# Detect Docker Compose command
if command -v docker >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
        success "Docker Compose (plugin) detected"
    elif command -v docker-compose >/dev/null 2>&1; then
        DOCKER_COMPOSE="docker-compose"
        success "docker-compose (standalone) detected"
    else
        error "Docker Compose is required but neither 'docker compose' nor 'docker-compose' was found."
        exit 1
    fi
else
    error "Docker is not running or not installed. Please start Docker and retry."
    exit 1
fi

# 2. Environment Setup
if [ ! -f .env ]; then
    info "No .env file found. Creating .env from .env.example..."
    cp .env.example .env
    success ".env created from .env.example"
else
    info ".env configuration file detected"
fi

# Load variables from .env safely
set -a
source <(grep -v '^#' .env | sed -E 's/^[[:space:]]*//; /^[[:space:]]*$/d') 2>/dev/null || true
set +a

# Auto-generate AES_KEY if default zero hex detected
if [ "$AES_KEY" = "0000000000000000000000000000000000000000000000000000000000000000" ] || [ -z "$AES_KEY" ]; then
    if command -v openssl >/dev/null 2>&1; then
        info "Generating secure 32-byte AES_KEY for secret encryption..."
        NEW_AES_KEY=$(openssl rand -hex 32)
        sed -i "s/AES_KEY=0000000000000000000000000000000000000000000000000000000000000000/AES_KEY=$NEW_AES_KEY/" .env 2>/dev/null || true
        export AES_KEY="$NEW_AES_KEY"
        success "Generated and set AES_KEY in .env"
    fi
fi

# 3. Dependencies & Shared Build
if [ ! -d "node_modules" ]; then
    info "Installing dependencies..."
    npm install
else
    info "Dependencies already installed"
fi

info "Building shared package (@guardian/shared)..."
npm run build -w packages/shared
success "@guardian/shared built successfully"

# Prompt for mode if TTY and not specified in arguments
if [ -z "$MODE" ]; then
    if [ -t 0 ]; then
        echo ""
        echo -e "${BOLD}Select startup mode:${NC}"
        echo "  1) Development Mode  (Docker DB/Redis + npm run dev for live reloading)"
        echo "  2) Production Mode   (Full stack built and run inside Docker Compose)"
        echo ""
        read -p "Enter choice [1 or 2] (Default: 1): " CHOICE
        case $CHOICE in
            2)
                MODE="docker"
                ;;
            *)
                MODE="dev"
                ;;
        esac
    else
        MODE="dev"
    fi
fi

# 4. Handle Execution Mode
if [ "$MODE" = "docker" ]; then
    info "Starting full application via Docker Compose..."
    $DOCKER_COMPOSE up --build
else
    # Development Mode Flow
    info "Starting PostgreSQL and Redis containers for local development..."
    $DOCKER_COMPOSE up -d postgres redis

    # Database readiness check
    info "Waiting for PostgreSQL database container to become healthy..."
    PG_USER="${POSTGRES_USER:-cybercrew}"
    PG_DB="${POSTGRES_DB:-guardiancyber}"
    RETRIES=30
    until $DOCKER_COMPOSE exec -T postgres pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
        sleep 1
        RETRIES=$((RETRIES - 1))
    done

    if [ $RETRIES -eq 0 ]; then
        error "PostgreSQL container failed to become ready in time."
        exit 1
    fi
    success "PostgreSQL is ready for connections"

    # Redis readiness check
    info "Waiting for Redis container..."
    RETRIES=15
    until $DOCKER_COMPOSE exec -T redis redis-cli ping >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
        sleep 1
        RETRIES=$((RETRIES - 1))
    done
    success "Redis is ready for connections"

    # Migration & Seeding
    if [ "$SKIP_SEED" = false ]; then
        info "Running database migrations..."
        npm run db:migrate -w packages/server

        info "Seeding 14 OWASP LLM security challenges..."
        npm run db:seed -w packages/server
        success "Database setup and seeding finished"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}=================================================================${NC}"
    echo -e "${GREEN}${BOLD}      🎉  CyberCrews AI Security Lab Ready for Launch! 🎉       ${NC}"
    echo -e "${GREEN}${BOLD}=================================================================${NC}"
    echo -e "  🌐 Frontend App  : ${CYAN}http://localhost:5173${NC}"
    echo -e "  ⚙️ Backend API   : ${CYAN}http://localhost:3001${NC}"
    echo -e "  📊 PostgreSQL    : ${CYAN}localhost:5432${NC}"
    echo -e "  ⚡ Redis         : ${CYAN}localhost:6379${NC}"
    echo -e "${GREEN}=================================================================${NC}"
    echo ""

    info "Starting server and client dev servers via concurrent execution..."
    npm run dev
fi
