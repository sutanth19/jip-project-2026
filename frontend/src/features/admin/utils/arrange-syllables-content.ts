import { z } from "zod";

export const ARRANGE_SYLLABLES_MAX_SYLLABLES = 10;
export const ARRANGE_SYLLABLES_MIN_SYLLABLES = 2;
export const ARRANGE_SYLLABLES_MIN_ITEMS = 1;

export type ArrangeSyllablesInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH";

export type ArrangeSyllableForm = {
  id: string;
  value: string;
  sequence: number;
};

export type ArrangeSyllablesQuestionForm = {
  id?: string;
  activityItemId?: string;
  questionBankItemId?: string;
  sequence: number;
  targetWord: string;
  syllables: ArrangeSyllableForm[];
  isPersisted: boolean;
};

export type ArrangeSyllablesItemDto = {
  id: string;
  sequence: number;
  sectionKey: string | null;
  isRequired: boolean;
  marks: number | null;
  configuration: unknown;
  questionBankItem: {
    id: string;
    type: string;
    title: string | null;
    content: string;
    answerType: string;
    correctAnswer: unknown;
    difficulty: string;
    status: string;
    programmeId: string;
    mediaLinks: Array<{
      id: string;
      mediaKey: string;
      mediaRole: string;
      mimeType: string | null;
      originalName: string | null;
      sequence: number;
      altText: string | null;
      url: string;
    }>;
  };
};

export type ArrangeSyllablesActivityDetail = {
  id: string;
  title: string;
  status: string;
  programme?: {
    id: string;
    code: string;
    name: string;
  } | null;
  template?: {
    id: string;
    code?: string | null;
    name: string;
    rendererKey: string;
  } | null;
  curriculumLinks?: Array<{
    id?: string;
    isPrimary: boolean;
    curriculumYear?: { id?: string; yearLevel: number; name: string | null } | null;
    remedialSkill?: { id?: string; code?: string | null; name: string } | null;
    contentStandard?: { id: string; code: string; title: string } | null;
    learningStandard?: { id: string; code: string } | null;
    learningObjective?: { id: string; code: string | null; description: string } | null;
  }>;
  items?: ArrangeSyllablesItemDto[];
};

export type ArrangeSyllablesContentValues = {
  questions: ArrangeSyllablesQuestionForm[];
};

export const arrangeSyllablesQuestionSchema = z.object({
  id: z.string().optional(),
  activityItemId: z.string().optional(),
  questionBankItemId: z.string().optional(),
  sequence: z.number().int().min(0),
  targetWord: z.string().trim().min(1, "Perkataan Lengkap diperlukan.").max(2_000, "Perkataan Lengkap terlalu panjang."),
  syllables: z.array(z.object({
    id: z.string().min(1),
    value: z.string().trim().min(1, "Suku kata tidak boleh kosong.").max(500, "Suku kata terlalu panjang."),
    sequence: z.number().int().min(1).max(ARRANGE_SYLLABLES_MAX_SYLLABLES),
  }))
    .min(ARRANGE_SYLLABLES_MIN_SYLLABLES, `Sekurang-kurangnya ${ARRANGE_SYLLABLES_MIN_SYLLABLES} suku kata diperlukan.`)
    .max(ARRANGE_SYLLABLES_MAX_SYLLABLES, `Maksimum ${ARRANGE_SYLLABLES_MAX_SYLLABLES} suku kata dibenarkan.`),
  isPersisted: z.boolean(),
}).superRefine((value, ctx) => {
  const syllableIds = value.syllables.map((syllable) => syllable.id);
  if (new Set(syllableIds).size !== syllableIds.length) {
    ctx.addIssue({ code: "custom", path: ["syllables"], message: "Setiap suku kata mesti mempunyai ID unik." });
  }

  const sequences = value.syllables.map((syllable) => syllable.sequence);
  if (new Set(sequences).size !== sequences.length) {
    ctx.addIssue({ code: "custom", path: ["syllables"], message: "Setiap suku kata mesti mempunyai turutan unik." });
  }

  const ordered = [...value.syllables].sort((left, right) => left.sequence - right.sequence);
  if (ordered.some((syllable, index) => syllable.sequence !== index + 1)) {
    ctx.addIssue({ code: "custom", path: ["syllables"], message: "Turutan suku kata mesti bermula pada 1 tanpa jurang." });
  }

  const assembled = ordered.map((syllable) => syllable.value).join("").normalize("NFC");
  const target = value.targetWord.trim().normalize("NFC");
  if (assembled !== target) {
    ctx.addIssue({
      code: "custom",
      path: ["targetWord"],
      message: "Gabungan suku kata mesti sepadan dengan Perkataan Lengkap.",
    });
  }
});

export type ArrangeSyllablesQuestionValues = z.infer<typeof arrangeSyllablesQuestionSchema>;

export function createEmptySyllable(sequence: number): ArrangeSyllableForm {
  return { id: crypto.randomUUID(), value: "", sequence };
}

export function createEmptyQuestion(sequence: number): ArrangeSyllablesQuestionForm {
  return {
    sequence,
    targetWord: "",
    syllables: [createEmptySyllable(1), createEmptySyllable(2)],
    isPersisted: false,
  };
}

export function duplicateQuestion(question: ArrangeSyllablesQuestionForm, nextSequence: number): ArrangeSyllablesQuestionForm {
  return {
    sequence: nextSequence,
    targetWord: question.targetWord,
    syllables: question.syllables.map((syllable) => ({
      id: crypto.randomUUID(),
      value: syllable.value,
      sequence: syllable.sequence,
    })),
    isPersisted: false,
  };
}

export function isQuestionComplete(question: ArrangeSyllablesQuestionForm): boolean {
  return arrangeSyllablesQuestionSchema.safeParse(question).success;
}

