import ScheduledTable from "@/components/email-table/ScheduledTable";

export default function ScheduledPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-1">
        Scheduled Emails
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Emails waiting to be dispatched. Statuses update automatically.
      </p>
      <ScheduledTable />
    </div>
  );
}
