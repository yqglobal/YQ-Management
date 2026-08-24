#!/bin/bash
# Initial VPS Provisioning Script for YQ Platform (Hostinger Ubuntu 22.04+)
# Run this ONCE as root on your VPS: curl -s https://raw.githubusercontent.com/yq-qmova/repo/main/vps-setup.sh | bash

set -e

# 1. Update and install dependencies
echo "====> Updating system & installing dependencies..."
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban jq make

# 2. Setup Swap space (crucial for 8GB RAM + heavy build steps)
if [ ! -f /swapfile ]; then
    echo "====> Creating 4GB Swap Space..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
fi

# 3. Basic Firewall (UFW)
echo "====> Configuring UFW Firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 4. Install Docker & Docker Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "====> Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# 5. Prepare App Directory
APP_DIR="/var/www/yq"
echo "====> Preparing application directory at $APP_DIR..."
mkdir -p $APP_DIR
chown -R root:root $APP_DIR

echo "====> Setup Complete!"
echo "Next Steps:"
echo "1. Clone your git repository into $APP_DIR (e.g. git clone <repo> $APP_DIR)"
echo "2. Copy .env.production.example to $APP_DIR/.env and fill in the values"
echo "3. Run 'cd $APP_DIR && docker compose -f docker-compose.production.yml up -d'"
