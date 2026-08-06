# Domain Synthesis: Omnichannel Messaging & Gateway Resilience

> **Document Status:** Active Standard & Synthesis Benchmark
> **Author:** Staff Software Architect & UX Researcher
> **Purpose:** Architectural specifications for fault-tolerant omnichannel messaging across WhatsApp Business API, SMS Fallback Routing, Interactive IVR, and dynamic Apple/Google Wallet passes.

---

## 1. Executive Summary

Customer journey communication across legacy queue and scheduling SaaS solutions suffers from single-channel dependency—relying almost exclusively on plain-text SMS messages delivered via rigid telecom provider configurations. When cellular carriers throttle SMS short-codes during peak hours, customer check-in tracking fails, leading to lobby overcrowding and missed appointments.

This document outlines YQ’s multi-gateway omnichannel router, designed for absolute global deliverability, conversational interactivity, and zero-install wallet tracking.

---

## 2. YQ Fault-Tolerant Omnichannel Routing Architecture

```mermaid
flowchart TD
    Start[Event Triggered: e.g. Ticket Issued / Appointment Called]
    Router{YQ Omnichannel Intelligent Router}
    
    Start --> Router
    Router -->|Primary Route: Interactive Chat| WhatsApp[WhatsApp Business API Cloud Gateway]
    Router -->|Secondary Route: Wallet Push| Wallet_Push[APNs / Firebase Silent Push to Wallet Pass]
    
    WhatsApp -->|Delivery Status: Success (ACK)| Complete[Customer Experience Orchestrated]
    WhatsApp -->|Delivery Status: Timeout / Not Registered (<5s)| SMS_Router{SMS Telecom Failover Gateway}
    
    SMS_Router -->|Route 1: Twilio High-Throughput| SMS_1[Twilio Short Code / Toll-Free]
    SMS_Router -->|Route 2 Fallback (If Route 1 Throttles)| SMS_2[Infobip / MessageBird Backup Pool]
    
    SMS_1 --> Complete
    SMS_2 --> Complete
```

---

## 3. Conversational Interactivity vs. Static Broadcasts

### 3.1 WhatsApp Business Cloud API Integration
YQ integrates directly with Meta's Official WhatsApp Cloud API (bypassing third-party aggregator latency and markups where feasible). Unlike competitors that send static read-only text alerts, YQ deploys interactive templated payloads:
* **Interactive Quick Reply Action Buttons:** Every queue ticket alert embeds interactive buttons: `[📍 View Map]`, `[⏳ Running 15 Mins Late]`, and `[❌ Cancel Visit]`. Clicking a button fires an instantaneous bidirectional webhook back to YQ's routing engine to adjust queue order immediately without staff intervention.

---

## 4. Digital Wallet Pass Engine (Apple Wallet `.pkpass` & Google Wallet)

### 4.1 Zero-Install Real-Time Tracking Architecture
To achieve 100% adoption without forcing users to download an App Store application, YQ dynamically generates cryptographically signed `.pkpass` files on the fly during ticket creation:
* **Background APNs / FCM Push Updates:** When a customer's queue wait time decreases or their assignment shifts from "Waiting" to "Proceed to Counter 4", YQ's messaging microservice fires a silent background push notification via Apple Push Notification service (APNs) and Firebase Cloud Messaging (FCM).
* **Live Lock Screen Display:** The pass updates dynamically directly on the user's locked smartphone display, accompanied by high-contrast haptic vibrations announcing their counter number in real-time.
