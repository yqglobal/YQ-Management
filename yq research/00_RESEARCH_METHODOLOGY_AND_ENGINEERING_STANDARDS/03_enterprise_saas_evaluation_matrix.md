# Enterprise SaaS Evaluation Matrix & Scorecard Framework

> **Document Status:** Active Standard
> **Owner:** Enterprise SaaS Consultant & Senior Product Manager
> **Classification:** Confidential — Internal Engineering Documentation

---

## 1. Overview of Evaluation Framework

To maintain absolute architectural rigor when benchmarking competitive platforms and setting quality targets for **YQ**, every system is evaluated across seven distinct enterprise engineering vectors. Each vector is scored on a **0.0 to 5.0 scale**, enforced by strict objective criteria.

---

## 2. The 7 Evaluation Vectors & Scoring Criteria

```mermaid
radar-chart
    title Target YQ Enterprise Superiority vs. Industry Benchmark
    axis Architecture & Scalability, Realtime & Sync Resiliency, Enterprise Security & Governance, UX & Zero-Friction Flow, Omnichannel Communication, Hardware & IoT Integration, API & Developer Ecosystem
    "Industry Average (Incumbents)" : [3.1, 2.8, 3.5, 2.9, 3.2, 3.4, 2.7]
    "YQ Target Standard" : [4.9, 5.0, 4.9, 4.9, 4.8, 4.7, 4.9]
```

### Vector 1: Cloud Architecture & Scalability
* **5.0 (Elite / YQ Target):** Fully multi-tenant cloud-native architecture; distributed microservices with horizontal auto-scaling; global CDN edge caching; stateless API compute nodes; 99.99% financially backed uptime SLA.
* **3.0 (Standard SaaS):** Multi-tenant database architecture with monolithic backend or coarse microservices; single-region cloud hosting; standard 99.9% uptime SLA without high-availability cross-region failover.
* **1.0 (Legacy / Hosted On-Prem):** Single-tenant VM instances per customer; manual database scaling; architecture clearly ported from Windows Server on-premise software; severe downtime during version upgrades.

### Vector 2: Real-time Sync & Edge Resiliency
* **5.0 (Elite / YQ Target):** Sub-100ms bidirectional WebSocket sync across all connected clients; robust Service Worker offline caching for touch kiosks and counter terminals; automatic queue local reconciliation upon internet restoration without data loss.
* **3.0 (Standard SaaS):** WebSocket or SSE push notifications for counter updates; requires continuous internet connectivity; zero operational capability when network connections drop.
* **1.0 (Legacy / Fragile):** Reliant on aggressive HTTP client long-polling (e.g., polling every 5–10 seconds); high server overhead; frequent interface desynchronization during peak traffic.

### Vector 3: Enterprise Security & Governance
* **5.0 (Elite / YQ Target):** Granular Attribute-Based Access Control (ABAC) combined with RBAC; native enterprise SSO (SAML 2.0, OIDC, SCIM auto-provisioning); data encryption at rest with tenant customer-managed keys (CMK/BYOK); full SOC2 Type II, HIPAA, and GDPR compliance with automated audit log streaming (SIEM integration).
* **3.0 (Standard SaaS):** Standard Role-Based Access Control (Admin, Manager, Staff); Basic SAML SSO for enterprise plans; general AES-256 database encryption at rest; standard GDPR privacy features.
* **1.0 (Legacy / Weak):** Flat user permission hierarchies; username/password authentication without enforcement of multi-factor authentication (MFA); shared database encryption keys across tenants; lack of actionable audit logging.

### Vector 4: UX & Zero-Friction Journey (Customer & Staff)
* **5.0 (Elite / YQ Target):** Zero-install customer mobile web experiences (PWA) loading under 1.5 seconds; WCAG 2.1 AAA accessibility compliance; high-contrast kiosk mode with screen reader & sensory assistance; single-click agent desktop controls with visual micro-animations and zero latency.
* **3.0 (Standard SaaS):** Responsive web interface for ticketing and check-in; adequate desktop agent interface with minor navigation friction; WCAG AA compliance; moderate page load times (2–4 seconds).
* **1.0 (Legacy / High Friction):** Requires native App Store mobile app download for virtual queues; clumsy, outdated admin desktop interface requiring heavy staff training; non-compliant accessibility layouts.

