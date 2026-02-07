"use client";

import { useState } from "react";
import { useScheduledEmails, useCancelDispatch } from "@/hooks/useEmails";
import DataTable from "@/components/ui/DataTable";
import StatusChip from "@/components/ui/StatusChip";
import Pagination from "@/components/ui/Pagination";
import type { DispatchItem } from "@/types";

export default function ScheduledTable() {
  const [page, setPage] = useState(1);
  const { data: response, isLoading } = useScheduledEmails(page);
  const cancelMutation = useCancelDispatch();

  const columns = [
    {
      key: "recipient",
      header: "Recipient",
      render: (row: DispatchItem) => (
        <div>
          <div className="font-medium">{row.recipientEmail}</div>
          {row.recipientName && (
            <div className="text-xs text-gray-400">{row.recipientName}</div>
          )}
        </div>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      render: (row: DispatchItem) => row.campaign.title,
    },
    {
      key: "subject",
      header: "Subject",
      render: (row: DispatchItem) => row.campaign.subjectTemplate,
    },
    {
      key: "scheduledAt",
      header: "Scheduled For",
      render: (row: DispatchItem) =>
        new Date(row.scheduledAt).toLocaleString(),
    },
    {
      key: "status",
      header: "Status",
      render: (row: DispatchItem) => <StatusChip status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (row: DispatchItem) =>
        ["SCHEDULED", "QUEUED", "RATE_LIMITED"].includes(row.status) ? (
          <button
            onClick={() => cancelMutation.mutate(row.id)}
            className="text-xs text-red-500 hover:underline"
            disabled={cancelMutation.isPending}
          >
            Cancel
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={response?.data ?? []}
        loading={isLoading}
        emptyMessage="No scheduled emails yet. Compose one!"
      />
      {response?.meta && (
        <Pagination
          page={response.meta.page}
          totalPages={response.meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
