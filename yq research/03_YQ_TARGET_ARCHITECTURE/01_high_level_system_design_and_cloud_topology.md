# YQ Target Architecture: High-Level System Design & Cloud Topology

> **Document Status:** Architectural Blueprint (Target Standard)
> **Owner:** Staff Software Architect
> **Classification:** Confidential — Internal Engineering Documentation

---

## 1. Executive Summary & Design Tenets

**YQ** is engineered from the ground up as an enterprise-grade, cloud-native **Visit Orchestration Platform** for physical businesses. Our high-level system design enforces four immovable tenets:

1. **Visit-Centric Data Model:** The fundamental operational object is the **Visit**, not Queue, Token, or Appointment. All customer interactions—appointments, walk-ins, WhatsApp bookings, QR check-ins, phone reservations—converge into a single Visit entity with a unified lifecycle.
2. **Absolute Real-Time Syncdom:** Sub-50ms global state updates across all terminal web workspaces, kiosk screens, and mobile wallets via distributed WebSocket brokers.
3. **Offline-First Edge Resiliency:** Physical branch operations (check-ins, ticketing, local receipt printing) MUST continue without interruption during complete WAN internet outages.
4. **Infinite Horizontal Scale:** Multi-tenant microservice boundaries executed on stateless compute clusters capable of withstanding massive concurrent traffic spikes (e.g., national hospital onboarding or retail holiday surges).
5. **Zero-Trust Security & Tenant Isolation:** Strict multi-tenant schema isolation, attribute-based access governance, and comprehensive encryption with Customer-Managed Keys (CMK).

---

## 2. The Visit-Centric Product Model

### 2.1 Core Concept

**The fundamental operational object is the Visit.**

A Visit represents a single customer's interaction with a business at a specific location for a specific service. It is created regardless of how the customer arrives, and it flows through a configurable lifecycle until completion.

```
Business
   ↓
Location
   ↓
Service
   ↓
Visit
   ↓
┌─────────────────────────────────────────────┐
│ Appointment        (booked in advance)      │
│ Walk-in            (arrives and joins)      │
│ Website booking    (self-service online)    │
│ WhatsApp booking   (conversational AI)      │
│ Reception booking  (staff creates)          │
│ Phone booking      (staff creates)          │
│ Kiosk              (self-service on-site)   │
│ QR check-in        (scan and join)          │
│ External integration (EHR/CRM/API)          │
└─────────────────────────────────────────────┘
   ↓
Visit Flow
   ↓
Waiting / Queue / Scheduled / Assigned
   ↓
Staff + Resource
   ↓
Service
   ↓
Completed
```

### 2.2 Visit vs Appointment (Critical Distinction)

| Concept | Definition | Analogy |
|---------|-----------|---------|
| **Appointment** | A reservation for future capacity. Has a scheduled time, provider, and resource. | "I have a reservation at 5:30 PM" |
| **Visit** | The actual interaction with the business. Has an arrival time, check-in time, waiting start, service start, service end, and completion. | "I arrived at 5:28 PM, was seen at 5:35 PM, left at 5:55 PM" |

**Key rule:** An appointment can become a Visit. A walk-in creates a Visit without an Appointment. The appointment time and actual service time are separate concepts.

### 2.3 Visit Lifecycle States

```
CREATED
   ↓
SCHEDULED (appointment only)
   ↓
CHECKED_IN
   ↓
WAITING
   ↓
CALLED / ASSIGNED
   ↓
IN_SERVICE
   ↓
COMPLETED
```

**Alternative/terminal states:**
- `CANCELLED` — customer or staff cancelled
- `NO_SHOW` — appointment holder didn't arrive
- `MISSED` — customer missed their turn
- `RESCHEDULED` — moved to new time
- `ON_HOLD` — temporarily paused
- `TRANSFERRED` — moved to another service/staff
- `ABANDONED` — customer left the queue

The configured service flow determines which states are relevant. A strict appointment-only service skips `WAITING` and goes directly from `CHECKED_IN` to `IN_SERVICE`.

### 2.4 Visit Entry Points (Channels)

| Channel | Creates | Description |
|---------|---------|-------------|
| Public booking page | Appointment → Visit | Customer self-books via YQ-hosted page |
| Website widget | Appointment → Visit | Same engine embedded in business website |
| WhatsApp | Appointment → Visit | Conversational AI booking via chat |
| Phone | Appointment → Visit | Receptionist creates manually |
| Reception/front desk | Visit (walk-in or appointment) | Staff creates immediately |
| Kiosk | Visit | Self-service on-site |
| QR code | Visit | Scan to join queue or check in |
| External integration | Appointment → Visit | EHR, CRM, Google, partner API |

All channels create the same internal **Visit** object.

### 2.5 Service Availability Abstraction

Customers ask: *"When can I receive this service?"* — not *"Which queue should I join?"*

