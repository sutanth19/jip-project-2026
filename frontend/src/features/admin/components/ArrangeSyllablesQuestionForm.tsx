import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  ImagePlus,
  MinusCircle,
  Music2,
  Plus,
  SquareDashed,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { uploadMediaFile } from "@/features/admin/api/media.api";
import type {
  ArrangeSyllablesQuestionForm as ArrangeSyllablesQuestionFormValues,
  ArrangeSyllablesSyllableForm,
  ArrangeSyllablesWordForm,
} from "@/features/admin/utils/arrange-syllables-content";
import {
  ARRANGE_SYLLABLES_MAX_DISTRACTORS,
  ARRANGE_SYLLABLES_MAX_SYLLABLES,
  ARRANGE_SYLLABLES_MAX_WORDS,
  createEmptyDistractor,
  createEmptySyllable,
  createEmptyWord,
  getMissingSyllables,
  getQuestionIncorrectDistractors,
  getQuestionStatus,
  getQuestionStatusLabel,
  getQuestionStructurePreview,
  getQuestionWordSummary,
  getWordDisplayValue,
  normalizeDistractorSequence,
  normalizeSyllableSequence,
  normalizeWordSequence,
  syncQuestionChoices,
} from "@/features/admin/utils/arrange-syllables-content";
import { useToast } from "@/providers/toast-context-value";
import { cn } from "@/lib/utils";

type QuestionStepKey = "words" | "syllables" | "missing" | "choices" | "optional";

type StepMeta = {
  key: QuestionStepKey;
  title: string;
  instruction: string;
  summary: string;
  statusLabel: string;
  available: boolean;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-2 text-sm font-medium text-destructive">{message}</p> : null;
}

