"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import type {
  PaginatedResponse,
  DispatchItem,
  SentItem,
  SchedulePayload,
  RateLimitInfo,
} from "@/types";

// ─── Scheduled Emails ───────────────────────────────────

export function useScheduledEmails(page = 1) {
  return useQuery({
    queryKey: ["emails", "scheduled", page],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DispatchItem>>(
        "/emails/scheduled",
        { params: { page, perPage: 20 } }
      );
      return data;
    },
    refetchInterval: 10_000, // poll every 10s to catch status changes
  });
}

// ─── Sent Emails ────────────────────────────────────────

export function useSentEmails(page = 1) {
  return useQuery({
    queryKey: ["emails", "sent", page],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<SentItem>>(
        "/emails/sent",
        { params: { page, perPage: 20 } }
      );
      return data;
    },
    refetchInterval: 15_000,
  });
}

// ─── Schedule New Emails ────────────────────────────────

export function useScheduleEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SchedulePayload) => {
      const { data } = await apiClient.post("/emails/schedule", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails", "scheduled"] });
    },
  });
}

// ─── Cancel a Dispatch ──────────────────────────────────

export function useCancelDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dispatchId: string) => {
      const { data } = await apiClient.patch(`/emails/${dispatchId}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

// ─── Rate Limit Info ────────────────────────────────────

export function useRateLimit() {
  return useQuery({
    queryKey: ["rate-limit"],
    queryFn: async () => {
      const { data } = await apiClient.get<RateLimitInfo>(
        "/emails/rate-limit"
      );
      return data;
    },
    refetchInterval: 30_000,
  });
}