YQ calculates availability based on:
- Service
- Location
- Staff
- Resource
- Operating hours
- Service duration
- Existing appointments
- Existing visits
- Capacity
- Scheduling rules

**Example:**
```
General Consultation
Location: Bangalore Branch
Providers: Dr A, Dr B
Rooms: Room 1, Room 2
Duration: 30 min
Capacity: 2 concurrent consultations

YQ determines available time slots based on:
- Doctor schedules
- Room availability
- Existing appointments
- Current queue depth
- Walk-in capacity buffer
```

---

## 3. Scheduling Models

Businesses choose their scheduling model during onboarding. The system configures the underlying engine automatically.

### 3.1 Strict Fixed Appointments
```
5:00 → 5:30 → 6:00 → 6:30
```
- Customer books a specific slot
- Late arrival does not automatically move the appointment
- Use cases: visa appointments, government, certain clinics, interviews

### 3.2 Flexible Appointment + Walk-in
- Appointments reserve capacity
- Walk-ins fill available capacity
- System decides who is served next
- Use cases: clinics, hospitals, retail

### 3.3 Variable-Duration Service
- System learns actual service duration from historical data
- Adjusts subsequent capacity dynamically
- Example: average 22 min, actual 14 min → next slot opens earlier

### 3.4 Pure Walk-in
- No appointments
- Walk-in → Waiting → Service
- Use cases: food service, walk-in clinics

### 3.5 Appointment-Only
- No walk-ins
- Appointment → Check-in → Service
- Use cases: private practices, consultations

### 3.6 Appointment + Virtual Waiting
- Customer has reservation but doesn't physically stand in line
- Appointment → Check-in → Virtual waiting → "You're next" → Service
- Use cases: modern clinics, government offices

---

## 4. Smart Scheduling & Capacity Release

### 4.1 Early Completion Example

```
Doctor schedule:
5:00 PM → Patient A (appointment)
5:30 PM → Patient B (appointment)
6:00 PM → Patient C (appointment)

Patient A finishes at 5:10 PM (early)
Patient C has already arrived
Patient B hasn't arrived

YQ decision:
5:10 PM → Patient C eligible for early service
Patient B's reservation remains at 5:30 PM

When B arrives:
- If doctor available → serve immediately
- If doctor busy → place in waiting state
```

**Key insight:** Appointment time and actual service time are separate concepts.

### 4.2 Capacity Rules

| Scenario | System Action |
|----------|--------------|
| Earlier appointment finishes early | Release capacity, offer to next eligible visit |
| Current appointment runs long | Delay subsequent appointments, notify affected customers |
| Walk-in arrives during appointment block | Fit into available capacity or queue |
| No-show detected | Release slot, offer to waitlist |
| Customer cancels | Release slot immediately |
| Customer reschedules | Move to new time, release old slot |

---

## 5. Complete Global Cloud Topology & Network Boundaries

```mermaid
flowchart TB
    subgraph Client_Surface_Area [Universal Client Touchpoints]
        M_PWA[Customer Mobile Web PWA / QR Checkout]
        A_UI[Staff & Concierge Reactive OS Browser UI]
        K_UI[Hardware Touch Kiosks & Lobby Signage TVs]
        E_SYS[Enterprise Integrations: EHR / CRM / ACS]
    end

    subgraph Edge_&_Ingestion_Layer [Global CDN & Edge Gateway Tier]
        CDN[Cloudflare Global CDN / DDOS Protection / WAF]
        API_GW[Kong / AWS API Gateway (Rate Limiting & Auth Intercept)]
        WS_EDGE[Global Edge WebSocket Routers (WebSockets / SSE)]
    end

    subgraph Core_Microservices_Engine [Stateless Kubernetes Compute Cluster]
        AUTH[Auth & IAM Engine (SSO/SAML/SCIM)]
        VISIT[Visit Orchestration Engine]
        NOTIFY[Omnichannel Notification & Chat Orchestrator]
        AI[Autonomous Kingman Variance AI]
    end

    subgraph Distributed_State_&_Storage [Data Persistence & Cache Tier]
        REDIS[(Redis Cluster: Real-time Locks, Pub/Sub, EWMA Cache)]
        PG_MASTER[(PostgreSQL Master Cluster: Siloed / Pooled Tenant Shards)]
        EVENT_LOG[(Apache Kafka / AWS EventBridge Event Streaming Bus)]
        S3[(Object Cloud Blob Store: Legal NDAs / Kiosk Branding Assets)]
    end

    M_PWA --> CDN
    A_UI --> CDN
    K_UI --> CDN
    E_SYS --> API_GW
    
    CDN --> API_GW
    CDN <-->|Persistent WSS Tunnel| WS_EDGE
    
    API_GW --> AUTH
    API_GW --> VISIT
    API_GW --> NOTIFY
    
    WS_EDGE <-->|Pub/Sub State Streams| REDIS
    
    VISIT <--> REDIS
    VISIT --> PG_MASTER
    VISIT --> EVENT_LOG
    
    AUTH --> PG_MASTER
    NOTIFY --> EVENT_LOG
    AI --> EVENT_LOG
    AI --> REDIS
    
    EVENT_LOG --> NOTIFY
    NOTIFY -->|Webhooks / SMS / WhatsApp / Pass| M_PWA
```

