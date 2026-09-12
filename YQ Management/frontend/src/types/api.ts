/**
 * Shared API type definitions — mirroring the backend Prisma schema and NestJS DTOs.
 *
 * These are the canonical TypeScript interfaces for all API response shapes.
 * Use these in `useQuery` and `fetchApi<T>()` calls instead of `AnyFixMe`.
 *
 * IMPORTANT: Keep these in sync with:
 *   - backend/prisma/schema.prisma  (enum values, model shapes)
 *   - backend/src/**\/dto/          (request/response DTOs)
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MANAGER' | 'OPERATOR';

export type QueueStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';

export type TokenStatus = 'WAITING' | 'SERVING' | 'COMPLETED' | 'MISSED';

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PENDING_PAYMENT'
  | 'PAST_DUE';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'MISSED'
  | 'PENDING_APPROVAL'
  | 'REJECTED'
  | 'BLOCKED';

export type VisitSource =
  | 'APPOINTMENT'
  | 'WALK_IN'
  | 'WEBSITE'
  | 'WHATSAPP'
  | 'PHONE'
  | 'RECEPTION'
  | 'KIOSK'
  | 'QR'
  | 'API';

export type VisitState =
  | 'CREATED'
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'WAITING'
  | 'CALLED'
  | 'ASSIGNED'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'MISSED'
  | 'ON_HOLD'
  | 'ABANDONED'
  | 'TRANSFERRED';

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface TenantBranding {
  primaryColor?: string;
  logo?: string;
  name?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  branding: TenantBranding | null;
  whatsappConnected: boolean;
  whatsappPhone: string | null;
  chatbotEnabled: boolean;
  enableSmartReviews: boolean;
  reviewWaitThresholdMins: number;
  appointmentApprovalMode: string;
  autonomousEnabled: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  personalSettings: Record<string, unknown> | null;
  allowedLocationIds: string[];
  allowedServiceIds: string[];
  allowedPages: string[];
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  // Aggregates returned by GET /customer
  totalVisits?: number;
  lastVisitMs?: number;
  lastVisitAt?: string;
}

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  city: string | null;
  timezone: string;
  businessHours: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  tenantId: string;
  locationId: string | null;
  name: string;
  description: string | null;
  expectedDuration: number; // minutes
  bufferDuration: number;   // minutes
  concurrentSlots: number;
  allowAppointments: boolean;
  requireManualCheckIn: boolean;
  appointmentGranularityMins: number;
  dateSelectionType: string;
  maxDaysInAdvance: number;
  avgActualDurationMins: number | null;
  allowProviderSelection: boolean;
  frozenByQuota: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffWeeklyScheduleEntry {
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  enabled: boolean;
}

export interface Staff {
  id: string;
  tenantId: string;
  locationId: string | null;
  userId: string | null;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  color: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  capacity: number;
  weeklySchedule: StaffWeeklyScheduleEntry[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  tenantId: string;
  locationId: string | null;
  name: string;
  type: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Queue {
  id: string;
  tenantId: string;
  locationId: string | null;
  name: string;
  status: QueueStatus;
  frozenByQuota: boolean;
  createdAt: string;
  // Relations often included
  location?: Pick<Location, 'id' | 'name'> | null;
  services?: Pick<Service, 'id' | 'name'>[];
}

// ─── Visit ───────────────────────────────────────────────────────────────────

export interface Visit {
  id: string;
  tenantId: string;
  customerId: string;
  locationId: string;
  serviceId: string;
  appointmentId: string | null;
  source: VisitSource;
  currentState: VisitState;
  displayId: string | null;
  accessToken: string;
  priority: number;
  queueId: string | null;
  notes: string | null;
  language: string;
  rating: number | null;
  feedbackText: string | null;
  purpose: string | null;
  formResponses: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;

  // Timestamps (ISO strings from the API)
  scheduledTime: string | null;
  actualArrival: string | null;
  checkInTime: string | null;
  waitingStart: string | null;
  serviceStart: string | null;
  serviceEnd: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Computed / joined relations
  customer?: Pick<Customer, 'id' | 'name' | 'phone' | 'email'> | null;
  service?: Pick<Service, 'id' | 'name' | 'expectedDuration'> | null;
  location?: Pick<Location, 'id' | 'name' | 'timezone'> | null;
  queue?: Pick<Queue, 'id' | 'name'> | null;
  operatorUser?: Pick<User, 'id' | 'email'> | null;
}

// ─── Appointment ─────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  tenantId: string;
  customerId: string | null;
  locationId: string;
  serviceId: string;
  staffId: string | null;
  resourceId: string | null;
  scheduledStart: string; // ISO datetime
  scheduledEnd: string;
  status: AppointmentStatus;
  bookingSource: VisitSource;
  customerNotes: string | null;
  formData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  customer?: Pick<Customer, 'id' | 'name' | 'phone' | 'email'> | null;
  service?: Pick<Service, 'id' | 'name'> | null;
  location?: Pick<Location, 'id' | 'name'> | null;
  staff?: Pick<Staff, 'id' | 'name' | 'avatarUrl'> | null;
}

// ─── Subscription & Billing ──────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  currency: string;
  interval: string;
  billingInterval: string;
  trialDays: number;
  features: Record<string, unknown> | null;
  limits: Record<string, unknown> | null;
  maxVisits: number | null;
  maxQueues: number | null;
  active: boolean;
  annualDiscountPercent: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  billingInterval: string;
  nextBillingDate: string | null;
  renewalDate: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsKpis {
  totalVisits: number;
  totalServed: number;
  averageWaitTimeMins: number;
  averageServiceTimeMins: number;
  dropOffRate: number;
  csatScore: number;
  slaViolations: number;
}

export interface AnalyticsChartPoint {
  timeLabel: string;
  volume: number;
  avgWaitTime: number;
}

export interface AnalyticsStaffPerformance {
  name: string;
  email: string;
  served: number;
  avgServiceTimeMins: number;
}

export interface AnalyticsServicePerformance {
  id: string;
  name: string;
  count: number;
  avgMins: number | null;
  violations: number;
  walkaways: number;
  queues: Array<{
    name: string;
    count: number;
    avgMins: number | null;
    violations: number;
    walkaways: number;
  }>;
}

export interface AnalyticsResponse {
  kpis: AnalyticsKpis;
  chartData: AnalyticsChartPoint[];
  staffPerformance: AnalyticsStaffPerformance[];
  servicePerformance: AnalyticsServicePerformance[];
}

// ─── Invitation & Auth ───────────────────────────────────────────────────────

export interface Invitation {
  id: string;
  tenantId: string;
  code: string;
  email: string | null;
  role: Role;
  used: boolean;
  usedCount: number;
  maxUses: number;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  allowedLocationIds: string[];
  allowedServiceIds: string[];
  allowedPages: string[];
}

// ─── Messaging ───────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  tenantId: string;
  customerPhone: string;
  visitId: string | null;
  conversationId: string | null;
  body: string;
  sender: 'OPERATOR' | 'CUSTOMER' | 'SYSTEM';
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface CustomerConversation {
  id: string;
  tenantId: string;
  customerPhone: string;
  status: 'OPEN' | 'CLOSED';
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

// ─── Pagination wrapper (for future paginated endpoints) ─────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── API Utility types ───────────────────────────────────────────────────────

/** Standard NestJS error response shape */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}
