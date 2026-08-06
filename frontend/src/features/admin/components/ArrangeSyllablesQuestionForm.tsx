import { Copy, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ArrangeSyllableForm,
  ArrangeSyllablesQuestionForm,
} from "@/features/admin/utils/arrange-syllables-content";
import {
  ARRANGE_SYLLABLES_MAX_SYLLABLES,
  createEmptySyllable,
  getQuestionStatus,
  normalizeSyllableSequence,
} from "@/features/admin/utils/arrange-syllables-content";
import { cn } from "@/lib/utils";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-2 text-sm font-medium text-destructive">{message}</p> : null;
}

export function ArrangeSyllablesQuestionForm({
  question,
  index,
  errors,
  onUpdate,
  onDuplicate,
  onDelete,
  disabled,
}: {
  question: ArrangeSyllablesQuestionForm;
  index: number;
  errors: Record<string, string | undefined>;
  onUpdate: (updated: ArrangeSyllablesQuestionForm) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const status = getQuestionStatus(question);
  const previewText = normalizeSyllableSequence(question.syllables)
    .map((syllable) => syllable.value)
    .join(" + ");

  const updateTargetWord = (targetWord: string) => {
    onUpdate({ ...question, targetWord });
  };

  const updateSyllable = (syllableId: string, value: string) => {
    const syllables = question.syllables.map((syllable) => (
      syllable.id === syllableId ? { ...syllable, value } : syllable
    ));
    onUpdate({ ...question, syllables });
  };

  const addSyllable = () => {
    const nextSequence = question.syllables.length + 1;
    onUpdate({
      ...question,
      syllables: [...question.syllables, createEmptySyllable(nextSequence)],
    });
  };

  const removeSyllable = (syllableId: string) => {
    const remaining = question.syllables
      .filter((syllable) => syllable.id !== syllableId)
      .map((syllable, sequence) => ({ ...syllable, sequence: sequence + 1 }));
    onUpdate({ ...question, syllables: remaining });
  };

  const moveSyllable = (syllableId: string, direction: -1 | 1) => {
    const indexInList = question.syllables.findIndex((syllable) => syllable.id === syllableId);
    if (indexInList === -1) return;

    const targetIndex = indexInList + direction;
    if (targetIndex < 0 || targetIndex >= question.syllables.length) return;

    const reordered = [...question.syllables];
    [reordered[indexInList], reordered[targetIndex]] = [reordered[targetIndex], reordered[indexInList]];
    onUpdate({
      ...question,
      syllables: normalizeSyllableSequence(reordered),
    });
  };

  const hasPreviewText = previewText.length > 0;

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Soalan {index + 1}</h2>
            <p className="text-sm leading-6 text-muted-foreground">Lengkapkan perkataan dan suku kata untuk soalan ini.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                status === "complete"
                  ? "border-secondary/20 bg-secondary/10 text-secondary"
                  : "border-warning/30 bg-warning/10 text-warning",
              )}
            >
              {status === "complete" ? "Lengkap" : "Belum Lengkap"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-lg px-3 text-xs"
              onClick={onDuplicate}
              disabled={disabled}
            >
              <Copy className="size-3.5" aria-hidden="true" />
              Duplikasi
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-lg px-3 text-xs text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={disabled}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Padam
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetWord">Perkataan Lengkap <span className="text-destructive">*</span></Label>
          <Input
            id="targetWord"
            value={question.targetWord}
            onChange={(event) => updateTargetWord(event.target.value)}
            aria-describedby="targetWord-help targetWord-error"
            aria-invalid={Boolean(errors.targetWord)}
            placeholder="Contoh: cawan"
            className="h-12 rounded-xl !bg-background/40"
            disabled={disabled}
          />
          <p id="targetWord-help" className="text-sm leading-6 text-muted-foreground">Masukkan perkataan penuh yang akan dibina oleh murid.</p>
          <FieldError id="targetWord-error" message={errors.targetWord} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="syllables">Suku Kata <span className="text-destructive">*</span></Label>
            <span className="text-xs text-muted-foreground">Maksimum {ARRANGE_SYLLABLES_MAX_SYLLABLES}</span>
          </div>

          <div id="syllables" className="space-y-2">
            {question.syllables.map((syllable, syllableIndex) => (
              <SyllableRow
                key={syllable.id}
                syllable={syllable}
                syllableIndex={syllableIndex}
                total={question.syllables.length}
                errors={errors}
                disabled={disabled}
                onChange={(value) => updateSyllable(syllable.id, value)}
                onRemove={() => removeSyllable(syllable.id)}
                onMove={(direction) => moveSyllable(syllable.id, direction)}
              />
            ))}
          </div>

          {question.syllables.length < ARRANGE_SYLLABLES_MAX_SYLLABLES ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 rounded-xl sm:w-auto"
              onClick={addSyllable}
              disabled={disabled}
            >
              <Plus className="size-4" aria-hidden="true" />
              Tambah Suku Kata
            </Button>
          ) : null}

          <FieldError id="syllables-error" message={errors.syllables} />
        </div>

        {hasPreviewText ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Pratonton gabungan</span>
            <span className="mt-1 block font-semibold text-foreground">{previewText}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SyllableRow({
  syllable,
  syllableIndex,
  total,
  errors,
  disabled,
  onChange,
  onRemove,
  onMove,
}: {
  syllable: ArrangeSyllableForm;
  syllableIndex: number;
  total: number;
  errors: Record<string, string | undefined>;
  disabled: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const errorKey = `syllables.${syllableIndex}.value`;

  return (
    <div className="flex items-center gap-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-sm font-semibold text-muted-foreground" aria-hidden="true">
        {syllableIndex + 1}
      </span>
      <div className="min-w-0 flex-1">
        <Input
          value={syllable.value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Suku kata ${syllableIndex + 1}`}
          aria-invalid={Boolean(errors[errorKey])}
          placeholder={`Suku kata ${syllableIndex + 1}`}
          className="h-12 rounded-xl !bg-background/40"
          disabled={disabled}
        />
        {errors[errorKey] ? (
          <p className="mt-1.5 text-sm font-medium text-destructive">{errors[errorKey]}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-lg"
          aria-label="Naikkan suku kata"
          onClick={() => onMove(-1)}
          disabled={disabled || syllableIndex === 0}
        >
          <span aria-hidden="true">↑</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-lg"
          aria-label="Turunkan suku kata"
          onClick={() => onMove(1)}
          disabled={disabled || syllableIndex === total - 1}
        >
          <span aria-hidden="true">↓</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-lg text-destructive hover:text-destructive"
          aria-label={`Buang suku kata ${syllableIndex + 1}`}
          onClick={onRemove}
          disabled={disabled || total <= 2}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}