**Key change from previous architecture:** The separate `Queue`, `Appointment`, and `Visitor` microservices are replaced by a single **Visit Orchestration Engine** that handles all visit types through a unified state machine.

---

## 6. Visit Orchestration Engine

### 6.1 Responsibilities

The Visit Orchestration Engine is the **central nervous system** of YQ. It:
- Accepts Visit creation from all channels (web, WhatsApp, walk-in, QR, integrations)
- Calculates service availability in real-time
- Manages the Visit lifecycle state machine
- Handles scheduling logic (fixed, flexible, variable-duration)
- Manages capacity allocation and release
- Coordinates staff and resource assignment
- Emits lifecycle events to Kafka for downstream processing

### 6.2 Core Data Model

```sql
-- The fundamental entity
CREATE TABLE visits (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    location_id UUID NOT NULL,
    service_id UUID NOT NULL,
    appointment_id UUID NULL,  -- nullable: walk-ins have no appointment
    
    -- Customer
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NULL,
    customer_metadata JSONB NULL,  -- flexible fields
    
    -- Timing
    scheduled_at TIMESTAMPTZ NULL,  -- appointment time
    arrived_at TIMESTAMPTZ NULL,    -- when customer arrived on-premise
    checked_in_at TIMESTAMPTZ NULL,
    waiting_started_at TIMESTAMPTZ NULL,
    called_at TIMESTAMPTZ NULL,
    service_started_at TIMESTAMPTZ NULL,
    service_ended_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    
    -- Assignment
    assigned_staff_id UUID NULL,
    assigned_resource_id UUID NULL,
    
    -- State
    status VISIT_STATUS NOT NULL DEFAULT 'CREATED',
    priority INTEGER NOT NULL DEFAULT 100,
    
    -- Source tracking
    source VISIT_SOURCE NOT NULL,  -- 'web', 'whatsapp', 'walkin', 'phone', 'kiosk', 'qr', 'integration'
    source_metadata JSONB NULL,
    
    -- Outcomes
    outcome VISIT_OUTCOME NULL,  -- 'completed', 'no_show', 'cancelled', etc.
    outcome_notes TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services define how visits are handled
CREATE TABLE services (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    location_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    capacity INTEGER NOT NULL DEFAULT 1,  -- concurrent visits
    scheduling_model SCHEDULING_MODEL NOT NULL DEFAULT 'flexible',  -- 'strict', 'flexible', 'variable', 'walkin_only', 'appointment_only', 'virtual_waiting'
    requires_skills TEXT[] NULL,
    allowed_sources VISIT_SOURCE[] NOT NULL DEFAULT ARRAY['walkin', 'appointment'],
    sla_threshold_minutes INTEGER NULL,
    wdrr_priority INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff/resources that serve visits
CREATE TABLE resources (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    location_id UUID NOT NULL,
    type RESOURCE_TYPE NOT NULL,  -- 'human', 'room', 'equipment'
    name TEXT NOT NULL,
    skills TEXT[] NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    operating_hours JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.3 Visit State Machine

```
CREATED
   ↓ (check-in)
SCHEDULED → CHECKED_IN
   ↓
WAITING
   ↓ (call/assign)
CALLED / ASSIGNED
   ↓
IN_SERVICE
   ↓
COMPLETED

