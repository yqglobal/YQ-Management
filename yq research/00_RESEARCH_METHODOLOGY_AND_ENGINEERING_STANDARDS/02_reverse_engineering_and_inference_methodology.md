# Reverse Engineering & Architectural Inference Methodology

> **Document Status:** Active Standard
> **Owner:** Staff Software Architect & Competitive Intelligence Analyst
> **Classification:** Confidential — Internal Engineering Documentation

---

## 1. Overview & Purpose

When evaluating commercial SaaS platforms (such as Qmatic, Waitwhile, or Envoy), direct access to closed-source codebase repositories and proprietary server architectures is unavailable. To construct engineering-grade assessments, our department utilizes empirical behavior observation, API intercept analysis, public integration documentation teardowns, client-side decompilation (where publicly accessible via browser DevTools), and structural deduction.

To maintain engineering integrity, **every architectural claim or technical deduction in this repository must be tagged with an Explicit Confidence Rating**.

---

## 2. The Assumption Confidence Rating Scale (L1 – L4)

All technical declarations regarding competitor database schemas, internal algorithms, routing mechanisms, and server structures must reference one of the following four confidence levels:

| Rating Level | Designation | Evidentiary Basis & Methodology | Example Usage in Documentation |
| :---: | :--- | :--- | :--- |
| **L1** | **Direct Evidence** | Proven via public API schemas, official developer docs, published engineering tech blogs, open-source SDKs, or visible network headers (e.g., `server: cloudflare`, GraphQL introspections). | *"Waitwhile utilizes Firebase Realtime Database for client push updates (**[L1]**: Observed via WebSocket connection payloads to `*.firebaseio.com`)."* |
| **L2** | **Empirical Deduction** | Inferred with high certainty through systemic testing, API latency stress behavior, error message leak analysis, or CORS / network bundle inspection. | *"JRNI enforces strict serialized transactional database locks during slot selection (**[L2]**: Simultaneous booking requests yield an immediate 409 Conflict error with SQL dead-lock retry codes in the JSON body)."* |
| **L3** | **Architectural Inference** | Deduced based on industry best practices, performance scaling characteristics, and external observable constraints (e.g., tenant setup delays, queue polling intervals). | *"Qmatic likely uses an on-premise relay agent connecting to an AWS IoT Core MQTT broker for lobby printer triggers (**[L3]**: Based on required outbound port 8883 specifications and local device polling behavior)."* |
| **L4** | **Theoretical Hypothesis** | Educated conjecture formulated to explain complex or opaque behaviors where no direct observational data exists. Must be accompanied by an alternative hypothesis. | *"Envoy’s facial recognition check-in feature likely offloads biometry processing to AWS Rekognition or Azure AI (**[L4]**: Inferred from latency profile and data residency compliance disclosures in their terms of service)."* |

---

## 3. Standard Operating Procedure (SOP) for Reverse Engineering a Platform

### Phase 1: Reconnaissance & Surface Analysis
1. **Developer Center & API Catalog Deconstruction:**
   * Extract all endpoints, authentication models (OAuth 2.0, API keys, JWT structure), and rate-limiting headers.
   * Map webhooks to understand their underlying asynchronous event-driven model (e.g., what events trigger webhook dispatches? Are payloads idempotent?).
2. **Client-Side Asset & Protocol Profiling:**
   * Inspect web portal network traffic using browser inspection and network recording tools.
   * Identify persistent real-time connections: WebSockets, Server-Sent Events (SSE), or HTTP long-polling. Document exact reconnection strategies, heartbeat intervals, and JSON/Protobuf schemas over the socket.
   * Analyze local storage, IndexedDB, and Service Worker caching patterns to reverse engineer offline-first resilience capabilities.

### Phase 2: Behavioral & State Machine Decomposition
1. **State Transition Mapping:**
   * Execute lifecycle mutations on core entities (e.g., Ticket issued -> Called -> Put on hold -> Transferred -> Completed -> No-show).
   * Construct an exhaustive state machine diagram documenting valid state transitions, mandatory intermediate validations, and implicit triggers.
2. **Concurrency & Race Condition Profiling:**
   * Document how the platform handles simultaneous attempts to acquire the same appointment time slot or queue number across separate clients.
   * Record whether the architecture implements Optimistic vs. Pessimistic locking.

### Phase 3: Algorithmic Inversion (Wait Time & Routing)
1. **Queue Velocity vs. Prediction Dissection:**
   * Evaluate estimated wait time (EWT) updates against intentional disruptions (e.g., pausing service counters, sudden VIP queue insertions).
   * Differentiate between rudimentary static calculations (e.g., `Total Tickets in Queue * Average Service Time`) and dynamic heuristic or machine learning models (e.g., exponentially weighted moving averages or regression models factoring in day-of-week seasonality).
2. **Routing & Prioritization Logic:**
   * Map multi-service ticketing rules. When an agent opens a counter assigned to both "Billing Queries" (Normal Priority) and "Executive Support" (High Priority), document the starvation prevention algorithm used to avoid locking out normal queue items.

### Phase 4: Synthesis & Documentation Generation
* Populate the 7 core technical analysis files within the competitor's workspace using the `_template` structures.
* Translate every observed weakness or architectural limitation directly into a strategic engineering recommendation for **YQ**.