### Vector 5: Omnichannel Communication & Journey Orchestration
* **5.0 (Elite / YQ Target):** Unified multi-channel routing (WhatsApp Business API with rich conversational interactivity, SMS, Email, voice call IVR, Apple Wallet / Google Wallet dynamic passes); intelligent automatic failover (e.g., if WhatsApp fails, fall back to SMS instantly); multilingual localization.
* **3.0 (Standard SaaS):** One-way notification broadcasts via standard SMS and email; basic appointment reminder schedules; static text templates without conversational branching or wallet pass updates.
* **1.0 (Legacy / Basic):** Reliant entirely on on-premise lobby display screens and vocal loudspeaker calls; simple email confirmation; no mobile SMS or chat integration.

### Vector 6: Hardware & IoT Integration (Kiosks, Printers, Signage)
* **5.0 (Elite / YQ Target):** Universal hardware agnostic framework; web-based terminal orchestration via secure local network gateways (WebUSB / IP network printing / MQTT protocols); plug-and-play support for custom touch kiosks, Apple TV / WebOS digital signage, and SIP intercoms.
* **3.0 (Standard SaaS):** Supports specific proprietary kiosk hardware or limited iOS/Android tablet deployments; requires dedicated desktop drivers for thermal printer integrations.
* **1.0 (Legacy / Proprietary Vendor Lock-in):** Operates only with expensive, proprietary physical terminal hardware sold by the software vendor; closed communications protocols requiring physical serial/USB server connections.

### Vector 7: API & Developer Ecosystem (Extensibility)
* **5.0 (Elite / YQ Target):** Full API coverage (GraphQL + REST endpoints for 100% of functional capabilities); comprehensive real-time webhooks with configurable retry semantics; out-of-the-box bi-directional connectors for EHR (Epic/Cerner via HL7/FHIR), CRM (Salesforce, Dynamics, HubSpot), and Enterprise Calendars (M365, Google Workspace via Graph API webhooks).
* **3.0 (Standard SaaS):** Basic REST API covering common ticketing and scheduling operations; simple webhook dispatchers for primary lifecycle events; pre-built Zapier/Make connectors with limited direct CRM integrations.
* **1.0 (Legacy / Closed):** SOAP APIs, internal database direct integration requirements, or undocumented REST wrappers; zero real-time webhook support; custom engineering services required for external software data integration.

---

## 3. Standard Scorecard Summary Template

When completing competitive research reports, the following consolidated scorecard table must be populated in `01_executive_summary_and_market_positioning.md`:

| Evaluation Vector | Competitor Score (0.0 – 5.0) | Confidence Level (L1–L4) | Core Deficit vs. YQ Target Architecture |
| :--- | :---: | :---: | :--- |
| **1. Cloud Architecture & Scalability** | *[Score]* | *[L1-L4]* | *[Architectural critique & weakness summary]* |
| **2. Real-time Sync & Edge Resiliency** | *[Score]* | *[L1-L4]* | *[Architectural critique & weakness summary]* |
| **3. Enterprise Security & Governance** | *[Score]* | *[L1-L4]* | *[Architectural critique & weakness summary]* |
| **4. UX & Zero-Friction Journey** | *[Score]* | *[L1-L4]* | *[Architectural critique & weakness summary]* |
| **5. Omnichannel Communication** | *[Score]* | *[L1-L4]* | *[Architectural critique & weakness summary]* |
| **6. Hardware & IoT Integration** | *[Score]* | *[L1-L4]* | *[Architectural critique & weakness summary]* |
| **7. API & Developer Ecosystem** | *[Score]* | *[L1-L4]* | *[Architectural critique & weakness summary]* |
| **OVERALL COMPOSITE RATING** | **[Average Score]** | **[Average L-Level]** | **Summary of Leapfrog Opportunity** |
