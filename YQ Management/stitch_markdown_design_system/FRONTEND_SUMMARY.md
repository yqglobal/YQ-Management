# YQ Frontend Template Analysis & Strategic Summary
## Stitch AI-Generated Template Review — Final Folder Audit

> **Purpose:** This document provides a comprehensive analysis of the AI-generated frontend templates against YQ's Visit-Centric product model. It evaluates page segregation, feature coverage, missing capabilities, redundant pages, and recommends the ideal SaaS page distribution.

---

## 0. The Visit-Centric Product Model

### 0.1 Core Concept

**The fundamental operational object is the Visit, not Queue, Token, or Appointment.**

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
Waiting / Queued / Scheduled / Assigned
   ↓
Staff + Resource
   ↓
Service
   ↓
Completed
```

### 0.2 Visit vs Appointment (Critical Distinction)

| Concept | Definition |
|---------|-----------|
| **Appointment** | A reservation for future capacity. Has a scheduled time, provider, and resource. |
| **Visit** | The actual interaction. Has arrival time, check-in time, waiting start, service start, service end, and completion. |

**Key rule:** An appointment can become a Visit. A walk-in creates a Visit without an Appointment. The appointment time and actual service time are separate concepts.

### 0.3 Visit Lifecycle States

```
CREATED → SCHEDULED → CHECKED_IN → WAITING → CALLED/ASSIGNED → IN_SERVICE → COMPLETED
```

Alternative/terminal states: `CANCELLED`, `NO_SHOW`, `MISSED`, `RESCHEDULED`, `ON_HOLD`, `TRANSFERRED`, `ABANDONED`

The configured service flow determines which states are relevant.

### 0.4 Visit Entry Points (Channels)

| Channel | Creates |
|---------|---------|
| Public booking page | Appointment → Visit |
| Website widget | Appointment → Visit |
| WhatsApp | Appointment → Visit |
| Phone | Appointment → Visit |
| Reception/front desk | Visit (walk-in or appointment) |
| Kiosk | Visit |
| QR code | Visit |
| External integration | Appointment → Visit |

All channels create the same internal **Visit** object.

### 0.5 Service Availability Abstraction

Customers ask: *"When can I receive this service?"* — not *"Which queue should I join?"*

YQ calculates availability based on: Service + Location + Staff + Resource + Operating hours + Duration + Existing appointments + Existing visits + Capacity + Scheduling rules.

### 0.6 UI Implications

- **"Today" view** shows Visits, not Queue tokens
- **Today** shows Visit cards with state transitions (Check In, Call, Start, Complete)
- **Scanner** creates Visits, not just checks people into queues
- **Calendar** shows scheduled Visits, not just appointments
- **Settings** contains Service configuration that determines Visit behavior

---

## 1. Current Template Inventory (Final Folder)

### 1.1 Pages Present in `/final/`

| # | Page Folder | Page Type | Primary Function | Alignment with YQ Research |
|---|-------------|-----------|------------------|----------------------------|
| 1 | `analytics_sla_reporting_dashboard` | Staff / Admin | Visit KPI dashboard, throughput charts, SLA heatmap | ✅ Strong — Visit lifecycle analytics |
| 2 | `concierge_qr_scanner_manual_intake` | Staff / Concierge | QR scanner viewfinder, manual phone lookup, Visit profile verification, route-to-service | ✅ Strong — Visit creation via QR/manual |
| 3 | `lobby_tv_digital_signage_display` | Public / Hardware | 4K TV signage with video infotainment + live Visit roster | ✅ Strong — Visit calling display |
| 4 | `mobile_public_intake_boarding_pass` | Public / Mobile | Mobile intake form + digital Visit pass with QR, position display, actions | ✅ Strong — Visit pass with zero-app |
| 5 | `multi_resource_scheduling_matrix` | Staff / Admin | Resource timeline matrix (doctors, rooms, equipment) with Visit blocks | ✅ Strong — multi-resource Visit scheduling |
| 6 | `qmova_the_11_10_experience` | Marketing | Hero, 3D showcase, bento grid, WhatsApp mockup, CTA | ⚠️ Marketing-only — not a SaaS operational page |
| 7 | `settings_studio_billing_usage` | Admin / Billing | Plan management, usage meters, payment method, invoice history | ✅ Strong — matches Pillar 6 (transparent licensing) |
| 8 | `settings_studio_service_configurator_final` | Admin / Config | Service lines, Visit routing rules, scheduling model config, duration/grace inputs | ✅ Strong — Visit flow configuration |
| 9 | `settings_studio_service_configurator_updated` | Admin / Config | Duplicate/variant of #8 | ❌ Redundant — consolidate with #8 |
| 10 | `system_onboarding_workspace_identity` | Onboarding | Step 1: Org name, subdomain, operating model selection | ✅ Good — tenant initialization |
| 11 | `system_onboarding_resource_mapping` | Onboarding | Step 2: Map resources (humans, spaces, assets) | ✅ Good — Pillar 4 (multi-resource) |
| 12 | `system_onboarding_admin_invitations` | Onboarding | Step 3: Invite admins, SSO enforcement toggle | ✅ Good — Pillar 6 (SCIM/SSO) |
| 13 | `shader` | Visual Effect | WebGL liquid metal background animation | ❌ Not a functional page — dev/test asset |

### 1.2 Pages MISSING from Final (but exist in parent folder)

| Page Folder | Criticality | Reason for Inclusion |
|-------------|-------------|---------------------|
| `service_desk_command_roster` | 🔴 **CRITICAL** | The #1 operational screen — Visit state machine, calling roster, WhatsApp chat, CRM context |
| `settings_studio_infrastructure_manager_final` | 🔴 **HIGH** | Location/asset management, online/offline toggles, hardware mapping |
| `settings_studio_integrations_webhooks_refined` | 🔴 **HIGH** | EHR/CRM/SSO/calendar integrations, webhook DLQ vault, test connections |
| `settings_studio_intake_form_builder_refined` | 🟡 **MEDIUM** | Drag-drop form builder with conditional logic (OCR config missing) |
| `marketing_landing_page_the_end_of_the_waiting_room` | 🟢 **LOW** | Alternative marketing page — keep as dev asset, not core SaaS |

---

## 2. Feature Coverage Analysis vs. YQ Research

### 2.1 Feature Alignment Matrix

| YQ Research Feature / Pillar | Template Coverage | Pages Where Present | Gap Analysis |
|------------------------------|-------------------|---------------------|--------------|
| **Pillar 1: Serverless Edge Compute** | ❌ Not visually represented | None | Invisible to end-user; should manifest as sub-50ms Visit state sync, zero loading spinners |
| **Pillar 2: Zero-Install Lock-Screen Wallets** | ⚠️ Partial | `mobile_public_intake_boarding_pass` (web pass mockup), `concierge_qr_scanner` | Missing: actual Wallet pass UI, APNs push notifications, NFC tap-to-join, lock-screen calling alerts |
| **Pillar 3: Autonomous Kingman AI** | ❌ Not represented | None | Missing: AI self-healing dashboard, Kingman variance gauges, auto-reskill notifications, predictive SLA alerts |
| **Pillar 4: Redis Redlock Concurrency** | ❌ Not visually represented | None | Invisible; should manifest as instant Visit creation, no loading states during surges |
| **Pillar 5: Polymorphic Columnar Analytics** | ✅ Good | `analytics_sla_reporting_dashboard` | Good real-time KPIs and heatmap; missing: Visit lifecycle funnel, cross-location JOINs, DuckDB query interface |
| **Pillar 6: Transparent All-Inclusive Licensing** | ⚠️ Partial | `settings_studio_billing_usage` | Good plan/usage display; missing: SMS overage warnings (should show $0), location-based pricing tiers |

### 2.2 Critical Missing Features (Ranked by Business Impact)

| Priority | Missing Feature | Research Rationale | Recommended Page |
|----------|----------------|-------------------|------------------|
| **P0** | **Today — Visit Command Center** | Core operational screen for agents — Visit state machine, CRM/EHR screen-pops, two-way chat | `today` (primary) |
| **P0** | **Command Palette (Cmd+K)** | YQ's signature UX innovation — instant transfers, Visit throttling, search | Global overlay on all staff pages |
| **P0** | **WhatsApp / SMS Broker Panel** | Two-way conversational triage is a core differentiator vs Qmatic/Qminder | Embedded in Today + standalone |
| **P1** | **AI Operations Center** | Kingman variance monitoring, autonomous self-healing logs, workforce re-skilling alerts | New page: `ai-operations` |
| **P1** | **Locations & Infrastructure Manager** | Asset mapping, online/offline toggles, hardware provisioning | `settings/locations` |
| **P1** | **Integrations & Webhooks Studio** | EHR (Epic/Cerner), CRM (Salesforce), SSO (SAML/SCIM), calendar sync, DLQ vault | `settings/integrations` |
| **P1** | **Intake Form Builder** | Drag-drop builder with conditional logic + OCR camera scanning config | `settings/forms` |
| **P1** | **Apple/Google Wallet Pass Designer** | Dynamic `.pkpass` generation, APNs push config, lock-screen layout | New page or embedded in Forms |
| **P2** | **Visitor / ACS Management** | Badge printing, turnstile access, watchlist screening, NDAs | New page: `visitor-management` |
| **P2** | **Payment / Stripe Overlay Config** | Deposit requirements, no-show protection, Stripe Connect | New page or embedded in Service Studio |
| **P2** | **CSAT/NPS Post-Visit Automation** | Interactive lock-screen surveys, WhatsApp feedback loops, escalation alerts | New page or embedded in Analytics |
| **P3** | **Multi-Stop Journey Orchestrator** | Sequential routing (Advising → Bursar → Radiology), auto-progression | New page or embedded in Today |
| **P3** | **Geofence / GPS Arrival Gating** | Proximity-based appointment injection, BLE indoor navigation | Settings overlay or embedded in Calendar |
| **P3** | **EHR Screen-Pop Preview** | Live Epic/Cerner iframe preview configuration | Embedded in Integrations or Today |

---

## 3. Page Distribution Assessment

### 3.1 Current Final Folder Distribution

```
final/
├── analytics_sla_reporting_dashboard/     ✅ Staff Analytics
├── concierge_qr_scanner_manual_intake/    ✅ Concierge Intake
├── lobby_tv_digital_signage_display/      ✅ Public Signage
├── mobile_public_intake_boarding_pass/    ✅ Public Intake
├── multi_resource_scheduling_matrix/      ✅ Staff Scheduling
├── qmova_the_11_10_experience/            ⚠️ Marketing (not SaaS)
├── shader/                                ❌ Dev asset (not a page)
├── settings_studio_billing_usage/         ✅ Admin Billing
├── settings_studio_service_configurator_final/  ✅ Admin Config
├── settings_studio_service_configurator_updated/ ❌ Duplicate
├── system_onboarding_admin_invitations/   ✅ Onboarding
├── system_onboarding_resource_mapping/    ✅ Onboarding
└── system_onboarding_workspace_identity/  ✅ Onboarding
```

**Count:** 13 folders, ~11 unique functional pages + 1 marketing page + 1 dev asset

### 3.2 Gaps by User Persona

| Persona | Needed Pages | Currently Covered | Missing |
|---------|--------------|-------------------|---------|
| **Public Customer** | Intake, Tracker, Wallet | ✅ Intake + Tracker | Wallet pass, NFC tap, lock-screen calling |
| **Frontline Agent** | Today, Scanner, Calendar | ⚠️ Scanner + Calendar | **Today (CRITICAL)**, Command Palette, Chat Broker |
| **Branch Manager** | Analytics, SLA, AI Ops | ✅ Analytics | AI Operations Center, real-time surge alerts |
| **System Admin** | Onboarding, Billing, Integrations, Forms, Locations | ⚠️ Onboarding + Billing | **Integrations**, **Forms Builder**, **Locations/Infrastructure** |
| **Enterprise CIO** | Analytics, Billing, Identity | ⚠️ Analytics + Billing | Identity & Access (SCIM/RBAC), cross-location BI, compliance audit logs |

---

## 4. What the Templates Get Right

1. **Design System Consistency:** Strong Zinc/Sky color palette, Plus Jakarta Sans + Geist Mono typography, consistent 44px touch targets, Material Symbols icons.
2. **Clinical Yet Warm Aesthetic:** Matches YQ's "Art Gallery Balanced" spatial framework (Density 5/10, asymmetric spacing).
3. **Core Dashboard Concept:** Analytics page shows real-time KPIs, throughput visualization, and SLA heatmap — aligns with Pillar 5.
4. **Public Intake Flow:** Mobile boarding pass with position tracking and action buttons matches zero-app induction.
5. **Resource Scheduling Matrix:** Multi-resource timeline (doctors, rooms, equipment) aligns with YQ's multi-resource interval tree architecture.
6. **Service Configurator Hierarchy:** Level 3 (Department) → Level 4 (Service Action) nesting with FIFO/Dynamic toggle matches research.
7. **Onboarding Wizard:** 3-step flow (Identity → Resources → Invitations) is logically sequenced.
8. **Billing Transparency:** Usage meters, plan tiers, invoice history support Pillar 6 economics.

---

## 5. What's Wrong or Missing

### 5.1 Structural Issues

| Issue | Severity | Description |
|--------|----------|-------------|
| **Today missing from Final** | 🔴 Critical | The most important operational page exists in parent folder but was excluded from final review |
| **Duplicate Service Configurator** | 🟡 Medium | `final/` and `final/` are duplicates; wastes AI generation budget |
| **`shader/` in final** | 🟡 Medium | WebGL test asset, not a functional page |
| **`clinical_warmth/` empty** | 🟡 Medium | Folder exists but no `code.html` — incomplete generation |
| **Marketing mixed with SaaS** | 🟢 Low | `qmova_the_11_10_experience/` is a landing page, not an app screen |

### 5.2 Feature Gaps by Research Pillar

| Pillar | Missing in Templates | Impact |
|--------|---------------------|--------|
| **Pillar 1 (Edge Compute)** | No visible sub-50ms responsiveness cues | Users can't perceive speed advantage |
| **Pillar 2 (Wallets)** | No actual `.pkpass` / Google Wallet pass UI; no NFC tap flow; no lock-screen calling animation | Misses core mobile differentiation vs Waitwhile/Qminder |
| **Pillar 3 (Kingman AI)** | No AI dashboard, no self-healing alerts, no variance gauges | Misses autonomous operations story |
| **Pillar 4 (Redis Redlock)** | No Visit creation speed cues, no concurrency indicators | Invisible but critical for trust |
| **Pillar 5 (Analytics)** | Good basic dashboard but no cross-location JOINs, no real-time query interface | Partial coverage |
| **Pillar 6 (Licensing)** | No transparent location pricing display; no "unlimited" messaging | Partial coverage |

### 5.3 Missing SaaS Pages (by Category)

**Operational (Must-Have):**
- Today — Visit Command Center (3-column: Staff → Visit Feed → Context/Chat)
- Command Palette overlay (Cmd+K)
- WhatsApp / SMS Broker Panel (standalone view)
- AI Operations Center (Kingman variance, self-healing logs)

**Configuration (Must-Have):**
- Locations & Infrastructure Manager (asset grid, online/offline toggles, hardware provisioning)
- Integrations & Webhooks Studio (EHR, CRM, SSO, calendar, DLQ vault)
- Intake Form Builder (drag-drop, conditional logic, OCR config)
- Wallet Pass Designer (`.pkpass` layout, APNs config)

**Visitor Management (Should-Have):**
- Visitor Check-in & Badge Printing
- Watchlist / Blocklist Screening
- ACS / Turnstile Control Panel

**Financial (Should-Have):**
- Usage & Overage Dashboard (show $0 SMS costs vs incumbent markups)
- Enterprise Contract Workspace (location-based tiers, SCIM/SSO gates)

---

## 6. Ideal Page Distribution (Recommended)

### 6.1 Core Operational Workspace (5 pages)

```
/app/
├── today/                      # PRIMARY — Visit state machine, CRM pop, chat
├── scanner/                         # Concierge QR/NFC + manual intake + OCR
├── calendar/                        # Multi-resource scheduling matrix (already exists)
├── lobby-tv/                        # 4K signage display (already exists)
└── ai-operations/                   # NEW — Kingman AI, self-healing, variance gauges
```

### 6.2 Public Customer Surfaces (2 pages)

```
/public/
├── booking/                         # Mobile intake + service selection (already exists)
└── pass/                            # Digital boarding pass with Wallet UI (already exists)
```

### 6.3 Settings Studio (6 pages)

```
/settings/
├── service-studio/                  # Service configurator (already exists)
├── form-builder/                    # Intake forms + OCR + conditional logic
├── locations/                       # Infrastructure, assets, hardware, online/offline
├── integrations/                    # EHR, CRM, SSO, calendar, webhooks, DLQ
├── billing/                         # Plans, usage, invoices (already exists)
└── identity/                        # RBAC/ABAC, SCIM, SAML, audit logs
```

### 6.4 Onboarding Flow (3 pages)

```
/onboarding/
├── workspace-identity/              # Tenant namespace, org name, model (already exists)
├── resource-mapping/                # Rooms, staff, equipment (already exists)
└── admin-invitations/               # Invite team, SSO enforcement (already exists)
```

### 6.5 Analytics & Intelligence (1 page)

```
/analytics/
└── sla-reporting/                   # KPIs, throughput, heatmaps (already exists)
```

**TOTAL RECOMMENDED: 17 functional pages** (vs. current ~11 unique pages)

---

## 7. Specific Recommendations per Page

### 7.1 Pages to KEEP and REFINE

| Page | Action | Key Refinements Needed |
|------|--------|------------------------|
| `analytics_sla_reporting_dashboard` | ✅ Keep | Add: cross-location filter, AI prediction overlay, real-time DuckDB query bar |
| `concierge_qr_scanner_manual_intake` | ✅ Keep | Add: NFC tap animation, OCR camera capture button, GPS arrival confirmation |
| `lobby_tv_digital_signage_display` | ✅ Keep | Add: multi-zone video ad scheduler, RSS news ticker, burn-in prevention mode |
| `mobile_public_intake_boarding_pass` | ✅ Keep | Transform into actual `.pkpass` Wallet UI; add: lock-screen calling animation, BLE navigation arrow |
| `multi_resource_scheduling_matrix` | ✅ Keep | Add: LineSync appointment injection visualization, GPS arrival geofence indicators |
| `settings_studio_billing_usage` | ✅ Keep | Add: SMS overage comparison (show $0 vs incumbent), location-based tier selector |
| `settings_studio_service_configurator_*` | ✅ Keep (consolidate) | Add: Kingman SLA threshold config, WDRR priority weight editor, skill-based routing tags |
| `system_onboarding_*` | ✅ Keep | Add: SCIM 2.0 endpoint test, HIPAA BAA signature flow, data residency selector |

### 7.2 Pages to ADD (Priority Order)

| Priority | New Page | Rationale | Key Features |
|----------|----------|-----------|--------------|
| **P0** | `today` | Core operational screen — Visit feed with Check In, Call, Start, Complete actions | 3-column (Staff → Visits → Context), Spacebar call-next, Cmd+K transfer, WhatsApp chat, CRM/EHR pop, Visit state machine |
| **P0** | `integrations` | Enterprise integration hub | EHR (Epic/Cerner HL7), CRM (Salesforce), SSO (SAML/SCIM), Calendar (Graph/Google), Webhook DLQ vault with replay button |
| **P1** | `form-builder` | Intake form builder | Drag-drop toolbox, conditional logic tree, OCR camera scan config, HIPAA auto-reset toggle |
| **P1** | `locations-infrastructure` | Asset & hardware management | Location cards, resource sub-tables (rooms, staff, equipment), online/offline toggles, driverless WebUSB printer mapping |
| **P1** | `ai-operations` | Kingman AI & self-healing | Real-time variance gauge, surge prediction timeline, auto-reskill log, workforce availability heatmap |
| **P2** | `wallet-designer` | Wallet pass configurator | Pass template editor, APNs push rules, lock-screen layout, NFC tap-to-join config |
| **P2** | `visitor-management` | Visitor check-in & ACS | Badge printing, watchlist screening, NDA capture, turnstile relay control |
| **P2** | `identity-access` | RBAC/ABAC & SCIM | Role templates, permission matrix, SCIM provisioning logs, SAML metadata, audit trail |

### 7.3 Pages to REMOVE or DEPRECATE

| Page | Action | Reason |
|------|--------|--------|
| `settings_studio_service_configurator_updated` | ❌ Remove duplicate | Identical to `_final`; wastes template budget |
| `shader/` | ❌ Remove from final | Dev/test asset, not a functional page |
| `qmova_the_11_10_experience/` | 📦 Move to `/marketing/` | Landing page, not SaaS app screen — separate concern |
| `clinical_warmth/` | 🔧 Fix or remove | Empty folder; incomplete generation |

---

## 8. Alignment with 6-Pillar YQ Dominance

### 8.1 Current Template Coverage by Pillar

| Pillar | Template Coverage | Score | Notes |
|--------|-------------------|-------|-------|
| **1. Serverless Edge Compute** | ❌ None | 0/5 | Invisible to users; needs speed cues (sub-50ms states, zero spinners) |
| **2. Zero-Install Lock-Screen Wallets** | ⚠️ 2/5 | Partial | Mobile pass mockup exists; missing actual Wallet UI, NFC, lock-screen calling |
| **3. Autonomous Kingman AI** | ❌ 0/5 | None | Zero AI representation in any template |
| **4. Redis Redlock Concurrency** | ❌ 0/5 | None | Invisible; needs instant UI feedback, no loading skeletons |
| **5. Polymorphic Columnar Analytics** | ✅ 4/5 | Strong | Good KPI ribbon, charts, heatmap; missing real-time query interface |
| **6. Transparent All-Inclusive Licensing** | ⚠️ 2/5 | Partial | Billing page exists; missing location-based pricing, $0 SMS messaging showcase |

### 8.2 Gap Fill Roadmap

**Phase 1 (Immediate):**
- Add `today` page from parent folder to final
- Add `integrations` page from parent folder to final
- Remove duplicates (`service_configurator_updated`)

**Phase 2 (Next Sprint):**
- Create `ai-operations` page with Kingman variance dashboard
- Enhance `mobile_public_intake_boarding_pass` with actual Wallet pass UI
- Add `locations-infrastructure` page

**Phase 3 (Polish):**
- Create `form-builder` with OCR camera scanning
- Create `visitor-management` page
- Add Command Palette (Cmd+K) global overlay to all staff pages

---

## 9. Design System Assessment

### 9.1 What Works
- **Typography:** Plus Jakarta Sans + Geist Mono is excellent for data-dense SaaS
- **Color System:** Zinc neutral base with Sky primary and Emerald/Rose status colors is clinical yet warm
- **Touch Targets:** Consistent 44px minimum targets throughout
- **Iconography:** Material Symbols Outlined with FILL variants is appropriate

### 9.2 What Needs Adjustment
| Issue | Current State | Recommended Fix |
|--------|--------------|-----------------|
| **Font inconsistency** | Some pages use `Inter` (marketing), others `Plus Jakarta Sans` | Standardize on Plus Jakarta Sans for all app pages |
| **Dark mode coverage** | Only `lobby_tv_digital_signage_display` and `qmova_the_11_10_experience` use dark mode | Implement full dark mode across all staff pages (night-shift hospitals) |
| **Loading states** | Generic spinners in some places | Replace with skeleton loaders matching actual component shapes |
| **Animation consistency** | Some pages have spring physics, others snap | Enforce sub-50ms transitions everywhere |
| **Data density toggle** | Not implemented | Add density toggle (Dense Tabular ↔ Visual Cards) for DMV vs. retail use cases |

---

## 10. Executive Summary & Next Steps

### 10.1 Current State
The Stitch-generated templates establish a **strong visual foundation** — the Zinc/Sky design system, clinical aesthetic, and core dashboard concepts align well with YQ's research. However, the **page coverage is incomplete for a production SaaS platform**. Critical operational screens (Today, Integrations, AI Operations) are either missing from the final set or exist only as older iterations in the parent folder.

### 10.2 Top 3 Priorities
1. **Promote `service_desk_command_roster` to final** — This is the #1 screen frontline staff use hourly. It must be in the final review set.
2. **Add `settings_studio_integrations_webhooks_refined` to final** — Enterprise buyers evaluate platforms on integration depth (EHR, CRM, SSO, webhooks).
3. **Create `ai-operations` page** — YQ's Autonomous Kingman AI is the #1 differentiator vs incumbents; it needs a visible operational dashboard.

### 10.3 Template Accuracy Score
| Category | Score | Notes |
|----------|-------|-------|
| **Design System** | 8/10 | Strong foundation; needs dark mode expansion |
| **Page Coverage** | 5/10 | Missing 4+ critical operational pages |
| **Feature Accuracy** | 6/10 | Good basics; missing AI, Wallets, Command Palette, integrations |
| **Research Alignment** | 6/10 | Aligns with Pillars 2 & 5; weak on Pillars 1, 3, 4, 6 |
| **SaaS Completeness** | 5/10 | Needs Today, Integrations, AI Ops, Identity pages |

**Overall: 6/10** — Solid MVP foundation, but requires 4–6 additional pages and feature deep-dives to accurately represent YQ's 6-pillar dominance architecture.

---

---

## 11. Stitch Implementation Guide — Existing Pages (Modify)

### 11.1 Analytics & SLA Reporting Dashboard
**File:** `analytics_sla_reporting_dashboard/index.html`
**Route:** `/analytics`
**Priority:** P1

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `CrossLocationFilter` | Top bar, right of title | `locations: string[]`, `selected: string[]`, `onChange: (ids: string[]) => void` | `onChange` | `h-10`, `border-zinc-200`, `rounded-lg` |
| `AiOverlayToggle` | Top bar, next to filter | `enabled: boolean`, `onToggle: (v: boolean) => void` | `onChange` | `h-10`, `px-4` |
| `RealtimeQueryBar` | Top bar, full width below title | `onQuery: (sql: string) => void` | `onSubmit` | `h-12`, `border-zinc-800`, `font-mono` |
| `StaffUtilizationHeatmap` | Below KPI ribbon | `staff: Array<{id, name, status}>`, `desks: string[]` | Click desk → filter | `grid grid-cols-6 gap-2` |
| `LiveIndicator` | Top bar, far right | `connected: boolean`, `latency: number` | None | `w-2 h-2 rounded-full bg-emerald-500 animate-pulse` |
| `ExportActions` | Below heatmap | `onExport: (format: 'csv'|'parquet'|'arrow') => void` | Click | `h-8`, `border-zinc-200` |

**State Additions:**
```json
{
  "selectedLocations": [],
  "aiOverlayEnabled": false,
  "query": "",
  "staffUtilization": {},
  "connectionStatus": { "connected": true, "latency": 23 }
}
```

**Keyboard Shortcuts:**
- `Cmd+K` → focus query bar

---

### 11.2 Concierge QR Scanner & Manual Intake
**File:** `concierge_qr_scanner_manual_intake/index.html`
**Route:** `/scanner`
**Priority:** P1

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `NfcTapZone` | Overlaid on camera viewfinder | `scanning: boolean`, `onTap: (nfcData: string) => void` | `onTap` | `w-64 h-64 rounded-full border-2 border-sky-500 animate-ping` |
| `OcrCaptureButton` | Below viewfinder | `processing: boolean`, `onCapture: () => void` | `onClick` | `h-12`, `bg-sky-600` |
| `GpsArrivalBadge` | Top of profile card | `distance: number \| null`, `status: 'approaching' \| 'arrived' \| 'unknown'` | None | `px-3 py-1 rounded-full text-xs` |
| `OfflineBanner` | Top of screen | `offline: boolean`, `pendingCount: number` | None | `h-10`, `bg-amber-50`, `text-amber-900` |
| `LanguageToggle` | Viewfinder corner | `lang: string`, `onChange: (lang) => void` | `onChange` | `h-8 w-8`, `rounded-full` |

**State Additions:**
```json
{
  "nfcScanning": false,
  "ocrProcessing": false,
  "gpsDistance": null,
  "offline": false,
  "pendingSync": 0,
  "language": "en"
}
```

**Keyboard Shortcuts:**
- `Ctrl+Shift+O` → trigger OCR capture
- `Ctrl+Shift+N` → toggle NFC scan mode

---

### 11.3 Lobby TV Digital Signage Display
**File:** `lobby_tv_digital_signage_display/index.html`
**Route:** `/signage`
**Priority:** P1

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `ZoneScheduler` | Settings panel | `zones: Array<{id, name, start, end}>`, `onUpdate: (zones) => void` | Drag to resize | `h-48`, `border-zinc-700` |
| `NewsTicker` | Below main video | `feeds: Array<{source, items}>` | None | `h-8`, `overflow-hidden` |
| `BurnInPrevention` | Global CSS overlay | `enabled: boolean`, `schedule: {start: '02:00', end: '05:00'}` | None | CSS `@keyframes pixel-shift` |
| `QrSelfCheckIn` | Corner overlay | `url: string`, `size: number` | None | `w-32 h-32`, `opacity-80` |
| `AccessibilityToggle` | Bottom bar | `mode: 'normal' \| 'aa' \| 'aaa' \| 'large'`, `onChange: (m) => void` | `onChange` | `h-10`, `gap-2` |
| `EmergencyPause` | Bottom bar, red | `onPause: () => void` | `onClick` | `h-12`, `bg-rose-600`, `text-white` |

**State Additions:**
```json
{
  "zones": [{ "id": "a", "name": "Ad Zone A", "start": "00:00", "end": "04:00" }],
  "newsFeeds": [{ "source": "BBC", "items": [] }],
  "accessibilityMode": "normal",
  "emergencyPaused": false
}
```

---

### 11.4 Mobile Public Intake & Boarding Pass
**File:** `mobile_public_intake_boarding_pass/index.html`
**Route:** `/booking`
**Priority:** P0

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `WalletPassCard` | Center of pass screen | `pass: {service, position, qr, expiresAt}`, `live: boolean` | None | `w-full max-w-sm`, `rounded-2xl`, `shadow-xl` |
| `LockScreenOverlay` | Full screen overlay | `message: string`, `room: string`, `onDismiss: () => void` | `onDismiss` | `fixed inset-0 z-50 bg-white flex items-center justify-center` |
| `NfcTapAnimation` | Pass card overlay | `active: boolean`, `onComplete: () => void` | `onComplete` | `w-24 h-24 rounded-full border-4 border-sky-500 animate-ping` |
| `WhatsappFab` | Bottom right | `phone: string`, `message: string` | `onClick` | `fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-500` |
| `OfflineFallback` | Full screen | `cachedPass: object`, `syncCount: number` | None | `p-4 text-center` |

**State Additions:**
```json
{
  "walletPass": { "service": "", "position": 0, "qr": "", "expiresAt": "" },
  "lockScreenActive": false,
  "lockScreenMessage": "",
  "lockScreenRoom": "",
  "nfcActive": false,
  "offline": false,
  "cachedPass": null
}
```

**Keyboard Shortcuts (mobile gestures):**
- Tap NFC zone → `nfcCheckIn()`
- Swipe up on pass → `showActions()`

---

### 11.5 Multi-Resource Scheduling Matrix
**File:** `multi_resource_scheduling_matrix/index.html`
**Route:** `/calendar`
**Priority:** P1

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `LineSyncMergeBlock` | Timeline grid | `appointment: object`, `gap: object`, `merged: boolean` | Click to split | `border-2 border-dashed border-emerald-500 bg-emerald-50` |
| `GpsArrivalIndicator` | Resource row | `patientName: string`, `etaMinutes: number`, `status: 'approaching' \| 'arrived'` | None | `w-2 h-2 rounded-full bg-sky-500 animate-pulse` |
| `SkillTag` | Resource header | `skills: string[]`, `colorMap: Record<string, string>` | None | `px-2 py-0.5 rounded text-xs` |
| `ConflictWarning` | Grid cell | `conflict: object`, `onResolve: () => void` | `onClick` | `h-8 bg-rose-50 border border-rose-200 rounded` |
| `AnimatedTimeCursor` | Grid overlay | `time: Date` | None | `absolute left-0 right-0 h-0.5 bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]` |

**State Additions:**
```json
{
  "lineSyncMerged": [],
  "gpsArrivals": [],
  "skillTags": {},
  "conflicts": [],
  "currentTime": "2026-08-10T14:00:00Z"
}
```

---

### 11.6 Qmova Marketing Landing Page
**File:** `qmova_the_11_10_experience/index.html`
**Route:** `/marketing/landing`
**Priority:** P1

**Modify Components:**
| Component | Current | Target | Style Changes |
|-----------|---------|--------|---------------|
| `HeroShader` | Heavy WebGL canvas | CSS-only animated gradient | Remove `<canvas>`, add `bg-gradient-to-br from-sky-500 to-zinc-900` |
| `PricingSection` | ❌ None | New section below features | `py-24 bg-zinc-50` |
| `TcoCalculator` | ❌ None | Interactive slider | `max-w-2xl mx-auto` |
| `PillarDiagram` | Abstract icons | 6-pillar grid with icons | `grid grid-cols-3 gap-8` |
| `ComplianceBadges` | ❌ None | Badge strip | `flex gap-4 justify-center` |

**Add State:**
```json
{
  "tcoSlider": { "qmaticCost": 40000, "yqCost": 12000, "savings": 28000 }
}
```

---

### 11.7 Settings Studio — Billing & Usage
**File:** `settings_studio_billing_usage/index.html`
**Route:** `/settings/billing`
**Priority:** P2

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `SmsOverageComparison` | Below usage meters | `incumbentCost: number`, `yqCost: number` | None | `grid grid-cols-2 gap-4` |
| `LocationTierSelector` | Plan card | `locations: string[]`, `onAdd: () => void`, `onRemove: (id) => void` | `onAdd`/`onRemove` | `border border-dashed border-zinc-300 rounded-lg p-4` |
| `AddonToggles` | Below plan | `addons: Array<{id, name, price, enabled}>`, `onToggle: (id) => void` | `onToggle` | `flex gap-4` |
| `ChannelDonut` | Usage section | `data: Array<{channel, count}>`, `total: number` | None | `w-48 h-48` |

**State Additions:**
```json
{
  "locations": [{ "id": "loc_1", "name": "HQ", "tier": "enterprise" }],
  "addons": [{ "id": "ehr", "name": "EHR Sync", "price": 200, "enabled": false }],
  "channelUsage": { "sms": 1200, "whatsapp": 3400, "wallet": 8900, "web": 5600 }
}
```

---

### 11.8 Settings Studio — Service Configurator
**File:** `settings_studio_service_configurator_final/index.html`
**Route:** `/settings/service-studio`
**Priority:** P1

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `KingmanSlaSlider` | Service action block | `threshold: number`, `onChange: (min: number) => void` | `onChange` | `w-full`, `accent-sky-600` |
| `WdrrWeightEditor` | Service action block | `weights: {standard: number, priority: number, emergency: number}`, `onChange: (w) => void` | `onChange` | `grid grid-cols-3 gap-2` |
| `SkillRoutingTags` | Service action block | `available: string[]`, `selected: string[]`, `onChange: (tags) => void` | `onChange` | `flex flex-wrap gap-2` |
| `OperatingModelToggle` | Service card header | `model: 'fifo' \| 'dynamic' \| 'linesync'`, `onChange: (m) => void` | `onChange` | `h-10 px-4 rounded-lg border` |
| `SimulateButton` | Service card footer | `onSimulate: (serviceId) => void` | `onClick` | `h-8 text-xs bg-zinc-100 hover:bg-zinc-200` |

**State Additions:**
```json
{
  "kingmanThreshold": 15,
  "wdrrWeights": { "standard": 100, "priority": 500, "emergency": 2000 },
  "skillTags": ["Spanish", "Mortgage Notary"],
  "operatingModel": "dynamic"
}
```

---

### 11.9 System Onboarding — Workspace Identity
**File:** `system_onboarding_workspace_identity/index.html`
**Route:** `/onboarding/workspace`
**Priority:** P1

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `ScimTestButton` | Step 3, SSO section | `endpoint: string`, `onTest: () => Promise<boolean>` | `onClick` | `h-10 px-4 border rounded-lg` |
| `BaaSignature` | Step 2, compliance section | `onSign: (signature: string) => void` | `onSign` | `h-48 border-2 border-dashed border-zinc-300 rounded-lg` |
| `DataResidencyPicker` | Step 1, advanced options | `regions: string[]`, `selected: string`, `onChange: (r) => void` | `onChange` | `grid grid-cols-3 gap-2` |
| `BrandThemePreview` | Step 1, preview card | `primaryColor: string`, `logo: string` | None | `w-full h-32 rounded-xl` |

**State Additions:**
```json
{
  "scimEndpoint": "",
  "scimTested": null,
  "baaSigned": false,
  "dataResidency": "us-east-1",
  "brandPrimaryColor": "#0ea5e9"
}
```

---

### 11.10 System Onboarding — Resource Mapping
**File:** `system_onboarding_resource_mapping/index.html`
**Route:** `/onboarding/resources`
**Priority:** P1

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `SkillTagInput` | Resource form | `skills: string[]`, `onAdd: (s) => void`, `onRemove: (s) => void` | `onAdd`/`onRemove` | `flex flex-wrap gap-2` |
| `WeeklyScheduleGrid` | Resource form | `schedule: Record<string, Array<{start, end}>>`, `onChange: (day, slots) => void` | `onChange` | `grid grid-cols-7 gap-1` |
| `HardwareMapping` | Resource form | `hardware: Array<{type, assigned}>`, `onAssign: (type, id) => void` | `onAssign` | `select` elements |
| `CsvImport` | Resource list header | `onImport: (csv: string) => void` | `onChange` (file input) | `h-10 px-4 border border-dashed rounded-lg` |
| `DependencyGraph` | Resource list footer | `dependencies: Array<{from, to}>` | None | `h-48 bg-zinc-50 rounded-lg` |

**State Additions:**
```json
{
  "resourceSkills": {},
  "resourceSchedules": {},
  "hardwareMap": { "printer": "prn_1", "tv": "tv_1", "kiosk": "ks_1" },
  "dependencies": []
}
```

---

### 11.11 System Onboarding — Admin Invitations
**File:** `system_onboarding_admin_invitations/index.html`
**Route:** `/onboarding/invitations`
**Priority:** P1

**Add Components:**
| Component | Location | Props | Events | Style |
|-----------|----------|-------|--------|-------|
| `RoleTemplateSelector` | Invite form | `templates: Array<{id, name, permissions}>`, `selected: string`, `onSelect: (id) => void` | `onSelect` | `grid grid-cols-2 gap-2` |
| `PermissionMatrixPreview` | Expandable row | `permissions: string[]`, `expanded: boolean` | `onToggle` | `border-l-2 border-zinc-200 pl-4` |
| `ScimProvisionTest` | SSO section | `idp: 'entra' \| 'okta'`, `onTest: () => Promise<boolean>` | `onClick` | `h-8 text-xs` |
| `AuditLogPreview` | Bottom section | `logs: Array<{action, user, timestamp}>`, `maxItems: number` | None | `h-48 overflow-y-auto text-xs font-mono` |

**State Additions:**
```json
{
  "roleTemplates": [
    { "id": "receptionist", "name": "Receptionist", "permissions": ["read:visits", "create:visit", "call:next"] },
    { "id": "nurse", "name": "Nurse", "permissions": ["read:visits", "call:next", "transfer", "complete:visit"] },
    { "id": "manager", "name": "Manager", "permissions": ["*"] }
  ],
  "selectedTemplate": "",
  "scimTestStatus": null,
  "auditLogs": []
}
```

---



## 12. Stitch Implementation Guide — New Pages (Create)

### 12.1 Today — Visit Command Center (CRITICAL — P0)
**File:** `today/index.html` (create new)
**Source:** Promote `../service_desk_command_roster/index.html` → rename folder, update internal links
**Route:** `/today`
**Sidebar:** Position 1, icon `today`, shortcut `1` / `Cmd+1`
**Priority:** P0

**Layout Component Tree:**
```
<AppLayout sidebar={sidebar} commandPalette={cmdK}>
  <TodayPage>
    <TopBar>
      <CommandPaletteTrigger />
      <NotificationBell />
      <LocationSelector />
    </TopBar>
    <MainContent class="grid grid-cols-[280px_1fr_400px]">
      <StaffSidebar />
      <VisitFeed />
      <VisitContextPanel />
    </MainContent>
  </TodayPage>
