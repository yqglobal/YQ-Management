# YQ Queue Management — Full SaaS Audit, Workflow Validation & QA Report

## Executive Summary
This report presents a deep technical, functional, UX, business-logic, and workflow audit of the YQ Queue Management (Qmova) SaaS codebase. The audit evaluated the system from the perspective of administrators, receptionists, service providers, customers, and the underlying architecture.

**The most critical finding is a major architectural split between a legacy "Queue/Token" data model and a newer "Location/Service/Visit" data model.** This split causes severe data consistency issues and necessitates "fallback intercepts" in the backend. 
Furthermore, the customer-facing real-time wait screen contains critical bugs (hardcoded initial states) that break the core value proposition of the product if a customer refreshes their browser.

**Production Readiness Assessment:** The system is **NOT** ready for deployment to a real hospital/clinic without resolving the critical data consistency and customer-facing state bugs.

---

## 1. SaaS Mental Model
The SaaS attempts to model a physical queuing and booking system but suffers from entity duplication:
*   **The Physical Model**: `Tenant` -> `Location` (Branch) -> `Service` -> `Staff` -> `Resource`. A customer makes an `Appointment` or a `Visit`.
*   **The Virtual Model (Legacy)**: `Tenant` -> `Queue` -> `Token`. 
*   **The Conflict**: The backend attempts to merge these. When a customer joins a `Queue` to get a `Token`, the backend artificially creates a `Visit`, a `Customer`, and links them to the *first* `Location` and `Service` it finds, bypassing the actual intended architecture.

## 2. Architecture Overview
*   **Frontend**: Next.js (Pages Router) with Tailwind CSS, Framer Motion, and React Query.
*   **Backend**: NestJS framework.
*   **Database**: PostgreSQL managed by Prisma ORM.
*   **Real-time/Cache**: Socket.io for WebSocket broadcasting, Redis for queue positioning and ETA calculation.
*   **Integrations**: Ozow (Payments), WhatsApp (Evolution API).

---

## 3. Complete Page Inventory
### Admin / Receptionist (Dashboard)
*   `/dashboard` - Main overview.
*   `/dashboard/queues` - Queue list and management.
*   `/dashboard/queues/[id]` - Active queue operator screen.
*   `/dashboard/appointments` - Booking management.
*   `/dashboard/people` - Staff and customer CRM.
*   `/dashboard/settings/*` - Billing, Workspace, Team, Operations (Locations/Services).
*   `/dashboard/analytics` - Reporting.

### Customer Facing
*   `/queue/[id]` - Real-time waiting screen.
*   `/book` - Public booking flow.
*   `/kiosk` - On-site physical kiosk flow.
*   `/tv` - Digital signage display.

---

## 4. Page-by-Page Audit & Feature-by-Feature Validation

### The Customer Wait Screen (`/queue/[id]`)
**Status: FAIL (CRITICAL BUG)**
*   **Issue**: The page hardcodes the initial position (`setPosition(5)`) and Estimated Wait Time (`setEwt(25)`). It does NOT fetch the current state from the backend on load. If a customer is actually 1st in line and refreshes their page, they will see themselves as 5th in line with a 25-minute wait.
*   **Issue**: Socket events decrement the position blindly (`Math.max(1, prev - 1)`). If the socket disconnects and reconnects, missed events will cause the client state to permanently desync from the server.
*   **Issue**: The `tokenId` defaults to `"DEMO-123"` if not provided in the query string, which will result in broken sockets.
*   **Security**: The WebSocket connection joins the queue room (`id`) without authenticating the token. Anyone with the queue ID can listen to all token status changes.

### Queue Management (`/dashboard/queues`)
**Status: PARTIAL**
*   **Issue**: The creation form allows linking services, but the backend `joinQueue` logic completely ignores the selected services and instead queries `this.prisma.service.findFirst({ where: { tenantId } })`. This means a queue for "Cardiology" will incorrectly create Visits for "General Consultation" if General Consultation was created first.
*   **UI/UX**: Good visual hierarchy, but lacks bulk operations (e.g., closing all queues at end of day).

### Operator Screen (`/dashboard/queues/[id]`)
**Status: PARTIAL**
*   **Issue**: When completing a token, the backend calculates the new Average Wait Time. If an operator accidentally calls and immediately completes a token, it severely skews the moving average in Redis, destroying the ETA accuracy for all subsequent customers.

---

## 5. Workflow Audits

### Receptionist Workflow Audit
**Status: BROKEN**
If a hospital has two branches (Locations), the receptionist at Branch B creates a queue. When customers join Branch B's queue, the backend legacy intercept (`joinQueue` in `queue.service.ts`) looks for `prisma.location.findFirst({ where: { tenantId } })`. It will assign all Branch B customers to Branch A in the analytics and `Visit` records.

### Service Provider / Doctor / Staff Audit
**Status: MISSING**
The codebase defines a `Staff` model, but there is no dedicated workflow or view for them. The system assumes a "Receptionist" (Operator) manages the entire queue. A doctor cannot log in and say "I am ready for the next patient in the Cardiology queue." The system relies entirely on the receptionist to act as a middleman for all state transitions.