function updateWord(
  words: ArrangeSyllablesWordForm[],
  wordId: string,
  updater: (word: ArrangeSyllablesWordForm) => ArrangeSyllablesWordForm,
): ArrangeSyllablesWordForm[] {
  return words.map((word) => (word.id === wordId ? updater(word) : word));
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getStatusBadgeClass(statusLabel: string): string {
  if (statusLabel === "Lengkap") {
    return "";
  }

  if (statusLabel === "Ditambah" || statusLabel === "Pilihan") {
    return "border-border bg-muted/30 text-muted-foreground";
  }

  return "border-warning/30 bg-warning/10 text-warning";
}

function getWordTextError(
  errors: Record<string, string | undefined>,
  wordIndex: number,
): string | undefined {
  return errors[`words.${wordIndex}.text`];
}

function getWordSyllableError(
  errors: Record<string, string | undefined>,
  wordIndex: number,
): string | undefined {
  return errors[`words.${wordIndex}.syllables`] ?? errors.words;
}

function getDistractorError(
  errors: Record<string, string | undefined>,
  distractorId: string,
  distractorIndex: number,
): string | undefined {
  return errors[`distractors.${distractorIndex}.value`] ?? errors[`distractors.${distractorId}`] ?? undefined;
}

function getRecommendedStep(question: ArrangeSyllablesQuestionFormValues): QuestionStepKey {
  const words = normalizeWordSequence(question.words);
  const hasAllWords = words.every((word) => getWordDisplayValue(word));
  if (!hasAllWords) return "words";

  const hasValidSyllables = words.every((word) => {
    const sourceWord = getWordDisplayValue(word).trim().replace(/\s+/g, "").toUpperCase();
    const joined = normalizeSyllableSequence(word.syllables)
      .map((syllable) => syllable.value.trim())
      .join("")
      .replace(/\s+/g, "")
      .toUpperCase();
    return joined.length > 0 && sourceWord === joined;
  });
  if (!hasValidSyllables) return "syllables";

  if (getMissingSyllables(question).length === 0) return "missing";

  return "choices";
}

function getStepMetadata(
  question: ArrangeSyllablesQuestionFormValues,
  errors: Record<string, string | undefined>,
): StepMeta[] {
  const normalizedWords = normalizeWordSequence(question.words);
  const missingSyllables = getMissingSyllables(question);
  const incorrectDistractors = getQuestionIncorrectDistractors(question);
  const wordSummary = getQuestionWordSummary(question);
  const syllableSummary = normalizedWords
    .map((word) => normalizeSyllableSequence(word.syllables).map((syllable) => syllable.value.trim()).filter(Boolean).join(" | "))
    .filter(Boolean)
    .join("  ");
  const optionalSummary = [
    question.hint.trim() ? "Petunjuk" : null,
    question.image ? "Imej" : null,
    question.audio ? "Audio" : null,
  ].filter(Boolean).join(" • ");

  const stepOneComplete = normalizedWords.every((word) => getWordDisplayValue(word));
  const stepTwoComplete = stepOneComplete && normalizedWords.every((word, wordIndex) => {
    if (getWordSyllableError(errors, wordIndex)) return false;
    return normalizeSyllableSequence(word.syllables).every((syllable) => syllable.value.trim());
  });
  const stepThreeComplete = stepTwoComplete && missingSyllables.length > 0;
  const stepFourComplete = stepThreeComplete && incorrectDistractors.every((distractor) => distractor.value.trim()) && !errors.distractors;

  return [
    {
      key: "words",
      title: "1. Perkataan",
      instruction: "Tambah satu atau lebih perkataan untuk soalan ini.",
      summary: wordSummary || "Belum ada perkataan",
      statusLabel: stepOneComplete ? "Lengkap" : "Belum Lengkap",
      available: true,
    },
    {
      key: "syllables",
      title: "2. Suku Kata",
      instruction: "Bahagikan setiap perkataan kepada suku kata.",
      summary: syllableSummary || "Bahagikan perkataan kepada suku kata",
      statusLabel: stepTwoComplete ? "Lengkap" : "Belum Lengkap",
      available: stepOneComplete,
    },
    {
      key: "missing",
      title: "3. Suku Kata Hilang",
      instruction: "Pilih suku kata yang akan dipaparkan sebagai ruang kosong.",
      summary: getQuestionStructurePreview(question) || "Pilih suku kata yang hilang",
      statusLabel: stepThreeComplete ? "Lengkap" : "Belum Lengkap",
      available: stepTwoComplete,
    },
    {
      key: "choices",
      title: "4. Pilihan Jawapan",
      instruction: "Tambah pilihan salah. Jawapan betul dimasukkan secara automatik.",
      summary: incorrectDistractors.map((distractor) => distractor.value.trim()).filter(Boolean).join(", ") || "Tambah pilihan salah",
      statusLabel: stepFourComplete ? "Lengkap" : "Belum Lengkap",
      available: stepThreeComplete,
    },
    {
      key: "optional",
      title: "5. Pilihan Tambahan",
      instruction: "Tambah petunjuk, imej atau audio jika diperlukan.",
      summary: optionalSummary || "Tiada pilihan tambahan",
      statusLabel: optionalSummary ? "Ditambah" : "Pilihan",
      available: true,
    },
  ];
}

function StepHeader({
  meta,
  open,
  onOpen,
}: {
  meta: StepMeta;
  open: boolean;
  onOpen: () => void;
}) {
  return (
    <CollapsibleTrigger asChild>
      <button
        type="button"
        className={cn(
          "flex w-full items-start justify-between gap-4 rounded-2xl px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          open ? "bg-muted/50" : "hover:bg-muted/35",
          !meta.available && "cursor-not-allowed opacity-70",
        )}
        onClick={(event) => {
          event.preventDefault();
          if (!meta.available) return;
          onOpen();
        }}
        aria-expanded={open}
        disabled={!meta.available}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">{meta.title}</span>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant={meta.statusLabel === "Lengkap" ? "secondary" : "outline"}
                className={cn("h-6 rounded-full px-2.5", getStatusBadgeClass(meta.statusLabel))}
              >
                {meta.available ? meta.statusLabel : "Tunggu"}
              </Badge>
              <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{open ? meta.instruction : meta.summary}</p>
        </div>
      </button>
    </CollapsibleTrigger>
  );
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
  question: ArrangeSyllablesQuestionFormValues;
  index: number;
  errors: Record<string, string | undefined>;
  onUpdate: (updated: ArrangeSyllablesQuestionFormValues) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const toast = useToast();
  const status = getQuestionStatus(question);
  const statusLabel = getQuestionStatusLabel(question);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [uploadingAudio, setUploadingAudio] = React.useState(false);
  const [openStep, setOpenStep] = React.useState<QuestionStepKey>(() => getRecommendedStep(question));

  const totalSyllables = question.words.reduce((count, word) => count + word.syllables.length, 0);
  const missingSyllables = getMissingSyllables(question);
  const incorrectDistractors = getQuestionIncorrectDistractors(question);
  const steps = getStepMetadata(question, errors);

  const apply = React.useCallback((partial: Partial<ArrangeSyllablesQuestionFormValues>) => {
    onUpdate(syncQuestionChoices({ ...question, ...partial }));
  }, [onUpdate, question]);

  const handleAddWord = () => {
    if (question.words.length >= ARRANGE_SYLLABLES_MAX_WORDS || totalSyllables >= ARRANGE_SYLLABLES_MAX_SYLLABLES) {
      return;
    }

    apply({ words: [...question.words, createEmptyWord(question.words.length + 1)] });
  };

  const handleRemoveWord = (wordId: string) => {
    apply({ words: normalizeWordSequence(question.words.filter((word) => word.id !== wordId)) });
  };

  const handleAddSyllable = (wordId: string) => {
    if (totalSyllables >= ARRANGE_SYLLABLES_MAX_SYLLABLES) {
      return;
    }

    apply({
      words: updateWord(question.words, wordId, (word) => ({
        ...word,
        syllables: [...word.syllables, createEmptySyllable(word.syllables.length + 1)],
      })),
    });
  };

  const handleUpdateSyllable = (
    wordId: string,
    syllableId: string,
    updater: (syllable: ArrangeSyllablesSyllableForm) => ArrangeSyllablesSyllableForm,
  ) => {
    apply({
      words: updateWord(question.words, wordId, (word) => ({
        ...word,
        syllables: word.syllables.map((syllable) => (syllable.id === syllableId ? updater(syllable) : syllable)),
      })),
    });
  };

  const handleRemoveSyllable = (wordId: string, syllableId: string) => {
    apply({
      words: updateWord(question.words, wordId, (word) => ({
        ...word,
        syllables: normalizeSyllableSequence(word.syllables.filter((syllable) => syllable.id !== syllableId)),
      })),
    });
  };

  const handleUpdateIncorrectDistractor = (distractorId: string, value: string) => {
    apply({
      distractors: question.distractors.map((distractor) => (
        distractor.id === distractorId ? { ...distractor, value } : distractor
      )),
    });
  };

  const handleAddDistractor = () => {
    if (incorrectDistractors.length >= ARRANGE_SYLLABLES_MAX_DISTRACTORS) {
      return;
    }

    const nextSequence = question.distractors.length + 1;
    apply({ distractors: [...question.distractors, createEmptyDistractor(nextSequence)] });
  };

  const handleRemoveDistractor = (distractorId: string) => {
    apply({
      distractors: normalizeDistractorSequence(question.distractors.filter((distractor) => distractor.id !== distractorId)),
    });
  };

  const handleUploadMedia = async (file: File, type: "image" | "audio") => {
    const setUploading = type === "image" ? setUploadingImage : setUploadingAudio;
    try {
      setUploading(true);
      const uploaded = await uploadMediaFile({
        file,
        purpose: type === "image" ? "ACTIVITY_IMAGE" : "ACTIVITY_AUDIO",
      });

      if (!uploaded.key) {
        throw new Error("MEDIA_KEY_MISSING");
      }

      const nextMedia = {
        mediaKey: uploaded.key,
        url: uploaded.url,
        mimeType: uploaded.mimeType ?? null,
        originalName: uploaded.originalName ?? null,
        mediaRole: type === "image" ? "PRIMARY_IMAGE" : "REFERENCE_AUDIO",
        altText: null,
      } as const;

      apply(type === "image" ? { image: nextMedia } : { audio: nextMedia });
      toast.success("Berjaya", type === "image" ? "Imej rujukan berjaya dimuat naik." : "Audio rujukan berjaya dimuat naik.");
    } catch {
      toast.error("Muat naik gagal", "Fail tidak dapat dimuat naik. Sila cuba semula.");
    } finally {
      setUploading(false);
    }
  };

  if (question.contractMode === "ORDERED_RECONSTRUCTION") {
    return (
      <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Soalan {index + 1}</h2>
              <p className="text-sm leading-6 text-muted-foreground">Rekod susun penuh lama ini masih boleh dibaca, tetapi tidak boleh diedit menggunakan borang baharu suku kata hilang.</p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-9 gap-1.5 rounded-lg px-3 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDelete}
              disabled={disabled}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Padam
            </Button>
          </div>

          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
            Cipta semula soalan ini menggunakan mod suku kata hilang jika anda perlu mengeditnya.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-6 p-5 sm:p-6">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUploadMedia(file, "image");
            event.target.value = "";
          }}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm,.mp4"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUploadMedia(file, "audio");
            event.target.value = "";
          }}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Soalan {index + 1}</h2>
              <Badge
                variant={status === "complete" ? "secondary" : "outline"}
                className={cn(
                  "h-6 rounded-full px-2.5",
                  status === "complete"
                    ? ""
                    : "border-warning/30 bg-warning/10 text-warning",
                )}
              >
                {statusLabel}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">Lengkapkan lima langkah di bawah untuk membina soalan.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 gap-1.5 rounded-xl px-4 text-sm"
              onClick={onDuplicate}
              disabled={disabled}
            >
              <Copy className="size-4" aria-hidden="true" />
              Duplikasi
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-10 gap-1.5 rounded-xl px-4 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDelete}
              disabled={disabled}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Padam
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          {steps.map((step) => (
            <Collapsible
              key={step.key}
              open={openStep === step.key}
              onOpenChange={(nextOpen) => {
                if (nextOpen && step.available) {
                  setOpenStep(step.key);
                }
              }}
            >
              <div className="rounded-2xl border border-border bg-background/25">
                <StepHeader
                  meta={step}
                  open={openStep === step.key}
                  onOpen={() => setOpenStep(step.key)}
                />

                <CollapsibleContent className="border-t border-border px-4 pb-4 pt-4 sm:px-5">
                  {step.key === "words" ? (
                    <div className="space-y-4">
                      {normalizeWordSequence(question.words).map((word, wordIndex) => {
                        const wordError = getWordTextError(errors, wordIndex);

                        return (
                          <div key={word.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="min-w-0">
                              <Label htmlFor={`word-${question.localId}-${word.id}`}>Perkataan {wordIndex + 1}</Label>
                              <div className="mt-2 flex items-center gap-3">
                                <Input
                                  id={`word-${question.localId}-${word.id}`}
                                  value={word.text}
                                  onChange={(event) => apply({
                                    words: updateWord(question.words, word.id, (current) => ({
                                      ...current,
                                      text: event.target.value,
                                    })),
                                  })}
                                  className="h-12 rounded-xl bg-background/40"
                                  placeholder={`Perkataan ${wordIndex + 1}`}
                                  disabled={disabled}
                                  aria-invalid={wordError ? "true" : "false"}
                                  aria-describedby={wordError ? `word-${question.localId}-${word.id}-error` : undefined}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-10 rounded-lg text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveWord(word.id)}
                                  disabled={disabled || question.words.length <= 1}
                                  aria-label={`Buang Perkataan ${wordIndex + 1}`}
                                >
                                  <MinusCircle className="size-4" aria-hidden="true" />
                                </Button>
                              </div>
                              <FieldError id={`word-${question.localId}-${word.id}-error`} message={wordError} />
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl px-4"
                          onClick={handleAddWord}
                          disabled={disabled || question.words.length >= ARRANGE_SYLLABLES_MAX_WORDS || totalSyllables >= ARRANGE_SYLLABLES_MAX_SYLLABLES}
                        >
                          <Plus className="mr-2 size-4" aria-hidden="true" />
                          Tambah Perkataan
                        </Button>
                        <span className="self-center text-xs text-muted-foreground">
                          {countLabel(question.words.length, "perkataan", "perkataan")}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {step.key === "syllables" ? (
                    <div className="space-y-4">
                      {normalizeWordSequence(question.words).map((word, wordIndex) => {
                        const syllableError = getWordSyllableError(errors, wordIndex);

                        return (
                          <div key={word.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{getWordDisplayValue(word) || `Perkataan ${wordIndex + 1}`}</p>
                                <p className="text-xs text-muted-foreground">Bahagikan setiap perkataan kepada suku kata.</p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {countLabel(word.syllables.length, "suku kata", "suku kata")}
                              </span>
                            </div>

                            <div className="space-y-3">
                              {normalizeSyllableSequence(word.syllables).map((syllable, syllableIndex) => (
                                <div key={syllable.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3">
                                  <div className="min-w-0 flex-1">
                                    <Label htmlFor={`syllable-${question.localId}-${syllable.id}`}>Suku kata {syllableIndex + 1}</Label>
                                    <Input
                                      id={`syllable-${question.localId}-${syllable.id}`}
                                      value={syllable.value}
                                      onChange={(event) => handleUpdateSyllable(word.id, syllable.id, (current) => ({
                                        ...current,
                                        value: event.target.value,
                                      }))}
                                      className="mt-2 h-12 rounded-xl bg-background/40"
                                      placeholder={`Suku kata ${syllableIndex + 1}`}
                                      disabled={disabled}
                                      aria-invalid={syllableError ? "true" : "false"}
                                      aria-describedby={syllableError ? `syllables-${question.localId}-${word.id}-error` : undefined}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="mt-6 size-10 rounded-lg text-destructive hover:text-destructive"
                                    aria-label={`Buang suku kata ${syllableIndex + 1}`}
                                    onClick={() => handleRemoveSyllable(word.id, syllable.id)}
                                    disabled={disabled || word.syllables.length <= 1}
                                  >
                                    <MinusCircle className="size-4" aria-hidden="true" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 rounded-xl px-4"
                                onClick={() => handleAddSyllable(word.id)}
                                disabled={disabled || totalSyllables >= ARRANGE_SYLLABLES_MAX_SYLLABLES}
                              >
                                <Plus className="mr-2 size-4" aria-hidden="true" />
                                Tambah Suku Kata
                              </Button>
                              <FieldError id={`syllables-${question.localId}-${word.id}-error`} message={syllableError} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {step.key === "missing" ? (
                    <div className="space-y-4">
                      {normalizeWordSequence(question.words).map((word, wordIndex) => (
                        <div key={word.id} className="rounded-2xl border border-border bg-card p-4">
                          <p className="mb-3 text-sm font-semibold text-foreground">{getWordDisplayValue(word) || `Perkataan ${wordIndex + 1}`}</p>
                          <div className="space-y-3">
                            {normalizeSyllableSequence(word.syllables).map((syllable, syllableIndex) => (
                              <div key={syllable.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex min-w-0 rounded-lg bg-muted/60 px-3 py-2 text-sm font-semibold text-foreground">
                                    {syllable.value.trim() || `Suku kata ${syllableIndex + 1}`}
                                  </span>
                                </div>
                                <div className="grid w-full grid-cols-2 gap-2 sm:w-[15rem]">
                                  <Button
                                    type="button"
                                    variant={syllable.isMissing ? "outline" : "default"}
                                    className="h-11 rounded-xl px-3"
                                    aria-pressed={!syllable.isMissing}
                                    onClick={() => handleUpdateSyllable(word.id, syllable.id, (current) => ({ ...current, isMissing: false }))}
                                    disabled={disabled}
                                  >
                                    <Eye className="mr-2 size-4" aria-hidden="true" />
                                    Kelihatan
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={syllable.isMissing ? "default" : "outline"}
                                    className="h-11 rounded-xl px-3"
                                    aria-pressed={syllable.isMissing}
                                    onClick={() => handleUpdateSyllable(word.id, syllable.id, (current) => ({ ...current, isMissing: true }))}
                                    disabled={disabled}
                                  >
                                    <SquareDashed className="mr-2 size-4" aria-hidden="true" />
                                    Hilang
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <FieldError id={`missing-${question.localId}-error`} message={missingSyllables.length === 0 ? "Pilih sekurang-kurangnya satu suku kata sebagai Hilang." : undefined} />
                    </div>
                  ) : null}

                  {step.key === "choices" ? (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-sm font-semibold text-foreground">Jawapan Betul</p>
                        <p className="mt-1 text-sm text-muted-foreground">Suku kata hilang dimasukkan secara automatik.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {missingSyllables.length > 0 ? missingSyllables.map((syllable) => (
                            <Badge key={syllable.id} variant="secondary" className="h-8 rounded-full px-3 text-sm font-semibold">
                              {syllable.value.trim() || "—"}
                            </Badge>
                          )) : (
                            <p className="text-sm text-muted-foreground">Belum ada suku kata hilang dipilih.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Pilihan Salah</p>
                            <p className="mt-1 text-sm text-muted-foreground">Tambah pilihan salah. Jawapan betul dimasukkan secara automatik.</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {incorrectDistractors.length} / {ARRANGE_SYLLABLES_MAX_DISTRACTORS}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {incorrectDistractors.length > 0 ? incorrectDistractors.map((distractor, distractorIndex) => (
                            <div key={distractor.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/30 p-3">
                              <div className="min-w-0 flex-1">
                                <Label htmlFor={`distractor-${question.localId}-${distractor.id}`}>Pilihan {distractorIndex + 1}</Label>
                                <Input
                                  id={`distractor-${question.localId}-${distractor.id}`}
                                  value={distractor.value}
                                  onChange={(event) => handleUpdateIncorrectDistractor(distractor.id, event.target.value)}
                                  className="mt-2 h-12 rounded-xl bg-background/40"
                                  placeholder="Masukkan pilihan jawapan"
                                  disabled={disabled}
                                  aria-invalid={getDistractorError(errors, distractor.id, distractorIndex) ? "true" : "false"}
                                  aria-describedby={getDistractorError(errors, distractor.id, distractorIndex) ? `distractor-${question.localId}-${distractor.id}-error` : undefined}
                                />
                                <FieldError id={`distractor-${question.localId}-${distractor.id}-error`} message={getDistractorError(errors, distractor.id, distractorIndex)} />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="mt-6 size-10 rounded-lg text-destructive hover:text-destructive"
                                aria-label={`Buang pilihan ${distractor.value.trim() || distractorIndex + 1}`}
                                onClick={() => handleRemoveDistractor(distractor.id)}
                                disabled={disabled}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </div>
                          )) : (
                            <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                              Belum ada pilihan salah ditambah.
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl px-4"
                            onClick={handleAddDistractor}
                            disabled={disabled || incorrectDistractors.length >= ARRANGE_SYLLABLES_MAX_DISTRACTORS}
                          >
                            <Plus className="mr-2 size-4" aria-hidden="true" />
                            Tambah Pilihan
                          </Button>
                          <FieldError id={`choices-${question.localId}-error`} message={errors.distractors} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step.key === "optional" ? (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor={`hint-${question.localId}`}>Petunjuk</Label>
                        <textarea
                          id={`hint-${question.localId}`}
                          value={question.hint}
                          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => apply({ hint: event.target.value })}
                          className="min-h-24 w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                          placeholder="Masukkan petunjuk ringkas"
                          disabled={disabled}
                        />
                        <p className="text-sm text-muted-foreground">Petunjuk akan dipaparkan kepada murid jika fungsi ini digunakan.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">Imej Rujukan</p>
                              <p className="mt-1 text-sm text-muted-foreground">Tambah imej yang membantu murid memahami soalan.</p>
                            </div>
                            <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />
                          </div>
                          <div className="mt-4 space-y-3">
                            {question.image ? (
                              <div className="flex flex-col gap-4 rounded-xl border border-dashed border-input bg-background/50 p-4 sm:flex-row sm:items-center">
                                <div className="flex h-[180px] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted sm:w-32">
                                  <img
                                    src={question.image.url}
                                    alt={`Imej rujukan untuk Soalan ${index + 1}`}
                                    className="h-full w-full rounded-lg object-contain"
                                  />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p className="text-sm font-semibold text-foreground">Imej telah dimuat naik</p>
                                  <p className="truncate text-sm leading-6 text-muted-foreground" title={question.image.originalName ?? question.image.mediaKey}>
                                    {question.image.originalName ?? question.image.mediaKey}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2 sm:w-auto">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-xl px-5"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={disabled || uploadingImage}
                                  >
                                    Ganti Imej
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-xl border-destructive/30 px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => apply({ image: null })}
                                    disabled={disabled || uploadingImage}
                                  >
                                    Buang
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-input bg-background/50 p-4">
                                <div className="flex flex-col items-center justify-center gap-3 py-5 text-center">
                                  <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                                    <ImagePlus className="size-6" aria-hidden="true" />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground">
                                      {uploadingImage ? "Memuat naik imej..." : "Tiada imej ditambah."}
                                    </p>
                                    <p className="text-sm leading-6 text-muted-foreground">
                                      Tambah imej yang membantu murid memahami soalan.
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-xl px-5"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={disabled || uploadingImage}
                                  >
                                    {uploadingImage ? "Memuat naik..." : "Muat Naik Imej"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">Audio Rujukan</p>
                              <p className="mt-1 text-sm text-muted-foreground">Tambah audio sebutan atau arahan jika diperlukan.</p>
                            </div>
                            <Music2 className="size-5 text-muted-foreground" aria-hidden="true" />
                          </div>
                          <div className="mt-4 space-y-3">
                            {question.audio ? (
                              <div className="flex flex-col gap-4 rounded-xl border border-dashed border-input bg-background/50 p-4">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p className="text-sm font-semibold text-foreground">Audio telah dimuat naik</p>
                                  <p className="truncate text-sm leading-6 text-muted-foreground" title={question.audio.originalName ?? question.audio.mediaKey}>
                                    {question.audio.originalName ?? question.audio.mediaKey}
                                  </p>
                                </div>
                                <audio controls className="w-full">
                                  <source src={question.audio.url} />
                                </audio>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-xl px-5"
                                    onClick={() => audioInputRef.current?.click()}
                                    disabled={disabled || uploadingAudio}
                                  >
                                    Ganti Audio
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-xl border-destructive/30 px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => apply({ audio: null })}
                                    disabled={disabled || uploadingAudio}
                                  >
                                    Buang
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-input bg-background/50 p-4">
                                <div className="flex flex-col items-center justify-center gap-3 py-5 text-center">
                                  <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                                    <Music2 className="size-6" aria-hidden="true" />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground">
                                      {uploadingAudio ? "Memuat naik audio..." : "Tiada audio ditambah."}
                                    </p>
                                    <p className="text-sm leading-6 text-muted-foreground">
                                      Tambah audio sebutan atau arahan jika diperlukan.
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-xl px-5"
                                    onClick={() => audioInputRef.current?.click()}
                                    disabled={disabled || uploadingAudio}
                                  >
                                    {uploadingAudio ? "Memuat naik..." : "Muat Naik Audio"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-secondary/20 bg-secondary/10 text-secondary">
              {status === "complete" ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <TriangleAlert className="size-5" aria-hidden="true" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {status === "complete"
                  ? "Soalan sedia untuk disimpan"
                  : "Semak semula langkah yang belum lengkap"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {countLabel(question.words.length, "perkataan", "perkataan")} • {countLabel(missingSyllables.length, "ruang kosong", "ruang kosong")} • {countLabel(incorrectDistractors.length, "pilihan salah", "pilihan salah")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