</AppLayout>
```

**State Schema:**
```json
{
  "visits": [
    { "id": "A-102", "visitNumber": "#A-102", "waitMinutes": 12, "status": "waiting", "priority": "normal", "service": "Consultation", "name": "John Doe", "phone": "+1 (555) 123-4567", "source": "walkin", "appointmentTime": null, "avatar": "JD" }
  ],
  "filters": { "services": ["Consultation", "X-Ray", "Follow-up"], "statuses": ["waiting", "checked_in", "in_service"] },
  "selectedVisitId": "A-102",
  "offline": false,
  "density": "comfortable"
}
```

**Event Handlers:**
- `Space` → `callNextVisit()`
- `Shift+Space` → `callNextVisit({ priority: true })`
- `Cmd+K` → `openCommandPalette()`
- Click Visit card → `selectVisit(id)`
- Click "Transfer" → `transferVisitToService(serviceId)`

**Features (P0):**
- [ ] 3-column layout: staff sidebar (280px) | Visit feed (flex) | context (400px)
- [ ] Visit card with SLA border: green < 5m, amber 5-15m, red > 15m
- [ ] Visit state actions: Check In, Call, Start, Complete, Cancel
- [ ] Staff status sidebar: 🟢 Active, 🟡 On Break, 🔴 Offline
- [ ] Context panel: avatar, phone, service, source (walkin/appointment/whatsapp), appointment time, custom fields
- [ ] WhatsApp chat drawer (right slide-over)
- [ ] CRM/EHR iframe panel (tab in context)
- [ ] Outcome tagging: Completed / No-Show / Cancelled / Rescheduled buttons
- [ ] Command palette: `Cmd+K` → type to transfer/search

**Design Tokens:**
- Card border transition: `border-l-4 transition-colors duration-300`
- SLA colors: `emerald-500` / `amber-500` / `rose-500`
- Density modes: `comfortable` (p-4), `dense` (p-2, text-sm)

---

### 12.2 AI Operations Center
**File:** `ai-operations/index.html` (create new)
**Route:** `/ai-operations`
**Sidebar:** Position 5, icon `psychology`, shortcut `5` / `Cmd+5`
**Priority:** P1

**Layout Component Tree:**
```
<AppLayout sidebar={sidebar}>
  <AiOperations>
    <TopBar title="AI Operations" />
    <MainContent class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <KingmanGauge />
      <SurgeTimeline />
      <AutoReskillLog />
      <WorkforceHeatmap />
      <SelfHealingToggle />
      <InterventionHistory />
    </MainContent>
  </AiOperations>
