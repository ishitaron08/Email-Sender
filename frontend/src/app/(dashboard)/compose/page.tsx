import ComposeForm from "@/components/email-form/ComposeForm";

export default function ComposePage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-1">
        Compose &amp; Schedule
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Create a new email campaign and schedule it for delivery.
      </p>
      <ComposeForm />
    </div>
  );
}
