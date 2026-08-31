#!/bin/bash
# Production Server Health Audit Script
# Run this on 168.231.79.175

echo "=============================================="
echo "      YQ SAAS PRODUCTION HEALTH AUDIT         "
echo "=============================================="
echo ""

echo "1. SYSTEM RESOURCES"
echo "-------------------"
echo "=> CPU & Memory Usage:"
free -h
echo ""
echo "=> Disk Space:"
df -h /
echo ""

echo "2. DOCKER CONTAINER HEALTH"
echo "--------------------------"
if command -v docker &> /dev/null; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "=> Checking for restarting or dead containers:"
    docker ps -a | grep -i "exited\|restarting" || echo "All containers are healthy!"
else
    echo "Docker is not installed or not in PATH."
fi
echo ""

echo "3. PM2 PROCESS HEALTH (If running via PM2)"
echo "------------------------------------------"
if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo "PM2 is not installed globally."
fi
echo ""

echo "4. DATABASE CONNECTIONS (Postgres)"
echo "----------------------------------"
if command -v docker &> /dev/null && docker ps | grep -q "postgres"; then
    echo "=> Active Postgres Connections:"
    docker exec $(docker ps -qf "name=postgres") psql -U prisma -d yq -c "SELECT count(*) from pg_stat_activity;" 2>/dev/null || echo "Unable to connect to Postgres"
else
    echo "Postgres container not found."
fi
echo ""

echo "5. NGINX REVERSE PROXY"
echo "----------------------"
if command -v nginx &> /dev/null; then
    nginx -t
else
    echo "Nginx is not installed or not in PATH."
fi
echo ""

echo "=============================================="
echo " AUDIT COMPLETE. Please copy this output.     "
echo "=============================================="
