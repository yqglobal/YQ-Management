# Qmova / YQ Management - Production Architecture & Operations Report

This document provides an exhaustive reference for the production infrastructure, deployment pipelines, secret management, and operational workflows of the **Qmova (YQ Management)** software ecosystem.

---

## 1. Executive Summary & Architecture Overview

Qmova is a multi-tenant queue management and customer interaction platform designed for businesses, healthcare facilities, restaurants, and government services. The architecture operates as a globally distributed, decoupled modern web application:

```
+-------------------+       +-----------------------+       +------------------------+
|                   |       |                       |       |                        |
|  Next.js Frontend | <---> | NestJS REST Backend   | <---> | PostgreSQL Database    |
|  (Vercel CDN)     |       | (Render / AWS)        |       | (Managed DB & Prisma)  |
|                   |       |                       |       |                        |
+-------------------+       +-----------------------+       +------------------------+
         ^                              ^
         |                              |
         |                              v
         |                  +-----------------------+
         |                  | External APIs:        |
         +----------------> | - Brevo (OTP Emails)  |
   (Google OAuth SSO        | - Evolution API (WA)  |
     Redirect Flow)         | - Google OAuth Cloud  |
                            +-----------------------+
```

---

## 2. Service Hosting Breakdown

### A. Frontend Application (Vercel)
* **Production URL:** `https://yq-qmova.vercel.app`
* **Framework:** Next.js (Pages router), React, Tailwind CSS, `@tanstack/react-query`, Lucide UI icons, Sonner notifications.
* **Hosting Provider:** **Vercel** (Global Edge CDN).
* **Role:** Delivers responsive web interfaces for public user enrollment, administrative dashboards, tenant onboarding, and super-admin platform management.
* **Build Command:** `npm run build` (Standard Next.js optimized bundle).

### B. Backend REST API (Render)
* **Production URL:** `https://qmova-backend.onrender.com`
* **Framework:** NestJS (Node.js / TypeScript), Prisma ORM, Passport Auth (JWT & Google OAuth 2.0).
* **Hosting Provider:** **Render** (Hosted on AWS US-West infrastructure).
* **Role:** Handles core business logic, user authentication, multi-tenant queue processing, webhooks, rate limiting (Throttler), and external vendor orchestrations.
* **Health & Keep-Alive:** Implements an automated self-ping / keep-alive worker (`KeepAliveService`) targeting `/health` every 5 minutes to prevent container idle freeze in serverless/free hosting tiers.

### C. Primary Database (PostgreSQL / Prisma)
* **Database Type:** Managed PostgreSQL relational database.
* **Schema & ORM:** Powered by Prisma ORM (`backend/prisma/schema.prisma`).
* **Migrations:** Executed automatically during CI/CD deploy processes via `prisma migrate deploy` or `prisma db push`.
* **Role:** Persistent encrypted storage for workspaces, users, queue configurations, live queue tokens, audit logs, and communication templates.

### D. Email Notification Gateway (Brevo / Sendinblue)
* **Provider:** Brevo (formerly Sendinblue).
* **Role:** Outbound transactional SMTP/REST API email gateway for sending One-Time Passwords (OTPs) for registration, sign-in, and password recovery.
* **IP Authorization Protocol:** Brevo enforces IP whitelisting for outgoing calls. Render uses AWS dynamic pools; outbound IPs (`216.24.57.x`, `216.198.79.x`, etc.) are authorized directly within the Brevo Developer Portal via the *Unauthorized IP Addresses* tracker tab.

### E. WhatsApp Automation Engine (Evolution API)
* **Provider:** Evolution API (Self-hosted or cloud managed instance).
* **Version:** Pinned to `2.3.7` in all environments (local Docker, Render).
* **Architecture:** Per-tenant instance model (`tenant_{id}`) with auto-recovery cron (every 10 minutes).
* **Role:** Establishes linked WhatsApp Web connections per tenant via real-time QR code generation or mobile pairing codes. Automates out-of-the-box customer alerts (e.g., ticket issuance, turn approaching, service completion).
* **Webhook Security:** Optional `WEBHOOK_SECRET` query parameter validation. In production, `BACKEND_PUBLIC_URL` must point to the backend public URL (not the Vercel frontend) so Evolution webhooks target the NestJS backend.

### F. Single Sign-On (Google Cloud Identity)
* **Provider:** Google Cloud Console OAuth 2.0 Application.
* **Role:** Enables one-click onboarding and login for both existing users and seamless automated signup flows for brand-new users.

---

