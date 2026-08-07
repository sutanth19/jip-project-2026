import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ActivityContentSummary } from "@/features/admin/components/ActivityContentSummary";
import { ActivityQuestionNavigator } from "@/features/admin/components/ActivityQuestionNavigator";
import { ArrangeSyllablesQuestionForm } from "@/features/admin/components/ArrangeSyllablesQuestionForm";
import { getActivityContentSaveMode } from "@/features/admin/hooks/use-activity-content";
import { syncQuestionChoices, type ArrangeSyllablesQuestionForm as ArrangeSyllablesQuestionFormValues } from "@/features/admin/utils/arrange-syllables-content";

vi.mock("@/providers/toast-context-value", () => ({
  useToast: () => ({
    success: () => undefined,
    error: () => undefined,
  }),
}));

function buildQuestion(): ArrangeSyllablesQuestionFormValues {
  return syncQuestionChoices({
    localId: "question-1",
    sequence: 0,
    contractMode: "MISSING_SYLLABLES",
    words: [
      {
        id: "word-1",
        text: "BOLA",
        sequence: 1,
        syllables: [
          { id: "syllable-1", value: "BO", sequence: 1, isMissing: false },
          { id: "syllable-2", value: "LA", sequence: 2, isMissing: true },
        ],
      },
      {
        id: "word-2",
        text: "SEPAK",
        sequence: 2,
        syllables: [
          { id: "syllable-3", value: "SE", sequence: 1, isMissing: false },
          { id: "syllable-4", value: "PAK", sequence: 2, isMissing: true },
        ],
      },
    ],
    distractors: [
      { id: "d1", value: "RA", sequence: 1 },
      { id: "d2", value: "TU", sequence: 2 },
    ],
    hint: "Pilih suku kata yang sesuai.",
    image: {
      mediaKey: "image-1",
      url: "https://example.com/bola-sepak.png",
      mimeType: "image/png",
      originalName: "bola-sepak.png",
      mediaRole: "PRIMARY_IMAGE",
      altText: null,
    },
    audio: {
      mediaKey: "audio-1",
      url: "https://example.com/bola-sepak.mp3",
      mimeType: "audio/mpeg",
      originalName: "bola-sepak.mp3",
      mediaRole: "REFERENCE_AUDIO",
      altText: null,
    },
    isPersisted: true,
  });
}

