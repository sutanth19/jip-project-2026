import { StatusBadge } from "@/components/shared";
import type { BuilderRecord } from "@/features/builder/types/builder.types";
import { builderValueToText, isBuilderRecord } from "@/features/builder/utils/builder-record";

const sensitive = [/password/i, /pin/i, /token/i, /secret/i, /key$/i, /hash/i, /correctAnswer/i];

function renderValue(value: unknown) {
  if (isBuilderRecord(value) || Array.isArray(value)) {
    return <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>;
  }

  return builderValueToText(value);
}

export function SafeRecordDetails({ record }: { record: BuilderRecord }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {Object.entries(record)
        .filter(([key]) => !sensitive.some((pattern) => pattern.test(key)))
        .map(([key, value]) => (
          <div key={key} className="rounded-lg border bg-card p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{key}</dt>
            <dd className="mt-2 text-sm">
              {key.toLowerCase().includes("status") ? <StatusBadge status={builderValueToText(value)} /> : renderValue(value)}
            </dd>
          </div>
        ))}
    </dl>
  );
}

