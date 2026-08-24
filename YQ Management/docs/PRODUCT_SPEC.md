# YQ Queue — Product Overview & Technical Specification (MVP)

---

# 1. Product Overview

## Product Name

**YQ Queue**

## Product Category

White-label B2B SaaS Queue Management Platform

## Product Vision

YQ Queue is a cloud-based, mobile-first queue orchestration platform that enables organizations to digitize and manage physical queues in real time while providing customers with a seamless waiting experience.

Instead of customers physically waiting in long lines, they can scan a QR code, join the queue digitally, monitor their live position, receive automated notifications, and present a digital QR token when it is their turn.

The platform is designed to operate completely under the client's branding, making YQ Queue the invisible infrastructure powering queue operations.

---

# 2. Problem Statement

Businesses that handle large numbers of walk-in customers often struggle with:

* Long physical queues
* Poor crowd management
* Customer frustration
* Unpredictable waiting times
* Manual token systems
* No real-time visibility
* High staff workload
* Missed turns
* Operational inefficiencies

Traditional paper token systems provide little visibility and require customers to remain physically present.

YQ Queue solves this problem through a real-time digital queue management platform.

---

# 3. Solution

Customers can:

* Scan a QR code at the business
* Join the queue instantly
* View live queue position
* Monitor estimated waiting time
* Receive WhatsApp reminders
* Present their personal QR code when called

Businesses can:

* Digitize queue operations
* Reduce congestion
* Improve customer experience
* Increase operational efficiency
* Track queue performance
* Manage multiple queues simultaneously

---

# 4. Target Customers

Primary industries:

* Hospitals
* Clinics
* Government Offices
* Municipal Service Centers
* Visa Centers
* Banks
* Insurance Offices
* Universities
* Educational Institutions

Secondary industries:

* Retail Stores
* Car Service Centers
* Customer Support Centers
* Passport Offices
* Licensing Offices

---

# 5. Product Positioning

YQ Queue is **not simply a queue application.**

It is positioned as:

> **A Customer Flow & Queue Orchestration Platform**

The product helps organizations optimize customer movement, reduce congestion, improve operational efficiency, and enhance customer satisfaction.

---

# 6. White-Label SaaS Model

Every business receives its own branded environment.

Example:

```
hospitalname.yqmanagement.com
```

Branding includes:

* Business logo
* Business colors
* Business name
* Custom queues
* Custom WhatsApp branding
* Independent configuration

Customers interact only with the business.

They are not required to know about YQ Queue.

---

# 7. Core Product Features

## Customer Features

### QR Queue Joining

Customers scan a QR code displayed at the business.

The QR automatically opens the business-specific queue page.

No application installation required.

No account creation required.

---

### Quick Registration

Customer enters:

* Name
* Mobile Number

This minimizes friction while maintaining customer identification.

---

### Digital Queue Token

Upon joining the queue the system generates:

* Queue Token
* Unique Token ID
* Personal QR Code

This QR acts as the customer's access credential.

---

### Live Queue Tracking

Customers can continuously monitor:

* Current queue position
* Number of people ahead
* Current token being served
* Estimated waiting time
* Queue status

Updates occur automatically in real time.

---

### Estimated Wait Time

The platform continuously calculates waiting time using queue progression.

Initially:

Average Service Time × People Ahead

Future versions may introduce predictive algorithms using historical queue data.

---

### WhatsApp Notifications

Customers receive automatic WhatsApp notifications when:

* Queue successfully joined
* Customer is approaching their turn
* Customer is next
* Customer's turn begins
* Customer misses their turn

All notifications are branded with the business name.

---

### QR Validation

When the customer reaches the service counter:

Admin scans customer's QR.

System validates:

* Current token
* Queue status
* Eligibility

Response:

Allow

or

Manual Override Required

---

# 8. Admin Features

## Live Dashboard

Displays:

* Active queues
* Current serving token
* Queue statistics
* Waiting customers
* Estimated waiting times

---

## Queue Management

Administrators can:

* Create queues
* Pause queues
* Resume queues
* Close queues
* Rename queues

---

## QR Scanner

Built-in camera scanner.

Scans customer QR.

Returns validation result immediately.

Possible outcomes:

Green

* Allow customer

Red

* Override Required

Invalid

* Reject

---

## Queue Controls

Operators can:

* Advance queue
* Skip customer
* Hold customer
* Recall previous customer

---

## Multi Queue Support

One business can operate multiple queues.

Example:

* Registration
* Billing
* Consultation
* Pharmacy

Each queue operates independently.

---

## Activity Logs

Stores:

* Queue progression
* Skipped customers
* Manual overrides
* Operator actions

Useful for auditing.

---

# 9. Future Integration — YQ Buddy

The architecture is designed to integrate with **YQ Buddy** in future releases.

YQ Buddy provides physical queue assistants.

Future integration allows:

* Assigning a queue assistant to a customer
* Switching token ownership
* Automated buddy assignment
* Hybrid digital + physical queue management

The backend architecture will support this through a token holder abstraction.

---

# 10. Technical Stack

## Frontend

Framework
* Next.js 15

Language
* TypeScript

Styling
* Tailwind CSS

Component Library
* shadcn/ui

State Management
* TanStack Query
* React Context

Realtime Client
* Socket.IO Client

Progressive Web App
* next-pwa

QR Scanner
* html5-qrcode

---

## Backend

Runtime
* Node.js

Framework
* NestJS

Language
* TypeScript

Architecture
* Modular Service Architecture

Communication
* REST APIs
* WebSockets

Authentication
* JWT (Admin)
* Role Based Access Control

---

## Database

Primary Database
* PostgreSQL

ORM
* Prisma

Reasons:
* Strong relational support
* Multi-tenant capability
* Excellent reporting
* Reliability
* ACID compliance

---

## Queue Engine

Redis

Responsibilities:
* Queue ordering
* Position calculations
* Temporary state
* Pub/Sub
* Realtime synchronization

Redis Data Structures:
* Sorted Sets
* Lists
* Pub/Sub Channels

---

## Realtime Communication

Socket.IO

Used for:
* Queue updates
* Position changes
* Admin dashboard updates
* Customer dashboard updates

---

## Notifications

WhatsApp

Provider:
* Twilio WhatsApp API (initial implementation)

Triggers:
* Queue Joined
* Near Turn
* Turn Active
* Missed Turn

---

## File Storage

Cloud Storage

Stores:
* Logos
* Branding assets
* QR images (if required)

---

## Hosting

Frontend
* Vercel

Backend
* Railway

Database
* Supabase PostgreSQL or Neon PostgreSQL

Redis
* Upstash

DNS
* Cloudflare

---

# 11. Multi-Tenant Architecture

The platform operates using a shared backend with isolated tenants.

Each tenant contains:
* Independent queues
* Branding
* Settings
* Administrators
* Notifications
* Statistics

Routing:
```
tenant.yqmanagement.com
```

Backend automatically resolves tenant from subdomain.

---

# 12. Security

Admin Authentication
* JWT

Passwords
* BCrypt Hashing

Rate Limiting
Applied to:
* Queue Join API
* Login
* QR Validation

Input Validation
* DTO validation
* Server-side validation

HTTPS
Required for production.

---

# 13. Performance Goals

Queue update latency
< 500ms

QR validation
< 1 second

Page load
< 2 seconds

Concurrent users
Scalable using Redis and horizontal backend instances.

---

# 14. Scalability

The architecture supports future expansion including:
* Multi-location businesses
* Enterprise accounts
* API integrations
* Appointment scheduling
* AI-based waiting predictions
* Digital signage
* Customer analytics
* Native mobile applications
* Integration with YQ Buddy
* Third-party ERP integrations
* Custom domains
* Advanced reporting

---

# 15. MVP Scope

Included:
* QR queue joining
* Live queue dashboard
* Queue management
* QR validation
* WhatsApp notifications
* White-label branding
* Multi-tenant architecture
* Business onboarding
* Subscription-ready architecture

Deferred to future versions:
* AI wait-time prediction
* Appointment scheduling
* Native mobile applications
* Enterprise APIs
* YQ Buddy integration
* Advanced analytics
* Custom domains
* Multi-region deployments

---

# 16. Development Timeline

**Duration:** 8 weeks (approximately 2 months)

### Weeks 1–2
* Project setup
* Authentication
* Multi-tenant foundation
* Database schema
* UI framework

### Weeks 3–4
* Queue engine
* Customer flow
* Admin dashboard
* QR generation
* QR validation

### Weeks 5–6
* Realtime updates
* Redis integration
* WhatsApp notifications
* Queue controls
* Testing

### Weeks 7–8
* Branding
* SaaS onboarding
* Deployment
* Performance optimization
* Pilot client preparation

---

# 17. Long-Term Vision

YQ Queue is intended to become the operational infrastructure for customer flow management across service-based organizations.

Combined with future **YQ Buddy** integration, the platform evolves beyond queue management into a complete **Queue Operations Ecosystem**, enabling businesses to manage both digital queue orchestration and human-assisted queue fulfillment through a single unified platform.
