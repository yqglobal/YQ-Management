---
name: Clinical Warmth
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b22'
  on-surface-variant: '#3f4850'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#8d4b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b15f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1ec'
  canvas: '#FAFAFA'
  card: '#FFFFFF'
  border: '#E4E4E7'
  alert: '#E11D48'
  dark-canvas: '#09090B'
  dark-card: '#121214'
  dark-border: '#27272A'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  data-mono:
    fontFamily: Geist Mono
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  data-mono-lg:
    fontFamily: Geist Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  label-caps:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  sidebar-w: 256px
  header-h: 64px
---

## Brand & Style

The design system is engineered for **Qmova**, a multi-tenant visit and queue management platform. The brand personality is "Clinical yet Warm"—balancing the high-stakes precision of operational environments (hospitals, service centers) with the approachability required for stressed visitors.

The chosen style is **Art Gallery Balanced Minimalism**. This approach utilizes heavy whitespace and an asymmetric spacing rhythm to create a sense of calm and order. It avoids the "clutter" typical of enterprise dashboards by maintaining a density score of 5/10.

**Key visual principles:**
- **Asymmetric Balance:** Layouts should feel intentionally weighted, often pulling the primary focus to the center-left while secondary metadata rests on the right.
- **Operational Precision:** High-contrast status indicators and monospaced data ensure that critical information is never misread.
- **Clinical Utility:** Sharp boundaries and a neutral palette suggest hygiene and professional reliability.

## Colors

The palette is strictly based on the **Zinc scale** to maintain a neutral, professional foundation. 

- **Primary (#0284C7):** Reserved for primary CTAs and active navigation states.
- **Success/Safe (#059669):** Used for "Call Next" actions and "Online" statuses.
- **Warning (#D97706):** Used for threshold alerts where wait times exceed soft limits.
- **Alert (#E11D48):** Reserved for SLA violations and critical errors.

**Implementation Rules:**
- Never use pure black (`#000000`); use the Zinc 950 for deep shadows or dark mode backgrounds.
- Do not mix warm grays (Slate/Stone) with this system's cold Zinc grays.
- Functional colors (Success, Warning, Alert) should be used as borders or subtle backgrounds to highlight specific queue items.

## Typography

This system uses a dual-font strategy:
1. **Plus Jakarta Sans:** Used for all prose, headers, and UI controls. Headers must use `tracking-tight` (negative letter spacing) to appear more "designed" and authoritative.
2. **Geist Mono:** Reserved strictly for **quantitative data** (Ticket IDs like #LAB-104, Wait Timers, and Roster Counters). It must utilize `tabular-nums` and `slashed-zero` to ensure that real-time ticking data does not cause layout shifts.

On mobile devices, `headline-lg` should scale down to 24px (`headline-md` values) to ensure readability without excessive wrapping.

## Layout & Spacing

The layout follows an **Art Gallery Balanced** philosophy, prioritizing wide margins and asymmetric compositions.

- **Grid:** A 12-column fluid grid is used for configuration screens, while operational screens (like the Service Desk) use a fixed-column asymmetric layout (20% / 50% / 30%).
- **Rhythm:** An 8px base unit is used for component internal spacing, but a 4px "micro-unit" is allowed for dense data tables.
- **Breakpoints:**
  - **Mobile (<768px):** Single column stack. Sidebar collapses to a bottom navigation or hidden drawer.
  - **Tablet (768px - 1024px):** Sidebar collapses to icons only (64px width).
  - **Desktop (>1024px):** Full 256px sidebar. Asymmetric 3-column layout active.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** rather than heavy shadows.

- **Level 0 (Canvas):** `#FAFAFA`. This is the bottom-most layer.
- **Level 1 (Cards/Panels):** `#FFFFFF`. Used for the main interactive surface. It features a 1px solid border of `#E4E4E7` (Zinc 200).
- **Level 2 (Modals/Popovers):** `#FFFFFF` with a very soft, diffused shadow (`0 10px 15px -3px rgba(0, 0, 0, 0.05)`).
- **Active State:** When a ticket or item is "Called" or "Active," it does not lift; instead, it receives a 2px colored border (Primary or Success) to indicate focus.

Avoid all heavy drop shadows or neomorphic effects. Depth is communicated through the contrast between the Zinc 50 canvas and the pure White cards.

## Shapes

The shape language is **Rounded**, balancing the clinical feel with a touch of softness.

- **Standard Elements (Buttons, Inputs, Cards):** 0.5rem (8px) radius.
- **Large Containers (Scanner Viewfinder, Modals):** 1rem (16px) radius.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

- **Buttons:** 
  - Primary: `bg-sky-600 text-white`.
  - Operational (Call Next): `bg-emerald-600 text-white`.
  - All buttons must have a minimum height of `44px` for touch ergonomics.
- **Input Fields:** 
  - Neutral Zinc 200 border. On focus, use a 1px `sky-600` ring. 
  - Use `Geist Mono` for inputs specifically for phone numbers or IDs.
- **Cards (Visitor/Ticket):** 
  - White background, Zinc 200 border. 
  - Features a vertical color-accent bar on the left edge to indicate wait status (Green, Amber, or Rose).
- **Icons:** 
  - Use **Lucide** icons. 
  - Stroke width must be exactly `1.5px` to maintain the "Art Gallery" airy aesthetic.
- **Lobby TV Display:** 
  - High-contrast Dark Mode (`bg-zinc-950`). 
  - "Now Serving" items should use `data-mono-lg` typography for maximum legibility from a distance.
- **Status Badges:** 
  - Small, uppercase labels using `label-caps` typography. High contrast background with white text.