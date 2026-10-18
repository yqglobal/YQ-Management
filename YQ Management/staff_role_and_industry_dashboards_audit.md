# Deep Audit & Brainstorming: User Roles and Industry-Specific Staff Dashboards

## 1. Current State vs. Ideal Abstraction

### Current Confusion in the System
Currently, the system is suffering from overloaded terminology. 
- The codebase uses roles like `TENANT_ADMIN`, `ADMIN`, `OPERATOR`, and sometimes references `MANAGER` or `STAFF`.
- The UI sometimes says "Operator" (as seen in the welcome modal screenshot) but lists the user as "Staff" in the directory (second screenshot).
- There's also mention of "Service Providers" on the operations page, which conflates the concept of "the person providing the service" with "the person managing the software."

### The Ideal Abstraction
Your proposed 4-tier hierarchy perfectly clarifies the organizational structure:

1. **Owner:** The ultimate authority. Can manage billing, delete the workspace, and has full access.
2. **Admin:** Can configure settings, add services, manage integrations, and invite other users.
3. **Manager (Receptionist/Queue Operator):** The "traffic controller." They sit at the front desk, manage the main Service Desk, add walk-ins to the queue, and oversee the flow of customers.
4. **Staff (Service Provider/Specialist):** The person *actually doing the work* (Doctor, Barber, Cook, Technician). They are the end-point of the queue.

---

## 2. Brainstorming: The "Staff" Experience

The core realization here is that **Staff members do not care about "Queue Management." They care about "Task Execution."** 

When a doctor logs in, they shouldn't see a complex table of waiting times or QR code settings. They need a focused, distraction-free environment to execute their specific job.

### General Capabilities of the "Staff View"
Regardless of the industry, every Staff View must share a common, underlying engine:
- **Active Task View:** What am I working on *right now*?
- **Upcoming Queue (My Backlog):** Who/what is next in line for *me* specifically?
- **Action Buttons (The "Advance" mechanism):** "Start," "Complete," "Skip," "Hold."
- **Contextual Customer Data:** History, notes, or form submissions related to the current task.
- **Internal Comms:** Ability to ping the Manager/Receptionist (e.g., "Send the next patient in" or "I'm running 10 mins late").

### Industry-Specific Use Cases & Layouts

#### Use Case 1: Healthcare (Doctor / Nurse / Therapist)
- **UI Paradigm:** The Clinical Dashboard.
- **Key Elements:**
  - **Current Patient Panel:** Shows patient name, age, reason for visit (from intake form).
  - **Medical History & Past Visits:** Quick access to previous prescriptions or notes (tied to the customer profile).
  - **Action Tools:** Text areas for "Diagnosis," "Prescription," and "Internal Notes."
  - **Workflow Actions:** "Call Patient In" (triggers a display screen update in the waiting room), "Finish Consultation," "Send to Pharmacy/Billing."
- **Why it's needed:** Doctors have strict time limits. A unified screen that combines the queue with the actual consultation notes prevents them from switching between Qmova and a separate EHR (Electronic Health Record) system.

#### Use Case 2: Food & Beverage (Cook / Barista / Kitchen Staff)
- **UI Paradigm:** Kitchen Display System (KDS).
- **Key Elements:**
  - **Grid/Kanban View:** Unlike a doctor who sees one person at a time, a cook sees a grid of incoming orders (tickets).
  - **Timer Alerts:** Color-coded timers (Green -> Yellow -> Red) showing how long an order has been waiting.
  - **Action Tools:** One-tap "Bump" button to mark an item/order as completed.
  - **Sub-tasking:** Grouping similar items (e.g., "I need to make 4 lattes for 3 different orders right now").
- **Why it's needed:** High-speed environments require low-touch, high-visibility interfaces. The KDS model is standard in F&B; bringing this into Qmova makes it an all-in-one POS-companion.

#### Use Case 3: Beauty & Wellness (Barber / Stylist)
- **UI Paradigm:** The Appointment & Portfolio View.
- **Key Elements:**
  - **Daily Schedule:** A calendar timeline showing appointments vs. walk-ins.
  - **Customer Preferences:** "Usually gets a fade," "Prefers brand X color."
  - **Portfolio/Notes:** Ability to take a picture of the finished haircut and save it to the customer's profile for next time.
  - **Action Tools:** "Start Service," "Add Upsell Item" (e.g., added a beard trim, send updated total to reception).
- **Why it's needed:** Salons thrive on repeat business and personalization. The staff needs quick context on the customer's history.

#### Use Case 4: Retail & Support (Genius Bar Tech / Customer Service)
- **UI Paradigm:** The Support Ticket View.
- **Key Elements:**
  - **Issue Details:** What is the customer's problem? (e.g., "Broken iPhone screen").
  - **Knowledge Base Integration:** Quick links to repair guides or policy documents.
  - **Handoff Mechanism:** "Escalate to Tier 2" or "Send to checkout."

---

## 3. How to Implement a Generalized Architecture

To avoid building 50 different hardcoded React pages, we need a **Dynamic UI Engine** driven by the `IndustryTemplate` logic.

### The "Staff Dashboard" Engine
Instead of hardcoding a Doctor page and a Cook page, the Staff page should be a flexible grid composed of **Widgets**.

When an Admin assigns a template (e.g., `HEALTHCARE`), the system defines a JSON layout for the Staff View:
```json
{
  "staffViewLayout": [
    { "widget": "CurrentTicket", "position": "left-main" },
    { "widget": "CustomerHistory", "position": "right-sidebar" },
    { "widget": "CustomForm", "formId": "prescription_form", "position": "center" },
    { "widget": "NextInLineList", "position": "bottom" }
  ]
}
```

### The Manager-Staff Relationship (The Hand-off)
1. **The Manager (Receptionist)** uses the main **Service Desk**. They see the *Macro* view (everyone in the building).
2. The Manager assigns a customer to a specific **Staff Member** (or the system auto-routes them).
3. The customer appears on the **Staff Member's** tailored dashboard (The *Micro* view).
4. When the Staff Member clicks "Complete", the system can either end the journey, or route the customer back to the Manager (e.g., "Go back to reception to pay").

## 4. Current System Gap Analysis & Action Plan

### What needs fixing in Qmova right now:
1. **Role Terminology Cleanup:** 
   - Rename/consolidate `OPERATOR` to `MANAGER` (or keep `OPERATOR` but clearly define it as the receptionist).
   - Introduce a strict `STAFF` role.
   - Fix the UI inconsistencies (e.g., the welcome modal says Operator, the table says Staff).
2. **Decouple "Service Providers" from "Users":**
   - Currently, a "Provider" might just be a string or a separate model. A `STAFF` user *is* a Provider. They must be linked 1:1.
3. **Staff Specific Routing:**
   - When a user with the `STAFF` role logs in, they should NOT be routed to `/dashboard/service-desk`. 
   - They should be routed to `/dashboard/my-desk` (or similar), which renders the specialized widget-based UI.
4. **Data Isolation:**
   - Staff should only see analytics and people related to *their* past tickets. We need Row-Level Security (or Prisma query filters) ensuring `STAFF` can't browse the entire tenant's customer database unless permitted.

### 10/10 Vision: The "No-Code" Staff Interface
In the most advanced version of this SaaS, the Admin goes to "Settings -> Staff Interface Builder." 
They drag and drop widgets: "I want my barbers to see the customer's past photos here, the timer here, and a button to upsell hair gel here."
Qmova then generates the perfect, hyper-optimized screen for that specific location's staff.
