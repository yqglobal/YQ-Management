# Messaging Templates Audit

## Overview
The "Messaging Templates" page allows Tenant Admins and authorized staff to customize the automated text and WhatsApp messages sent to customers throughout their journey. These templates correspond to specific events triggered within the system (e.g., when a customer joins a queue, books an appointment, or when their turn is approaching).

## How it Operates
1. **Template Retrieval:** The frontend fetches all available message templates using `GET /communication/templates/whatsapp`. The backend dynamically returns templates for predefined event triggers (e.g., `TICKET_CREATED`, `TURN_APPROACHING`, `APPOINTMENT_CONFIRMED`).
2. **Template Customization:** 
   - Each template has a unique `key` identifying the trigger event.
   - Users can edit the `content` text box to adjust the messaging tone, language, or included information.
   - The UI provides a list of dynamic variables like `{{name}}`, `{{token}}`, `{{service_name}}`, `{{wait_time}}`, and `{{link}}` that are interpolated by the backend before sending the message.
3. **Saving Changes:** Updates to a template are saved via `POST /communication/templates/whatsapp/:key`. This updates the database record for the specific tenant, overriding the global defaults.
4. **Resetting to Defaults:** If a user makes a mistake or wants to revert to the standard system language, they can click "Reset to Default" which calls `DELETE /communication/templates/whatsapp/:key`. This removes the tenant-specific override, falling back to the system's hardcoded default template for that event.

## Key Observations & Recommendations
- **Simplicity:** The current implementation is straightforward and covers the essential needs for customizing automated notifications.
- **Variables:** The interpolation variables (`{{name}}`, `{{token}}`, etc.) are hardcoded as a hint text. **Recommendation:** Consider validating the variables against the specific template type before saving, or providing a click-to-insert UI for variables to reduce typos.
- **Channels:** Currently, the page is exclusively for WhatsApp (`/communication/templates/whatsapp`). If SMS or Email templates are introduced, the UI will need tabs or sections to manage templates per channel, or a unified model where templates apply across channels.
- **Status:** The backend API accepts an `isActive` boolean (currently hardcoded to `true` when saving in the UI). Exposing a toggle in the UI would allow users to selectively disable specific automated notifications (e.g., turning off the `TURN_APPROACHING` reminder).
