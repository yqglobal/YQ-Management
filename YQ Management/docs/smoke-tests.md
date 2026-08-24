# Smoke Tests

Date: 2026-07-28

## What Changed

- Fixed backend compile blockers in `users` and `whatsapp` controllers.
- Opened the public customer queue flow so guest users can load queue details and self-serve cancel/check-in.
- Fixed the QR join URL to point to the real customer join route.
- Wired the operator complete action to a real completion endpoint.
- Added tenant/workspace ownership checks to several admin-facing queue and messaging routes.
- Linked payment transactions to the first workspace for a tenant so payment success can activate the workspace subscription.

## Smoke Results

- Backend production build: PASS
  - Command: `cd backend && npm run build`
- Frontend production build: PASS
  - Command: `cd frontend && npm run build`
- Repository whitespace check: FAIL
  - Command: `git diff --check`
  - Result: existing trailing whitespace in pre-existing files such as `backend/prisma/schema.prisma`, `backend/src/main.ts`, and `backend/src/auth/google.strategy.ts`
  - Note: this is unrelated to the changes in this pass and did not block the builds.

## Not Run

- Browser-level interaction smoke on the running app.

## Live Integration Smoke (2026-07-28)

- PostgreSQL (port 5455): PASS
  - Schema synced (20 tables), CRUD (tenant/user/workspace) verified via Prisma
- Redis (port 6380): PASS
  - PING, queue create, token join, and `LLEN` queue length verified
- Evolution API (port 8080): PASS
  - Root reachable (v2.3.7), `/whatsapp/connect` (201), `/whatsapp/status` (200)
- Ozow Payments: PASS
  - `GET /payments/generate-link` (200), `POST /payments/webhook` (201), DB verified txn=SUCCESS + workspace=ACTIVE

## Notes

- The backend and frontend builds both completed successfully after the fixes.
- The remaining repository cleanliness issue is pre-existing whitespace noise in unrelated files.
