import type { DispatchStatus } from "@/types";

/**
 * Color-coded chip that visualizes a dispatch status.
 */
const palette: Record<DispatchStatus, { bg: string; text: string }> = {
  SCHEDULED: { bg: "bg-blue-100", text: "text-blue-800" },
  QUEUED: { bg: "bg-yellow-100", text: "text-yellow-800" },
  PROCESSING: { bg: "bg-indigo-100", text: "text-indigo-800" },
  SENT: { bg: "bg-green-100", text: "text-green-800" },
  FAILED: { bg: "bg-red-100", text: "text-red-800" },
  RATE_LIMITED: { bg: "bg-orange-100", text: "text-orange-800" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-600" },
};

export default function StatusChip({ status }: { status: DispatchStatus }) {
  const color = palette[status] ?? palette.SCHEDULED;

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