</AppLayout>
```

**State Schema:**
```json
{
  "kingman": { "current": 4.2, "projected": 8.7, "threshold": 10, "unit": "minutes" },
  "surgeTimeline": [{ "time": "14:00", "predicted": 12, "actual": 8 }],
  "autoReskillLog": [{ "timestamp": "2026-08-10T12:03:00Z", "action": "Injected overflow permission into Nurse #3", "outcome": "success" }],
  "workforce": [{ "id": "u1", "name": "Dr. Smith", "status": "idle" }],
  "selfHealingEnabled": true,
  "interventions": []
}
```

**Event Handlers:**
- Click gauge → `showDetails()`
- Toggle self-healing → `setSelfHealing(enabled)` (requires manager approval)
- Click intervention → `expandDetail(id)`

**Features (P1):**
- [ ] Kingman variance gauge: real-time `E[Wq]` dial, red zone > threshold
- [ ] Surge prediction timeline: 15-min forward projection
- [ ] Auto-reskill log: live feed of AI actions
- [ ] Workforce heatmap: idle/busy/overflow grid
- [ ] Self-healing toggle: on/off with approval modal
- [ ] Intervention history: timeline with outcomes

---

### 12.3 Locations & Infrastructure Manager
**File:** `settings/locations/index.html` (create new)
**Route:** `/settings/locations`
**Sidebar:** Settings → Position 1, icon `location_city`
**Priority:** P1

**Layout Component Tree:**
```
<AppLayout sidebar={settingsSidebar}>
  <LocationsPage>
    <TopBar title="Locations & Assets" />
    <MainContent>
      <LocationGrid>
        <LocationCard />
      </LocationGrid>
      <LocationDetailDrawer>
        <ResourceTabs />
        <HardwareTable />
      </LocationDetailDrawer>
    </MainContent>
  </LocationsPage>
