# YQ Product Strategy: Target ICPs, Pricing & Enterprise Roadmap

> **Document Status:** Active Standard & Roadmap Blueprint
> **Owner:** Senior Product Manager & Enterprise SaaS Consultant
> **Classification:** Confidential — Internal Engineering Documentation

---

## 1. Target Ideal Customer Profiles (ICPs) & Vertical Alignment

YQ focuses its go-to-market and architectural customization around four high-value enterprise verticals where queue friction, scheduling delays, and visitor management failures generate measurable financial and operational losses:

```mermaid
graph TD
    A[YQ Enterprise OS] --> B[Healthcare: Hospital Systems & Outpatient Clinics]
    A --> C[Retail Banking & Financial Advisory Branches]
    A --> D[Public Sector: Government DMV & Citizen Services]
    A --> E[Global Corporate HQs & Secure Facilities]
    
    B -->|Core Need| B1[EHR Epic/Cerner Integration, HIPAA BAA, Triage Routing]
    C -->|Core Need| C1[Salesforce CRM Screen Pops, VIP Priority Queue, Wealth Appts]
    D -->|Core Need| D1[Mass Overwhelm Defense, SMS/WhatsApp Surge Resilience, ADA Compliance]
    E -->|Core Need| E1[NDA Signatures, ACS Turnstile Gates, Watchlist Verification]
```

---

## 2. disruptive Commercial Packaging & Licensing Economics

Legacy competitors confuse buyers with complicated pricing matrices—charging simultaneous fees per location, per hardware kiosk terminal, per administrative user seat, and expensive surcharge usage tiers for every individual SMS reminder text sent.

### 2.1 YQ Transparent Location-Based Licensing Architecture
YQ obliterates enterprise contract adoption friction by implementing an intuitive, predictable **Per-Branch / Location-Based Enterprise License**:
* **Unlimited User & Agent Seats:** Enterprise clients can license hundreds of front-desk tellers and clinic receptionists per branch without per-user seat penalties, encouraging rapid 100% staff workflow adoption.
* **Universal Channel Inclusion:** All base conversational messaging via WhatsApp Business Cloud API and dynamic Apple/Google Wallet pass updates are bundled directly into the location enterprise subscription tier, eliminating unpredictable telecommunications overage anxiety for CFOs.
* **Hardware Freedom Guarantee:** Zero vendor lock-in. Customers install YQ software across their existing commercial hardware investments (standard Apple iPads, Android tablets, Epson/Zebra USB thermal printers, Apple TVs for lobby signage) without paying recurring hardware maintenance leases to YQ.

---

## 3. Phased Engineering Execution & Delivery Roadmap

```mermaid
gantt
    title YQ Phased Architecture & Engineering Delivery Timeline
    dateFormat YYYY-MM-DD
    section Phase 1: Core Engine
    Polymorphic DB Schema & Multi-Tenancy Engine   :done,    p1, 2026-08-05, 30d
    Redis Pub/Sub Realtime WebSocket Gateway       :active,  p2, after p1, 30d
    PWA Customer Zero-Install Web & Wallet Pass    :         p3, after p2, 45d

    section Phase 2: Omnichannel & Kiosks
    WhatsApp Business Cloud & SMS Fallback Router  :         p4, after p3, 30d
    Driverless WebUSB / WebBluetooth Kiosk Engine    :         p5, after p4, 30d
    Lobby Signage Engine & Neural TTS Audio        :         p6, after p5, 30d

    section Phase 3: AI & Enterprise Ecosystem
    Hybrid EWMA / ML Wait-Time Prediction Engine     :         p7, after p6, 45d
    Salesforce CRM & Epic/Cerner FHIR Connectors   :         p8, after p7, 45d
    SOC2 Type II Audit Completion & BYOK Enforced  :         p9, after p8, 60d
```

### 3.1 Milestone Summary
* **Phase 1 (MVP Foundation - Months 1-3):** Delivery of the unified polymorphic `CUSTOMER_INTERACTION` database schema, PostgreSQL multi-tenancy Row-Level Security, sub-50ms Redis WebSocket sync, and zero-install customer PWAs with dynamic lock-screen Apple Wallet passes.
* **Phase 2 (Omnichannel & Hardware Freedom - Months 4-5):** Deployment of intelligent messaging fallback gateways (WhatsApp -> SMS) and driverless WebUSB/WebBluetooth kiosk terminal printing.
* **Phase 3 (AI Mastery & Enterprise Scale - Months 6-8):** Production release of machine learning reinforcement models for predictive wait times, deep Epic/Salesforce ecosystem webhooks, and formal SOC2 Type II compliance attestation with Customer-Managed Key (CMK) encryption.
