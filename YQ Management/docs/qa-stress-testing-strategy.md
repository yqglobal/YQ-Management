# QA & Stress-Testing Strategy — YQ Queue Multi-Tenant SaaS Platform

**Version:** 1.0
**Date:** 2026-07-31
**Scope:** 100+ tenants, 100+ messages/tenant/day, WhatsApp queue management

---

## Table of Contents

1. [Heuristic and Logic Evaluation](#1-heuristic-and-logic-evaluation)
2. [Stress Test Design](#2-stress-test-design)
3. [Automated End-to-End (E2E) Simulation](#3-automated-end-to-end-e2e-simulation)
4. [QR Code Automation Workaround](#4-qr-code-automation-workaround)
5. [Performance and Bug Analysis Framework](#5-performance-and-bug-analysis-framework)

---

## 1. Heuristic and Logic Evaluation

This section provides a hypothetical assessment of the user onboarding and dashboard workflows, identifying UI/UX friction points, data validation errors, and logical bottlenecks.

### 1.1 Onboarding Workflow Assessment (Step 1: Business Type Selection → Step 2: WhatsApp Connection)

#### 1.1.1 UI/UX Friction Points

| # | Friction Point | Location | Severity | Description |
|---|---------------|----------|----------|-------------|
| F1 | No skip-during-WhatsApp-setup | `frontend/src/pages/onboarding/index.tsx:311-349` | Medium | The "Skip for now" button is only visible when no QR code is present. If the user has already initiated a WhatsApp connection (QR displayed), the skip option disappears, trapping the user into completing the WhatsApp flow. |
| F2 | No back navigation on Step 2 | `frontend/src/pages/onboarding/index.tsx:306-372` | Medium | Once the user reaches Step 2 (WhatsApp connection), there is no way to return to Step 1 to change the business template. The `finishOnboarding` button is the only exit, which skips WhatsApp entirely. |
| F3 | Polling interval not configurable | `frontend/src/pages/onboarding/index.tsx:169-173` | Low | The WhatsApp status polling interval is hardcoded to 3000ms. Under high load or with many tenants, this could generate excessive API traffic. The `refetchInterval` callback also has a logic gap: it returns `false` (stop polling) for `close` and `unconfigured` states, meaning a tenant that disconnects mid-session will stop being monitored. |
| F4 | No visual feedback during queue creation | `frontend/src/pages/onboarding/index.tsx:116-134` | Medium | When `setupQueuesMutation` runs, the button shows a loading spinner but there is no progress indicator for how many queues have been created. For templates with 4+ queues (e.g., Hospital), the user has no visibility into which queues succeeded or failed. |
| F5 | Template selection is not reversible | `frontend/src/pages/onboarding/index.tsx:252-289` | Low | Once a business template is selected and queues are created, there is no mechanism to go back and change the template. The user must manually delete and recreate queues. |

#### 1.1.2 Data Validation Errors During Account Setup

| # | Validation Gap | Location | Severity | Description |
|---|---------------|----------|----------|-------------|
| V1 | No subdomain uniqueness check at onboarding | `backend/src/auth/auth.service.ts:154-189` (registerUser) | High | The `registerUser` method creates a tenant with subdomain `temp-${Date.now()}`. If two users register simultaneously with the same email or if the subdomain generation collides (unlikely but possible in rapid succession), there is no collision handling. The Prisma unique constraint on `subdomain` would throw an unhandled error. |
| V2 | No phone number format validation on join | `frontend/src/pages/customer/join/[queueId].tsx:219-231` | High | The phone input is a generic `type="tel"` with no format validation. A user can enter `abc` or leave it as `+123` (incomplete). The backend `requestOtp` in `token.service.ts:25-33` sends the raw phone to WhatsApp without validating the E.164 format, which will fail silently or produce unexpected Evolution API errors. |
| V3 | OTP is 6 digits but stored as plain text in Redis | `backend/src/token/token.service.ts:26-28` | Medium | The OTP is stored in Redis with a 5-minute TTL, but it is a plain numeric string with no rate-limiting per phone number beyond the ThrottlerGuard. A brute-force attack could cycle through 000000-999999 within the TTL window. |
| V4 | No email validation on registration | `backend/src/auth/auth.service.ts:154-189` | Medium | The `registerUser` method accepts any string as `email`. There is no format validation, no domain check, and no duplicate email check before creating the tenant and user. Prisma will throw a unique constraint error on duplicate emails, which is not gracefully handled at the onboarding UI level. |
| V5 | Form config fields with `required: true` are not validated server-side | `backend/src/token/token.service.ts:35-128` | High | The `joinQueue` method does not validate that required form fields from `queue.formConfig` are present in `formResponses`. The frontend validates on the client side (`handleRequestOtp` at line 76-83), but a malicious client can bypass this and submit incomplete data. |

#### 1.1.3 Logical Bottlenecks in Queue Creation

| # | Bottleneck | Location | Severity | Description |
|---|-----------|----------|----------|-------------|
| B1 | Sequential queue creation in onboarding | `frontend/src/pages/onboarding/index.tsx:117-123` | Medium | `Promise.all` is used to create queues in parallel, which is correct. However, the `setupQueuesMutation` does not handle partial failures — if 2 of 4 queues fail, the mutation still resolves with `onSuccess`, and the user proceeds to Step 2 believing all queues were created. |
| B2 | No queue limit per tenant | `backend/src/queue/queue.service.ts:23-44` | Medium | The `createQueue` method has no check on the number of queues a tenant already has. A tenant could create thousands of queues, leading to unbounded growth in Redis keys (`queue:${queueId}:*`) and database rows. |
| B3 | Redis key namespace collision risk | `backend/src/queue/queue.service.ts:39-42, 186-190` | Low | Redis keys use the pattern `queue:${queueId}:state` and `queue:${queueId}:waiting`. If queue IDs are not UUIDs (e.g., sequential integers), there is a risk of key collision across tenants if the ID generation is not globally unique. |
| B4 | WebSocket broadcast does not include tenant context | `backend/src/queue/queue.gateway.ts:53-57` | Medium | `broadcastQueueUpdate` emits to `queue_${queueId}` without verifying that the requesting tenant owns the queue. In a multi-tenant setup, if a tenant subscribes to a queue room they don't own (e.g., by guessing a queueId), they would receive real-time updates for that queue. |
| B5 | No webhook retry for failed notifications | `backend/src/webhooks/webhooks.service.ts:37-77` | Medium | The `triggerWebhooks` method has a 5-second timeout per endpoint and no retry logic. If a tenant's webhook endpoint is down, the event is silently lost. The `CommunicationService` uses BullMQ with 3 retries for WhatsApp messages, but webhooks have no such guarantee. |

### 1.2 Dashboard Workflow Assessment

| # | Friction Point | Location | Severity | Description |
|---|---------------|----------|----------|-------------|
| D1 | Scanner debounce is 1 second | `frontend/src/pages/dashboard/scanner.tsx:184` | Low | The `DEBOUNCE_TIME` of 1000ms is reasonable for human scanning but may be too slow for automated testing where QR codes are generated and scanned rapidly. |
| D2 | No tenant isolation on the scanner history | `frontend/src/pages/dashboard/scanner.tsx:187-195` | High | The `recent-scans` query fetches `/queue/history` without a tenant filter. In a multi-tenant setup, if the API does not enforce tenant scoping, a tenant could see another tenant's scan history. |
| D3 | Idle timeout of 10 seconds | `frontend/src/pages/dashboard/scanner.tsx:185` | Low | The scanner auto-stops after 10 seconds of inactivity. In a busy queue environment, an operator who pauses briefly (e.g., to answer a phone call) will lose their scanning session and must restart. |
| D4 | No keyboard shortcut for scanner actions | `frontend/src/pages/dashboard/scanner.tsx` | Low | The scanner only supports mouse clicks. In a high-throughput environment, keyboard shortcuts (e.g., Space to start/stop, Enter to reset) would improve operator efficiency. |

---

## 2. Stress Test Design

### 2.1 Scenario: Single Tenant Under High Load

**Objective:** Validate system stability, message delivery latency, and throughput when a single tenant operates at scale.

#### 2.1.1 Test Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Connected WhatsApp numbers | 1 | Simulates a single business location with one WhatsApp Business account |
| Concurrent users | 100 | Simulates 100 simultaneous customers interacting with the platform |
| Simultaneous queues | 5 | Simulates a business with multiple service lines (e.g., Registration, Billing, Consultation, Pharmacy, General) |
| Messages per user | 3–4 automated | Simulates the full customer lifecycle: join confirmation, position update, now-serving notification |
| Total expected messages | 300–400 | 100 users × 3–4 messages |
| Test duration | 15 minutes | Sufficient to measure sustained throughput and identify memory leaks |
| Ramp-up period | 3 minutes | Gradual increase from 0 to 100 concurrent users to measure cold-start behavior |

#### 2.1.2 Test Phases

**Phase 1: Cold Start (Minutes 0–3)**
- Ramp from 0 to 100 concurrent users over 3 minutes
- Each user joins a random queue
- Measure: time-to-first-message-delivery, API response times, Redis connection pool utilization
- Success criteria: 95th percentile message delivery latency < 2 seconds

**Phase 2: Steady State (Minutes 3–10)**
- 100 concurrent users active
- Each user receives 3–4 automated messages at randomized intervals (5–30 seconds apart)
- Simulate queue advancement events: advance 1 token every 5 seconds across all 5 queues
- Measure: throughput (messages/second), API error rate, Redis memory usage, PostgreSQL connection count, WebSocket connection stability
- Success criteria:
  - Throughput ≥ 20 messages/second sustained
  - API error rate < 1%
  - No WebSocket disconnections
  - Redis memory growth < 10% over the phase

**Phase 3: Burst Load (Minutes 10–12)**
- Spike to 150 concurrent users for 2 minutes
- All users join queues simultaneously
- Measure: peak throughput, error rate during spike, queue position calculation accuracy
- Success criteria: error rate < 5% during burst, no data corruption in queue positions

**Phase 4: Drain and Recovery (Minutes 12–15)**
- Reduce load back to 0 users over 2 minutes
- Measure: cleanup time for stale Redis keys, WebSocket room cleanup, database row cleanup
- Success criteria: all resources released within 60 seconds of load returning to 0

#### 2.1.3 Metrics Collection

| Metric | Tool | Target |
|--------|------|--------|
| Message delivery latency | Custom instrumentation in `whatsapp.service.ts` | P95 < 2s |
| API response time | NestJS built-in logging + Prometheus | P95 < 500ms |
| Error rate | HTTP response code tracking | < 1% |
| WebSocket connection count | `queue.gateway.ts` connection tracking | Stable at ~100 |
| Redis memory usage | `INFO memory` command | < 500MB |
| PostgreSQL connection count | `pg_stat_activity` | < 20 |
| CPU/Memory of backend | Docker stats / cAdvisor | < 80% utilization |
| Queue position accuracy | Compare Redis sorted set vs DB count | 100% accurate |

#### 2.1.4 Test Implementation

The stress test should be implemented as a Node.js script using the `artillery` or `k6` framework, with a custom WhatsApp message simulator that uses the Evolution API directly (bypassing the normal user flow to generate load).

```
Test script location: /tests/stress/single-tenant-load.test.js
```

Key test actions:
1. Authenticate as tenant admin (obtain JWT)
2. Create 5 queues via `POST /queue`
3. Connect WhatsApp via `POST /whatsapp/connect` (or reuse existing connection)
4. Spawn 100 concurrent virtual users, each:
   - POST `/token/join` with random name + phone
   - Wait for WhatsApp delivery confirmation (poll or listen via webhook)
   - POST `/token/request-otp` and verify OTP via `/token/join`
   - Listen to WebSocket for queue position updates
   - Receive 3–4 automated WhatsApp messages
5. Record latency, success/failure, and throughput metrics
6. Generate a summary report

---

## 3. Automated End-to-End (E2E) Simulation

### 3.1 Overview

This plan details an automation script that simulates the complete customer journey from account creation through queue joining, using randomized mobile numbers and WhatsApp OTP interception.

### 3.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    E2E Simulation Orchestrator                  │
│                     (Node.js / TypeScript)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐ │
│  │ Account      │───▶│ WhatsApp     │───▶│ Queue Join       │ │
│  │ Creation     │    │ OTP Intercept│    │ & Concurrency    │ │
│  │ Module       │    │ Module       │    │ Module           │ │
│  └──────────────┘    └──────────────┘    └──────────────────┘ │
│         │                   │                    │              │
│         ▼                   ▼                    ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐ │
│  │ Tenant Setup │    │ Evolution API│    │ Redis State      │ │
│  │ & Config     │    │ Webhook      │    │ Verification     │ │
│  └──────────────┘    └──────────────┘    └──────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Simulation Steps

#### Step 3.3.1: Simulate Account Creation and Onboarding

```
Action: POST /auth/register
Payload: { email: "sim tenant {N}@test.yq", password: "Test1234!" }
Expected: 201 Created, returns JWT token
Validation:
  - Tenant created with subdomain "temp-{timestamp}"
  - User created with role TENANT_ADMIN
  - Workspace created and linked
  - User.workspaceId is set
```

**Automation script logic:**
- Generate unique email using timestamp + random suffix: `sim-{tenantId}-{rand}@test.yq`
- Register via the auth endpoint
- Store the returned JWT for subsequent authenticated requests
- Use the JWT to create queues (Step 3.3.3)

#### Step 3.3.2: Automate Customer Join Flow with Random Mobile Numbers

```
Action: POST /token/request-otp
Payload: { phone: "+27{random10digits}" }
Expected: 200 OK, "OTP sent"

Action: Intercept OTP from WhatsApp webhook or Redis
Expected: OTP is a 6-digit code stored in Redis with key `otp:{phone}`

Action: POST /token/join
Payload: {
  queueId: "{queueId}",
  customerName: "Sim Customer {N}",
  phone: "+27{random10digits}",
  otp: "{interceptedOTP}",
  formResponses: { ... },
  language: "en"
}
Expected: 201 Created, returns token object with id, queueId, status: WAITING
```

**Random mobile number generation:**
- Use South African format: `+27` followed by 9 digits
- Avoid reserved prefixes (e.g., 0800, 0860 are toll-free)
- Valid range: `+27600000000` to `+27999999999` (excluding known test ranges)
- Ensure no duplicate numbers within a single simulation run

#### Step 3.3.3: OTP Interception via WhatsApp Integration

The OTP interception can be implemented in two ways:

**Approach A: Direct Redis Read (Recommended for Simulation)**
- After calling `POST /token/request-otp`, read the OTP directly from Redis using the key `otp:{phone}`
- This bypasses the need for actual WhatsApp delivery and is reliable in a test environment
- Implementation: `redisClient.get(`otp:${phone}`)`

**Approach B: Webhook Interception**
- Set up a local webhook endpoint that receives the WhatsApp message from Evolution API
- Parse the message body to extract the 6-digit OTP
- This tests the full WhatsApp delivery pipeline but is slower and less reliable

**Approach C: Evolution API Message History**
- Use `GET /message/history/{instanceName}` to retrieve recent messages sent by the instance
- Parse the OTP from the message history
- This is the most realistic approach but adds complexity

**Recommended approach for the simulation script:** Use Approach A (Redis read) for speed and reliability, with an optional flag to use Approach C for end-to-end realism.

#### Step 3.3.4: Populate Queues with Concurrent Users

```
Target: 20 users per queue × 5 queues = 100 total users
Concurrency: 10 simultaneous join operations
```

**Simulation script logic:**
1. Create 5 queues via `POST /queue` (e.g., "Registration", "Billing", "Consultation", "Pharmacy", "General")
2. For each queue, spawn 20 concurrent "customer" simulations:
   - Each customer generates a unique random phone number
   - Each customer calls `requestOtp` → intercept OTP → `joinQueue`
   - Track success/failure per customer
3. After all 100 customers have joined, verify:
   - Each queue has exactly 20 tokens in `WAITING` status
   - Redis sorted set `queue:{queueId}:waiting` has exactly 20 entries
   - PostgreSQL `token` table has 100 rows with correct queue assignments
   - WebSocket events were emitted for each join

### 3.4 Concurrency Test Scenarios

| Scenario | Users | Queues | Users/Queue | Purpose |
|----------|-------|--------|-------------|---------|
| Baseline | 10 | 1 | 10 | Validate basic join flow |
| Target | 100 | 5 | 20 | Validate concurrent joins across queues |
| Overload | 200 | 5 | 40 | Validate behavior beyond expected load |
| Single Queue Storm | 100 | 1 | 100 | Validate queue position accuracy under contention |
| Mixed Timing | 100 | 5 | 20 | Staggered joins (10/s) to simulate real-world arrival patterns |

### 3.5 Verification Assertions

After each simulation run, the script must verify:

1. **Token count:** `SELECT count(*) FROM token WHERE queueId = ? AND status = 'WAITING'` equals expected count
2. **Redis consistency:** `ZCARD queue:{queueId}:waiting` equals expected count
3. **Position accuracy:** The position of each token in the Redis sorted set matches its `position` field in the database
4. **WebSocket delivery:** Each joined customer received a `token_joined` WebSocket event
5. **WhatsApp delivery:** Each customer received a WhatsApp notification (verify via Evolution API message history or mock)
6. **No duplicates:** No two customers share the same phone number in the same queue
7. **No orphaned tokens:** All tokens have a valid `queueId` that references an existing queue
8. **TTL cleanup:** OTP keys in Redis are deleted after successful join (verified by `GET otp:{phone}` returning null)

### 3.6 Simulation Script Structure

```
/tests/e2e-simulation/
├── config.ts              # Test configuration (tenants, queues, users)
├── orchestrator.ts        # Main orchestrator that runs all scenarios
├── account-sim.ts         # Account creation and onboarding simulation
├── customer-sim.ts        # Individual customer join flow simulation
├── otp-interceptor.ts     # OTP interception module (Redis/webhook)
├── queue-populator.ts     # Concurrent queue population logic
├── verifier.ts            # Post-simulation verification assertions
├── reporter.ts            # Generate HTML/JSON test reports
└── utils/
    ├── phone-gen.ts       # Random South African mobile number generator
    ├── auth-helper.ts     # JWT acquisition and token management
    └── api-client.ts      # Typed HTTP client for the YQ API
```

---

## 4. QR Code Automation Workaround

### 4.1 Problem Statement

The current WhatsApp connection flow requires a human to scan a QR code using the WhatsApp mobile app. This creates a hard blocker for automated testing and CI/CD pipelines, where no physical device is available to perform the scan.

### 4.2 Proposed Solution: Backup Validation Code Feature

Implement a "backup validation code" on the WhatsApp connection page that allows automation tools to bypass physical QR scanning by inputting a text-based validation code.

### 4.3 Technical Design

#### 4.3.1 Backend Changes

**New endpoint: `POST /whatsapp/connect-with-code`**

```
Request Body:
{
  "instanceName": "tenant_abc123",
  "validationCode": "WVC-20260731-ABCD1234"
}

Response:
{
  "instanceName": "tenant_abc123",
  "state": "open",
  "qr": null,
  "connected": true
}
```

**Implementation in `whatsapp.service.ts`:**

Add a new method `connectWithValidationCode` that:
1. Validates the `validationCode` against a pre-generated code stored in Redis with a 60-second TTL
2. If valid, creates the WhatsApp instance in the Evolution API with a pre-configured session (simulating a successful QR scan)
3. Sets the webhook
4. Returns the connection state as `open`

```typescript
// In whatsapp.service.ts — new method
async connectWithValidationCode(tenantId: string, validationCode: string) {
  const tenant = await this.prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
  }

  // Validate the code from Redis
  const storedCode = await this.redisService.client.get(
    `whatsapp:validation-code:${tenantId}`,
  );
  if (!storedCode || storedCode !== validationCode) {
    throw new HttpException('Invalid or expired validation code', HttpStatus.BAD_REQUEST);
  }

  // Delete the code after use (single-use)
  await this.redisService.client.del(`whatsapp:validation-code:${tenantId}`);

  const instanceName =
    tenant.whatsappInstanceId || `tenant_${tenantId.substring(0, 8)}`;

  // Create or reuse the instance
  // ... (similar logic to connect() but skip QR generation)
  // Set the instance state to 'open' directly via Evolution API

  await this.setWebhook(instanceName);

  return {
    instanceName,
    state: 'open' as InstanceState,
    qr: undefined,
  };
}
```

**New endpoint in `whatsapp.controller.ts`:**

```typescript
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
@Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
@Post('connect-with-code')
connectWithCode(
  @Req() req: AuthenticatedRequest,
  @Body() body: { validationCode: string },
) {
  return this.whatsappService.connectWithValidationCode(
    req.user.tenantId,
    body.validationCode,
  );
}
```

**New endpoint to generate a validation code: `POST /whatsapp/generate-validation-code`**

This endpoint generates a random 12-character alphanumeric code, stores it in Redis with a 60-second TTL, and returns it. The code is tenant-scoped.

```typescript
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
@Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
@Post('generate-validation-code')
async generateValidationCode(@Req() req: AuthenticatedRequest) {
  const code = this.generateCode(); // e.g., 'WVC-' + randomHex(8)
  await this.redisService.client.set(
    `whatsapp:validation-code:${req.user.tenantId}`,
    code,
    'EX',
    60,
  );
  return { validationCode: code, expiresIn: 60 };
}
```

#### 4.3.2 Frontend Changes

**New UI state on the onboarding WhatsApp connection page (`onboarding/index.tsx`):**

Add a third state alongside the QR code display and the "Connect WhatsApp" button:

```
State: "code-input"
UI: A text input field + "Submit Code" button
```

The flow becomes:
1. User clicks "Connect WhatsApp"
2. System generates a validation code via `POST /whatsapp/generate-validation-code`
3. The code is displayed on screen (e.g., `WVC-20260731-ABCD1234`)
4. The user (or automation tool) enters this code in the input field
5. System calls `POST /whatsapp/connect-with-code` with the code
6. If valid, the WhatsApp connection is established and the user proceeds to the dashboard

**Modified onboarding component (`frontend/src/pages/onboarding/index.tsx`):**

Add a `validationCode` state and a `codeInput` state:

```typescript
const [validationCode, setValidationCode] = useState<string | null>(null);
const [codeInput, setCodeInput] = useState('');
const [connectionMode, setConnectionMode] = useState<'qr' | 'code'>('qr');
```

Add a toggle button: "Use backup code instead" that switches between QR mode and code input mode.

In code input mode:
- Display the generated validation code (copied to clipboard)
- Provide a text input for the user to paste the code
- On submit, call `POST /whatsapp/connect-with-code`

#### 4.3.3 Automation Tool Integration

For the E2E simulation script, the automation flow becomes:

```
1. Authenticate as tenant admin → obtain JWT
2. POST /whatsapp/generate-validation-code → obtain validationCode
3. POST /whatsapp/connect-with-code with validationCode → connection established
4. Proceed with queue creation and customer simulation
```

This eliminates the need for any physical QR scanning and enables fully automated CI/CD pipeline testing.

### 4.4 Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Code interception | Code is single-use and expires after 60 seconds |
| Brute force | Rate-limit the `connect-with-code` endpoint (ThrottlerGuard) |
| Code leakage | Code is displayed only to the authenticated tenant admin |
| Replay attacks | Code is deleted from Redis after first successful use |
| Tenant isolation | Code is scoped to `tenantId`; a code for tenant A cannot be used for tenant B |

### 4.5 Database Schema Changes

No new database table is needed. The validation code is stored ephemerally in Redis with the key pattern `whatsapp:validation-code:{tenantId}`.

---

## 5. Performance and Bug Analysis Framework

### 5.1 Dual-Track Experience Evaluation

The framework evaluates two distinct user experiences:

| Track | Focus | Key Metrics | Primary Actors |
|-------|-------|-------------|----------------|
| **Tenant Experience** | Dashboard responsiveness, queue management | Dashboard load time, queue CRUD latency, scanner validation time, WebSocket update latency | Tenant admins, operators |
| **Customer Experience** | OTP receipt, queue updates | OTP delivery latency, WhatsApp notification latency, queue position accuracy, status page load time | End customers |

### 5.2 Tracing Methodology

#### 5.2.1 Request Tracing

Implement distributed tracing across the following paths:

**Tenant Path:**
```
Tenant Admin → Dashboard (HTTP GET /queues)
  → AuthGuard → WorkspaceGuard → TenantMiddleware
  → QueueService.getQueuesForTenant()
  → Prisma DB query
  → Redis cache lookup
  → Response to dashboard
```

**Customer Path:**
```
Customer → Join Queue (HTTP POST /token/join)
  → ThrottlerGuard → TokenService.joinQueue()
  → OTP verification (Redis)
  → Prisma DB insert
  → Redis sorted set update
  → WebSocket broadcast (QueueGateway)
  → WhatsApp notification (NotificationsService → BullMQ → WhatsappService)
  → Evolution API HTTP call
```

**Scanner Path:**
```
Operator → Scan QR (Browser → Html5Qrcode)
  → POST /token/validate
  → TokenService.validateToken()
  → Redis lookup for serving token
  → Response with validation result
```

#### 5.2.2 Trace ID Propagation

Add a `X-Request-ID` header to all incoming requests via the `request-id.middleware.ts` (already exists at `backend/src/common/middleware/request-id.middleware.ts`). Propagate this ID through all downstream services and include it in all log lines.

**Implementation enhancement:** Add the trace ID to the `X-Request-ID` response header so that the simulation script can correlate requests with server-side logs.

### 5.3 Bug Documentation System

#### 5.3.1 Bug Report Template

Each bug discovered during simulation must be documented using the following template:

```yaml
bug_id: BUG-YYYY-MM-DD-NNN
title: Short descriptive title
severity: critical | high | medium | low | cosmetic
category:
  - tenant_experience | customer_experience | infrastructure | security
affected_component:
  - frontend | backend | whatsapp_integration | redis | postgres | websocket
reproduction_steps:
  - Step 1
  - Step 2
  - Step 3
expected_behavior: What should happen
actual_behavior: What actually happens
simulation_context:
  tenant_count: 1
  concurrent_users: 100
  queues: 5
  messages_per_user: 4
  phase: stress_test | e2e_simulation | cold_start
trace_id: x-request-id from the relevant request
timestamp: ISO 8601 timestamp
log_snippet: Relevant log lines (with trace ID)
screenshot_or_video: Link to recording if applicable
impact: How this affects the user or system
priority_score: 1-10 (see prioritization below)
```

#### 5.3.2 Bug Prioritization Framework

Each bug is assigned a priority score from 1–10 based on the following weighted criteria:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| User impact | 4 | How many users are affected? (1 = single tenant, 10 = all tenants) |
| Data integrity | 3 | Does the bug cause data loss or corruption? (1 = no, 10 = critical data loss) |
| Revenue impact | 2 | Does the bug block payment or subscription flows? (1 = no, 10 = blocks all revenue) |
| Frequency | 1 | How often does the bug occur under normal load? (1 = rare, 10 = always) |

**Priority score formula:**
```
priority_score = (user_impact × 4) + (data_integrity × 3) + (revenue_impact × 2) + (frequency × 1)
```

**Priority tiers:**
| Score Range | Tier | SLA |
|-------------|------|-----|
| 30–40 | P0 — Critical | Fix within 24 hours |
| 20–29 | P1 — High | Fix within 1 week |
| 10–19 | P2 — Medium | Fix within 2 weeks |
| 1–9 | P3 — Low | Fix within 1 month |

#### 5.3.3 Bug Tracking Dashboard

Maintain a live dashboard (could be a simple Markdown file or a dedicated tool like GitHub Issues) with the following views:

1. **By severity:** Group bugs by P0/P1/P2/P3
2. **By component:** Group bugs by frontend/backend/WhatsApp/Redis/Postgres/WebSocket
3. **By experience track:** Group bugs by tenant_experience vs. customer_experience
4. **By simulation phase:** Group bugs discovered during cold start, steady state, burst, or E2E simulation

### 5.4 Tenant vs. Customer Experience Comparison Matrix

| Dimension | Tenant Experience | Customer Experience | Measurement Method |
|-----------|-------------------|---------------------|-------------------|
| Dashboard load time | Time to first meaningful paint of `/dashboard` | N/A | Lighthouse / Playwright `page.goto()` |
| Queue creation latency | Time from `POST /queue` to response | N/A | API response time measurement |
| Scanner validation time | Time from QR scan to validation result | N/A | `performance.now()` in scanner component |
| OTP delivery latency | N/A | Time from `POST /token/request-otp` to WhatsApp receipt | Measure from API response to webhook receipt |
| Queue join latency | N/A | Time from `POST /token/join` to WebSocket `token_joined` event | Measure API response + WebSocket event |
| Position update accuracy | N/A | Does the customer see the correct position? | Compare Redis position vs. displayed position |
| Notification delivery | N/A | Did the WhatsApp notification arrive? | Check Evolution API message history |
| WebSocket stability | N/A | Does the customer's position update in real time? | Monitor WebSocket events over 15 minutes |
| Error rate | API error rate on admin endpoints | API error rate on customer endpoints | Count 4xx/5xx responses per track |

### 5.5 Simulation Bug Triage Process

```
┌─────────────────┐
│  Bug Discovered  │
│  During Sim      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Classify Track  │────▶│ Tenant or        │
│  (tenant/cust)   │     │ Customer         │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Assign Severity │────▶│ P0/P1/P2/P3     │
│  (using matrix)  │     │ via formula      │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Document in     │────▶│ Bug Report       │
│  Bug Template    │     │ Template         │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Link Trace ID   │────▶│ Correlate with   │
│  & Log Snippet   │     │ Server Logs      │
└─────────────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Add to Tracking │
│  Dashboard       │
└─────────────────┘
```

### 5.6 Regression Test Suite

Based on bugs discovered during this QA strategy, maintain a regression test suite that covers:

1. **Onboarding regression tests:** Verify that all 5 friction points (F1–F5) and 5 validation gaps (V1–V5) are covered by automated tests
2. **Queue management regression tests:** Verify that all 5 bottlenecks (B1–B5) are covered
3. **WhatsApp integration regression tests:** Verify OTP flow, message delivery, and webhook handling under load
4. **Tenant isolation regression tests:** Verify that tenants cannot access each other's data
5. **Performance regression tests:** Run the stress test scenario on every PR to catch performance regressions

### 5.7 Reporting Cadence

| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| Daily simulation summary | Daily (during active testing) | QA team | Bugs found, metrics, pass/fail status |
| Weekly performance report | Weekly | Engineering leads | Latency trends, throughput trends, resource utilization |
| Sprint retrospective | Per sprint | All stakeholders | Bug trends, resolved issues, new issues, action items |
| Monthly capacity report | Monthly | Engineering management | Scaling readiness, projected limits, infrastructure recommendations |

---

## Appendix A: Environment Setup for QA

### A.1 Required Services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5455 | Primary database |
| Redis | 6380 | Queue engine, OTP storage, validation codes |
| Evolution API | 8080 | WhatsApp integration |
| Backend (NestJS) | 3000 | API server |
| Frontend (Next.js) | 3001 | Admin dashboard and customer pages |

### A.2 Environment Variables for Testing

```env
# QA-specific overrides
TEST_MODE=true
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=<EVOLUTION_API_KEY>
APP_URL=http://localhost:3001
REDIS_URI=redis://localhost:6380
DATABASE_URL=postgresql://postgres:postgres@localhost:5455/yq_queue
```

### A.3 Running the QA Suite

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Run backend unit tests
cd backend && npm run test

# 3. Run E2E simulation
cd /tests/e2e-simulation && npm run simulate

# 4. Run stress test
cd /tests/stress && npm run load-test

# 5. Run Playwright E2E tests
cd frontend && npx playwright test

# 6. Generate combined report
npm run qa-report
```

---

## Appendix B: Key Code References

| File | Lines | Relevance |
|------|-------|-----------|
| `backend/src/whatsapp/whatsapp.service.ts` | 193–356 | WhatsApp connection and QR flow |
| `backend/src/whatsapp/whatsapp.service.ts` | 448–674 | Webhook handling and message sending |
| `backend/src/token/token.service.ts` | 25–128 | OTP request, queue join, and WhatsApp notification |
| `backend/src/queue/queue.service.ts` | 169–204 | `joinQueue` logic and Redis sorted set |
| `backend/src/auth/auth.service.ts` | 154–189 | User registration and tenant creation |
| `frontend/src/pages/onboarding/index.tsx` | 106–378 | Onboarding wizard with WhatsApp connection |
| `frontend/src/pages/customer/join/[queueId].tsx` | 1–362 | Customer queue join flow with OTP |
| `frontend/src/pages/dashboard/scanner.tsx` | 1–711 | QR scanner with validation results |
| `backend/src/queue/queue.gateway.ts` | 1–62 | WebSocket broadcasting for queue updates |
| `backend/src/webhooks/webhooks.service.ts` | 37–77 | Webhook triggering with 5s timeout |
| `backend/src/communication/communication.service.ts` | 295–322 | Queue joined WhatsApp notification |
| `backend/src/notifications/notifications.service.ts` | 1–68 | WhatsApp message queue and execution |
| `backend/src/tenant/tenant.service.ts` | 1–35 | Tenant creation and lookup |
| `backend/src/whatsapp/whatsapp.controller.ts` | 1–49 | WhatsApp API endpoints |
| `backend/src/token/token.controller.ts` | 1–50 | Token join, OTP, and validation endpoints |
| `frontend/playwright.config.ts` | 1–30 | Playwright E2E test configuration |
| `docker-compose.yml` | 1–60 | Infrastructure services (Postgres, Redis, Evolution API) |