</AppLayout>
```

**State Schema:**
```json
{
  "locations": [
    { "id": "loc_1", "name": "HQ", "address": "123 Main St", "timezone": "America/New_York", "status": "online", "capacity": 50 }
  ],
  "selectedLocationId": null,
  "resources": { "humans": [], "spaces": [], "assets": [] },
  "hardware": { "printers": [], "tvs": [], "kiosks": [] },
  "operatingHours": { "mon": [{ "start": "09:00", "end": "17:00" }] }
}
```

**Event Handlers:**
- Click location card → `selectLocation(id)`
- Toggle online/offline → `setLocationStatus(id, status)`
- Click "Add Resource" → `openResourceModal(type)`

**Features (P1):**
- [ ] Location cards grid with status, address, timezone
- [ ] Expandable resource sub-tables: humans, spaces, assets
- [ ] Online/offline toggle per location
- [ ] Hardware mapping: printers, TVs, kiosks
- [ ] Weekly operating hours schedule
- [ ] Capacity limit config

---

### 12.4 Integrations & Webhooks Studio
**File:** `settings/integrations/index.html` (create new)
**Route:** `/settings/integrations`
**Sidebar:** Settings → Position 4, icon `cable`
**Priority:** P1

**Layout Component Tree:**
```
<AppLayout sidebar={settingsSidebar}>
  <IntegrationsPage>
    <TopBar title="Integrations" />
    <MainContent class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <IntegrationCard />
      <WebhookDlqPanel />
    </MainContent>
  </IntegrationsPage>
