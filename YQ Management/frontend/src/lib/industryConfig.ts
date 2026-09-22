/**
 * Industry Intelligence Layer — Configuration Library
 *
 * Each industry config encodes terminology, UI flags, and service-desk behaviour
 * so every page can adapt without any conditional logic scattered in components.
 *
 * Usage:
 *   import { getIndustryConfig } from '../lib/industryConfig';
 *   const config = getIndustryConfig(tenant.businessType);
 */

export type BusinessType =
  | 'general'
  | 'hospital'
  | 'salon'
  | 'bank'
  | 'visa'
  | 'fastfood'
  | 'logistics';

/**
 * Sentinel value for visitCard.primaryChipField that means:
 * "show the first non-empty key from formResponses dynamically".
 * Used by the 'general' (universal) mode.
 */
export const DYNAMIC_CHIP_SENTINEL = '__dynamic__';

export interface IndustryConfig {
  id: BusinessType;

  /** Display name for the industry */
  industryLabel: string;

  /** Material Symbols icon name for the industry */
  industryIcon: string;

  /** Terminology used across all UI */
  terminology: {
    /** What a person waiting in line is called */
    customer: string;
    /** Plural of customer */
    customers: string;
    /** What a "visit" or "token" is called  */
    ticket: string;
    /** Plural of ticket */
    tickets: string;
    /** What the staff member serving is called */
    provider: string;
    /** What the act of starting service is called */
    actionVerb: string;
    /** Action verb in past tense (e.g., "Served", "Examined") */
    actionVerbPast: string;
    /** Label for the service itself */
    service: string;
    /** Label for Notes field */
    notesLabel: string;
    /** Placeholder text for the notes field */
    notesPlaceholder: string;
    /** What "Walk-in" is called in this industry */
    walkIn: string;
    /** What "Appointment" is called in this industry */
    appointment: string;
  };

  /** Service Desk page labels */
  serviceDesk: {
    /** Main page title */
    pageTitle: string;
    /** Left pipeline column title */
    pipelineTitle: string;
    /** Centre pool column title */
    poolTitle: string;
    /** Empty pool state heading */
    emptyHeading: string;
    /** Empty pool state body text */
    emptyBody: string;
    /** Material symbol icon for empty state */
    emptyIcon: string;
    /** Label above pending approvals section */
    pendingApprovalsLabel: string;
  };

  /** Visit card in the pool — which formResponse field to surface as a "chip" */
  visitCard: {
    /** Key in visit.formResponses to show as the primary chip (e.g. "symptoms", "orderNum") */
    primaryChipField: string | null;
    /** Label prefix for the chip (e.g. "Symptoms:", "Order #:") */
    primaryChipLabel: string | null;
    /** Material symbol icon for the chip */
    primaryChipIcon: string;
    /** Urgency badge label override (null = use default "Urgent") */
    urgencyLabel: string | null;
  };

  /** Provider (right-side) context panel configuration */
  providerView: {
    /** What the right-side panel title is called */
    title: string;
    /** Label for the provider assignment dropdown */
    providerAssignLabel: string;
    /** "Unassigned" option label */
    unassignedLabel: string;
  };

  /** Which special UI panels to show */
  uiFlags: {
    /** Show multi-stop itinerary progress tracker on visit cards */
    showItinerary: boolean;
    /** Show emergency/code-blue pause button on queue cards */
    showEmergencyPause: boolean;
    /** Show document upload status chip on visit cards */
    showDocumentStatus: boolean;
    /** Show accompanying guests count chip */
    showGuestCount: boolean;
    /** Show a "strict privacy" badge on visit cards */
    showPrivacyBadge: boolean;
    /** Highlight appointment arrival status (Early/Late) prominently */
    highlightArrivalStatus: boolean;
  };

  /** Admin sidebar nav label override for the "Service Desk" link */
  navLabel: string;

  /** Colour accent for industry-specific highlights (Tailwind class fragment) */
  accentColor: string;
  accentBg: string;
  accentText: string;
}

