# Domain Synthesis: Concurrency, Double-Booking Prevention & Scheduling Engines

> **Document Status:** Active Standard & Synthesis Benchmark
> **Author:** Staff Software Architect & Technical Writer
> **Purpose:** Comprehensive architectural evaluation of distributed concurrency models, transaction locking mechanics, and bidirectional calendar synchronization protocols across the SaaS landscape.

---

## 1. Executive Summary

In appointment scheduling platforms (such as JRNI, Skedulo, or Waitwhile), the single most catastrophic engineering failure mode is the **Double-Booking Race Condition**—occurring when concurrent users simultaneously claim the same available time slot, or when background calendar synchronization lag overwrites a blocked personal calendar event.

This document establishes YQ's engineering protocol for distributed locking, optimistic concurrency control, and zero-latency webhook calendar federation.

---

## 2. Race Condition Mitigation Models (Incumbent vs. YQ)

```mermaid
sequenceDiagram
    autonumber
    actor Client A (User 1)
    actor Client B (User 2)
    participant API as YQ Edge API Gateway
    participant Lock as Redis Distributed Lock (Redlock)
    participant DB as YQ Relational DB

    Client A->>API: POST /reserve (Slot: 10:00 AM, Resource_ID: 88)
    Client B->>API: POST /reserve (Slot: 10:00 AM, Resource_ID: 88) [Simultaneous]
    API->>Lock: SETEX lock:resource:88:2026-08-05T10:00 600 "Client_A_UUID" NX
    Note over Lock: NX flag guarantees atomic exclusive creation. Lock assigned to Client A.
    Lock-->>API: OK (Lock Acquired for Client A)
    API->>Lock: SETEX lock:resource:88:2026-08-05T10:00 600 "Client_B_UUID" NX
    Lock-->>API: NIL (Lock Acquisition Failed for Client B)
    API->>DB: INSERT INTO reservation_holds (slot, client, expires_at)
    API-->>Client A: 200 OK (Slot Held for 10 minutes to complete checkout)
    API-->>Client B: 409 Conflict ("This slot was just reserved by another user. Please select another time.")
```

---

## 3. YQ Concurrency & Locking Specification

### 3.1 Two-Phase Booking State Machine
To deliver a frictionless UX while guaranteeing database consistency, YQ separates booking into two transactional stages:
1. **Phase 1: Temporary Slot Reservation (Distributed Lock in Redis):**
   When a user clicks a time slot, the edge API executes an atomic Redis `SET resource_id:timestamp client_uuid NX EX 600` command. This secures a lightweight 10-minute temporary reservation without performing heavy relational database locking.
2. **Phase 2: Booking Confirmation (Optimistic Commit & Idempotency):**
   Upon payment or detail submission, the backend validates the Redis lock UUID, commits the final immutable `Appointment` row inside PostgreSQL within an ACID transaction, and immediately deletes the temporary Redis key. Every confirmation request mandates an `Idempotency-Key` header (UUIDv4) to guarantee network retry resiliency during cellular dropouts.

---

## 4. Enterprise Calendar Federation & Real-Time Webhook Engine

Legacy scheduling SaaS platforms rely on polling architectures (e.g., executing background cron jobs every 15 minutes to inspect external Microsoft Exchange or Google Workspace calendars for new events). **This 15-minute sync window represents a critical double-booking vulnerability.**

### 4.1 YQ Real-Time Push Sync Specification
YQ implements exclusively bidirectional event-driven synchronization using official provider Webhooks:
* **Microsoft 365 / Exchange Online:** YQ deploys background workers that register subscriptions with the **Microsoft Graph API Change Notification Webhook** engine. Whenever an employee creates an appointment directly inside Desktop Outlook, Microsoft servers push an encrypted JSON payload to YQ's endpoints within 3 seconds, triggering an immediate slot closure in YQ's Redis availability tree.
* **Google Workspace:** YQ subscribes to **Google Calendar API Push Notifications via Webhooks (`events.watch`)**, ensuring sub-5-second synchronization across all connected staff calendars globally.