</AppLayout>
```

**State Schema:**
```json
{
  "integrations": [
    { "id": "epic", "name": "Epic HL7", "type": "ehr", "status": "connected", "lastSync": "2 min ago" },
    { "id": "salesforce", "name": "Salesforce CRM", "type": "crm", "status": "connected", "lastSync": "15 min ago" },
    { "id": "entra", "name": "Entra ID SSO", "type": "sso", "status": "connected", "lastSync": "1 min ago" }
  ],
  "webhooks": [{ "id": "wh_1", "endpoint": "/api/webhook", "status": "failed", "retries": 3 }],
  "apiKeys": []
}
```

**Event Handlers:**
- Click "Test" → `testConnection(integrationId)`
- Click "Replay" → `replayWebhook(webhookId)`
- Click "Generate Key" → `createApiKey(integrationId)`

**Features (P1):**
- [ ] Integration cards grid: Epic, Salesforce, SAML SSO, M365, Google, Twilio, WhatsApp
- [ ] Test connection button per card with HTTP status
- [ ] Webhook DLQ vault: failed webhooks list with replay
- [ ] API key management: scoped OAuth tokens
- [ ] SSO/SCIM config: metadata upload, endpoint test
- [ ] Calendar sync status indicators

---

### 12.5 Intake Form Builder
**File:** `settings/forms/index.html` (create new)
**Route:** `/settings/forms`
**Sidebar:** Settings → Position 3, icon `list_alt`
**Priority:** P1

**Layout Component Tree:**
```
<AppLayout sidebar={settingsSidebar}>
  <FormBuilderPage>
    <TopBar title="Intake Forms" />
    <MainContent class="grid grid-cols-[280px_1fr_320px]">
      <Toolbox>
        <ToolboxItem type="text" />
        <ToolboxItem type="number" />
        <ToolboxItem type="dropdown" />
        <ToolboxItem type="ocr" />
      </Toolbox>
      <Canvas>
        <FormField />
      </Canvas>
      <PreviewPanel>
        <MobilePreview />
      </PreviewPanel>
    </MainContent>
  </FormBuilderPage>
