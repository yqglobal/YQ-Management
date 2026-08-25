# Qmova / YQ Management - Production Architecture & Operations Guide

This document provides a comprehensive reference for the self-hosted production infrastructure, deployment pipelines, container orchestration, and operational workflows of the **Qmova (YQ Management)** software ecosystem.

---

## 1. Executive Summary & Architecture Overview

Qmova is a multi-tenant queue management and customer interaction platform designed for businesses, healthcare facilities, restaurants, and government services. The architecture operates as a self-hosted, containerized stack running on a single VPS using Docker Compose.

```
                                +-----------------------------------+
                                |            VPS Server             |
                                |                                   |
+-------------------+           |  +-----------------------------+  |
|                   | HTTP/443  |  |                             |  |
|  Public Internet  | <=======> |  |      Caddy (yq-caddy)       |  |
|                   |           |  |      Reverse Proxy & TLS    |  |
+-------------------+           |  |                             |  |
                                |  +--------------+--------------+  |
                                |                 |                 |
                                |   qmova.        |  api.qmova.     |
                                |   yqbuddy.com   |  yqbuddy.com    |
                                |                 |                 |
                                |  +--------------v--------------+  |
                                |  |                             |  |
                                |  |    Next.js Frontend         |  |
                                |  |    (yq-frontend:3001)       |  |
                                |  |                             |  |
                                |  +-----------------------------+  |
                                |                                   |
                                |  +-----------------------------+  |
                                |  |                             |  |
                                |  |    NestJS REST Backend      |  |
                                |  |    (yq-backend:3000)        |  |
                                |  |                             |  |
                                |  +--+-------+--------+------+--+  |
                                |     |       |        |      |     |
                                | +---v---+ +-v-----+ +-v---++-v--+ |
                                | |       | |       | |      ||   | |
                                | | pg    | | redis | | evo  ||   | |
                                | |(5432) | |(6379) | |(8080)||   | |
                                | +-------+ +-------+ +------++---+ |
                                +-----------------------------------+
```

---

## 2. Infrastructure & Hosting Breakdown

The entire stack is hosted on a single **8GB VPS** (IP: `168.231.79.175`) running Ubuntu Linux. The stack is defined in `docker-compose.production.yml`.

### A. Reverse Proxy (Caddy)
* **Image:** `caddy:2-alpine`
* **Role:** Acts as the edge proxy, terminating SSL/TLS automatically via Let's Encrypt, and routing traffic based on hostnames.
* **Routing:**
  * `qmova.yqbuddy.com` -> Routes to `yq-frontend` on port 3001.
  * `api.qmova.yqbuddy.com` -> Routes to `yq-backend` on port 3000.
* **Volume:** `caddy_data` for storing TLS certificates persistently.

### B. Frontend Application (Next.js)
* **Production URL:** `https://qmova.yqbuddy.com`
* **Container:** `yq-frontend`
* **Framework:** Next.js (Pages router), React, Tailwind CSS, `@tanstack/react-query`, Lucide UI icons.
* **Build Architecture:** The frontend is built inside a multi-stage Dockerfile (`frontend/Dockerfile`) using Next.js Standalone mode for a minimized footprint. Build-time environment variables (`NEXT_PUBLIC_API_URL`) are injected via Docker `ARG` instructions during the image build phase.

### C. Backend REST API (NestJS)
* **Production URL:** `https://api.qmova.yqbuddy.com`
* **Container:** `yq-backend`
* **Framework:** NestJS (Node.js / TypeScript), Prisma ORM, Passport Auth (JWT & Google OAuth 2.0).
* **Role:** Handles core business logic, user authentication, multi-tenant queue processing, webhooks, and rate limiting.

### D. Primary Database (PostgreSQL / Prisma)
* **Container:** `yq-postgres`
* **Image:** `postgres:15-alpine`
* **Role:** Persistent encrypted storage for workspaces, users, queue configurations, live queue tokens, audit logs, and communication templates.
* **Volume:** `pgdata` (CRITICAL: Never delete this volume to avoid data loss).
* **Migrations:** Executed automatically during the deployment script via a dedicated short-lived container running `npx prisma migrate deploy`.

### E. Cache & Message Broker (Redis)
* **Container:** `yq-redis`
* **Image:** `redis:7-alpine`
* **Role:** Serves as the caching layer, rate-limiting store (Throttler), and BullMQ message queue broker for background job processing.
* **Volume:** `redisdata` (Optional persistence, but mounted to survive container restarts).

