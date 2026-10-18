import { FlowTemplate, INDUSTRY_TEMPLATES } from './industry-templates';

export interface ServiceDefinition {
  name: string;
  description?: string;
  expectedDuration?: number; // In minutes
  allowAppointments?: boolean;
}

export interface BusinessSubType {
  key: string;
  name: string;
  description: string;
  services: ServiceDefinition[];
  flowTemplateKey: string;
  defaultStaffLayout?: any[];
}

export interface IndustryCatalog {
  key: string;
  name: string;
  description: string;
  icon?: string;
  subTypes: BusinessSubType[];
}

export const BUSINESS_CATALOG: IndustryCatalog[] = [
  {
    key: 'healthcare',
    name: 'Healthcare & Medical Services',
    description:
      'Hospitals, clinics, dental practices, and medical facilities.',
    subTypes: [
      {
        key: 'general_practice',
        name: 'General Practice / GP',
        description:
          'Walk-in or appointment-based general medical consultations.',
        flowTemplateKey: 'healthcare',
        services: [
          {
            name: 'General Consultation',
            expectedDuration: 30,
            allowAppointments: true,
          },
          { name: 'Blood Test / Lab Work', expectedDuration: 15 },
          { name: 'Vaccination', expectedDuration: 10 },
          { name: 'Prescription Refill', expectedDuration: 10 },
        ],
        defaultStaffLayout: [
          {
            id: 'current-task',
            type: 'CurrentTicketWidget',
            position: { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
          },
          {
            id: 'history',
            type: 'CustomerHistoryWidget',
            position: { col: 2, row: 1, colSpan: 2, rowSpan: 1 },
          },
          {
            id: 'notes',
            type: 'CustomFormWidget',
            formId: 'Clinical Notes',
            position: { col: 1, row: 2, colSpan: 3, rowSpan: 1 },
          },
        ],
      },
      {
        key: 'dental_clinic',
        name: 'Dental Clinic',
        description: 'Dental check-ups, cleanings, and procedures.',
        flowTemplateKey: 'healthcare',
        services: [
          {
            name: 'Dental Check-up',
            expectedDuration: 30,
            allowAppointments: true,
          },
          {
            name: 'Teeth Cleaning',
            expectedDuration: 45,
            allowAppointments: true,
          },
          { name: 'Dental X-Ray', expectedDuration: 15 },
          { name: 'Root Canal', expectedDuration: 90, allowAppointments: true },
          {
            name: 'Filling / Restoration',
            expectedDuration: 45,
            allowAppointments: true,
          },
        ],
      },
      {
        key: 'specialist_clinic',
        name: 'Specialist Clinic',
        description: 'Specialized medical care and diagnostics.',
        flowTemplateKey: 'healthcare',
        services: [
          {
            name: 'Specialist Consultation',
            expectedDuration: 45,
            allowAppointments: true,
          },
          {
            name: 'Follow-up Appointment',
            expectedDuration: 20,
            allowAppointments: true,
          },
          { name: 'Diagnostic Test', expectedDuration: 30 },
        ],
      },
      {
        key: 'pharmacy',
        name: 'Pharmacy / Dispensary',
        description: 'Medication dispensing and minor health consultations.',
        flowTemplateKey: 'healthcare',
        services: [
          { name: 'Prescription Collection', expectedDuration: 5 },
          { name: 'Over-the-Counter Advice', expectedDuration: 10 },
          {
            name: 'Pharmacist Consultation',
            expectedDuration: 15,
            allowAppointments: true,
          },
        ],
      },
    ],
  },
  {
    key: 'food_and_beverage',
    name: 'Food & Beverage',
    description: 'Restaurants, cafes, QSRs, and catering services.',
    subTypes: [
      {
        key: 'dine_in_restaurant',
        name: 'Dine-in Restaurant',
        description: 'Full-service dining with table management.',
        flowTemplateKey: 'food_and_beverage',
        services: [
          {
            name: 'Table Reservation',
            expectedDuration: 90,
            allowAppointments: true,
          },
          { name: 'Walk-in Dining', expectedDuration: 60 },
          {
            name: 'Private Dining Event',
            expectedDuration: 180,
            allowAppointments: true,
          },
        ],
      },
      {
        key: 'qsr_takeaway',
        name: 'QSR / Takeaway',
        description: 'Quick service, fast food, and order pickup.',
        flowTemplateKey: 'food_and_beverage',
        services: [
          { name: 'Order Pickup', expectedDuration: 5 },
          { name: 'Walk-in Order', expectedDuration: 10 },
          { name: 'Drive-thru', expectedDuration: 5 },
        ],
        defaultStaffLayout: [
          {
            id: 'kds-queue',
            type: 'QueueGridWidget',
            position: { col: 1, row: 1, colSpan: 3, rowSpan: 2 },
          },
        ],
      },
      {
        key: 'cafe_bakery',
        name: 'Cafe / Bakery',
        description: 'Coffee shops, bakeries, and light meals.',
        flowTemplateKey: 'food_and_beverage',
        services: [
          { name: 'Coffee / Drink Order', expectedDuration: 5 },
          { name: 'Pastry / Food Order', expectedDuration: 5 },
          { name: 'Dine-in Table', expectedDuration: 45 },
        ],
      },
    ],
  },
  {
    key: 'government_and_civic',
    name: 'Government & Civic',
    description: 'Public services, licensing, and civic amenities.',
    subTypes: [
      {
        key: 'licensing_center',
        name: 'Licensing & Permits Center',
        description: 'Driver licenses, vehicle registration, and permits.',
        flowTemplateKey: 'government_and_civic',
        services: [
          {
            name: 'Driver License Renewal',
            expectedDuration: 20,
            allowAppointments: true,
          },
          {
            name: 'Vehicle Registration',
            expectedDuration: 30,
            allowAppointments: true,
          },
          {
            name: 'Permit Application',
            expectedDuration: 45,
            allowAppointments: true,
          },
        ],
      },
      {
        key: 'civic_services',
        name: 'General Civic Services',
        description: 'Passports, IDs, and general inquiries.',
        flowTemplateKey: 'government_and_civic',
        services: [
          {
            name: 'ID Card Application',
            expectedDuration: 30,
            allowAppointments: true,
          },
          {
            name: 'Passport Renewal',
            expectedDuration: 30,
            allowAppointments: true,
          },
          { name: 'General Inquiry', expectedDuration: 15 },
        ],
      },
    ],
  },
  {
    key: 'events_and_invitations',
    name: 'Events & Invitations',
    description: 'Conferences, weddings, and ticketed events.',
    subTypes: [
      {
        key: 'conference_expo',
        name: 'Conference / Expo',
        description: 'Large scale professional events and exhibitions.',
        flowTemplateKey: 'events_and_invitations',
        services: [
          { name: 'Attendee Check-in', expectedDuration: 5 },
          { name: 'VIP Access', expectedDuration: 5 },
          { name: 'Session Entry', expectedDuration: 5 },
        ],
      },
      {
        key: 'private_event',
        name: 'Private Event / Wedding',
        description: 'Guest management for private gatherings.',
        flowTemplateKey: 'events_and_invitations',
        services: [
          { name: 'Guest Check-in', expectedDuration: 5 },
          { name: 'Cloakroom Service', expectedDuration: 5 },
        ],
      },
    ],
  },
  {
    key: 'beauty_and_wellness',
    name: 'Beauty & Wellness',
    description: 'Salons, spas, barbershops, and aesthetic clinics.',
    subTypes: [
      {
        key: 'hair_salon',
        name: 'Hair Salon / Barbershop',
        description: 'Haircuts, styling, and color treatments.',
        flowTemplateKey: 'beauty_and_wellness',
        services: [
          { name: 'Haircut', expectedDuration: 45, allowAppointments: true },
          {
            name: 'Hair Coloring',
            expectedDuration: 120,
            allowAppointments: true,
          },
          {
            name: 'Styling / Blowdry',
            expectedDuration: 45,
            allowAppointments: true,
          },
        ],
        defaultStaffLayout: [
          {
            id: 'current-task',
            type: 'CurrentTicketWidget',
            position: { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
          },
          {
            id: 'schedule',
            type: 'ScheduleWidget',
            position: { col: 2, row: 1, colSpan: 2, rowSpan: 1 },
          },
          {
            id: 'history',
            type: 'CustomerHistoryWidget',
            position: { col: 1, row: 2, colSpan: 3, rowSpan: 1 },
          },
        ],
      },
      {
        key: 'spa_wellness',
        name: 'Spa & Wellness Center',
        description: 'Massages, facials, and relaxation treatments.',
        flowTemplateKey: 'beauty_and_wellness',
        services: [
          {
            name: 'Massage Therapy',
            expectedDuration: 60,
            allowAppointments: true,
          },
          {
            name: 'Facial Treatment',
            expectedDuration: 60,
            allowAppointments: true,
          },
          {
            name: 'Sauna / Pool Access',
            expectedDuration: 120,
            allowAppointments: true,
          },
        ],
      },
    ],
  },
  {
    key: 'hospitality_and_accommodation',
    name: 'Hospitality & Accommodation',
    description: 'Hotels, resorts, and short-term rentals.',
    subTypes: [
      {
        key: 'hotel_resort',
        name: 'Hotel / Resort',
        description: 'Guest check-in, concierge, and amenities.',
        flowTemplateKey: 'hospitality_and_accommodation',
        services: [
          {
            name: 'Guest Check-in',
            expectedDuration: 10,
            allowAppointments: true,
          },
          { name: 'Guest Check-out', expectedDuration: 5 },
          { name: 'Concierge Request', expectedDuration: 10 },
          {
            name: 'Spa/Gym Access',
            expectedDuration: 60,
            allowAppointments: true,
          },
        ],
      },
    ],
  },
  {
    key: 'finance_and_insurance',
    name: 'Finance & Insurance',
    description: 'Banks, insurance brokers, and financial advisors.',
    subTypes: [
      {
        key: 'retail_bank',
        name: 'Retail Bank Branch',
        description: 'Teller services, account opening, and loans.',
        flowTemplateKey: 'finance_and_insurance',
        services: [
          { name: 'Teller Services (Cash/Check)', expectedDuration: 10 },
          {
            name: 'Account Opening',
            expectedDuration: 45,
            allowAppointments: true,
          },
          {
            name: 'Loan Consultation',
            expectedDuration: 60,
            allowAppointments: true,
          },
          { name: 'Customer Service', expectedDuration: 20 },
        ],
      },
      {
        key: 'insurance_agency',
        name: 'Insurance Agency',
        description: 'Policy quotes, claims, and renewals.',
        flowTemplateKey: 'finance_and_insurance',
        services: [
          {
            name: 'Policy Consultation',
            expectedDuration: 45,
            allowAppointments: true,
          },
          {
            name: 'Claim Processing',
            expectedDuration: 30,
            allowAppointments: true,
          },
          {
            name: 'Policy Renewal',
            expectedDuration: 20,
            allowAppointments: true,
          },
        ],
      },
    ],
  },
  {
    key: 'fitness_and_recreation',
    name: 'Fitness & Recreation',
    description: 'Gyms, studios, sports facilities, and clubs.',
    subTypes: [
      {
        key: 'gym_fitness_center',
        name: 'Gym / Fitness Center',
        description: 'Facility access, personal training, and classes.',
        flowTemplateKey: 'fitness_and_recreation',
        services: [
          { name: 'Gym Entry', expectedDuration: 90 },
          {
            name: 'Personal Training Session',
            expectedDuration: 60,
            allowAppointments: true,
          },
          {
            name: 'Group Fitness Class',
            expectedDuration: 60,
            allowAppointments: true,
          },
        ],
      },
      {
        key: 'sports_facility',
        name: 'Sports Facility',
        description: 'Court rentals, swimming pools, and sports clubs.',
        flowTemplateKey: 'fitness_and_recreation',
        services: [
          {
            name: 'Court / Pitch Rental',
            expectedDuration: 60,
            allowAppointments: true,
          },
          { name: 'Pool Access', expectedDuration: 90 },
          { name: 'Equipment Rental', expectedDuration: 10 },
        ],
      },
    ],
  },
  {
    key: 'automotive_and_mechanical',
    name: 'Automotive & Mechanical',
    description: 'Service centers, mechanics, and car washes.',
    subTypes: [
      {
        key: 'auto_repair_shop',
        name: 'Auto Repair & Service Center',
        description: 'Vehicle maintenance, repairs, and diagnostics.',
        flowTemplateKey: 'automotive_and_mechanical',
        services: [
          {
            name: 'Scheduled Maintenance',
            expectedDuration: 120,
            allowAppointments: true,
          },
          {
            name: 'Diagnostic Check',
            expectedDuration: 60,
            allowAppointments: true,
          },
          {
            name: 'Tire / Oil Change',
            expectedDuration: 45,
            allowAppointments: true,
          },
          {
            name: 'Vehicle Drop-off',
            expectedDuration: 10,
            allowAppointments: true,
          },
        ],
      },
      {
        key: 'car_wash',
        name: 'Car Wash / Detailing',
        description: 'Vehicle cleaning and detailing services.',
        flowTemplateKey: 'automotive_and_mechanical',
        services: [
          { name: 'Express Car Wash', expectedDuration: 15 },
          {
            name: 'Full Detailing',
            expectedDuration: 180,
            allowAppointments: true,
          },
          {
            name: 'Interior Cleaning',
            expectedDuration: 45,
            allowAppointments: true,
          },
        ],
      },
    ],
  },
  {
    key: 'logistics_and_supply_chain',
    name: 'Logistics & Supply Chain',
    description: 'Warehouses, distribution, and freight forwarders.',
    subTypes: [
      {
        key: 'warehouse_distribution',
        name: 'Warehouse & Distribution Center',
        description: 'Loading docks, receiving, and dispatch.',
        flowTemplateKey: 'logistics_and_supply_chain',
        services: [
          {
            name: 'Inbound Delivery (Receiving)',
            expectedDuration: 45,
            allowAppointments: true,
          },
          {
            name: 'Outbound Collection (Dispatch)',
            expectedDuration: 45,
            allowAppointments: true,
          },
          { name: 'Driver Check-in', expectedDuration: 10 },
        ],
      },
    ],
  },
  {
    key: 'education_and_training',
    name: 'Education & Training',
    description: 'Schools, universities, and training centers.',
    subTypes: [
      {
        key: 'student_services',
        name: 'Student Services / Administration',
        description: 'Admissions, financial aid, and counseling.',
        flowTemplateKey: 'education_and_training',
        services: [
          {
            name: 'Admissions Counseling',
            expectedDuration: 30,
            allowAppointments: true,
          },
          {
            name: 'Financial Aid Consultation',
            expectedDuration: 30,
            allowAppointments: true,
          },
          { name: 'Student ID Collection', expectedDuration: 10 },
          {
            name: 'Academic Advising',
            expectedDuration: 30,
            allowAppointments: true,
          },
        ],
      },
    ],
  },
  {
    key: 'legal_and_professional',
    name: 'Legal & Professional Services',
    description: 'Law firms, accountants, and consultants.',
    subTypes: [
      {
        key: 'law_firm',
        name: 'Law Firm / Legal Practice',
        description: 'Legal consultations, document signing, and meetings.',
        flowTemplateKey: 'legal_and_professional',
        services: [
          {
            name: 'Initial Consultation',
            expectedDuration: 60,
            allowAppointments: true,
          },
          {
            name: 'Document Signing',
            expectedDuration: 30,
            allowAppointments: true,
          },
          {
            name: 'Client Meeting',
            expectedDuration: 60,
            allowAppointments: true,
          },
        ],
      },
      {
        key: 'accounting_firm',
        name: 'Accounting / Tax Firm',
        description: 'Tax prep, audits, and financial planning.',
        flowTemplateKey: 'legal_and_professional',
        services: [
          {
            name: 'Tax Preparation',
            expectedDuration: 60,
            allowAppointments: true,
          },
          {
            name: 'Financial Planning',
            expectedDuration: 60,
            allowAppointments: true,
          },
          { name: 'Document Drop-off', expectedDuration: 10 },
        ],
      },
    ],
  },
  {
    key: 'retail_and_commerce',
    name: 'Retail & Commerce',
    description: 'Stores, boutiques, and customer service desks.',
    subTypes: [
      {
        key: 'retail_store',
        name: 'Retail Store',
        description: 'Customer service, returns, and order pickups.',
        flowTemplateKey: 'retail_and_commerce',
        services: [
          { name: 'Click & Collect (Order Pickup)', expectedDuration: 5 },
          { name: 'Returns & Exchanges', expectedDuration: 15 },
          { name: 'Customer Service / Complaints', expectedDuration: 20 },
        ],
      },
      {
        key: 'specialty_retail',
        name: 'Specialty Retail / Boutique',
        description: 'Personal shopping, fittings, and consultations.',
        flowTemplateKey: 'retail_and_commerce',
        services: [
          {
            name: 'Personal Shopping Appointment',
            expectedDuration: 60,
            allowAppointments: true,
          },
          {
            name: 'Product Demonstration',
            expectedDuration: 30,
            allowAppointments: true,
          },
          {
            name: 'Fitting / Alterations',
            expectedDuration: 30,
            allowAppointments: true,
          },
        ],
      },
    ],
  },
  {
    key: 'corporate_and_hr',
    name: 'Corporate & HR',
    description: 'Offices, visitor management, and employee services.',
    subTypes: [
      {
        key: 'corporate_office',
        name: 'Corporate Office / Headquarters',
        description: 'Visitor management, interviews, and IT support.',
        flowTemplateKey: 'corporate_and_hr',
        services: [
          { name: 'Visitor Check-in', expectedDuration: 5 },
          {
            name: 'Job Interview',
            expectedDuration: 60,
            allowAppointments: true,
          },
          {
            name: 'IT Helpdesk Support',
            expectedDuration: 20,
            allowAppointments: true,
          },
          {
            name: 'HR Consultation',
            expectedDuration: 30,
            allowAppointments: true,
          },
        ],
      },
    ],
  },
];
