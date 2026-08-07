import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, GripVertical, Plus, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ArrangeSyllablesQuestionForm } from "@/features/admin/utils/arrange-syllables-content";
import {
  getMissingSyllables,
  getQuestionStatus,
  getQuestionWordSummary,
} from "@/features/admin/utils/arrange-syllables-content";
import { learningDndAnnouncements } from "@/features/activity-player/interactions/dnd-accessibility";
import { cn } from "@/lib/utils";

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function QuestionStatusBadge({ status }: { status: "complete" | "incomplete" }) {
  return (
    <Badge
      variant={status === "complete" ? "secondary" : "outline"}
      className={cn(
        "h-6 rounded-full px-2.5",
        status === "complete"
          ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
          : "border-warning/30 bg-warning/10 text-warning hover:bg-warning/10",
      )}
    >
      {status === "complete" ? (
        <CheckCircle2 className="size-3.5 text-secondary-foreground" aria-hidden="true" />
      ) : (
        <TriangleAlert className="size-3.5 text-warning" aria-hidden="true" />
      )}
      {status === "complete" ? "Lengkap" : "Belum Lengkap"}
    </Badge>
  );
}

function SortableQuestionCard({
  question,
  index,
  selectedQuestionId,
  onSelect,
  disabled,
}: {
  question: ArrangeSyllablesQuestionForm;
  index: number;
  selectedQuestionId: string | null;
  onSelect: (questionId: string) => void;
  disabled: boolean;
}) {
  const status = getQuestionStatus(question);
  const summary = getQuestionWordSummary(question);
  const missingCount = getMissingSyllables(question).length;
  const isSelected = question.localId === selectedQuestionId;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question.localId,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      role="listitem"
      aria-current={isSelected ? "true" : undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "min-h-[128px] min-w-[344px] max-w-[380px] flex-none rounded-2xl border p-4 text-left transition-[box-shadow,border-color,background-color,opacity] focus-within:ring-2 focus-within:ring-primary/30",
        isSelected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-background/35 hover:border-primary/35 hover:bg-background/60",
        isDragging && "border-primary shadow-lg ring-2 ring-primary/20 opacity-95",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="shrink-0">
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Susun semula Soalan ${index + 1}`}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold whitespace-nowrap text-foreground">Soalan {index + 1}</p>
        </div>
        <div className="shrink-0 justify-self-end">
          <QuestionStatusBadge status={status} />
        </div>
      </div>

      <button
        type="button"
        className="mt-3 block w-full text-left focus-visible:outline-none"
        onClick={() => onSelect(question.localId)}
        disabled={disabled}
      >
        <p className="truncate text-sm text-muted-foreground">{summary || "Belum ada perkataan"}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{countLabel(question.words.length, "perkataan", "perkataan")}</span>
          <span aria-hidden="true">•</span>
          <span>{countLabel(missingCount, "ruang kosong", "ruang kosong")}</span>
        </div>
      </button>
    </div>
  );
}

export function ActivityQuestionNavigator({
  questions,
  selectedQuestionId,
  onSelect,
  onAdd,
  onReorder,
  disabled,
}: {
  questions: ArrangeSyllablesQuestionForm[];
  selectedQuestionId: string | null;
  onSelect: (questionId: string) => void;
  onAdd: () => void;
  onReorder: (activeQuestionId: string, overQuestionId: string) => void;
  disabled: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const questionIds = React.useMemo(
    () => questions.map((question) => question.localId),
    [questions],
  );

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    onReorder(String(active.id), String(over.id));
  }, [onReorder]);

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Senarai Soalan</h2>
            <p className="text-sm text-muted-foreground">Tambah, pilih dan susun semula soalan aktiviti ini.</p>
          </div>
          <Button
            type="button"
            className="h-11 gap-2 rounded-xl bg-secondary px-5 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30"
            onClick={onAdd}
            disabled={disabled}
          >
            <Plus className="size-4" aria-hidden="true" />
            Tambah Soalan
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          accessibility={{ announcements: learningDndAnnouncements }}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={questionIds} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-3 overflow-x-auto pb-1" role="list" aria-label="Senarai soalan">
              {questions.map((question, index) => (
                <SortableQuestionCard
                  key={question.localId}
                  question={question}
                  index={index}
                  selectedQuestionId={selectedQuestionId}
                  onSelect={onSelect}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}