### F. WhatsApp Automation Engine (Evolution API)
* **Container:** `yq-evolution`
* **Image:** `atendai/evolution-api:v2.2.1`
* **Role:** Establishes linked WhatsApp Web connections per tenant via real-time QR codes. Automates out-of-the-box customer alerts (e.g., ticket issuance, turn approaching).
* **Volume:** `evolution_instances` and `evolution_store` for persisting WhatsApp session state.

---

## 3. Secret & API Key Management

API keys and database credentials are injected as runtime environment variables. On the VPS, these are stored in the `.env` file at the root of the project directory (`/var/www/yq/YQ Management/.env`).

### Core Environment Variables

| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `POSTGRES_USER` | DB root username | `postgres` |
| `POSTGRES_PASSWORD` | DB root password | *Secure string* |
| `POSTGRES_DB` | Database name | `yq_queue` |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma | `postgresql://user:password@db:5432/yq_queue?schema=public` |
| `REDIS_HOST` | Internal Docker host for Redis | `redis` |
| `JWT_SECRET` | 256-bit secret key used to sign session JWTs | *High-entropy string* |
| `FRONTEND_URL` | Canonical root domain of the frontend | `https://qmova.yqbuddy.com` |
| `NEXT_PUBLIC_API_URL` | Canonical root domain of the backend | `https://api.qmova.yqbuddy.com` |
| `BREVO_API_KEY` | REST API Key for transactional OTP emails | Generated via Brevo Dashboard |
| `EVOLUTION_API_URL` | Internal/External endpoint for WhatsApp service | `http://evolution:8080` |
| `EVOLUTION_API_KEY` | Global/Instance API token for WhatsApp setup | Configured during Evolution setup |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for SSO | Obtained from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret for SSO | Obtained from Google Cloud Console |

---

## 4. Deployment Workflow

Deployment is automated using a Bash script (`scripts/deploy.sh`) that safely pulls the latest code, builds the Docker images, applies database migrations, and restarts the containers with zero/minimal downtime.

### Executing a Deployment

1. **Commit and Push Changes:**
   Push your changes to the `main` branch on GitHub.
   ```bash
   git add .
   git commit -m "feat: your description"
   git push origin main
   ```

2. **Run the Deployment Script:**
   SSH into the VPS and run the deployment script. The script can be executed securely using `sshpass` from a local machine or CI/CD runner:
   ```bash
   sshpass -p '<VPS_PASSWORD>' ssh -o StrictHostKeyChecking=no root@168.231.79.175 '/var/www/yq/YQ\ Management/scripts/deploy.sh'
   ```

### What `deploy.sh` Does:
1. **Pulls Code:** Runs `git pull origin main` to fetch the latest changes.
2. **Builds Images:** Rebuilds the frontend and backend Docker images locally on the server using `docker compose -f docker-compose.production.yml build`.
3. **Applies Migrations:** Spins up an ephemeral container to run `npx prisma migrate deploy` safely without affecting running traffic.
4. **Restarts Containers:** Issues `docker compose up -d` to restart any containers whose image or configuration has changed. Intact containers are left untouched.
5. **Prunes Resources:** Runs `docker image prune -f` to clean up dangling/old images and save disk space.

---

## 5. Security & Networking Considerations

1. **Internal Networking:** The backend, database, redis, and evolution API communicate over an internal isolated Docker network (`yq_network`). The database and redis ports are **NOT** exposed to the public internet, drastically reducing the attack surface.
2. **Reverse Proxy & HTTPS:** Caddy sits at the edge, exposing only HTTP (80) and HTTPS (443) ports. It handles automatic SSL certificate provisioning and renewal via Let's Encrypt.
3. **SSO Redirection:** Google OAuth is configured to redirect to `https://api.qmova.yqbuddy.com/auth/google/callback`, which then issues a token and redirects the browser safely back to the frontend (`https://qmova.yqbuddy.com/login?token=...`).

---

## 6. Maintenance & Troubleshooting

### Viewing Logs
To view live logs for any specific service, SSH into the VPS and use Docker Compose:
```bash
cd "/var/www/yq/YQ Management"
docker compose -f docker-compose.production.yml logs -f yq-backend
docker compose -f docker-compose.production.yml logs -f yq-frontend
docker compose -f docker-compose.production.yml logs -f yq-caddy
```

### Database Administration
If you need to run queries against the production database:
```bash
docker exec -it yq-postgres psql -U postgres -d yq_queue
```

### Restarting Services
To cleanly restart a specific service without affecting others:
```bash
docker compose -f docker-compose.production.yml restart yq-backend
```
