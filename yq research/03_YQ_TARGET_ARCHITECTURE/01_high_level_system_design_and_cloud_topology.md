# YQ Target Architecture: High-Level System Design & Cloud Topology

> **Document Status:** Architectural Blueprint (Target Standard)
> **Owner:** Staff Software Architect
> **Classification:** Confidential — Internal Engineering Documentation

---

## 1. Executive Summary & Design Tenets

**YQ** is engineered from the ground up as an enterprise-grade, cloud-native SaaS OS designed to conquer the structural shortcomings of incumbent Queue and Visit management platforms. Our high-level system design enforces four immovable tenets:

1. **Absolute Real-Time Syncdom:** Sub-50ms global state updates across all terminal web workspaces, kiosk screens, and mobile wallets via distributed WebSocket brokers.
2. **Offline-First Edge Resiliency:** Physical branch operations (check-ins, ticketing, local receipt printing) MUST continue without interruption during complete WAN internet outages.
3. **Infinite Horizontal Scale:** Multi-tenant microservice boundaries executed on stateless compute clusters capable of withstanding massive concurrent traffic spikes (e.g., national hospital onboarding or retail holiday surges).
4. **Zero-Trust Security & Tenant Isolation:** Strict multi-tenant schema isolation, attribute-based access governance, and comprehensive encryption with Customer-Managed Keys (CMK).

---

## 2. Complete Global Cloud Topology & Network Boundaries

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
        QUEUE[Queue & Dynamic SLA Routing Microservice]
        APPT[Appointment Concurrency & Scheduling Microservice]
        VISIT[Visitor & ACS Access Control Microservice]
        NOTIFY[Omnichannel Webhook & Chat Orchestrator]
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
    API_GW --> QUEUE
    API_GW --> APPT
    API_GW --> VISIT
    
    WS_EDGE <-->|Pub/Sub State Streams| REDIS
    
    QUEUE <--> REDIS
    APPT <--> REDIS
    VISIT <--> REDIS
    
    QUEUE --> PG_MASTER
    APPT --> PG_MASTER
    VISIT --> PG_MASTER
    AUTH --> PG_MASTER
    
    QUEUE --> EVENT_LOG
    APPT --> EVENT_LOG
    VISIT --> EVENT_LOG
    
    EVENT_LOG --> NOTIFY
    NOTIFY -->|Webhooks / SMS / WhatsApp / Pass| M_PWA
```

---

## 3. Microservice Service Boundaries & Separation of Concerns

### 3.1 `Auth & IAM Engine`
* **Responsibilities:** Evaluates multi-tenant JWT validation, executes SCIM user auto-provisioning from Okta/Entra ID, and evaluates real-time Attribute-Based Access Control (ABAC) governance policies.
* **Tech Specifications:** High-speed stateless validation via edge-cached JWKS (JSON Web Key Sets).

### 3.2 `Queue & Dynamic SLA Routing Microservice`
* **Responsibilities:** Manages live walk-in tickets, computes exponentially weighted wait times (EWMA), maintains starvation-free Weighted Deficit Round Robin queue sorting in Redis, and pushes instant counter assignments.
* **Tech Specifications:** Built in Go or Rust for microsecond memory execution during intense concurrency.

### 3.3 `Appointment Concurrency & Scheduling Microservice`
* **Responsibilities:** Enforces optimistic/pessimistic distributed locking (Redlock) during time-slot checkout, prevents double-booking, manages multi-resource interval trees, and processes live webhook streams from Microsoft Graph API and Google Workspace.

### 3.4 `Visitor & ACS Access Control Microservice`
* **Responsibilities:** Governs host check-in invitations, manages facial/ID OCR verification workflows, verifies watchlist database blocklists, and dispatches encrypted open-gate commands to physical security turnstiles and local badge printers.

### 3.5 `Omnichannel Webhook & Chat Orchestrator`
* **Responsibilities:** Asynchronously consumes domain lifecycle events from Kafka/EventBridge, evaluates cost-routing failover across Meta WhatsApp Cloud API and Twilio SMS pools, and emits APNs/FCM silent push notifications to Apple/Google Wallet passes.

---

## 4. Resilience, Auto-Scaling, and Disaster Recovery

* **Zero-Downtime Blue-Green Deployments:** Compute containers deploy across redundant Availability Zones via Kubernetes rolling deployments, ensuring zero dropped WebSocket connections during updates.
* **Multi-Region Recovery Point Objective (RPO) & RTO:** Primary relational tables maintain continuous cross-region asynchronous storage replicas, ensuring an RPO of <1 second and an automated failover Recovery Time Objective (RTO) under 60 seconds during a regional cloud outage.
