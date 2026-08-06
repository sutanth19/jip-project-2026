import { ListChecks } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ArrangeSyllablesQuestionForm } from "@/features/admin/utils/arrange-syllables-content";
import { getContentSummary } from "@/features/admin/utils/arrange-syllables-content";

export function ActivityContentSummary({
  questions,
}: {
  questions: ArrangeSyllablesQuestionForm[];
}) {
  const summary = getContentSummary(questions);

  const rows = [
    ["Jumlah Soalan", String(summary.total)],
    ["Soalan Lengkap", String(summary.complete)],
    ["Belum Lengkap", String(summary.incomplete)],
    ["Templat", "Seret Suku Kata"],
  ];

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-secondary/20 bg-secondary/10 text-secondary">
            <ListChecks className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Struktur Kandungan</h2>
            <p className="text-sm text-muted-foreground">Ringkasan soalan untuk aktiviti ini.</p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 rounded-xl bg-muted/30 px-3 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}