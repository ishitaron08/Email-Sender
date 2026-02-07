"use client";

import { useState } from "react";
import { useSentEmails } from "@/hooks/useEmails";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import type { SentItem } from "@/types";

export default function SentTable() {
  const [page, setPage] = useState(1);
  const { data: response, isLoading } = useSentEmails(page);

  const columns = [
    {
      key: "recipient",
      header: "Recipient",
      render: (row: SentItem) => (
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
      render: (row: SentItem) => row.campaign.title,
    },
    {
      key: "subject",
      header: "Subject",
      render: (row: SentItem) => row.campaign.subjectTemplate,
    },
    {
      key: "sentAt",
      header: "Sent At",
      render: (row: SentItem) =>
        row.ledger?.sentAt
          ? new Date(row.ledger.sentAt).toLocaleString()
          : "—",
    },
    {
      key: "messageId",
      header: "Message ID",
      render: (row: SentItem) => (
        <span className="text-xs font-mono text-gray-400 truncate block max-w-[200px]">
          {row.ledger?.smtpMessageId ?? "—"}
        </span>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      render: (row: SentItem) => (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          {row.ledger?.outcome ?? "DELIVERED"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={response?.data ?? []}
        loading={isLoading}
        emptyMessage="No emails sent yet."
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
