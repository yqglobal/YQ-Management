/**
 * Sub-Industry Catalogue — Qmova
 *
 * Maps each broad industry vertical to a list of specific business types.
 * Each sub-industry has:
 *  - id: unique slug
 *  - label: display name
 *  - icon: emoji for quick recognition
 *  - description: one-line blurb shown to the tenant during onboarding
 *  - blueprintKey: the backend flow template key to apply for this sub-industry
 *  - businessType: the industryConfig id to set on the tenant
 *  - tags: searchable keywords
 *  - whatYouGet: bullet points shown in the preview modal
 */

export interface SubIndustry {
  id: string;
  label: string;
  icon: string;
  description: string;
  blueprintKey: string;
  businessType: string;
  tags: string[];
  whatYouGet: string[];
}

export interface IndustryGroup {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  subIndustries: SubIndustry[];
}

export const INDUSTRY_GROUPS: IndustryGroup[] = [
  {
    id: 'healthcare',
    label: 'Healthcare & Medical',
    icon: '🏥',
    color: 'sky',
    description: 'Clinics, hospitals, specialists, dental, pharmacy, and allied health',
    subIndustries: [
      {
        id: 'gp_clinic',
        label: 'GP / General Practice',
        icon: '👨‍⚕️',
        description: 'General practitioners and family medicine practices',
        blueprintKey: 'healthcare',
        businessType: 'hospital',
        tags: ['gp', 'doctor', 'general practitioner', 'family medicine'],
        whatYouGet: ['Arrival & Registration', 'Medical Aid Verification', 'Triage', 'Consultation', 'Prescriptions & Billing'],
      },
      {
        id: 'hospital_outpatient',
        label: 'Hospital / Outpatient',
        icon: '🏨',
        description: 'Hospital outpatient departments and specialist referrals',
        blueprintKey: 'healthcare',
        businessType: 'hospital',
        tags: ['hospital', 'outpatient', 'ward', 'specialist'],
        whatYouGet: ['Arrival & Registration', 'Triage & Vitals', 'Consultation', 'Diagnostics', 'Pharmacy & Billing', 'Discharge'],
      },
      {
        id: 'dental_clinic',
        label: 'Dental Practice',
        icon: '🦷',
        description: 'Dentists, orthodontists, and dental surgeons',
        blueprintKey: 'healthcare',
        businessType: 'hospital',
        tags: ['dentist', 'dental', 'orthodontist'],
        whatYouGet: ['Check-In', 'X-Ray (optional)', 'Consultation', 'Treatment', 'Billing'],
      },
      {
        id: 'pharmacy',
        label: 'Pharmacy',
        icon: '💊',
        description: 'Prescription collection and over-the-counter dispensing',
        blueprintKey: 'healthcare',
        businessType: 'hospital',
        tags: ['pharmacy', 'dispensary', 'chemist'],
        whatYouGet: ['Prescription Drop-Off', 'Verification', 'Dispensing', 'Payment'],
      },
      {
        id: 'physio_allied',
        label: 'Physio & Allied Health',
        icon: '🩺',
        description: 'Physiotherapy, occupational therapy, and allied health',
        blueprintKey: 'healthcare',
        businessType: 'hospital',
        tags: ['physio', 'physiotherapy', 'allied health', 'occupational therapy'],
        whatYouGet: ['Check-In', 'Assessment', 'Treatment Session', 'Billing'],
      },
    ],
  },
  {
    id: 'food_beverage',
    label: 'Food & Beverage',
    icon: '🍽️',
    color: 'orange',
    description: 'Restaurants, fast food, cafes, catering, and event food service',
    subIndustries: [
      {
        id: 'restaurant_dine_in',
        label: 'Restaurant (Dine-In)',
        icon: '🍴',
        description: 'Full-service sit-down restaurants with table management',
        blueprintKey: 'food_and_beverage',
        businessType: 'fastfood',
        tags: ['restaurant', 'dine-in', 'table service', 'bistro'],
        whatYouGet: ['Arrival & Reservation Check-In', 'Table Assignment', 'Order Taking', 'Food Delivery', 'Bill Payment'],
      },
      {
        id: 'fast_food_qsr',
        label: 'Fast Food / QSR',
        icon: '🍔',
        description: 'Quick service restaurants with counter ordering',
        blueprintKey: 'food_and_beverage',
        businessType: 'fastfood',
        tags: ['fast food', 'qsr', 'counter', 'takeaway'],
        whatYouGet: ['Order at Counter', 'Payment', 'Order Ready Notification', 'Collection'],
      },
      {
        id: 'catering_events',
        label: 'Catering & Event Meals',
        icon: '🥗',
        description: 'Event catering, corporate dining, and buffet meal service',
        blueprintKey: 'food_and_beverage',
        businessType: 'catering',
        tags: ['catering', 'event', 'buffet', 'corporate dining'],
        whatYouGet: ['Guest Check-In', 'Meal Entitlement Validation', 'Food Collection', 'VIP Bypass (optional)'],
      },
      {
        id: 'cafe_bakery',
        label: 'Café / Bakery',
        icon: '☕',
        description: 'Coffee shops, cafés, and bakeries',
        blueprintKey: 'food_and_beverage',
        businessType: 'fastfood',
        tags: ['cafe', 'coffee', 'bakery', 'patisserie'],
        whatYouGet: ['Queue & Order', 'Payment', 'Order Ready Pickup'],
      },
    ],
  },
  {
    id: 'beauty_wellness',
    label: 'Beauty & Wellness',
    icon: '💇',
    color: 'pink',
    description: 'Salons, spas, barbershops, nail bars, and wellness studios',
    subIndustries: [
      {
        id: 'hair_salon',
        label: 'Hair Salon',
        icon: '✂️',
        description: 'Hair salons and styling studios',
        blueprintKey: 'beauty_and_wellness',
        businessType: 'salon',
        tags: ['salon', 'hair', 'stylist', 'hairdresser'],
        whatYouGet: ['Arrival & Stylist Assignment', 'Consultation', 'Service', 'Payment'],
      },
      {
        id: 'barbershop',
        label: 'Barbershop',
        icon: '💈',
        description: 'Barbershops and men\'s grooming studios',
        blueprintKey: 'beauty_and_wellness',
        businessType: 'salon',
        tags: ['barber', 'barbershop', 'grooming'],
        whatYouGet: ['Walk-In Queue', 'Barber Assignment', 'Groom & Style', 'Payment'],
      },
      {
        id: 'spa_massage',
        label: 'Spa & Massage',
        icon: '🧖',
        description: 'Day spas, massage studios, and wellness centres',
        blueprintKey: 'beauty_and_wellness',
        businessType: 'salon',
        tags: ['spa', 'massage', 'wellness', 'beauty'],
        whatYouGet: ['Arrival', 'Consultation & Allocation', 'Treatment', 'Payment & Review'],
      },
      {
        id: 'nail_bar',
        label: 'Nail Bar',
        icon: '💅',
        description: 'Nail salons and nail art studios',
        blueprintKey: 'beauty_and_wellness',
        businessType: 'salon',
        tags: ['nails', 'nail bar', 'manicure', 'pedicure'],
        whatYouGet: ['Check-In', 'Technician Assignment', 'Service', 'Payment'],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Banking',
    icon: '🏦',
    color: 'indigo',
    description: 'Banks, insurance, microfinance, and financial advisors',
    subIndustries: [
      {
        id: 'retail_bank',
        label: 'Retail Bank',
        icon: '🏧',
        description: 'Bank branches with teller services and consultations',
        blueprintKey: 'finance_and_insurance',
        businessType: 'bank',
        tags: ['bank', 'banking', 'teller', 'branch'],
        whatYouGet: ['Arrival & Token', 'Purpose Selection', 'Teller Service', 'Consultation (optional)', 'Completion'],
      },
      {
        id: 'insurance',
        label: 'Insurance Office',
        icon: '🛡️',
        description: 'Insurance brokers and claim processing offices',
        blueprintKey: 'finance_and_insurance',
        businessType: 'bank',
        tags: ['insurance', 'claims', 'broker'],
        whatYouGet: ['Registration', 'Claim Type Triage', 'Documentation', 'Assessment', 'Resolution'],
      },
      {
        id: 'financial_advisor',
        label: 'Financial Advisor',
        icon: '📊',
        description: 'Wealth management and financial planning consultations',
        blueprintKey: 'finance_and_insurance',
        businessType: 'bank',
        tags: ['financial advisor', 'wealth management', 'investments'],
        whatYouGet: ['Client Check-In', 'KYC Verification', 'Consultation', 'Proposal Review', 'Follow-Up'],
      },
    ],
  },
  {
    id: 'government',
    label: 'Government & Civic',
    icon: '🏛️',
    color: 'amber',
    description: 'Home affairs, licensing, municipal services, and visa offices',
    subIndustries: [
      {
        id: 'home_affairs',
        label: 'Home Affairs / Civil Services',
        icon: '📋',
        description: 'Document processing, IDs, passports, and certificates',
        blueprintKey: 'government_and_civic',
        businessType: 'visa',
        tags: ['home affairs', 'id', 'passport', 'birth certificate'],
        whatYouGet: ['Arrival & Document Check', 'Application Submission', 'Biometrics', 'Processing', 'Collection'],
      },
      {
        id: 'visa_office',
        label: 'Visa & Immigration Office',
        icon: '✈️',
        description: 'Visa applications, immigration, and permit processing',
        blueprintKey: 'government_and_civic',
        businessType: 'visa',
        tags: ['visa', 'immigration', 'permit', 'embassy'],
        whatYouGet: ['Document Screening', 'Application Intake', 'Biometrics', 'Interview', 'Decision & Collection'],
      },
      {
        id: 'licensing_authority',
        label: 'Licensing & Motor Vehicle',
        icon: '🚗',
        description: 'Driver\'s licence, vehicle registration, and roadworthy',
        blueprintKey: 'government_and_civic',
        businessType: 'visa',
        tags: ['licence', 'motor vehicle', 'roadworthy', 'registration'],
        whatYouGet: ['Arrival & Form Collection', 'Document Verification', 'Testing/Inspection', 'Payment', 'Licence Issue'],
      },
      {
        id: 'municipal_services',
        label: 'Municipal Services',
        icon: '🏙️',
        description: 'Rates, utilities, permits, and council enquiries',
        blueprintKey: 'government_and_civic',
        businessType: 'visa',
        tags: ['municipality', 'council', 'rates', 'utilities'],
        whatYouGet: ['Check-In', 'Request Classification', 'Officer Consultation', 'Payment (if applicable)', 'Resolution'],
      },
    ],
  },
  {
    id: 'events',
    label: 'Events & Entertainment',
    icon: '🎪',
    color: 'violet',
    description: 'Conferences, concerts, sports events, exhibitions, and festivals',
    subIndustries: [
      {
        id: 'conference_expo',
        label: 'Conference / Expo',
        icon: '🎤',
        description: 'Multi-session conferences, exhibitions, and trade shows',
        blueprintKey: 'events_and_invitations',
        businessType: 'general',
        tags: ['conference', 'expo', 'trade show', 'exhibition'],
        whatYouGet: ['Registration & Badge', 'Session Check-In', 'Meal Entitlement', 'Breakout Routing', 'Departure'],
      },
      {
        id: 'concert_venue',
        label: 'Concert / Live Venue',
        icon: '🎵',
        description: 'Concerts, theatre, and live entertainment venues',
        blueprintKey: 'events_and_invitations',
        businessType: 'general',
        tags: ['concert', 'venue', 'theatre', 'entertainment'],
        whatYouGet: ['Ticket Scan', 'Entry Gate', 'VIP Lounge (optional)', 'Meal/Bar Collection'],
      },
      {
        id: 'private_event',
        label: 'Private Event / Wedding',
        icon: '💍',
        description: 'Weddings, galas, private parties, and corporate events',
        blueprintKey: 'events_and_invitations',
        businessType: 'catering',
        tags: ['wedding', 'private event', 'gala', 'party', 'corporate event'],
        whatYouGet: ['Guest Check-In', 'Seating Validation', 'Meal Collection', 'Gifts & Extras (optional)'],
      },
      {
        id: 'sports_event',
        label: 'Sports Event / Stadium',
        icon: '⚽',
        description: 'Sports stadiums, arenas, and ticketed sporting events',
        blueprintKey: 'events_and_invitations',
        businessType: 'general',
        tags: ['sports', 'stadium', 'arena', 'match'],
        whatYouGet: ['Entry Scan', 'Section Routing', 'Food & Beverage Collection', 'Merchandise (optional)'],
      },
    ],
  },
  {
    id: 'hospitality',
    label: 'Hospitality & Accommodation',
    icon: '🏨',
    color: 'teal',
    description: 'Hotels, guest houses, lodges, and B&Bs',
    subIndustries: [
      {
        id: 'hotel',
        label: 'Hotel / Resort',
        icon: '🏩',
        description: 'Full-service hotels and resorts',
        blueprintKey: 'hospitality_and_accommodation',
        businessType: 'general',
        tags: ['hotel', 'resort', 'lodge'],
        whatYouGet: ['Arrival & ID Verification', 'Check-In', 'Key Collection', 'Concierge Request', 'Check-Out & Payment'],
      },
      {
        id: 'guest_house',
        label: 'Guest House / B&B',
        icon: '🏡',
        description: 'Small-scale guesthouses and bed & breakfasts',
        blueprintKey: 'hospitality_and_accommodation',
        businessType: 'general',
        tags: ['guest house', 'bnb', 'bed and breakfast'],
        whatYouGet: ['Guest Check-In', 'Room Assignment', 'Breakfast Collection', 'Check-Out'],
      },
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness & Recreation',
    icon: '💪',
    color: 'green',
    description: 'Gyms, sports clubs, pools, and recreation centres',
    subIndustries: [
      {
        id: 'gym',
        label: 'Gym / Fitness Studio',
        icon: '🏋️',
        description: 'Gyms, fitness studios, and personal training',
        blueprintKey: 'fitness_and_recreation',
        businessType: 'general',
        tags: ['gym', 'fitness', 'personal training', 'studio'],
        whatYouGet: ['Member Check-In', 'Class Booking Confirmation', 'Equipment Allocation', 'Exit'],
      },
      {
        id: 'sports_club',
        label: 'Sports Club / Pool',
        icon: '🏊',
        description: 'Swimming pools, tennis clubs, and sports facilities',
        blueprintKey: 'fitness_and_recreation',
        businessType: 'general',
        tags: ['sports club', 'pool', 'tennis', 'squash'],
        whatYouGet: ['Member Check-In', 'Lane/Court Allocation', 'Facility Exit'],
      },
    ],
  },
  {
    id: 'automotive',
    label: 'Automotive & Mechanical',
    icon: '🚘',
    color: 'slate',
    description: 'Panel beaters, service centres, car washes, and tyre shops',
    subIndustries: [
      {
        id: 'service_centre',
        label: 'Car Service Centre',
        icon: '🔧',
        description: 'Mechanical workshops and car service centres',
        blueprintKey: 'automotive_and_mechanical',
        businessType: 'general',
        tags: ['mechanic', 'service centre', 'workshop'],
        whatYouGet: ['Vehicle Drop-Off', 'Job Card Creation', 'Progress Updates', 'Quality Check', 'Payment & Collection'],
      },
      {
        id: 'panel_beater',
        label: 'Panel Beater / Body Shop',
        icon: '🚗',
        description: 'Collision repair and auto body shops',
        blueprintKey: 'automotive_and_mechanical',
        businessType: 'general',
        tags: ['panel beater', 'body shop', 'smash repair'],
        whatYouGet: ['Assessment Check-In', 'Insurance Verification', 'Repair Progress', 'Quality Inspection', 'Handover'],
      },
      {
        id: 'car_wash',
        label: 'Car Wash',
        icon: '🧹',
        description: 'Drive-through and hand-wash car wash services',
        blueprintKey: 'automotive_and_mechanical',
        businessType: 'general',
        tags: ['car wash', 'valet', 'detailing'],
        whatYouGet: ['Vehicle Check-In & Payment', 'Wash Queue', 'Completion Notification', 'Vehicle Collection'],
      },
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics & Courier',
    icon: '📦',
    color: 'emerald',
    description: 'Courier depots, warehouses, post offices, and collection points',
    subIndustries: [
      {
        id: 'courier_depot',
        label: 'Courier / Parcel Depot',
        icon: '🚚',
        description: 'Parcel drop-off and collection depots',
        blueprintKey: 'logistics_and_supply_chain',
        businessType: 'logistics',
        tags: ['courier', 'parcel', 'depot', 'delivery'],
        whatYouGet: ['Parcel Check-In', 'Weighing & Costing', 'Labelling', 'Payment', 'Dispatch Confirmation'],
      },
      {
        id: 'post_office',
        label: 'Post Office',
        icon: '📮',
        description: 'Postal services, money transfers, and bill payments',
        blueprintKey: 'logistics_and_supply_chain',
        businessType: 'logistics',
        tags: ['post office', 'postal', 'mail'],
        whatYouGet: ['Queue Token', 'Service Triage', 'Counter Service', 'Payment'],
      },
    ],
  },
  {
    id: 'education',
    label: 'Education & Training',
    icon: '🎓',
    color: 'blue',
    description: 'Schools, universities, training centres, and exam venues',
    subIndustries: [
      {
        id: 'university_admin',
        label: 'University / College Admin',
        icon: '🏫',
        description: 'Student registration, financial aid, and admin services',
        blueprintKey: 'education_and_training',
        businessType: 'general',
        tags: ['university', 'college', 'student services', 'admin'],
        whatYouGet: ['Student Check-In', 'Document Submission', 'Financial Aid Verification', 'Advisor Consultation', 'Resolution'],
      },
      {
        id: 'exam_centre',
        label: 'Exam / Testing Centre',
        icon: '📝',
        description: 'Controlled exam venues and certification centres',
        blueprintKey: 'education_and_training',
        businessType: 'general',
        tags: ['exam', 'test', 'certification', 'assessment'],
        whatYouGet: ['Identity Verification', 'Invigilator Check-In', 'Exam Sitting', 'Paper Collection', 'Exit'],
      },
      {
        id: 'training_centre',
        label: 'Training / Skills Centre',
        icon: '📚',
        description: 'Corporate training, skills development, and workshops',
        blueprintKey: 'education_and_training',
        businessType: 'general',
        tags: ['training', 'skills', 'workshop', 'corporate training'],
        whatYouGet: ['Learner Registration', 'Attendance Capture', 'Material Collection', 'Assessment', 'Certificate Issuance'],
      },
    ],
  },
  {
    id: 'legal_professional',
    label: 'Legal & Professional',
    icon: '⚖️',
    color: 'zinc',
    description: 'Law firms, accounting practices, HR offices, and consulting',
    subIndustries: [
      {
        id: 'law_firm',
        label: 'Law Firm',
        icon: '🏛️',
        description: 'Legal consultation and case management',
        blueprintKey: 'legal_and_professional',
        businessType: 'general',
        tags: ['law firm', 'attorney', 'legal', 'solicitor'],
        whatYouGet: ['Client Check-In', 'Conflict Check', 'Consultation', 'Document Signing', 'Billing'],
      },
      {
        id: 'accounting',
        label: 'Accounting / Tax Practice',
        icon: '🧮',
        description: 'Accounting firms and tax return services',
        blueprintKey: 'legal_and_professional',
        businessType: 'general',
        tags: ['accounting', 'tax', 'bookkeeping', 'auditor'],
        whatYouGet: ['Client Check-In', 'Document Handover', 'Consultation', 'Review & Approval', 'Billing'],
      },
    ],
  },
  {
    id: 'retail',
    label: 'Retail & Commerce',
    icon: '🛍️',
    color: 'rose',
    description: 'Retail stores, click & collect, returns desks, and pop-up shops',
    subIndustries: [
      {
        id: 'click_collect',
        label: 'Click & Collect / Returns',
        icon: '📬',
        description: 'Online order pickup and return processing',
        blueprintKey: 'retail_and_commerce',
        businessType: 'general',
        tags: ['click and collect', 'returns', 'pickup', 'ecommerce'],
        whatYouGet: ['Order Verification', 'Collection', 'Returns Processing (optional)', 'Refund (optional)'],
      },
      {
        id: 'retail_store',
        label: 'Retail Store Queue',
        icon: '🏪',
        description: 'General retail with customer service desks',
        blueprintKey: 'retail_and_commerce',
        businessType: 'general',
        tags: ['retail', 'shop', 'store', 'customer service'],
        whatYouGet: ['Customer Queue Token', 'Service Desk Allocation', 'Query Resolution', 'Payment'],
      },
    ],
  },
  {
    id: 'corporate',
    label: 'Corporate & HR',
    icon: '🏢',
    color: 'purple',
    description: 'HR departments, visitor management, and internal service desks',
    subIndustries: [
      {
        id: 'hr_department',
        label: 'HR Department',
        icon: '👥',
        description: 'Onboarding, payroll queries, and HR services',
        blueprintKey: 'corporate_and_hr',
        businessType: 'general',
        tags: ['hr', 'human resources', 'payroll', 'onboarding'],
        whatYouGet: ['Employee Check-In', 'Request Triage', 'HR Consultant Meeting', 'Document Processing', 'Resolution'],
      },
      {
        id: 'visitor_management',
        label: 'Visitor Management',
        icon: '🪪',
        description: 'Corporate visitor check-in and access control',
        blueprintKey: 'corporate_and_hr',
        businessType: 'general',
        tags: ['visitor', 'reception', 'access control', 'corporate'],
        whatYouGet: ['Visitor Check-In', 'Host Notification', 'Badge Issuance', 'Escort Coordination', 'Sign-Out'],
      },
    ],
  },
];

/**
 * Get a flat list of all sub-industries for a given industry group id.
 */
export function getSubIndustries(industryGroupId: string): SubIndustry[] {
  return INDUSTRY_GROUPS.find(g => g.id === industryGroupId)?.subIndustries ?? [];
}

/**
 * Find a sub-industry by its id.
 */
export function findSubIndustry(subId: string): SubIndustry | undefined {
  for (const group of INDUSTRY_GROUPS) {
    const found = group.subIndustries.find(s => s.id === subId);
    if (found) return found;
  }
  return undefined;
}
