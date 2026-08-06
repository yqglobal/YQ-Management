#!/bin/bash
set -euo pipefail

# QMover Oracle Free Tier Setup Script
# This script automates the initial setup on an Oracle Ubuntu VM

echo "🚀 QMover Oracle Free Tier Setup"
echo "================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Configuration
APP_NAME="qmover-backend"
APP_DIR="/opt/qmover/backend"
SERVICE_USER="ubuntu"
NODE_VERSION="20"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system
log_info "Updating system..."
apt-get update && apt-get upgrade -y

# Install dependencies
log_info "Installing system dependencies..."
apt-get install -y \
    curl wget gnupg lsb-release ca-certificates \
    apt-transport-https software-properties-common \
    build-essential python3 make g++ git ufw \
    redis-server nginx

# Configure Redis
log_info "Configuring Redis..."
sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
cat >> /etc/redis/redis.conf << EOF

# QMover Redis Configuration
maxmemory 128mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
EOF
systemctl restart redis
systemctl enable redis

# Install Node.js
log_info "Installing Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi

# Install PM2
log_info "Installing PM2..."
npm install -g pm2

# Setup firewall
log_info "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create app directory
log_info "Creating application directory..."
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/logs
mkdir -p ${APP_DIR}/backups
chown -R ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}

# Clone repository
log_info "Cloning repository..."
read -p "Enter GitHub repository URL: " REPO_URL
if [ -n "$REPO_URL" ]; then
    sudo -u ${SERVICE_USER} git clone ${REPO_URL} ${APP_DIR} || true
    cd ${APP_DIR}
else
    log_warn "No repository URL provided. Skipping clone."
fi

# Setup environment
log_info "Setting up environment..."
if [ ! -f "${APP_DIR}/.env" ]; then
    cp ${APP_DIR}/.env.production ${APP_DIR}/env 2>/dev/null || true
    log_warn "Please edit ${APP_DIR}/.env with your configuration"
fi

# Install Docker for Evolution API
log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ${SERVICE_USER}
fi

# Install Evolution API (WhatsApp) - uses local PostgreSQL and Redis
log_info "Installing Evolution API..."
if ! docker ps | grep -q yq_evolution_api; then
    # Create database for Evolution API
    log_info "Creating Evolution API database..."
    sudo -u postgres psql -c "CREATE DATABASE evolution_api;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE evolution_api TO postgres;" 2>/dev/null || true

    # Run Evolution API container pointing to local services
    docker run -d \
        --name yq_evolution_api \
        --restart unless-stopped \
        -p 127.0.0.1:8080:8080 \
        -e SERVER_URL=http://localhost:8080 \
        -e DOCKER_ENV=true \
        -e LOG_LEVEL=ERROR,WARN,DEBUG,INFO,LOG,VERBOSE,DARK,WEBHOOKS \
        -e AUTHENTICATION_TYPE=apikey \
        -e AUTHENTICATION_API_KEY=<EVOLUTION_API_KEY> \
        -e DATABASE_PROVIDER=postgresql \
        -e DATABASE_CONNECTION_URI=postgresql://postgres:postgres@host.docker.internal:5432/evolution_api \
        -e DATABASE_CONNECTION_CLIENT_NAME=evolution_api \
        -e REDIS_URI=redis://host.docker.internal:6379 \
        -e REDIS_PREFIX_KEY=evolution \
        --add-host=host.docker.internal:host-gateway \
        evoapicloud/evolution-api:latest

    # Wait for Evolution API to start
    log_info "Waiting for Evolution API to start..."
    sleep 15

    # Check if Evolution API is running
    if docker ps | grep -q yq_evolution_api; then
        log_info "✅ Evolution API is running at http://localhost:8080"
    else
        log_warn "⚠️  Evolution API failed to start. Check logs: docker logs yq_evolution_api"
    fi
else
    log_info "Evolution API already running, skipping..."
fi

# Setup environment file
log_info "Setting up environment..."
if [ ! -f "${APP_DIR}/.env" ]; then
    cat > ${APP_DIR}/.env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yq_queue
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://qmover.vercel.app
APP_URL=https://qmover.vercel.app
BACKEND_URL=http://localhost:3000
JWT_SECRET=$(openssl rand -base64 64)
BREVO_API_KEY=your_brevo_api_key
BREVO_LIST_ID=2
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=<EVOLUTION_API_KEY>
EVOLUTION_INSTANCE_NAME=yq_instance
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OZOW_SITE_CODE=your_site_code
OZOW_PRIVATE_KEY=your_private_key
OZOW_API_KEY=your_api_key
TEST_MODE=false
EOF
    chown ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}/.env
    log_warn "Please edit ${APP_DIR}/.env with your actual values"
fi

# Install dependencies and build
log_info "Installing dependencies and building..."
cd ${APP_DIR}
sudo -u ${SERVICE_USER} npm ci
sudo -u ${SERVICE_USER} npm run build

# Run database migrations
log_info "Running database migrations..."
sudo -u ${SERVICE_USER} npx prisma migrate deploy || true

# Setup nginx with basic config (no SSL yet)
log_info "Configuring nginx..."
cat > /etc/nginx/conf.d/qmover.conf << 'EOF'
# HTTP server - redirect to HTTPS if SSL is configured
server {
    listen 80;
    server_name _;

    # API proxy (no SSL - for direct IP access)
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Auth endpoints with stricter rate limiting
    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        
        proxy_pass http://localhost:3000/api/auth/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Add rate limiting zones
if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
    sed -i '/http {/a \    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;\n    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;' /etc/nginx/nginx.conf
fi

nginx -t && systemctl restart nginx && systemctl enable nginx

# Setup PM2
log_info "Setting up PM2..."
cd ${APP_DIR}
sudo -u ${SERVICE_USER} pm2 start dist/main --name ${APP_NAME}
sudo -u ${SERVICE_USER} pm2 save
sudo -u ${SERVICE_USER} pm2 startup systemd -u ${SERVICE_USER} --hp /home/${SERVICE_USER}

# Summary
log_info "✅ Basic setup complete!"
log_info ""
log_info "Next steps:"
log_info "1. Edit ${APP_DIR}/.env with your configuration"
log_info "2. Run: cd ${APP_DIR} && npx prisma migrate deploy"
log_info "3. Start backend: pm2 start dist/main --name ${APP_NAME}"
log_info ""
log_info "Your backend is accessible at: http://$(curl -s ifconfig.me):3000"
log_info ""
log_info "For HTTPS, choose one:"
log_info "  a) Self-signed cert: sudo bash scripts/setup-ssl-selfsigned.sh"
log_info "  b) DuckDNS + Let's Encrypt: sudo bash scripts/setup-ssl-duckdns.sh"
log_info "  c) Cloudflare Tunnel: sudo bash scripts/setup-cloudflare-tunnel.sh"
log_info ""
log_info "Useful commands:"
log_info "  pm2 logs ${APP_NAME}    # View logs"
log_info "  pm2 restart ${APP_NAME}  # Restart backend"
log_info "  systemctl status nginx  # Check nginx"

