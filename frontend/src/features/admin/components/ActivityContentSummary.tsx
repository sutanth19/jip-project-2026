import { AlertTriangle, AudioLines, CheckCircle2, ListChecks, Lightbulb, SquareDashed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ArrangeSyllablesQuestionForm } from "@/features/admin/utils/arrange-syllables-content";
import { getContentSummary, getQuestionChoicePreview } from "@/features/admin/utils/arrange-syllables-content";

export function ActivityContentSummary({
  questions,
  selectedQuestion,
  selectedQuestionIndex,
}: {
  questions: ArrangeSyllablesQuestionForm[];
  selectedQuestion: ArrangeSyllablesQuestionForm | null;
  selectedQuestionIndex: number;
}) {
  const summary = getContentSummary(questions);
  const previewChoices = selectedQuestion ? getQuestionChoicePreview(selectedQuestion) : [];
  const summaryRows = [
    {
      label: "Jumlah Soalan",
      value: summary.total,
      icon: ListChecks,
      className: "border-primary/20 bg-primary/5",
      iconClassName: "text-primary",
    },
    {
      label: "Lengkap",
      value: summary.complete,
      icon: CheckCircle2,
      className: "border-secondary/20 bg-secondary/10",
      iconClassName: "text-secondary",
    },
    {
      label: "Belum Lengkap",
      value: summary.incomplete,
      icon: AlertTriangle,
      className: "border-warning/30 bg-warning/10",
      iconClassName: "text-warning",
    },
    {
      label: "Ruang Kosong",
      value: summary.totalBlanks,
      icon: SquareDashed,
      className: "border-border bg-muted/30",
      iconClassName: "text-muted-foreground",
    },
  ];

  return (
    <div className="flex h-full flex-col gap-6 lg:sticky lg:top-6">
      <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Pratonton Soalan</h2>
            <p className="text-sm text-muted-foreground">Perubahan dipaparkan secara langsung.</p>
          </div>

          {selectedQuestion ? (
            <div className="space-y-5">
              <Badge variant="outline" className="h-6 rounded-full px-2.5">
                Soalan {selectedQuestionIndex + 1}
              </Badge>

              {selectedQuestion.image ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-background/35">
                  <img
                    src={selectedQuestion.image.url}
                    alt={`Imej rujukan untuk Soalan ${selectedQuestionIndex + 1}`}
                    className="h-[200px] w-full object-contain"
                  />
                </div>
              ) : null}

              <div className="space-y-3 rounded-2xl border border-border bg-background/35 p-4">
                <p className="text-sm font-medium text-muted-foreground">Seret suku kata yang betul ke ruang kosong.</p>
                <div className="space-y-2">
                  {selectedQuestion.words.map((word) => (
                    <div key={word.id} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                      {word.syllables.map((syllable) => (
                        <span
                          key={syllable.id}
                          className={syllable.isMissing
                            ? "inline-flex min-h-10 min-w-16 items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/5 px-3 py-2 text-primary"
                            : "inline-flex min-h-10 items-center justify-center rounded-xl bg-muted px-3 py-2"}
                        >
                          {syllable.isMissing ? "____" : syllable.value.trim() || "—"}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Pilihan</p>
                <div className="flex flex-wrap gap-2">
                  {previewChoices.map((distractor) => (
                    <span key={distractor.id} className="inline-flex min-h-10 items-center rounded-xl border border-border bg-background/35 px-3 py-2 text-sm font-medium text-foreground">
                      {distractor.value.trim() || "—"}
                    </span>
                  ))}
                </div>
              </div>

              {selectedQuestion.hint.trim() ? (
                <div className="rounded-2xl border border-border bg-background/35 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-warning/20 bg-warning/10 text-warning">
                      <Lightbulb className="size-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Petunjuk</p>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedQuestion.hint.trim()}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedQuestion.audio ? (
                <div className="rounded-2xl border border-border bg-background/35 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <AudioLines className="size-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">Audio Rujukan</p>
                  </div>
                  <audio controls className="w-full">
                    <source src={selectedQuestion.audio.url} />
                  </audio>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              Pilih soalan untuk melihat pratonton.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-secondary/20 bg-secondary/10 text-secondary">
              <ListChecks className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Ringkasan Kandungan</h2>
              <p className="text-sm text-muted-foreground">Status semasa semua soalan dalam aktiviti ini.</p>
            </div>
          </div>

          <div className="space-y-3">
            {summaryRows.map((row) => {
              const Icon = row.icon;

              return (
                <div key={row.label} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${row.className}`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`size-4 ${row.iconClassName}`} aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">{row.label}</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{row.value}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