describe("Arrange Syllables Step 3 UI", () => {
  it("renders the guided five-step workflow with concise Malay copy", () => {
    const markup = renderToStaticMarkup(
      <ArrangeSyllablesQuestionForm
        question={buildQuestion()}
        index={0}
        errors={{}}
        onUpdate={() => undefined}
        onDuplicate={() => undefined}
        onDelete={() => undefined}
        disabled={false}
      />,
    );

    expect(markup).toContain("Lengkapkan lima langkah di bawah untuk membina soalan.");
    expect(markup).toContain("1. Perkataan");
    expect(markup).toContain("2. Suku Kata");
    expect(markup).toContain("3. Suku Kata Hilang");
    expect(markup).toContain("4. Pilihan Jawapan");
    expect(markup).toContain("5. Pilihan Tambahan");
    expect(markup).toContain("Jawapan Betul");
    expect(markup).toContain("Pilihan Salah");
    expect(markup).not.toContain("Petunjuk adalah pilihan dan disimpan dalam konfigurasi item berjenis.");
    expect(markup).not.toContain("Naikkan suku kata");
    expect(markup).not.toContain("Turunkan suku kata");
  });

  it("shows informative navigator items with word and blank summaries", () => {
    const question = buildQuestion();
    const markup = renderToStaticMarkup(
      <ActivityQuestionNavigator
        questions={[question]}
        selectedQuestionId={question.localId}
        onSelect={() => undefined}
        onAdd={() => undefined}
        onReorder={() => undefined}
        disabled={false}
      />,
    );

    expect(markup).toContain("Soalan 1");
    expect(markup).toContain("BOLA SEPAK");
    expect(markup).toContain("2 perkataan");
    expect(markup).toContain("2 ruang kosong");
    expect(markup).toContain("Lengkap");
    expect(markup.match(/Lengkap/g)?.length).toBe(1);
    expect(markup).toContain("Susun semula Soalan 1");
    expect(markup).not.toContain("Naikkan soalan");
    expect(markup).not.toContain("Turunkan soalan");
    expect(markup).not.toContain("Susun semula soalan");
  });

  it("keeps full question titles visible with stable card width and no title truncation", () => {
    const navigatorSource = readFileSync("src/features/admin/components/ActivityQuestionNavigator.tsx", "utf8");

    expect(navigatorSource).toContain("Soalan {index + 1}");
    expect(navigatorSource).toContain("min-w-[344px]");
    expect(navigatorSource).toContain("max-w-[380px]");
    expect(navigatorSource).toContain("flex-none");
    expect(navigatorSource).not.toContain('truncate text-sm font-semibold text-foreground">Soalan {index + 1}');
  });

  it("renders the live preview with uploaded image, audio, and student-facing choices", () => {
    const question = buildQuestion();
    const markup = renderToStaticMarkup(
      <ActivityContentSummary
        questions={[question]}
        selectedQuestion={question}
        selectedQuestionIndex={0}
      />,
    );

    expect(markup).toContain("Pratonton Soalan");
    expect(markup).toContain("Perubahan dipaparkan secara langsung.");
    expect(markup).toContain("https://example.com/bola-sepak.png");
    expect(markup).toContain("https://example.com/bola-sepak.mp3");
    expect(markup).toContain("Seret suku kata yang betul ke ruang kosong.");
    expect(markup).toContain("LA");
    expect(markup).toContain("PAK");
    expect(markup).toContain("RA");
    expect(markup).toContain("TU");
    expect(markup).not.toContain("Suku kata hilang");
    expect(markup).not.toContain("Jawapan");
  });

  it("renders media sections vertically with truncation-safe filenames and warning incomplete states", () => {
    const question = {
      ...buildQuestion(),
      image: {
        mediaKey: "login_img.png",
        url: "https://example.com/login_img.png",
        mimeType: "image/png",
        originalName: "login_img.png",
        mediaRole: "PRIMARY_IMAGE" as const,
        altText: null,
      },
      audio: {
        mediaKey: "audio_fail_panjang.mp3",
        url: "https://example.com/audio_fail_panjang.mp3",
        mimeType: "audio/mpeg",
        originalName: "audio_fail_panjang.mp3",
        mediaRole: "REFERENCE_AUDIO" as const,
        altText: null,
      },
    };
    const markup = renderToStaticMarkup(
      <ArrangeSyllablesQuestionForm
        question={question}
        index={0}
        errors={{}}
        onUpdate={() => undefined}
        onDuplicate={() => undefined}
        onDelete={() => undefined}
        disabled={false}
      />,
    );
    const source = readFileSync("src/features/admin/components/ArrangeSyllablesQuestionForm.tsx", "utf8");

    expect(source).toContain("Imej Rujukan");
    expect(source).toContain("Audio Rujukan");
    expect(source.indexOf("Imej Rujukan")).toBeLessThan(source.indexOf("Audio Rujukan"));
    expect(source).toContain('title={question.image.originalName ?? question.image.mediaKey}');
    expect(source).toContain('title={question.audio.originalName ?? question.audio.mediaKey}');
    expect(source).toContain("truncate text-sm leading-6 text-muted-foreground");
    expect(source).toContain('<div className="space-y-4">');
    expect(markup).toContain("Pilihan Tambahan");
    expect(source).toContain("border-warning/30 bg-warning/10 text-warning");
  });

  it("renders one summary metric per row with semantic row accents", () => {
    const question = buildQuestion();
    const markup = renderToStaticMarkup(
      <ActivityContentSummary
        questions={[question]}
        selectedQuestion={question}
        selectedQuestionIndex={0}
      />,
    );

    expect(markup).toContain("Jumlah Soalan");
    expect(markup).toContain("Lengkap");
    expect(markup).toContain("Belum Lengkap");
    expect(markup).toContain("Ruang Kosong");
    expect(markup).toContain("border-primary/20 bg-primary/5");
    expect(markup).toContain("border-secondary/20 bg-secondary/10");
    expect(markup).toContain("border-warning/30 bg-warning/10");
  });

  it("uses the repository sortable pattern and strong destructive actions", () => {
    const navigatorSource = readFileSync("src/features/admin/components/ActivityQuestionNavigator.tsx", "utf8");
    const formSource = readFileSync("src/features/admin/components/ArrangeSyllablesQuestionForm.tsx", "utf8");
    const hookSource = readFileSync("src/features/admin/hooks/use-activity-content.ts", "utf8");
    const pageSource = readFileSync("src/features/admin/pages/AdminActivityContentPage.tsx", "utf8");
    const confirmDialogSource = readFileSync("src/components/shared/ConfirmDialog.tsx", "utf8");
    const buttonVariantSource = readFileSync("src/components/ui/button-variants.ts", "utf8");

    expect(navigatorSource).toContain("DndContext");
    expect(navigatorSource).toContain("SortableContext");
    expect(navigatorSource).toContain("useSortable");
    expect(navigatorSource).toContain("KeyboardSensor");
    expect(navigatorSource).toContain("TouchSensor");
    expect(navigatorSource).toContain("GripVertical");
    expect(formSource).toContain('variant="destructive"');
    expect(buttonVariantSource).toContain('destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90');
    expect(hookSource).not.toContain("addQuestionBankMediaForActivity");
    expect(hookSource).not.toContain("removeQuestionBankMediaForActivity");
    expect(hookSource).not.toContain("syncQuestionMedia");
    expect(hookSource).toContain("question.questionBankItemId");
    expect(hookSource).toContain("addDigitalActivityItem(activityId, question, question.questionBankItemId)");
    expect(hookSource).toContain("question.isPersisted");
    expect(hookSource).toContain("ITEM_STATE_INCONSISTENT");
    expect(pageSource).toContain("try {");
    expect(pageSource).toContain("await content.saveSelectedQuestion();");
    expect(pageSource).toContain("catch {");
    expect(confirmDialogSource).toContain("variant={variant}");
    expect(confirmDialogSource).toContain("LoaderCircle");
  });

  it("reuses the compact remove control pattern for word and syllable deletion", () => {
    const formSource = readFileSync("src/features/admin/components/ArrangeSyllablesQuestionForm.tsx", "utf8");

    expect(formSource).toContain("aria-label={`Buang Perkataan");
    expect(formSource).toContain("aria-label={`Buang suku kata");
    expect(formSource).toContain('<MinusCircle className="size-4" aria-hidden="true" />');
    expect(formSource).toContain('variant="ghost"');
    expect(formSource).toContain('size="icon"');
    expect(formSource).toContain("size-10 rounded-lg text-destructive hover:text-destructive");
  });

  it("keeps persisted item identity monotonic and allows partial-create retry without falling back to POST for existing items", () => {
    const persistedQuestion = {
      ...buildQuestion(),
      isPersisted: true,
      activityItemId: "activity-item-1",
    };
    const recoveredQuestion = {
      ...buildQuestion(),
      isPersisted: false,
      questionBankItemId: "question-bank-1",
      activityItemId: undefined,
    };
    const inconsistentQuestion = {
      ...buildQuestion(),
      isPersisted: true,
      activityItemId: undefined,
    };
    const newQuestion = {
      ...buildQuestion(),
      isPersisted: false,
      questionBankItemId: undefined,
      activityItemId: undefined,
    };

    expect(getActivityContentSaveMode(persistedQuestion)).toBe("update");
    expect(getActivityContentSaveMode(recoveredQuestion)).toBe("recover");
    expect(getActivityContentSaveMode(inconsistentQuestion)).toBe("inconsistent");
    expect(getActivityContentSaveMode(newQuestion)).toBe("create");
  });
});
