import SentTable from "@/components/email-table/SentTable";

export default function SentPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-1">
        Sent Emails
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Successfully delivered emails with SMTP confirmation details.
      </p>
      <SentTable />
    </div>
  );
}