Alternative paths:
CREATED → CANCELLED
SCHEDULED → NO_SHOW
WAITING → ON_HOLD
IN_SERVICE → TRANSFERRED
ANY → ABANDONED
```

### 6.4 Capacity Engine

The capacity engine answers: *"When is this service available?"*

```
capacity = f(
    service.duration_minutes,
    resource.availability,
    resource.operating_hours,
    existing_appointments,
    existing_visits,
    scheduling_model,
    sla_threshold,
    historical_duration_variance
)
```

For variable-duration services, the engine uses Kingman's formula (G/G/s queue theory) to predict wait times and adjust capacity dynamically.

---

## 7. Microservice Service Boundaries

### 7.1 `Auth & IAM Engine`
* **Responsibilities:** Evaluates multi-tenant JWT validation, executes SCIM user auto-provisioning from Okta/Entra ID, and evaluates real-time Attribute-Based Access Control (ABAC) governance policies.
* **Tech Specifications:** High-speed stateless validation via edge-cached JWKS (JSON Web Key Sets).

### 7.2 `Visit Orchestration Engine`
* **Responsibilities:** Central state machine for all visits. Handles creation from all channels, lifecycle transitions, capacity calculation, scheduling logic, staff/resource assignment, and real-time state broadcasting.
* **Tech Specifications:** Built in Go or Rust for microsecond memory execution during intense concurrency. Uses Redis Redlock for distributed locking and Postgres for persistence.

### 7.3 `Omnichannel Notification & Chat Orchestrator`
* **Responsibilities:** Asynchronously consumes visit lifecycle events from Kafka/EventBridge, evaluates cost-routing failover across Meta WhatsApp Cloud API and Twilio SMS pools, emits APNs/FCM silent push notifications to Apple/Google Wallet passes, and manages two-way WhatsApp chat sessions.
* **Tech Specifications:** Event-driven architecture with exactly-once processing semantics.

### 7.4 `Autonomous Kingman Variance AI`
* **Responsibilities:** Continuously analyzes queue depth, service duration variance, and staff utilization. Predicts SLA breaches 15 minutes in advance. Autonomously adjusts capacity allocation, reassigns staff, and modifies routing rules to prevent bottlenecks.
* **Tech Specifications:** Streaming ML inference on Kafka event streams. Kingman's G/G/s formula for wait time prediction. Reinforcement learning for self-healing actions.

---

## 8. Resilience, Auto-Scaling, and Disaster Recovery

* **Zero-Downtime Blue-Green Deployments:** Compute containers deploy across redundant Availability Zones via Kubernetes rolling deployments, ensuring zero dropped WebSocket connections during updates.
* **Multi-Region Recovery Point Objective (RPO) & RTO:** Primary relational tables maintain continuous cross-regional asynchronous storage replicas, ensuring an RPO of <1 second and an automated failover Recovery Time Objective (RTO) under 60 seconds during a regional cloud outage.
* **Offline-First Edge:** All state transitions are cached locally in IndexedDB at the client. When connectivity resumes, the client replays the event stream to achieve eventual consistency.

---

## 9. Data Flow: Visit Creation Across Channels

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Website   │     │  WhatsApp   │     │    Kiosk    │     │  Reception  │
│   Widget    │     │   Bot       │     │   Screen    │     │   Desk      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │                    │
       └────────────────────┼────────────────────┼────────────────────┘
                            │                    │
                            ▼                    ▼
                   ┌─────────────────────────────────────┐
                   │   Visit Orchestration Engine        │
                   │   (createVisit / calculateAvailability) │
                   └─────────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────────────────────────┐
                   │   Redis State Stream (Pub/Sub)      │
                   │   visit:created → all terminals     │
                   └─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │  Staff UI     │ │  Customer PWA │ │  Lobby TV     │
    │  (Today view) │ │  (My visit)   │ │  (Roster)     │
    └───────────────┘ └───────────────┘ └───────────────┘
```

---

## 10. Visit-Centric Frontend Architecture

### 10.1 Operational Command Center ("Today")

The primary operational view is **Today** — a real-time feed of all active Visits for the selected location.

```
┌─────────────────────────────────────────────────────────────┐
│ Today — General Admissions                     [Cmd+K] [🔔] │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  NOW     │  10:00  John Doe        Consultation    Waiting  │
│          │  10:15  Sarah Smith      Consultation    Checked In│
│  Next    │  10:30  Mike Johnson     Consultation    Upcoming │
│          │  10:45  Lisa Chen        X-Ray           Waiting  │
│          │  11:00  David Park       Follow-up       Called   │
│          │                                                  │
│ Staff    │  [Call Next] [Check In] [Start] [Complete]        │
│ 🟢 Dr A  │                                                  │
│ 🟡 Dr B  │                                                  │
│ 🔴 Dr C  │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

**Key insight:** The operator sees **Visits**, not Queue tokens. Actions (Call Next, Start, Complete) are Visit state transitions.

### 10.2 Settings Contains the Complexity

Settings pages configure the behavior that determines how Visits flow:

| Setting | Purpose |
|---------|---------|
| Business | Org name, timezone, branding |
| Locations | Facilities, rooms, hardware, operating hours |
| Services | Service lines, duration, capacity, scheduling model, required skills |
| Staff | People, roles, skills, schedules |
| Resources | Rooms, equipment, dependencies |
| Scheduling Rules | Fixed vs flexible, overbooking, buffer times |
| Visit Rules | Auto-check-in, no-show thresholds, transfer rules |
| Notifications | WhatsApp, SMS, Wallet push rules |
| Branding | Logo, colors, pass templates |
| Integrations | EHR, CRM, SSO, calendars |
| Roles & Permissions | RBAC/ABAC governance |
| Billing | Plans, usage, invoices |

---

*Document updated to reflect Visit-centric product model. Supersedes previous Queue/Token-centric architecture.*