export function getQuestionStatus(question: ArrangeSyllablesQuestionForm): "complete" | "incomplete" {
  return isQuestionComplete(question) ? "complete" : "incomplete";
}

export function normalizeSyllableSequence(syllables: ArrangeSyllableForm[]): ArrangeSyllableForm[] {
  return syllables
    .map((syllable, index) => ({ ...syllable, sequence: index + 1 }))
    .sort((left, right) => left.sequence - right.sequence);
}

export function buildArrangeSyllablesConfiguration(question: ArrangeSyllablesQuestionForm): {
  arrangeSyllables: {
    interactionMode: ArrangeSyllablesInteractionMode;
    targetWord: string;
    syllables: Array<{ id: string; value: string; sequence: number }>;
    showReferenceText: boolean;
    showTargetSlots: boolean;
    shuffleSyllables: boolean;
    allowRetry: boolean;
    clearOnRetry: boolean;
    maximumSyllables: number;
  };
} {
  const orderedSyllables = normalizeSyllableSequence(question.syllables);

  return {
    arrangeSyllables: {
      interactionMode: "DRAG_ORDER",
      targetWord: question.targetWord.trim().normalize("NFC"),
      syllables: orderedSyllables.map((syllable) => ({
        id: syllable.id,
        value: syllable.value.trim().normalize("NFC"),
        sequence: syllable.sequence,
      })),
      showReferenceText: false,
      showTargetSlots: true,
      shuffleSyllables: true,
      allowRetry: true,
      clearOnRetry: false,
      maximumSyllables: ARRANGE_SYLLABLES_MAX_SYLLABLES,
    },
  };
}

export function parseArrangeSyllablesConfiguration(configuration: unknown): {
  targetWord: string;
  syllables: ArrangeSyllableForm[];
} | null {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    return null;
  }

  const record = configuration as Record<string, unknown>;
  const definition = record.arrangeSyllables;
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    return null;
  }

  const arrange = definition as Record<string, unknown>;
  if (typeof arrange.targetWord !== "string" || !Array.isArray(arrange.syllables)) {
    return null;
  }

  const syllables = arrange.syllables
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
      value: typeof entry.value === "string" ? entry.value : "",
      sequence: typeof entry.sequence === "number" ? entry.sequence : 0,
    }))
    .filter((entry) => entry.value.length > 0)
    .sort((left, right) => left.sequence - right.sequence);

  if (syllables.length === 0) {
    return null;
  }

  return {
    targetWord: arrange.targetWord,
    syllables: normalizeSyllableSequence(syllables),
  };
}

export function mapItemDtoToQuestion(item: ArrangeSyllablesItemDto, sequence: number): ArrangeSyllablesQuestionForm {
  const parsed = parseArrangeSyllablesConfiguration(item.configuration);

  return {
    id: item.questionBankItem.id,
    activityItemId: item.id,
    questionBankItemId: item.questionBankItem.id,
    sequence,
    targetWord: parsed?.targetWord ?? item.questionBankItem.content ?? "",
    syllables: parsed?.syllables ?? [],
    isPersisted: true,
  };
}

export function buildQuestionBankItemPayload(question: ArrangeSyllablesQuestionForm, programmeId: string): {
  programmeId: string;
  type: "SYLLABLE";
  content: string;
  difficulty: "EASY";
  answerType: "NONE";
} {
  return {
    programmeId,
    type: "SYLLABLE",
    content: question.targetWord.trim().normalize("NFC"),
    difficulty: "EASY",
    answerType: "NONE",
  };
}

export function buildQuestionBankCurriculumLinkPayload(activity: ArrangeSyllablesActivityDetail): {
  remedialSkillId?: string;
  contentStandardId?: string;
  learningStandardId?: string;
  curriculumYearId?: string;
  isPrimary: boolean;
} {
  const primaryLink = activity.curriculumLinks?.find((link) => link.isPrimary) ?? null;

  return {
    ...(primaryLink?.remedialSkill?.id ? { remedialSkillId: primaryLink.remedialSkill.id } : {}),
    ...(primaryLink?.contentStandard?.id ? { contentStandardId: primaryLink.contentStandard.id } : {}),
    ...(primaryLink?.learningStandard?.id ? { learningStandardId: primaryLink.learningStandard.id } : {}),
    ...(primaryLink?.curriculumYear?.id ? { curriculumYearId: primaryLink.curriculumYear.id } : {}),
    isPrimary: true,
  };
}

export function buildDigitalActivityItemPayload(
  question: ArrangeSyllablesQuestionForm,
  questionBankItemId: string,
): {
  questionBankItemId: string;
  sequence: number;
  isRequired: boolean;
  marks: number;
  configuration: ReturnType<typeof buildArrangeSyllablesConfiguration>;
} {
  return {
    questionBankItemId,
    sequence: question.sequence,
    isRequired: true,
    marks: 1,
    configuration: buildArrangeSyllablesConfiguration(question),
  };
}

export function buildDigitalActivityItemUpdatePayload(question: ArrangeSyllablesQuestionForm): {
  configuration: ReturnType<typeof buildArrangeSyllablesConfiguration>;
} {
  return {
    configuration: buildArrangeSyllablesConfiguration(question),
  };
}

export function getContentSummary(questions: ArrangeSyllablesQuestionForm[]) {
  const complete = questions.filter((question) => isQuestionComplete(question)).length;

  return {
    total: questions.length,
    complete,
    incomplete: questions.length - complete,
  };
}

export function hasValidPersistedContent(questions: ArrangeSyllablesQuestionForm[]): boolean {
  return questions.length >= ARRANGE_SYLLABLES_MIN_ITEMS
    && questions.every((question) => question.isPersisted && isQuestionComplete(question));
}
