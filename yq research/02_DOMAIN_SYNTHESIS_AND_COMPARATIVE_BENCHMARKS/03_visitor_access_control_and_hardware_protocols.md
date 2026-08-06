# Domain Synthesis: Visitor Access Control & Hardware Protocols

> **Document Status:** Active Standard & Synthesis Benchmark
> **Author:** Enterprise SaaS Consultant & Staff Software Architect
> **Purpose:** Comprehensive engineering specification for hardware integrations: Turnstiles, Security Badge Printers, SIP Intercoms, and Tablet Kiosk Edge Connectors.

---

## 1. Executive Summary

Visitor Management software (e.g., Envoy, Proxyclick, Traction Guest) must cross the physical-digital divide by instructing premises hardware—such as thermal printers, door strikes, optical turnstiles, and biometric ID scanners—to execute secure access workflows. Legacy platforms achieve this through brittle proprietary desktop printer drivers and expensive on-premise Windows relay servers that break during OS security upgrades.

This document specifies YQ's resilient, hardware-agnostic Edge IoT and Browser Communication architecture.

---

## 2. Universal Kiosk & Thermal Badge Printing Protocols

```mermaid
flowchart TD
    subgraph Browser_Kiosk [YQ Web Touch Kiosk / PWA (iPad / Android / Windows)]
        UI[Kiosk Check-in Complete UI]
        JS_Engine[YQ Edge Hardware Gateway (JavaScript API)]
    end

    subgraph Hardware_Layer [Premises Lobby Hardware]
        WebUSB[WebUSB Direct Protocol]
        WebBT[WebBluetooth Direct Protocol]
        IP_Print[RAW TCP 9100 / IPP Port]
        Printer[Thermal Badge Printer (Zebra / Brother / Dymo)]
    end

    UI --> JS_Engine
    JS_Engine -->|1st Priority: Driverless USB Cabled| WebUSB --> Printer
    JS_Engine -->|2nd Priority: Wireless Tablet Pairing| WebBT --> Printer
    JS_Engine -->|3rd Priority: Local Network Router Broadcast| IP_Print --> Printer
```

### 2.1 YQ Driverless Edge Printing Architecture
To eliminate the customer support technical debt of third-party desktop printer drivers, YQ kiosks leverage modern browser hardware standards:
* **WebUSB API & WebBluetooth API:** The YQ PWA kiosk application natively emits RAW printer command languages (ZPL II for Zebra, ESC/P for Epson, BCP for Brother) directly over USB or Bluetooth connections directly from JavaScript. No background system services, print spoolers, or native iPadOS app wrappers are required.

---

## 3. Physical Security & Access Control System (ACS) Federation

In Fortune 500 deployments, visitor check-in must trigger automated credentialing inside physical access control networks (e.g., LenelS2 OnGuard, CURE 9000, Brivo, Honeywell EBI).

### 3.1 YQ ACS Gateway & Digital Keycard Provisioning
* **Relay Gateway Architecture:** For cloud-inaccessible legacy ACS firewalls, YQ distributes an automated, containerized Docker Edge Gateway that sits inside the corporate intranet. The gateway establishes an outbound encrypted WebSockets (WSS/443) tunnel to YQ Cloud, ingesting real-time check-in webhooks without requiring open inbound firewall firewall ports.
* **Transient Digital Wallet Keycard Generation:** Instead of printing disposable paper badges, YQ integrates with Apple Wallet Access / NFC Host Card Emulation (HCE). Upon host approval, the visitor's smartphone Apple/Google Wallet pass emits a secure NFC cryptographic token capable of unlocking lobby turnstiles directly via existing corporate NFC readers.