</AppLayout>
```

**State Schema:**
```json
{
  "formFields": [
    { "id": "f1", "type": "text", "label": "Full Name", "required": true },
    { "id": "f2", "type": "ocr", "label": "Insurance Card", "config": { "extract": ["name", "dob", "mrn"] } }
  ],
  "conditionalLogic": [{ "if": "service === 'xray'", "then": "show pregnancy_question" }],
  "ocrEnabled": true,
  "hipaaAutoReset": 5,
  "previewDevice": "iphone"
}
```

**Event Handlers:**
- Drag toolbox item → `addField(type)`
- Click field → `selectField(id)`
- Toggle OCR → `setOcrEnabled(enabled)`

**Features (P1):**
- [ ] Drag-drop toolbox: Text, Number, Dropdown, Checkbox, File Upload, OCR Scan
- [ ] Canvas with form fields
- [ ] Conditional logic tree editor
- [ ] OCR camera config toggle
- [ ] HIPAA auto-reset toggle
- [ ] Live mobile preview panel

---

### 12.6 Wallet Pass Designer
**File:** `settings/wallet-passes/index.html` (create new)
**Route:** `/settings/wallet-passes`
**Sidebar:** Settings → Position 5, icon `credit_card`
**Priority:** P2

**Layout Component Tree:**
```
<AppLayout sidebar={settingsSidebar}>
  <WalletPassPage>
    <TopBar title="Wallet Passes" />
    <MainContent class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <PassEditor>
        <PassCanvas />
        <FieldEditor />
      </PassEditor>
      <PassPreview>
        <PhoneMockup />
      </PassPreview>
    </MainContent>
  </WalletPassPage>
