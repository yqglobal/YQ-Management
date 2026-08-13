# GOOGLE STITCH UI GENERATION MASTER PROMPT: QMOVA (FULL PLATFORM SUITE)
Act as a Principal Staff Frontend Engineer and World-Class Product Designer specialized in high-concurrency SaaS applications (similar to Linear, Vercel, and Stripe). Your task is to generate the entire multi-tenant frontend ecosystem for "Qmova," a visit and dynamic queue management platform. 
The visual design system must implement an "Art Gallery Balanced" spatial framework (Density Score: 5/10, Spacing Offset Asymmetric Score: 7/10, Motion Score: 6/10). The atmosphere must look clinical yet warm, prioritizing extreme readability for operational staff under stress.
---
## 1. DESIGN SYSTEM & VISUAL STYLE DEFINITION
### Explicit Theme Calibration & Color Rules
- Enforce an absolute neutral base theme. Generic "AI Purple/Neon Glow" aesthetics are strictly BANNED.
- Canvas Background Surface: `#FAFAFA` (Zinc 50) | Dark Mode: `#09090B` (Zinc 950)
- Component Card Fill: `#FFFFFF` (White) | Dark Mode: `#121214` (Zinc 900)
- Primary Boundaries & Boarder Strokes: `#E4E4E7` (Zinc 200) | Dark Mode: `#27272A` (Zinc 800)
- Muted Typography & Descriptions: `#71717A` (Zinc 500)
- Brand Highlight (Primary Call to Actions): `#0284C7` (Sky 600)
- Operational Active / Safe Status: `#059669` (Emerald 600)
- Operational Warning Threshold Status: `#D97706` (Amber 600)
- SLA Violation / Late Penalty Status: `#E11D48` (Rose 600)
- Prohibited Palette: Never use pure black (`#000000`). Never mix warm grays (Slate) with cold grays (Zinc).
### Typographic Framework & Iconography
- Primary Display Headers & Body Typography: Use "Plus Jakarta Sans". Render all headers with `tracking-tight` and `font-semibold` formatting. 
- Quantitative Data (Ticket IDs, Wait Timers, Queue Roster Counters): Use "Geist Mono". Enforce `tabular-nums slashed-zero font-mono` to prevent layout shifting during real-time data ticks.
- Icon Style: Lucide React icons exclusively. Enforce a unified stroke width of 1.5px across all screens.
---
## 2. PERSISTENT WORKSPACE SHELL (APPLICATION LAYOUT)
Generate the main administrative web application shell:
- Left Sidebar Frame: Fixed width `w-64`, collapsing to `w-16` on tablet breakpoints.
- Navigation Hierarchy (Top to Bottom): 
  - CORE: `Service Desk`, `Concierge Scanner`, `Calendar`, `Lobby TV Display`.
  - ANALYTICS: `Reporting`, `SLA Metrics`.
  - CONFIGURATION: `Locations & Infrastructure`, `Service Studio`, `Intake Forms`, `Integrations`.
- Top Context Header: Fixed height `h-16`. Left side embeds a "Facility Location Dropdown Selector". Right side houses a global search bar, Notification Bell, and a prominent `[+ Add Visitor]` CTA button.
---
## 3. CORE OPERATIONAL SCREENS (PRIORITY 1)
### View 1: The Service Desk Command Roster (`/service-desk`)
Generate an asymmetric 3-column Kanban layout (`h-[calc(100vh-4rem)]`), overflow hidden.
- Column 1 (20%): Monitored Pipeline Panel. Filter check-boxes for service lines and active staff allocation badges.
- Column 2 (50%): Dynamic Priority Queue Pool. Vertically scrolling list of waiting customer cards. Each card features a large mono-spaced identifier (e.g., `#LAB-104`), name, dynamic timer metrics (changing border color based on threshold), and an accessible `[Call Next]` action button (`bg-emerald-600 text-white`).
- Column 3 (30%): Visitor Context & WhatsApp Broker Panel. Accordion view of custom intake answers and an interactive Two-Way WhatsApp text conversation window with a message input bar at the bottom.
### View 2: Concierge QR Scanner & Manual Intake (`/scanner`)
Designed for receptionists managing the "Concierge Mode" physical desk.
- Layout: Split-screen focus layout.
- Left Side (The Scanner): A centered, rounded-2xl simulated camera viewfinder block (`aspect-square bg-zinc-900 border-2 border-dashed border-zinc-600`). Includes a pulsing scan line animation. Below it, an explicit manual fallback input: *"Scan Failed? Enter Phone Number:"*
- Right Side (Verification Pop-up): An empty state that transitions to a rich "Visitor Profile Card" upon successful scan. Displays the scanned patient's ID photo placeholder, Name, Appointment Slot time, and a massive `[Confirm Arrival & Route to Queue]` button.
### View 3: Multi-Resource Scheduling Calendar (`/calendar`)
- Layout: Horizontal timeline matrix tracking `Resource Asset Nodes` down the Y-axis against `Hourly Columns` down the X-axis.
- Interaction Slots: Filled, solid states for confirmed appointments (`bg-sky-50 text-sky-800`). Dashed border blocks representing "Calculated Walk-in Gaps" available for dynamic walk-in insertion (`border-dashed border-emerald-300 bg-white text-emerald-600 font-mono font-bold text-center uppercase`).
### View 4: Lobby TV Digital Signage Display (`/tv-display`)
- Context: Designed for 1080p/4K wall monitors. Enforce Strict Dark Mode (`bg-zinc-950`).
- Left Panel (70% Width): Infotainment zone. Display a simulated 16:9 video player placeholder for hospital marketing videos.
- Right Panel (30% Width): "Now Serving" Roster. A high-contrast vertical list of called tickets.
- Active Call State: The top component of the roster must feature a massive, flashing highlight box rendering: `TICKET #A-104 ➔ PROCEED TO DESK 3`.
---
## 4. CUSTOMER-FACING SURFACES (PRIORITY 2)
### View 5: Mobile-First Public Intake & Booking (`tenant.qmova.com/booking`)
- Context: Optimized entirely for mobile viewports (<768px). Dark Mode default (`bg-zinc-950`).
- Intake Elements: Top header with company logo. Center card holding a clean phone number input validation form, dynamic dropdown select menus, and a selection matrix for choosing target services.
### View 6: The Digital Boarding Pass / Wait Tracker (`tenant.qmova.com/pass`)
- Context: The dynamic web-view linked from WhatsApp. Mobile layout, light mode.
- Elements: 
  - Top: A large, crisp QR code (for on-site concierge scanning). 
  - Center: A massive dynamic typography block stating: `You are 3rd in line.` Avoid hard minute countdowns. 
  - Middle: A pulsing circular progress ring. 
  - Bottom: Action buttons `[I'm running late (+15m)]` and `[Cancel Visit]`.
