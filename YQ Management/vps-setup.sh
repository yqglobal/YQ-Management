#!/bin/bash
# VPS Initialization & Git Hook Setup Script
# Run this on your Hostinger Ubuntu VPS as root!

set -e

echo "=> Updating system packages..."
apt-get update && apt-get upgrade -y

echo "=> Installing Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi
apt-get install -y docker-compose-plugin

echo "=> Securing VPS with UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

echo "=> Setting up Git Deployment Hook..."
APP_DIR="/var/www/yq"
GIT_DIR="/var/repo/yq.git"

mkdir -p $APP_DIR
mkdir -p $GIT_DIR
cd $GIT_DIR
git init --bare

cat > hooks/post-receive << 'EOF'
#!/bin/bash
APP_DIR="/var/www/yq"
GIT_DIR="/var/repo/yq.git"

echo "====> Receiving new deployment..."
git --work-tree=$APP_DIR --git-dir=$GIT_DIR checkout -f

echo "====> Rebuilding Docker Containers..."
cd $APP_DIR

# Ensure .env is present
if [ ! -f .env ]; then
    echo "ERROR: .env file missing in $APP_DIR! Containers may fail to start."
fi

# Run docker-compose using the production config
docker compose -f docker-compose.production.yml up --build -d

echo "====> Deployment Complete!"
EOF

chmod +x hooks/post-receive

echo "--------------------------------------------------------"
echo "✅ VPS Setup Complete!"
echo ""
echo "To push code to this VPS from your laptop, run:"
echo "git remote add production root@<YOUR_VPS_IP>:/var/repo/yq.git"
echo "git push production main"
echo ""
echo "Don't forget to create /var/www/yq/.env on the server before deploying!"
echo "--------------------------------------------------------"
