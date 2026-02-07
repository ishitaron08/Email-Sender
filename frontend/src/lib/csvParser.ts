import Papa from "papaparse";

export interface CsvRecipient {
  email: string;
  name?: string;
}

export interface CsvParseResult {
  valid: CsvRecipient[];
  errors: string[];
}

/**
 * Parse a CSV file (or string) into validated recipients.
 * Expected columns: email (required), name (optional).
 * Deduplicates by email address.
 */
export function parseCsvRecipients(file: File): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete(results) {
        const seen = new Set<string>();
        const valid: CsvRecipient[] = [];
        const errors: string[] = [];

        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i] as Record<string, string>;
          const email = row.email?.trim().toLowerCase();

          if (!email || !isValidEmail(email)) {
            errors.push(`Row ${i + 2}: invalid or missing email "${row.email ?? ""}"`);
            continue;
          }

          if (seen.has(email)) {
            errors.push(`Row ${i + 2}: duplicate email "${email}"`);
            continue;
          }

          seen.add(email);
          valid.push({ email, name: row.name?.trim() || undefined });
        }

        resolve({ valid, errors });
      },
    });
  });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
