import { StatusBadge } from "@/components/shared";
import type { AdminRecord } from "@/features/admin/types/admin.types";
import { isRecord, stringifyValue } from "@/features/admin/utils/record";

const sensitivePatterns = [/password/i, /pin/i, /token/i, /secret/i, /key/i, /hash/i];

function safeEntries(record: AdminRecord) {
  return Object.entries(record).filter(([key]) => !sensitivePatterns.some((pattern) => pattern.test(key)));
}

function renderDetailValue(value: unknown) {
  if (isRecord(value)) {
    return (
      <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (Array.isArray(value)) {
    return (
      <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return stringifyValue(value);
}

export function AdminRecordDetails({ record }: { record: AdminRecord }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {safeEntries(record).map(([key, value]) => (
        <div key={key} className="rounded-lg border bg-card p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{key}</dt>
          <dd className="mt-2 text-sm">
            {key.toLowerCase().includes("status") ? (
              <StatusBadge status={stringifyValue(value)} />
            ) : (
              renderDetailValue(value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