### Booking Logic Audit
**Status: FLAWED**
The `getAvailableSlots` function in `QueueService` iterates over time blocks based on `granularityMins` and subtracts existing `Tokens`. However, it does not account for `Appointments` or `Visits` created outside of the queue system, leading to double-booking. It also assumes all services take the same amount of time, completely ignoring the `expectedDuration` field on the `Service` model.

### QR Audit
**Status: VULNERABLE**
QR codes generated on the customer wait screen encode the raw `tokenId` (a UUID). There is no cryptographic signature. If a malicious user guesses or obtains another user's UUID, they can present that QR code. 

### Payment / Subscription Audit
**Status: INCONSISTENT**
The frontend relies on `usePlan` hook to restrict features (e.g., `plan.isAtQueueLimit`). However, backend endpoints lack corresponding strict Guards to verify subscription quotas. A user could theoretically bypass the frontend and POST to `/api/queue` directly to create unlimited queues.

---

## 6. Database / Data Consistency Audit
**Status: CRITICAL ISSUES FOUND**
*   **The Split Brain**: The existence of `Token` (tied to `Queue`) vs `Visit` (tied to `Location`, `Service`, `Customer`). 
*   **The Hack**: `queue.service.ts` line 397 (`LEGACY QUEUE INTERCEPT`). It attempts to keep both systems in sync by blindly creating `Customer` and `Visit` records using `findFirst`.
*   **Orphaned Data**: `Token` has an `operatorId` (User), but `Visit` has an `assignedStaffId` (Staff). These are two completely different models representing the same human action.

---

## 7. Code Quality & Architecture Findings
*   **Over-engineering**: The system uses Redis for ETA calculations and sequence generation, but PostgreSQL is entirely capable of handling these loads for a queue system, avoiding the risk of Redis/Postgres desyncs.
*   **Missing Transactions**: In `completeToken`, updating the `Token`, updating Redis, creating the next `Token` (multi-step), and triggering webhooks are all separate operations without a database transaction. If the server crashes halfway, the system enters an invalid state.

---

## 8. Prioritized Problems

### CRITICAL (Fix Immediately before Production)
1.  **Customer Wait Screen State**: `/queue/[id].tsx` hardcodes position 5 and 25 min wait. It must fetch actual state via API on mount.
2.  **Legacy Queue Intercept**: `QueueService.joinQueue` assigns customers to the wrong Location and Service if a tenant has more than one.
3.  **Missing DB Transactions**: Critical state changes (advancing the queue) lack transactional integrity.

### HIGH (Fix before Launch)
1.  **API Quota Enforcement**: Subscription limits are only enforced on the frontend.
2.  **Socket Authentication**: Queue web sockets are open to anyone who knows a queue ID.
3.  **ETA Calculation Flaw**: Accidental rapid token completion permanently skews the Redis ETA average.

### MEDIUM 
1.  **Double Booking**: `getAvailableSlots` ignores `Service.expectedDuration` and `Appointment` records.
2.  **QR Code Spoofing**: QR codes lack signatures.

### LOW
1.  **Redundant Data Models**: Migrate completely away from `Token`/`Queue` to `Visit`/`Location`/`Service` or vice versa. Do not maintain both.

---

## 9. Final Production Readiness Assessment

*   Frontend quality: 4/10 (Critical logic bugs in core features)
*   Backend quality: 5/10 (Missing transactions, legacy hacks)
*   Database/data integrity: 3/10 (Split-brain schema)
*   Queue logic: 4/10 (ETA bugs, branch routing bugs)
*   Customer experience: 2/10 (Refresh breaks the wait screen)
*   Admin/receptionist experience: 7/10 (UI is well structured)
*   Provider/staff experience: 1/10 (Non-existent workflows)
*   Security: 4/10 (Unauth sockets, missing backend quota guards)
*   **Overall Production Readiness: 3.75/10**

### "Would I deploy this to a real hospital today?"
**NO.**

**Reasoning:** If a hospital with two branches attempts to use this system, customers joining the queue at Branch B will automatically be registered as visiting Branch A. Furthermore, when patients waiting in the lobby refresh their browser on their phone, they will instantly be told they are 5th in line with a 25-minute wait, regardless of their actual position. This will cause immediate chaos at the reception desk. The architectural split between `Tokens` and `Visits` must be resolved before this SaaS can reliably handle business operations.

---
## 10. Recommended Fix Order (Roadmap)

**PHASE 1 — Critical Correctness**
1. Rewrite `/queue/[id].tsx` to use React Query/fetch to get the initial `Token` state on mount.
2. Modify `queue.service.ts` -> `joinQueue` to accept and respect `locationId` and `serviceId` rather than using `findFirst()`.
3. Wrap queue advancement and completion logic in Prisma transactions.

**PHASE 2 — Security & Validation**
1. Add backend guards to enforce subscription limits (Max Queues, Max Tokens).
2. Authenticate Socket.io connections.

**PHASE 3 — Data Consistency**
1. Deprecate the `Token` model entirely. 
2. Migrate all queue logic to use the `Visit` model, driven by `Location` and `Service`. 

**PHASE 4 — Feature Completion**
1. Create a dedicated "Staff/Provider" view so doctors can pull the next patient from the queue without receptionist intervention.
2. Update `getAvailableSlots` to respect `Service.expectedDuration`.