const CONFIGS: Record<BusinessType, IndustryConfig> = {
  /**
   * 'general' is the UNIVERSAL / ALL-INCLUSIVE mode.
   * All UI flags are ON — features show contextually based on what data is present.
   * Terminology is neutral so it fits any business.
   * The chip field is dynamic — shows the first available formResponse field.
   */
  general: {
    id: 'general',
    industryLabel: 'Universal (All Features)',
    industryIcon: 'apps',
    terminology: {
      customer: 'Customer',
      customers: 'Customers',
      ticket: 'Ticket',
      tickets: 'Tickets',
      provider: 'Staff Member',
      actionVerb: 'Start Service',
      actionVerbPast: 'Served',
      service: 'Service',
      notesLabel: 'Notes',
      notesPlaceholder: 'Add private notes for staff...',
      walkIn: 'Walk-in',
      appointment: 'Appointment',
    },
    serviceDesk: {
      pageTitle: 'Service Desk',
      pipelineTitle: 'Service Pipeline',
      poolTitle: 'Active Pool',
      emptyHeading: 'Queue is clear.',
      emptyBody: 'Your waiting room is empty. Share your booking page or have visitors scan your QR code to get started.',
      emptyIcon: 'sentiment_satisfied',
      pendingApprovalsLabel: 'Pending Approvals',
    },
    visitCard: {
      // '__dynamic__' = show first available formResponse field as chip
      primaryChipField: DYNAMIC_CHIP_SENTINEL,
      primaryChipLabel: null, // dynamically derived from the field key
      primaryChipIcon: 'info',
      urgencyLabel: 'Urgent',
    },
    providerView: {
      title: 'Customer Context',
      providerAssignLabel: 'Assigned Staff',
      unassignedLabel: 'Unassigned',
    },
    // All flags ON — every feature renders contextually when data is present
    uiFlags: {
      showItinerary: true,
      showEmergencyPause: true,
      showDocumentStatus: true,
      showGuestCount: true,
      showPrivacyBadge: false, // Only show PHI badge for healthcare
      highlightArrivalStatus: true,
    },
    navLabel: 'Service Desk',
    accentColor: 'primary',
    accentBg: 'bg-primary/10',
    accentText: 'text-primary',
  },

  hospital: {
    id: 'hospital',
    industryLabel: 'Hospital & Clinic',
    industryIcon: 'local_hospital',
    terminology: {
      customer: 'Patient',
      customers: 'Patients',
      ticket: 'Case',
      tickets: 'Cases',
      provider: 'Doctor',
      actionVerb: 'Examine',
      actionVerbPast: 'Examined',
      service: 'Department',
      notesLabel: 'Clinical Notes',
      notesPlaceholder: 'Clinical observations, vitals, preliminary assessment...',
      walkIn: 'Walk-in Patient',
      appointment: 'Scheduled Appointment',
    },
    serviceDesk: {
      pageTitle: 'Patient Flow',
      pipelineTitle: 'Department Queue',
      poolTitle: 'Waiting Room',
      emptyHeading: 'Waiting room is clear.',
      emptyBody: 'No patients are currently waiting. All cases have been attended to.',
      emptyIcon: 'medical_services',
      pendingApprovalsLabel: 'Appointment Requests',
    },
    visitCard: {
      primaryChipField: 'symptoms',
      primaryChipLabel: 'Symptoms',
      primaryChipIcon: 'symptoms',
      urgencyLabel: 'Critical',
    },
    providerView: {
      title: 'Patient Record',
      providerAssignLabel: 'Attending Doctor',
      unassignedLabel: 'Unassigned',
    },
    uiFlags: {
      showItinerary: true,
      showEmergencyPause: true,
      showDocumentStatus: true,
      showGuestCount: true,
      showPrivacyBadge: true,
      highlightArrivalStatus: true,
    },
    navLabel: 'Patient Flow',
    accentColor: 'sky-600',
    accentBg: 'bg-sky-500/10',
    accentText: 'text-sky-600 dark:text-sky-400',
  },

  salon: {
    id: 'salon',
    industryLabel: 'Salon & Beauty',
    industryIcon: 'content_cut',
    terminology: {
      customer: 'Guest',
      customers: 'Guests',
      ticket: 'Booking',
      tickets: 'Bookings',
      provider: 'Stylist',
      actionVerb: 'Seat Guest',
      actionVerbPast: 'Served',
      service: 'Service',
      notesLabel: 'Style Notes',
      notesPlaceholder: 'Style preferences, allergies, product notes...',
      walkIn: 'Walk-in Guest',
      appointment: 'Booked Appointment',
    },
    serviceDesk: {
      pageTitle: 'Chair Board',
      pipelineTitle: 'Stylist Queue',
      poolTitle: 'Guest Waitlist',
      emptyHeading: "All chairs are free!",
      emptyBody: 'No guests waiting. Share your booking link to start accepting appointments.',
      emptyIcon: 'content_cut',
      pendingApprovalsLabel: 'Booking Requests',
    },
    visitCard: {
      primaryChipField: 'stylist',
      primaryChipLabel: 'Pref. Stylist',
      primaryChipIcon: 'person',
      urgencyLabel: 'Late',
    },
    providerView: {
      title: 'Guest Profile',
      providerAssignLabel: 'Assigned Stylist',
      unassignedLabel: 'Any Available',
    },
    uiFlags: {
      showItinerary: false,
      showEmergencyPause: false,
      showDocumentStatus: false,
      showGuestCount: true,
      showPrivacyBadge: false,
      highlightArrivalStatus: true,
    },
    navLabel: 'Chair Board',
    accentColor: 'pink-600',
    accentBg: 'bg-pink-500/10',
    accentText: 'text-pink-600 dark:text-pink-400',
  },

  bank: {
    id: 'bank',
    industryLabel: 'Bank & Finance',
    industryIcon: 'account_balance',
    terminology: {
      customer: 'Client',
      customers: 'Clients',
      ticket: 'Number',
      tickets: 'Numbers',
      provider: 'Teller',
      actionVerb: 'Serve Client',
      actionVerbPast: 'Served',
      service: 'Counter Type',
      notesLabel: 'Transaction Notes',
      notesPlaceholder: 'Transaction type, account details, special instructions...',
      walkIn: 'Walk-in Client',
      appointment: 'Scheduled Visit',
    },
    serviceDesk: {
      pageTitle: 'Teller Board',
      pipelineTitle: 'Counter Queue',
      poolTitle: 'Client Queue',
      emptyHeading: 'Counters are clear.',
      emptyBody: 'All clients have been attended to. Display your queue QR code to start accepting clients.',
      emptyIcon: 'account_balance',
      pendingApprovalsLabel: 'Pending Consultations',
    },
    visitCard: {
      primaryChipField: 'loanType',
      primaryChipLabel: 'Transaction',
      primaryChipIcon: 'paid',
      urgencyLabel: 'Priority',
    },
    providerView: {
      title: 'Client Details',
      providerAssignLabel: 'Assigned Teller',
      unassignedLabel: 'Any Teller',
    },
    uiFlags: {
      showItinerary: false,
      showEmergencyPause: false,
      showDocumentStatus: true,
      showGuestCount: false,
      showPrivacyBadge: true,
      highlightArrivalStatus: false,
    },
    navLabel: 'Teller Board',
    accentColor: 'indigo-600',
    accentBg: 'bg-indigo-500/10',
    accentText: 'text-indigo-600 dark:text-indigo-400',
  },

  visa: {
    id: 'visa',
    industryLabel: 'Visa & Government',
    industryIcon: 'badge',
    terminology: {
      customer: 'Applicant',
      customers: 'Applicants',
      ticket: 'Case',
      tickets: 'Cases',
      provider: 'Case Officer',
      actionVerb: 'Process Case',
      actionVerbPast: 'Processed',
      service: 'Application Type',
      notesLabel: 'Case Notes',
      notesPlaceholder: 'Document review notes, compliance flags, officer observations...',
      walkIn: 'Walk-in Applicant',
      appointment: 'Booked Appointment',
    },
    serviceDesk: {
      pageTitle: 'Applicant Queue',
      pipelineTitle: 'Processing Queue',
      poolTitle: 'Waiting Applicants',
      emptyHeading: 'All applicants processed.',
      emptyBody: 'No pending applications. All cases have been handled.',
      emptyIcon: 'badge',
      pendingApprovalsLabel: 'Pending Applications',
    },
    visitCard: {
      primaryChipField: 'visaType',
      primaryChipLabel: 'Visa Type',
      primaryChipIcon: 'flight',
      urgencyLabel: 'Urgent',
    },
    providerView: {
      title: 'Application Details',
      providerAssignLabel: 'Assigned Officer',
      unassignedLabel: 'Unassigned',
    },
    uiFlags: {
      showItinerary: false,
      showEmergencyPause: false,
      showDocumentStatus: true,
      showGuestCount: false,
      showPrivacyBadge: true,
      highlightArrivalStatus: true,
    },
    navLabel: 'Applicant Queue',
    accentColor: 'amber-600',
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-600 dark:text-amber-400',
  },

  fastfood: {
    id: 'fastfood',
    industryLabel: 'Restaurant & Fast Food',
    industryIcon: 'restaurant',
    terminology: {
      customer: 'Guest',
      customers: 'Guests',
      ticket: 'Order',
      tickets: 'Orders',
      provider: 'Staff',
      actionVerb: 'Serve Order',
      actionVerbPast: 'Served',
      service: 'Station',
      notesLabel: 'Order Notes',
      notesPlaceholder: 'Special requests, allergies, modifications...',
      walkIn: 'Dine-in / Walk-in',
      appointment: 'Reservation',
    },
    serviceDesk: {
      pageTitle: 'Order Board',
      pipelineTitle: 'Active Orders',
      poolTitle: 'Waiting Queue',
      emptyHeading: 'All orders served!',
      emptyBody: 'No guests waiting. You can share your waitlist QR to start accepting guests.',
      emptyIcon: 'restaurant',
      pendingApprovalsLabel: 'Reservation Requests',
    },
    visitCard: {
      primaryChipField: 'orderNum',
      primaryChipLabel: 'Order #',
      primaryChipIcon: 'receipt',
      urgencyLabel: 'Overdue',
    },
    providerView: {
      title: 'Order Details',
      providerAssignLabel: 'Assigned Staff',
      unassignedLabel: 'Any Staff',
    },
    uiFlags: {
      showItinerary: false,
      showEmergencyPause: false,
      showDocumentStatus: false,
      showGuestCount: true,
      showPrivacyBadge: false,
      highlightArrivalStatus: false,
    },
    navLabel: 'Order Board',
    accentColor: 'orange-600',
    accentBg: 'bg-orange-500/10',
    accentText: 'text-orange-600 dark:text-orange-400',
  },

  logistics: {
    id: 'logistics',
    industryLabel: 'Logistics & Courier',
    industryIcon: 'local_shipping',
    terminology: {
      customer: 'Sender / Receiver',
      customers: 'Customers',
      ticket: 'Parcel',
      tickets: 'Parcels',
      provider: 'Handler',
      actionVerb: 'Process Parcel',
      actionVerbPast: 'Processed',
      service: 'Service Type',
      notesLabel: 'Parcel Notes',
      notesPlaceholder: 'Special handling, fragile items, insurance notes...',
      walkIn: 'Walk-in',
      appointment: 'Scheduled Drop-off',
    },
    serviceDesk: {
      pageTitle: 'Dispatch Board',
      pipelineTitle: 'Parcel Queue',
      poolTitle: 'Processing Queue',
      emptyHeading: 'All parcels dispatched.',
      emptyBody: 'No customers waiting. Display your QR code at the counter to start accepting drop-offs.',
      emptyIcon: 'local_shipping',
      pendingApprovalsLabel: 'Pending Requests',
    },
    visitCard: {
      primaryChipField: 'trackingNum',
      primaryChipLabel: 'Tracking #',
      primaryChipIcon: 'qr_code',
      urgencyLabel: 'Urgent',
    },
    providerView: {
      title: 'Parcel Details',
      providerAssignLabel: 'Assigned Handler',
      unassignedLabel: 'Any Handler',
    },
    uiFlags: {
      showItinerary: false,
      showEmergencyPause: false,
      showDocumentStatus: false,
      showGuestCount: false,
      showPrivacyBadge: false,
      highlightArrivalStatus: false,
    },
    navLabel: 'Dispatch Board',
    accentColor: 'emerald-600',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-600 dark:text-emerald-400',
  },
};

const DEFAULT_CONFIG = CONFIGS['general'];

/**
 * Returns the IndustryConfig for a given businessType.
 * Falls back to 'general' if the type is unknown.
 */
export function getIndustryConfig(businessType?: string | null): IndustryConfig {
  if (!businessType) return DEFAULT_CONFIG;
  return CONFIGS[businessType as BusinessType] ?? DEFAULT_CONFIG;
}

export { CONFIGS as ALL_INDUSTRY_CONFIGS };