</AppLayout>
```

**State Schema:**
```json
{
  "passTemplate": {
    "logo": "",
    "primaryColor": "#0ea5e9",
    "fields": [{ "key": "name", "label": "Name", "type": "text" }],
    "barcodeType": "qr"
  },
  "apnsRules": [
    { "trigger": "position_change", "message": "Your position is now {position}" },
    { "trigger": "five_minutes_before", "message": "Please proceed to the service desk" }
  ],
  "nfcEnabled": true,
  "passExpiration": "visit_complete",
  "abTestVariant": "a"
}
```

**Event Handlers:**
- Click field → `editField(id)`
- Toggle NFC → `setNfcEnabled(enabled)`
- Add APNs rule → `addApnsRule(rule)`

**Features (P2):**
- [ ] Visual pass template editor: logo, fields, barcode, colors
- [ ] APNs push rules configuration
- [ ] NFC tap-to-join config
- [ ] Pass expiration rules
- [ ] A/B testing variants

---

### 12.7 Visitor Management & ACS
**File:** `visitors/index.html` (create new)
**Route:** `/visitors`
**Sidebar:** Position 4, icon `badge`, shortcut `4` / `Cmd+4`
**Priority:** P2

**Layout Component Tree:**
```
<AppLayout sidebar={sidebar}>
  <VisitorsPage>
    <TopBar title="Visitor Management" />
    <MainContent>
      <VisitorTable />
      <CheckInKiosk />
    </MainContent>
  </VisitorsPage>
</AppLayout>
```

**State Schema:**
```json
{
  "visitors": [
    { "id": "v1", "name": "John Contractor", "host": "Dr. Smith", "purpose": "Delivery", "status": "pre-registered", "badgePrinted": false }
  ],
  "kioskMode": false,
  "watchlistEnabled": true,
  "ndaRequired": true
}
```

**Event Handlers:**
- Click "Pre-register" → `openPreRegisterModal()`
- Click "Check In" → `startKioskFlow(visitorId)`
- Click "Print Badge" → `printBadge(visitorId)`

**Features (P2):**
- [ ] Pre-registration: host invites via email, auto-generate pass
- [ ] Check-in kiosk: tablet self-service flow
- [ ] Badge printing: WebUSB thermal printer
- [ ] Watchlist screening: OFAC/govt check
- [ ] NDA capture: e-signature on tablet
- [ ] Turnstile relay: IP relay control

---

### 12.8 Identity & Access Management (Staff Management)
**File:** `settings/identity/index.html` (create new)
**Route:** `/settings/identity`
**Sidebar:** Settings → Position 7, icon `admin_panel_settings`
**Priority:** P2

**Layout Component Tree:**
```
<AppLayout sidebar={settingsSidebar}>
  <IdentityPage>
    <TopBar title="Identity & Access" />
    <MainContent class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <StaffDirectory>
        <StaffTable />
        <AddStaffButton />
      </StaffDirectory>
      <RolePermissionEditor>
        <RoleSelector />
        <PermissionMatrix />
      </RolePermissionEditor>
      <ScimAuditPanel>
        <ScimStatus />
        <AuditLog />
      </ScimAuditPanel>
    </MainContent>
  </IdentityPage>
</AppLayout>
```

**State Schema:**
```json
{
  "staff": [
    { "id": "u1", "name": "Dr. Angela Jenkins", "email": "a.jenkins@hopkins.edu", "role": "admin", "status": "active", "lastActive": "2 min ago", "skills": ["Spanish", "Phlebotomy"] }
  ],
  "roles": [
    { "id": "admin", "name": "Admin", "permissions": ["*"] },
    { "id": "nurse", "name": "Nurse", "permissions": ["read:visits", "call:next", "transfer", "complete:visit"] },
    { "id": "agent", "name": "Agent", "permissions": ["read:visits", "call:next"] }
  ],
  "scimProviders": [
    { "id": "entra", "name": "Entra ID", "status": "synced", "lastSync": "2 min ago" },
    { "id": "okta", "name": "Okta", "status": "synced", "lastSync": "15 min ago" }
  ],
  "auditLogs": []
}
```

**Event Handlers:**
- Click staff row → `selectStaff(id)`
- Change role → `updateRole(id, roleId)`
- Add skill → `addSkill(id, skill)`
- Click "Sync Now" → `syncScim(providerId)`
- Click "Kill Session" → `revokeSession(sessionId)`

**Features (P0/P1):**
- [ ] Staff directory table: name, email, role, status, last active, actions
- [ ] Role assignment dropdown per user
- [ ] Skill tag editor: multi-select tags
- [ ] Permission matrix: granular checkboxes per role
- [ ] SCIM sync status per IdP with manual "Sync Now"
- [ ] Audit log: filterable table of actions
- [ ] Session management: view active sessions, kill globally

---



## 13. Staff Management Page — Detailed Design (Stitch Spec)

### 13.1 Why It's Needed
Current templates have **no dedicated staff management page**. `system_onboarding_admin_invitations` handles initial invites only. There is no ongoing management of:
- Staff profiles and contact info
- Role assignments and permission changes
- Skill tag updates (e.g., adding Spanish fluency)
- Schedule/shift management
- Performance metrics
- SCIM sync status

**This is a critical gap.** Every incumbent (Qmatic Care, Qminder Service Desk, Qless) has a staff/agent management console. YQ needs one to compete in enterprise RFPs.

### 13.2 Page Design: Identity & Access Management

**File:** `settings/identity/index.html` (create new)
**Route:** `/settings/identity`
**Sidebar:** Settings → Position 7, icon `admin_panel_settings`
**Priority:** P2

**Layout Component Tree:**
```
<AppLayout sidebar={settingsSidebar}>
  <IdentityPage>
    <TopBar title="Identity & Access" actions={["Add Staff", "Bulk Invite"]} />
    <MainContent class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <StaffDirectory>
        <StaffTable />
      </StaffDirectory>
      <RolePermissionEditor>
        <RoleSelector />
        <PermissionMatrix />
        <SkillTagEditor />
      </RolePermissionEditor>
      <ScimAuditPanel>
        <ScimStatus />
        <SessionManager />
        <AuditLog />
      </ScimAuditPanel>
    </MainContent>
  </IdentityPage>
