/**
 * Shared TypeScript types used across the backend.
 * These are NOT ORM types — they represent API contracts and internal DTOs.
 */

// ─── API Request / Response Shapes ──────────────────────

export interface ScheduleEmailPayload {
  campaignTitle: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO-8601 datetime
  recipients: RecipientEntry[];
}

export interface RecipientEntry {
  email: string;
  name?: string;
}

export interface ScheduleEmailResponse {
  campaignId: string;
  totalDispatches: number;
  dispatches: Array<{
    id: string;
    recipientEmail: string;
    status: string;
    scheduledAt: string;
  }>;
}

export interface PaginatedQuery {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// ─── Auth ───────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // user (Identity) UUID
  email: string;
  iat?: number;
  exp?: number;
}

export interface GoogleProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

// ─── Queue Job Data ─────────────────────────────────────

export interface DispatchJobData {
  dispatchId: string;
  campaignId: string;
  senderId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  idempotencyKey: string;
}

// ─── General ────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}
