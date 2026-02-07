"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import Button from "@/components/ui/Button";
import { useScheduleEmails } from "@/hooks/useEmails";
import { parseCsvRecipients, CsvRecipient } from "@/lib/csvParser";

/**
 * Compose form with two modes:
 * 1. Manual recipient entry (comma-separated emails)
 * 2. CSV file upload
 */
export default function ComposeForm() {
  const [campaignTitle, setCampaignTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [manualEmails, setManualEmails] = useState("");
  const [csvRecipients, setCsvRecipients] = useState<CsvRecipient[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<"manual" | "csv">("manual");

  const scheduleMutation = useScheduleEmails();

  async function handleCsvUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await parseCsvRecipients(file);
    setCsvRecipients(result.valid);
    setCsvErrors(result.errors);
  }

  function buildRecipients(): { email: string; name?: string }[] {
    if (mode === "csv") return csvRecipients;

    return manualEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .map((email) => ({ email }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const recipients = buildRecipients();
    if (recipients.length === 0) {
      alert("Please add at least one recipient");
      return;
    }

    const payload = {
      campaignTitle,
      subject,
      body,
      scheduledAt: new Date(scheduledAt).toISOString(),
      recipients,
    };

    console.log("[ComposeForm] Scheduling payload:", JSON.stringify(payload, null, 2));

    scheduleMutation.mutate(payload, {
      onSuccess: (data) => {
        console.log("[ComposeForm] Schedule success:", data);
        // Reset form
        setCampaignTitle("");
        setSubject("");
        setBody("");
        setScheduledAt("");
        setManualEmails("");
        setCsvRecipients([]);
        alert("Emails scheduled successfully!");
      },
      onError: (error: any) => {
        console.error("[ComposeForm] Schedule error:", error);
        console.error("[ComposeForm] Response data:", error?.response?.data);
        console.error("[ComposeForm] Response status:", error?.response?.status);
      },
    });
  }

  // Minimum datetime = now + 2 minutes (padded)
  const minDatetime = new Date(Date.now() + 120_000)
    .toISOString()
    .slice(0, 16);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Campaign Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Campaign Title
        </label>
        <input
          type="text"
          value={campaignTitle}
          onChange={(e) => setCampaignTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="e.g. February Newsletter"
        />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subject Line
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="Your email subject"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Body (HTML allowed)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="<p>Hello {{name}},</p>..."
        />
      </div>

      {/* Schedule Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Send At
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          min={minDatetime}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Recipient Mode Toggle */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`px-3 py-1 text-sm rounded-full border ${
            mode === "manual"
              ? "bg-brand-600 text-white border-brand-600"
              : "border-gray-300 text-gray-600"
          }`}
        >
          Manual Entry
        </button>
        <button
          type="button"
          onClick={() => setMode("csv")}
          className={`px-3 py-1 text-sm rounded-full border ${
            mode === "csv"
              ? "bg-brand-600 text-white border-brand-600"
              : "border-gray-300 text-gray-600"
          }`}
        >
          CSV Upload
        </button>
      </div>

      {/* Manual Entry */}
      {mode === "manual" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipients (comma-separated)
          </label>
          <textarea
            value={manualEmails}
            onChange={(e) => setManualEmails(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="alice@example.com, bob@example.com"
          />
        </div>
      )}

      {/* CSV Upload */}
      {mode === "csv" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload CSV (columns: email, name)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
          {csvRecipients.length > 0 && (
            <p className="mt-2 text-sm text-green-600">
              ✓ {csvRecipients.length} valid recipients parsed
            </p>
          )}
          {csvErrors.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              <p className="font-medium">Warnings:</p>
              <ul className="list-disc ml-5">
                {csvErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {csvErrors.length > 5 && (
                  <li>…and {csvErrors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        loading={scheduleMutation.isPending}
        size="lg"
      >
        Schedule Emails
      </Button>

      {scheduleMutation.isError && (
        <p className="text-sm text-red-600">
          {(scheduleMutation.error as any)?.response?.data?.message
            ? `Error: ${(scheduleMutation.error as any).response.data.message} — ${JSON.stringify((scheduleMutation.error as any).response.data.errors)}`
            : "Failed to schedule. Please try again."}
        </p>
      )}
    </form>
  );
}
