import { Check, ChevronDown, ChevronUp, Plus, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ArrangeSyllablesQuestionForm } from "@/features/admin/utils/arrange-syllables-content";
import { getQuestionStatus } from "@/features/admin/utils/arrange-syllables-content";
import { cn } from "@/lib/utils";

export function ActivityQuestionNavigator({
  questions,
  selectedQuestionId,
  onSelect,
  onAdd,
  onMoveUp,
  onMoveDown,
  disabled,
}: {
  questions: ArrangeSyllablesQuestionForm[];
  selectedQuestionId: string | null;
  onSelect: (questionId: string) => void;
  onAdd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled: boolean;
}) {
  const selectedIndex = questions.findIndex((question) => question.id === selectedQuestionId);

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Senarai Soalan</h2>
            <p className="text-sm text-muted-foreground">{questions.length} soalan</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-1.5 rounded-xl px-3 text-sm"
            onClick={onAdd}
            disabled={disabled}
          >
            <Plus className="size-4" aria-hidden="true" />
            Tambah Soalan
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Senarai soalan">
          {questions.map((question, index) => {
            const status = getQuestionStatus(question);
            const isSelected = question.id === selectedQuestionId;

            return (
              <button
                key={question.id}
                type="button"
                role="listitem"
                aria-label={`Soalan ${index + 1}: ${status === "complete" ? "Lengkap" : "Belum Lengkap"}`}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:border-primary/40 hover:bg-background/70",
                )}
                onClick={() => onSelect(question.id ?? "")}
                disabled={disabled}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-xs">
                  {index + 1}
                </span>
                {status === "complete" ? (
                  <Check className="size-4 text-secondary" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="size-4 text-warning" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {questions.length > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 rounded-lg"
              aria-label="Naikkan soalan"
              onClick={onMoveUp}
              disabled={disabled || selectedIndex <= 0}
            >
              <ChevronUp className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 rounded-lg"
              aria-label="Turunkan soalan"
              onClick={onMoveDown}
              disabled={disabled || selectedIndex === -1 || selectedIndex >= questions.length - 1}
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
            <span className="text-sm text-muted-foreground">Susun semula soalan</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}