</AppLayout>
```

**State Schema:**
```json
{
  "staff": [
    { "id": "u1", "name": "Dr. Angela Jenkins", "email": "a.jenkins@hopkins.edu", "role": "admin", "status": "active", "lastActive": "2 min ago", "skills": ["Spanish", "Phlebotomy"] }
  ],
  "roles": [
    { "id": "admin", "name": "Admin", "permissions": ["*"] },
    { "id": "manager", "name": "Manager", "permissions": ["read:*", "write:visits", "admin:config"] },
    { "id": "nurse", "name": "Nurse", "permissions": ["read:visits", "call:next", "transfer", "complete:visit"] },
    { "id": "agent", "name": "Agent", "permissions": ["read:visits", "call:next"] },
    { "id": "viewer", "name": "Viewer", "permissions": ["read:visits"] }
  ],
  "selectedStaffId": null,
  "scimProviders": [
    { "id": "entra", "name": "Entra ID", "status": "synced", "lastSync": "2 min ago" },
    { "id": "okta", "name": "Okta", "status": "synced", "lastSync": "15 min ago" }
  ],
  "sessions": [],
  "auditLogs": []
}
```

**Event Handlers:**
- Click staff row → `selectStaff(id)`
- Change role dropdown → `updateRole(id, roleId)`
- Add/remove skill tag → `updateSkills(id, skills)`
- Click "Sync Now" → `syncScim(providerId)`
- Click "Kill Session" → `revokeSession(sessionId)`
- Click "Add Staff" → `openInviteModal()`

**Features (P0/P1):**
- [ ] Staff directory table: name, email, role, status, last active, actions
- [ ] Role assignment dropdown per user
- [ ] Skill tag editor: multi-select tags
- [ ] Permission matrix: granular checkboxes per role
- [ ] SCIM sync status per IdP with manual "Sync Now"
- [ ] Audit log: filterable table of actions
- [ ] Session management: view active sessions, kill globally

---

### 13.3 Sidebar Positioning

**Recommended Top-Level Navigation Order:**

| Route | Label | Icon | Shortcut | Persona |
|-------|-------|------|----------|---------|
| `/today` | Today | `today` | `1`, `Cmd+1` | Frontline Agent |
| `/scanner` | Scanner | `qr_code_scanner` | `2`, `Cmd+2` | Concierge |
| `/calendar` | Calendar | `calendar_today` | `3`, `Cmd+3` | Scheduler |
| `/visitors` | Visitors | `badge` | `4`, `Cmd+4` | Front Desk |
| `/analytics` | Analytics | `analytics` | `5`, `Cmd+5` | Manager |
| `/settings` | Settings | `settings` | `6`, `Cmd+6` | Admin |

**Settings Studio Inner Navigation:**

| Route | Label | Icon | Position |
|-------|-------|------|----------|
| `/settings/locations` | Locations & Assets | `location_city` | 1 |
| `/settings/service-studio` | Service Studio | `settings_suggest` | 2 |
| `/settings/forms` | Intake Forms | `list_alt` | 3 |
| `/settings/integrations` | Integrations | `cable` | 4 |
| `/settings/wallet-passes` | Wallet Passes | `credit_card` | 5 |
| `/settings/billing` | Billing | `receipt` | 6 |
| `/settings/identity` | Identity & Access | `admin_panel_settings` | 7 |

---

## 14. Complete Recommended Page Map (Final)

### 14.1 Operational Pages (Top-Level Nav)

```
/app/
├── today/                        ← P0 — promote from parent `service_desk_command_roster/`
├── scanner/                      ← P1 — exists in final, add NFC + OCR
├── calendar/                     ← P1 — exists in final, add LineSync viz
├── visitors/                     ← P2 — NEW
├── analytics/                    ← P1 — exists in final, add AI overlay
└── ai-operations/                ← P1 — NEW
```

### 14.2 Settings Pages (Inner Nav)

```
/settings/
├── locations/                 ← P1 — promote from parent `infrastructure_manager_final/`
├── service-studio/            ← P1 — exists in final, consolidate duplicates
├── forms/                     ← P1 — promote from parent `intake_form_builder_refined/`
├── integrations/              ← P1 — promote from parent `integrations_webhooks_refined/`
├── wallet-passes/             ← P2 — NEW
├── billing/                   ← P2 — exists in final, add overage comparison
└── identity/                  ← P2 — NEW (staff management)
```

### 14.3 Public Pages

```
/public/
├── booking/                   ← EXISTS
└── pass/                      ← EXISTS
```

### 14.4 Onboarding Pages

```
/onboarding/
├── workspace/                 ← EXISTS
├── resources/                 ← EXISTS
└── invitations/               ← EXISTS
```

### 14.5 Marketing (External)

```
/marketing/
└── landing/                   ← EXISTS
```

**TOTAL: 20 functional pages** across 5 sections.

---

## 15. Stitch Implementation Sprint Order

### Sprint 1 (Week 1-2) — P0 Critical
| Task | Action | Source File | Target File |
|------|--------|-------------|-------------|
| 1.1 | Promote & rename | `../service_desk_command_roster/index.html` | `today/index.html` |
| 1.2 | Create page | — | `ai-operations/index.html` |
| 1.3 | Delete duplicate | `settings_studio_service_configurator_updated/` | (remove) |

**Sprint 1 Deliverables:**
- Today is the #1 operational screen; must be polished first
- AI Operations center establishes YQ differentiation
- Duplicate cleanup reduces confusion

---

### Sprint 2 (Week 3-4) — P1 High
| Task | Action | Source File | Target File |
|------|--------|-------------|-------------|
| 2.1 | Enhance | `concierge_qr_scanner_manual_intake/index.html` | Add NFC, OCR, GPS |
| 2.2 | Enhance | `analytics_sla_reporting_dashboard/index.html` | Add filters, AI overlay, query bar |
| 2.3 | Enhance | `multi_resource_scheduling_matrix/index.html` | Add LineSync, GPS, skills |
| 2.4 | Create page | `../settings_studio_infrastructure_manager_final/index.html` | `settings/locations/index.html` |
| 2.5 | Create page | `../settings_studio_integrations_webhooks_refined/index.html` | `settings/integrations/index.html` |
| 2.6 | Create page | `../settings_studio_intake_form_builder_refined/index.html` | `settings/forms/index.html` |

**Sprint 2 Deliverables:**
- Scanner becomes NFC/OCR-enabled
- Analytics gets real-time AI overlay
- Calendar gets LineSync visualization
- Settings gets Locations, Integrations, Forms

---

### Sprint 3 (Week 5-6) — P1/P2 Polish
| Task | Action | Source File | Target File |
|------|--------|-------------|-------------|
| 3.1 | Enhance | `mobile_public_intake_boarding_pass/index.html` | Add Wallet pass UI, lock-screen |
| 3.2 | Create page | — | `settings/wallet-passes/index.html` |
| 3.3 | Create page | — | `settings/identity/index.html` |
| 3.4 | Create page | — | `visitors/index.html` |
| 3.5 | Add global | All staff pages | Command Palette `Cmd+K` overlay |
| 3.6 | Enhance | `settings_studio_billing_usage/index.html` | Add overage comparison, location tiers |

**Sprint 3 Deliverables:**
- Mobile pass becomes Wallet-native
- Staff management (Identity & Access) launches
- Visitor management ready for enterprise RFPs
- Command Palette unified across staff UX

---

### Sprint 4 (Week 7-8) — Marketing & Polish
| Task | Action | Source File | Notes |
|------|--------|-------------|-------|
| 4.1 | Optimize | `qmova_the_11_10_experience/index.html` | Remove WebGL, add pricing/TCO |
| 4.2 | Rollout | All staff pages | Full dark mode |
| 4.3 | Replace | All pages | Spinners → skeleton loaders |
| 4.4 | Add | All data-dense pages | Density toggle (Dense ↔ Visual) |
| 4.5 | Enhance | `lobby_tv_digital_signage_display/index.html` | Zone scheduler, news ticker, burn-in prevention |

**Sprint 4 Deliverables:**
- Marketing page production-ready
- Dark mode complete for night-shift hospitals
- Loading states professionalized
- Accessibility (WCAG) targets met

---

## 16. Global Design Tokens (Enforce Everywhere)

**Typography:**
- Font family: `Plus Jakarta Sans` (app), `Geist Mono` (data/code)
- Sizes: `text-xs` (11px), `text-sm` (13px), `text-base` (15px), `text-lg` (18px)

**Colors:**
- Primary: `sky-600` (#0ea5e9)
- Success: `emerald-500`
- Warning: `amber-500`
- Danger: `rose-500`
- Surface: `white` / `zinc-50`
- Border: `zinc-200`
- Text primary: `zinc-900`
- Text secondary: `zinc-500`

**Spacing:**
- Touch target: `min-h-[44px]`
- Card padding: `p-4` (comfortable), `p-2` (dense)
- Grid gap: `gap-4`

**Animation:**
- Transition: `transition-all duration-150 ease-out`
- Pulse: `animate-pulse` (2s infinite)
- Skeleton: `animate-pulse bg-zinc-200 rounded`

**Dark Mode:**
- Background: `zinc-950`
- Surface: `zinc-900`
- Border: `zinc-800`
- Text: `zinc-100` / `zinc-400`

---