---
## 5. ADMINISTRATIVE SETTINGS STUDIO (PRIORITY 3)
### View 7: System Onboarding Wizard (`/onboarding`)
- Layout: Centered setup card (`w-full max-w-xl`) floating over a Zinc 50 backdrop. 
- Elements: A visual 3-step progress bar. Inputs for Organization Name and an interactive sub-domain selector mask (`https://[ input ].qmova.com`). Footer with `[Back]` and `[Continue]`.
### View 8: Services Studio Configurator (`/settings/services`)
- Layout: Nested section navigation rows.
- Control Components: Cards grouping Level 3 macro categories ("Radiology") wrapping multiple nested Level 4 Service Actions ("MRI Scan").
- Action Controls: Toggle selectors for `[Strict FIFO Queue]` vs. `[Dynamic Calendar Sync]`. Inputs for: Ticket Sequence Prefix, Estimated Service Duration (minutes), and Lateness Grace Window.
### View 9: Intake Form Drag-and-Drop Builder (`/settings/forms`)
- Layout: Two-column builder. 
- Left (Toolbox): Draggable input types (Short Text, Dropdown, Checkbox, File Upload for Medical IDs).
- Right (Canvas): A live preview of the mobile check-in form. Include a visual "Logic Branch" configuration modal that appears when a question is clicked (e.g., "IF age < 18, THEN show 'Guardian Name' field").
### View 10: Locations, Assets & Infrastructure (`/settings/infrastructure`)
- Layout: Data-table grid view.
- Elements: A list of physical facility locations. Clicking a location expands a sub-table of `Resource Assets` (e.g., "Exam Room 1", "Dr. Vance"). 
- Action: Include a prominent inline toggle switch `[Online / Offline]` for each asset to instantly halt routing if a room is closed for cleaning.
### View 11: Ecosystem Integrations & Webhooks (`/settings/integrations`)
- Layout: Grid of integration cards.
- Cards: "WhatsApp Business API", "SAML 2.0 / SSO", "Epic EHR HL7", "Twilio SMS Fallback".
- Card Internals: When expanded, display API key input masks (`••••••••`), webhook endpoint URL generators, and a visual `[Test Connection]` ping button rendering a green `HTTP 200 OK` success badge.
### View 12: Analytics & SLA Reporting (`/analytics`)
- Layout: Executive dashboard overview.
- Elements: Top row metric cards (Total Visits, Avg Wait Time, Walkaway Rate). Center area contains a smooth spline area chart mapping throughput volume over the last 24 hours. Bottom area contains a heatmap showing SLA threshold violations (Wait time > 20 mins) broken down by specific Service Categories.
---
## 6. STRICT UI ERGONOMIC & MICRO-INTERACTION RULES
- Touch Targets: Every interactive click target, toggle layout, and checkbox must uphold a minimum tap height of `44px`.
- State Loaders: Empty states must display accurate skeletal outline layers matching screen components rather than generic circular spinners.
- Fluid Layouts: Roster lists and dashboard columns must update positions using CSS spring-physics movements. No instantaneous snapping.
- Mobile Collapse Rules: All multi-column desktop matrix structures must collapse cleanly into standard single-column stacks when viewed on mobile screens, with zero horizontal overflow permitted.