/**
 * Shared TypeScript interfaces for the frontend.
 * Mirror the API response shapes defined in the backend.
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface DispatchItem {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  status: DispatchStatus;
  scheduledAt: string;
  attempts?: number;
  campaign: {
    title: string;
    subjectTemplate: string;
  };
}

export interface SentItem extends DispatchItem {
  updatedAt: string;
  ledger?: {
    smtpMessageId: string;
    sentAt: string;
    outcome: string;
  };
}

export type DispatchStatus =
  | "SCHEDULED"
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "RATE_LIMITED"
  | "CANCELLED";

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface SchedulePayload {
  campaignTitle: string;
  subject: string;
  body: string;
  scheduledAt: string;
  recipients: { email: string; name?: string }[];
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
}
