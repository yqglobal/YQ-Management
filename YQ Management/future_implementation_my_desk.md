# Future Implementation Plan: My-Desk & Dynamic Widget Engine

## 1. Overview
The goal of this implementation is to provide a tailored, distraction-free interface (`/dashboard/my-desk`) for `STAFF` users (the service providers). Instead of the generic "Service Desk" used by Receptionists (`MANAGER`), the `STAFF` view will adapt to their specific industry (Healthcare, F&B, Salon, etc.) using a dynamic, widget-based UI engine.

## 2. Core Architecture: The Widget Engine
The UI will be driven by a JSON configuration linked to the tenant's `IndustryTemplate`. The engine will parse this JSON and dynamically render React components (Widgets) on a grid.

### 2.1 The Configuration Schema
Each industry template will define a `staffViewLayout` array:
```json
{
  "staffViewLayout": [
    { "id": "current-task-1", "type": "CurrentTicketWidget", "position": { "col": 1, "row": 1, "span": 2 } },
    { "id": "history-1", "type": "CustomerHistoryWidget", "position": { "col": 3, "row": 1, "span": 1 } },
    { "id": "form-1", "type": "CustomFormWidget", "formId": "diagnosis", "position": { "col": 1, "row": 2, "span": 3 } }
  ]
}
```

### 2.2 Core Widgets to Develop
- **`CurrentTicketWidget`**: Displays the active customer's name, token, and basic info. Includes the core action buttons (Start, Complete, Skip).
- **`QueueGridWidget` (KDS)**: For high-volume environments (Kitchens), displays all pending orders as cards with color-coded wait timers.
- **`CustomerHistoryWidget`**: Pulls past visits, attachments (photos), and notes for the active customer.
- **`CustomFormWidget`**: Renders a dynamic form (e.g., Prescription, Consultation notes) that saves directly to the visit record.
- **`ScheduleWidget`**: Displays today's upcoming appointments in a timeline view.

## 3. Implementation Phases

### Phase 1: Database & Routing Prep
1. **Schema Updates:** Ensure `IndustryTemplate` includes the `staffViewLayout` JSON field.
2. **Routing:** Create `frontend/src/pages/dashboard/my-desk.tsx`.
3. **Redirection Logic:** Update `AuthContext.tsx` or `AdminLayout.tsx` so that users with the `STAFF` role are routed to `/dashboard/my-desk` upon login, bypassing the main Service Desk.

### Phase 2: The Widget Engine Foundation
1. **Widget Registry:** Create a registry (e.g., `WidgetRegistry.tsx`) mapping string types (like `"CurrentTicketWidget"`) to actual React components.
2. **Grid Layout System:** Implement a CSS Grid or Flexbox container in `my-desk.tsx` that maps over the `staffViewLayout` array and renders the correct widgets based on their `position` settings.
3. **Context Provider:** Create a `MyDeskContext` to hold the "currently active ticket/visit" state, so all widgets on the screen can react to the same customer without prop-drilling.

### Phase 3: Building the Specific Widgets
1. Develop the Clinical Widgets (Form inputs, History).
2. Develop the KDS Widgets (Kanban style order cards, Bump buttons).
3. Develop the Salon Widgets (Portfolio attachments, Schedule timeline).

### Phase 4: Data Isolation (Row-Level Security)
1. Ensure the backend endpoints called by the widgets (e.g., `GET /visits/active`) filter the results based on the logged-in `STAFF` member's ID. A doctor should only see their assigned patients; a cook should only see the kitchen queue.

### Phase 5: The "No-Code" Admin Builder (Long-Term)
1. Create a settings page for Admins (`/dashboard/settings/staff-view`).
2. Implement a drag-and-drop interface (using libraries like `dnd-kit` or `react-grid-layout`) allowing Admins to customize the layout JSON visually, adding/removing widgets as needed.