## 3. Secret & API Key Management

To maintain institutional-grade security, API keys and database credentials are **never** hardcoded in the source repository. They are injected as runtime environment variables through secure hosting dashboards.

### A. Backend Environment Variables (Render Dashboard)
Configure these inside the Render Web Service settings under the **Environment** tab:

| Variable Name | Description | Example / Location |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL direct connection string | `postgresql://user:password@hostname:5432/qmova?sslmode=require` |
| `JWT_SECRET` | 256-bit secret key used to sign session JWTs | High-entropy cryptographic random string |
| `FRONTEND_URL` | Canonical root domain of the Vercel frontend | `https://yq-qmova.vercel.app` |
| `BREVO_API_KEY` | REST API Key for transactional OTP emails | Generated via Brevo Dashboard -> Settings -> SMTP & API -> API Keys |
| `EVOLUTION_API_URL` | Base endpoint URL for WhatsApp service | `https://evo-api.domain.com` |
| `EVOLUTION_API_KEY` | Global/Instance API token for WhatsApp setup | Configured during Evolution API provisioning |
| `BACKEND_PUBLIC_URL` | Public URL where backend receives webhooks | `https://qmova-backend.onrender.com` |
| `WEBHOOK_SECRET` | Optional secret for Evolution webhook auth | Random string |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for SSO | Obtained from Google Cloud Console -> Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret for SSO | Obtained from Google Cloud Console -> Credentials |
| `SUPER_ADMIN_EMAIL` | Root administrative system email | `yqbuddysa@gmail.com` |
| `NODE_ENV` | Application execution state | `production` |

### B. Frontend Environment Variables (Vercel Dashboard)
Configure these inside the Vercel Project settings under **Settings -> Environment Variables**:

| Variable Name | Description | Default Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Canonical root target for API interactions | `https://qmova-backend.onrender.com` |

---

## 4. Git Workflows & Production Updates

Deployment is fully CI/CD-enabled via automated GitHub branch integration and manual Vercel command-line triggers when instant deployment acceleration is required.

### A. Standard Git Update Workflow (Recommended)

1. **Local Development & Stage Changes:**
   Make codebase alterations, test locally, and bundle modifications cleanly.
   ```bash
   git add .
   git commit -m "feat(auth): describe exact feature or fix here"
   ```

2. **Push to Central Git Repository:**
   Pushing to the `main` branch acts as the universal production release trigger.
   ```bash
   git push origin main
   ```

3. **Automated Server Deployments:**
   * **Backend (Render):** Render listens to webhook events from the GitHub `main` branch. Upon receiving a push event, Render clones the repo, installs dependencies (`npm ci`), runs database migrations (`npx prisma generate & push`), and spins up the new application container smoothly without downtime.
   * **Frontend (Vercel):** Vercel captures the Git commit immediately, builds the production Next.js application across its edge CDN network, and applies atomic URL promotion once build checks succeed.

### B. Immediate Manual Vercel Edge Promotion
When hot-fixing frontend code (such as UI placeholder updates or polling optimizations), you can directly trigger an immediate production release from the terminal using the Vercel CLI:
```bash
cd "/home/abhimanyu/Projects/YQ/YQ Management/frontend"
npx -y vercel --prod --yes
```
This deploys directly to the canonical production domain (`yq-qmova.vercel.app`) in approximately 45–60 seconds.

---

## 5. Recent Resiliency & Usability Improvements

1. **Onboarding Session Persistence & Navigation:**
   * Implemented localized persistence (`localStorage.setItem('onboarding_step', ...)`) to guarantee that accidental browser refreshes never reset user onboarding progress or lose entered forms.
   * Installed explicit **Back** buttons across all onboarding steps (Personal Info, Queues Configuration, and WhatsApp Setup) allowing fluid bidirectional traversal.
2. **Instantaneous WhatsApp State Reconciliation:**
   * Optimized React Query status polling (`/whatsapp/status`) during connection attempts to fire every **1500ms** (down from 3000ms+ or dead state cessation). Once a user scans the QR code on a mobile handset, the UI catches the `'open'` state transition almost instantly and reveals the successful confirmation dashboard.
3. **Cross-Domain SSO Token Synchronization:**
   * Hardened the Google OAuth callback redirect to attach the authentication token directly to URL query parameters upon return (`?token=...`). The frontend `AuthContext` natively intercepts, extracts, saves to local storage, and strips the token from the visible URL bar, completely overriding third-party cookie drop restrictions imposed by Safari and Chrome Incognito during multi-hop cloud SSO redirects.
