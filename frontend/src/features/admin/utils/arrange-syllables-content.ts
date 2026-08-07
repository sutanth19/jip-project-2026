import { z } from "zod";

export const ARRANGE_SYLLABLES_MAX_SYLLABLES = 10;
export const ARRANGE_SYLLABLES_MAX_WORDS = 6;
export const ARRANGE_SYLLABLES_MAX_DISTRACTORS = 12;
export const ARRANGE_SYLLABLES_MIN_WORDS = 1;
export const ARRANGE_SYLLABLES_MIN_SYLLABLES_PER_WORD = 1;
export const ARRANGE_SYLLABLES_MIN_ITEMS = 1;

export type ArrangeSyllablesInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH" | "DRAG_TO_BLANK";
export type ArrangeSyllablesContractMode = "ORDERED_RECONSTRUCTION" | "MISSING_SYLLABLES";
export type ArrangeSyllablesMediaRole = "PRIMARY_IMAGE" | "REFERENCE_AUDIO";

export type ArrangeSyllablesSyllableForm = {
  id: string;
  value: string;
  sequence: number;
  isMissing: boolean;
};

export type ArrangeSyllablesWordForm = {
  id: string;
  text: string;
  sequence: number;
  syllables: ArrangeSyllablesSyllableForm[];
};

export type ArrangeSyllablesDistractorForm = {
  id: string;
  value: string;
  sequence: number;
};

export type ArrangeSyllablesMediaForm = {
  mediaKey: string;
  url: string;
  mimeType: string | null;
  originalName: string | null;
  mediaRole: ArrangeSyllablesMediaRole;
  altText: string | null;
  mediaLinkId?: string;
};

export type ArrangeSyllablesConfigurationMedia = {
  mediaKey: string;
  url: string;
  mimeType: string | null;
  originalName: string | null;
  mediaRole: ArrangeSyllablesMediaRole;
  altText: string | null;
};

export type ArrangeSyllablesQuestionForm = {
  localId: string;
  id?: string;
  activityItemId?: string;
  questionBankItemId?: string;
  sequence: number;
  contractMode: ArrangeSyllablesContractMode;
  words: ArrangeSyllablesWordForm[];
  distractors: ArrangeSyllablesDistractorForm[];
  hint: string;
  image: ArrangeSyllablesMediaForm | null;
  audio: ArrangeSyllablesMediaForm | null;
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

export function hasPersistedQuestionIdentity(question: ArrangeSyllablesQuestionForm): boolean {
  return Boolean(question.questionBankItemId && question.activityItemId);
}

const syllableSchema = z.object({
  id: z.string().min(1),
  value: z.string().trim().min(1, "Suku kata tidak boleh kosong.").max(500, "Suku kata terlalu panjang."),
  sequence: z.number().int().min(1).max(ARRANGE_SYLLABLES_MAX_SYLLABLES),
  isMissing: z.boolean(),
});

const wordSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1, "Masukkan perkataan.").max(500, "Perkataan terlalu panjang."),
  sequence: z.number().int().min(1).max(ARRANGE_SYLLABLES_MAX_WORDS),
  syllables: z.array(syllableSchema)
    .min(ARRANGE_SYLLABLES_MIN_SYLLABLES_PER_WORD, "Bahagikan perkataan ini kepada suku kata.")
    .max(ARRANGE_SYLLABLES_MAX_SYLLABLES, "Terlalu banyak suku kata ditambah pada perkataan ini."),
});

const distractorSchema = z.object({
  id: z.string().min(1),
  value: z.string().trim().min(1, "Pilihan tidak boleh kosong.").max(500, "Pilihan terlalu panjang."),
  sequence: z.number().int().min(1).max(ARRANGE_SYLLABLES_MAX_DISTRACTORS),
});

const mediaSchema = z.object({
  mediaKey: z.string().trim().min(1),
  url: z.string().trim().url(),
  mimeType: z.string().trim().min(1).nullable(),
  originalName: z.string().trim().min(1).nullable(),
  mediaRole: z.enum(["PRIMARY_IMAGE", "REFERENCE_AUDIO"]),
  altText: z.string().trim().max(1_000).nullable(),
  mediaLinkId: z.string().optional(),
});

export const arrangeSyllablesQuestionSchema = z.object({
  localId: z.string().min(1),
  id: z.string().optional(),
  activityItemId: z.string().optional(),
  questionBankItemId: z.string().optional(),
  sequence: z.number().int().min(0),
  contractMode: z.enum(["ORDERED_RECONSTRUCTION", "MISSING_SYLLABLES"]),
  words: z.array(wordSchema)
    .min(ARRANGE_SYLLABLES_MIN_WORDS, "Tambah sekurang-kurangnya satu perkataan.")
    .max(ARRANGE_SYLLABLES_MAX_WORDS, "Terlalu banyak perkataan ditambah."),
  distractors: z.array(distractorSchema)
    .max(ARRANGE_SYLLABLES_MAX_DISTRACTORS, "Terlalu banyak pilihan ditambah."),
  hint: z.string().trim().max(1_000, "Petunjuk terlalu panjang."),
  image: mediaSchema.nullable(),
  audio: mediaSchema.nullable(),
  isPersisted: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.contractMode === "ORDERED_RECONSTRUCTION") {
    ctx.addIssue({
      code: "custom",
      path: ["words"],
      message: "Soalan lama susun penuh tidak boleh diedit menggunakan borang pengarang suku kata hilang.",
    });
    return;
  }

  const wordIds = value.words.map((word) => word.id);
  if (new Set(wordIds).size !== wordIds.length) {
    ctx.addIssue({ code: "custom", path: ["words"], message: "Setiap perkataan mesti mempunyai ID unik." });
  }

  const wordSequences = value.words.map((word) => word.sequence);
  if (new Set(wordSequences).size !== wordSequences.length) {
    ctx.addIssue({ code: "custom", path: ["words"], message: "Setiap perkataan mesti mempunyai turutan unik." });
  }

  const normalizedWords = normalizeWordSequence(value.words);
  if (normalizedWords.some((word, index) => word.sequence !== index + 1)) {
    ctx.addIssue({ code: "custom", path: ["words"], message: "Turutan perkataan mesti bermula pada 1 tanpa jurang." });
  }

  for (const [wordIndex, word] of normalizedWords.entries()) {
    const joinedWord = normalizeWordValue(word.syllables.map((syllable) => syllable.value).join(""));
    const sourceWord = normalizeWordValue(word.text);

    if (!sourceWord) {
      ctx.addIssue({ code: "custom", path: ["words", wordIndex, "text"], message: "Masukkan perkataan." });
    }

    if (sourceWord && joinedWord && sourceWord !== joinedWord) {
      ctx.addIssue({
        code: "custom",
        path: ["words", wordIndex, "syllables"],
        message: "Gabungan suku kata mesti membentuk perkataan ini.",
      });
    }
  }

  const allSyllables = normalizedWords.flatMap((word) => normalizeSyllableSequence(word.syllables));
  if (allSyllables.length === 0 || allSyllables.length > ARRANGE_SYLLABLES_MAX_SYLLABLES) {
    ctx.addIssue({ code: "custom", path: ["words"], message: `Soalan mesti mengandungi antara 1 hingga ${ARRANGE_SYLLABLES_MAX_SYLLABLES} jumlah suku kata.` });
  }

  const syllableIds = allSyllables.map((syllable) => syllable.id);
  if (new Set(syllableIds).size !== syllableIds.length) {
    ctx.addIssue({ code: "custom", path: ["words"], message: "Setiap suku kata mesti mempunyai ID unik dalam keseluruhan soalan." });
  }

  const missingSyllables = allSyllables.filter((syllable) => syllable.isMissing);
  if (missingSyllables.length === 0) {
    ctx.addIssue({ code: "custom", path: ["words"], message: "Pilih sekurang-kurangnya satu suku kata sebagai Hilang." });
  }

  const distractorIds = value.distractors.map((distractor) => distractor.id);
  if (new Set(distractorIds).size !== distractorIds.length) {
    ctx.addIssue({ code: "custom", path: ["distractors"], message: "Setiap pilihan mesti mempunyai ID unik." });
  }

  const distractorSequences = value.distractors.map((distractor) => distractor.sequence);
  if (new Set(distractorSequences).size !== distractorSequences.length) {
    ctx.addIssue({ code: "custom", path: ["distractors"], message: "Setiap pilihan mesti mempunyai turutan unik." });
  }

  const normalizedDistractors = normalizeDistractorSequence(value.distractors);
  const seenDistractors = new Map<string, number>();

  for (const [index, distractor] of normalizedDistractors.entries()) {
    const normalized = distractor.value.trim().normalize("NFC");
    if (!normalized) {
      continue;
    }

    if (seenDistractors.has(normalized)) {
      ctx.addIssue({
        code: "custom",
        path: ["distractors", index, "value"],
        message: "Pilihan ini telah ditambah.",
      });
      continue;
    }

    seenDistractors.set(normalized, index);
  }
});

export type ArrangeSyllablesQuestionValues = z.infer<typeof arrangeSyllablesQuestionSchema>;

type ParsedArrangeSyllablesConfiguration = {
  contractMode: ArrangeSyllablesContractMode;
  words: ArrangeSyllablesWordForm[];
  distractors: ArrangeSyllablesDistractorForm[];
  hint: string;
  media: {
    image: ArrangeSyllablesConfigurationMedia | null;
    audio: ArrangeSyllablesConfigurationMedia | null;
  };
};

function mediaFromDto(
  mediaLinks: ArrangeSyllablesItemDto["questionBankItem"]["mediaLinks"],
  mediaRole: ArrangeSyllablesMediaRole,
): ArrangeSyllablesMediaForm | null {
  const media = mediaLinks.find((entry) => entry.mediaRole === mediaRole);
  if (!media) return null;
  return {
    mediaKey: media.mediaKey,
    url: media.url,
    mimeType: media.mimeType,
    originalName: media.originalName,
    mediaRole,
    altText: media.altText,
    mediaLinkId: media.id,
  };
}

function mediaToConfiguration(media: ArrangeSyllablesMediaForm | null): ArrangeSyllablesConfigurationMedia | null {
  if (!media) return null;
  return {
    mediaKey: media.mediaKey,
    url: media.url,
    mimeType: media.mimeType,
    originalName: media.originalName,
    mediaRole: media.mediaRole,
    altText: media.altText,
  };
}

function mediaFromConfiguration(media: ArrangeSyllablesConfigurationMedia | null | undefined): ArrangeSyllablesMediaForm | null {
  if (!media) return null;
  return {
    mediaKey: media.mediaKey,
    url: media.url,
    mimeType: media.mimeType,
    originalName: media.originalName,
    mediaRole: media.mediaRole,
    altText: media.altText,
  };
}

function parseMediaAsset(value: unknown): ArrangeSyllablesConfigurationMedia | null {
  const media = parseRecord(value);
  if (!media || typeof media.mediaKey !== "string" || typeof media.url !== "string" || typeof media.mediaRole !== "string") return null;
  if (media.mediaRole !== "PRIMARY_IMAGE" && media.mediaRole !== "REFERENCE_AUDIO") return null;
  const mediaRole: ArrangeSyllablesMediaRole = media.mediaRole;
  return {
    mediaKey: media.mediaKey,
    url: media.url,
    mimeType: typeof media.mimeType === "string" || media.mimeType === null ? media.mimeType : null,
    originalName: typeof media.originalName === "string" || media.originalName === null ? media.originalName : null,
    mediaRole,
    altText: typeof media.altText === "string" || media.altText === null ? media.altText : null,
  };
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseWords(value: unknown): ArrangeSyllablesWordForm[] | null {
  if (!Array.isArray(value)) return null;
  const words = value
    .map((entry) => {
      const word = parseRecord(entry);
      if (!word || typeof word.id !== "string" || typeof word.sequence !== "number" || !Array.isArray(word.syllables)) {
        return null;
      }
      const syllables = word.syllables
        .map((syllableEntry) => {
          const syllable = parseRecord(syllableEntry);
          if (!syllable || typeof syllable.id !== "string" || typeof syllable.value !== "string" || typeof syllable.sequence !== "number" || typeof syllable.isMissing !== "boolean") {
            return null;
          }
          return {
            id: syllable.id,
            value: syllable.value,
            sequence: syllable.sequence,
            isMissing: syllable.isMissing,
          } satisfies ArrangeSyllablesSyllableForm;
        })
        .filter((syllable): syllable is ArrangeSyllablesSyllableForm => syllable !== null);
      if (syllables.length === 0) return null;
      return {
        id: word.id,
        text: syllables.map((syllable) => syllable.value).join(""),
        sequence: word.sequence,
        syllables: normalizeSyllableSequence(syllables),
      } satisfies ArrangeSyllablesWordForm;
    })
    .filter((word): word is ArrangeSyllablesWordForm => word !== null);

  return words.length > 0 ? normalizeWordSequence(words) : null;
}

function parseDistractors(value: unknown): ArrangeSyllablesDistractorForm[] {
  if (!Array.isArray(value)) return [];
  return normalizeDistractorSequence(
    value
      .map((entry) => {
        const distractor = parseRecord(entry);
        if (!distractor || typeof distractor.id !== "string" || typeof distractor.value !== "string" || typeof distractor.sequence !== "number") {
          return null;
        }
        return {
          id: distractor.id,
          value: distractor.value,
          sequence: distractor.sequence,
        } satisfies ArrangeSyllablesDistractorForm;
      })
      .filter((distractor): distractor is ArrangeSyllablesDistractorForm => distractor !== null),
  );
}

function stripDerivedCorrectDistractors(
  words: ArrangeSyllablesWordForm[],
  distractors: ArrangeSyllablesDistractorForm[],
): ArrangeSyllablesDistractorForm[] {
  const missingCounts = new Map<string, number>();

  for (const syllable of words.flatMap((word) => normalizeSyllableSequence(word.syllables)).filter((entry) => entry.isMissing)) {
    const normalized = syllable.value.trim().normalize("NFC");
    if (!normalized) continue;
    missingCounts.set(normalized, (missingCounts.get(normalized) ?? 0) + 1);
  }

  return normalizeDistractorSequence(distractors).filter((distractor) => {
    const normalized = distractor.value.trim().normalize("NFC");
    if (!normalized) {
      return true;
    }

    const remaining = missingCounts.get(normalized) ?? 0;
    if (remaining > 0) {
      missingCounts.set(normalized, remaining - 1);
      return false;
    }

    return true;
  });
}

export function createEmptySyllable(sequence: number, isMissing = false): ArrangeSyllablesSyllableForm {
  return { id: crypto.randomUUID(), value: "", sequence, isMissing };
}

export function createEmptyWord(sequence: number): ArrangeSyllablesWordForm {
  return {
    id: crypto.randomUUID(),
    text: "",
    sequence,
    syllables: [
      createEmptySyllable(1, false),
      createEmptySyllable(2, true),
    ],
  };
}

export function createEmptyDistractor(sequence: number): ArrangeSyllablesDistractorForm {
  return { id: crypto.randomUUID(), value: "", sequence };
}

export function createEmptyQuestion(sequence: number): ArrangeSyllablesQuestionForm {
  return {
    localId: crypto.randomUUID(),
    sequence,
    contractMode: "MISSING_SYLLABLES",
    words: [createEmptyWord(1)],
    distractors: [],
    hint: "",
    image: null,
    audio: null,
    isPersisted: false,
  };
}

export function duplicateQuestion(question: ArrangeSyllablesQuestionForm, nextSequence: number): ArrangeSyllablesQuestionForm {
  return {
    ...question,
    localId: crypto.randomUUID(),
    id: undefined,
    activityItemId: undefined,
    questionBankItemId: undefined,
    sequence: nextSequence,
    contractMode: question.contractMode,
    words: question.words.map((word, wordIndex) => ({
      id: crypto.randomUUID(),
      text: word.text,
      sequence: wordIndex + 1,
      syllables: word.syllables.map((syllable, syllableIndex) => ({
        id: crypto.randomUUID(),
        value: syllable.value,
        sequence: syllableIndex + 1,
        isMissing: syllable.isMissing,
      })),
    })),
    distractors: question.distractors.map((distractor, distractorIndex) => ({
      id: crypto.randomUUID(),
      value: distractor.value,
      sequence: distractorIndex + 1,
    })),
    image: question.image ? { ...question.image, mediaLinkId: undefined } : null,
    audio: question.audio ? { ...question.audio, mediaLinkId: undefined } : null,
    isPersisted: false,
  };
}

export function normalizeSyllableSequence(syllables: ArrangeSyllablesSyllableForm[]): ArrangeSyllablesSyllableForm[] {
  return [...syllables]
    .sort((left, right) => left.sequence - right.sequence)
    .map((syllable, index) => ({ ...syllable, sequence: index + 1 }));
}

export function normalizeWordSequence(words: ArrangeSyllablesWordForm[]): ArrangeSyllablesWordForm[] {
  return [...words]
    .sort((left, right) => left.sequence - right.sequence)
    .map((word, index) => ({
      ...word,
      text: word.text,
      sequence: index + 1,
      syllables: normalizeSyllableSequence(word.syllables),
    }));
}

export function normalizeDistractorSequence(distractors: ArrangeSyllablesDistractorForm[]): ArrangeSyllablesDistractorForm[] {
  return [...distractors]
    .sort((left, right) => left.sequence - right.sequence)
    .map((distractor, index) => ({ ...distractor, sequence: index + 1 }));
}

function normalizeWordValue(value: string): string {
  return value.trim().replace(/\s+/g, "").normalize("NFC").toUpperCase();
}

export function getWordDisplayValue(word: ArrangeSyllablesWordForm): string {
  return word.text.trim();
}

export function getQuestionWordSummary(question: ArrangeSyllablesQuestionForm): string {
  return normalizeWordSequence(question.words)
    .map((word) => getWordDisplayValue(word))
    .filter(Boolean)
    .join(" ");
}

export function getQuestionIncorrectDistractors(question: ArrangeSyllablesQuestionForm): ArrangeSyllablesDistractorForm[] {
  return normalizeDistractorSequence(question.distractors);
}

export function syncQuestionChoices(question: ArrangeSyllablesQuestionForm): ArrangeSyllablesQuestionForm {
  return {
    ...question,
    distractors: normalizeDistractorSequence(question.distractors),
  };
}

export function getQuestionChoicePreview(question: ArrangeSyllablesQuestionForm): ArrangeSyllablesDistractorForm[] {
  const correctChoices = getMissingSyllables(question).map((syllable, index) => ({
    id: `derived-correct-${index + 1}-${syllable.id}`,
    value: syllable.value,
    sequence: index + 1,
  }));

  const distractors = normalizeDistractorSequence(question.distractors).map((distractor, index) => ({
    ...distractor,
    sequence: correctChoices.length + index + 1,
  }));

  return [...correctChoices, ...distractors];
}

export function reorderQuestionsByIds(
  questions: ArrangeSyllablesQuestionForm[],
  activeQuestionId: string,
  overQuestionId: string,
): ArrangeSyllablesQuestionForm[] {
  const activeIndex = questions.findIndex((question) => question.localId === activeQuestionId);
  const overIndex = questions.findIndex((question) => question.localId === overQuestionId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return questions;
  }

  const reordered = [...questions];
  const [moved] = reordered.splice(activeIndex, 1);
  if (!moved) {
    return questions;
  }
  reordered.splice(overIndex, 0, moved);

  return reordered.map((question, sequence) => ({
    ...question,
    sequence,
  }));
}

export function getQuestionStructurePreview(question: ArrangeSyllablesQuestionForm): string {
  return normalizeWordSequence(question.words)
    .map((word) => normalizeSyllableSequence(word.syllables)
      .map((syllable) => (syllable.isMissing ? "____" : syllable.value.trim()))
      .join(" + "))
    .join("    ");
}

export function getQuestionAnswerPreview(question: ArrangeSyllablesQuestionForm): string {
  return normalizeWordSequence(question.words)
    .map((word) => normalizeSyllableSequence(word.syllables).map((syllable) => syllable.value.trim()).join(""))
    .join(" ");
}

export function getMissingSyllables(question: ArrangeSyllablesQuestionForm): ArrangeSyllablesSyllableForm[] {
  return normalizeWordSequence(question.words)
    .flatMap((word) => normalizeSyllableSequence(word.syllables))
    .filter((syllable) => syllable.isMissing);
}

export function isQuestionComplete(question: ArrangeSyllablesQuestionForm): boolean {
  return arrangeSyllablesQuestionSchema.safeParse(question).success;
}

export function getQuestionStatus(question: ArrangeSyllablesQuestionForm): "complete" | "incomplete" {
  return isQuestionComplete(question) ? "complete" : "incomplete";
}

export function buildArrangeSyllablesConfiguration(question: ArrangeSyllablesQuestionForm): {
  arrangeSyllables: {
    mode: "MISSING_SYLLABLES";
    interactionMode: "DRAG_TO_BLANK";
    words: Array<{
      id: string;
      sequence: number;
      syllables: Array<{
        id: string;
        value: string;
        sequence: number;
        isMissing: boolean;
      }>;
    }>;
    distractors: Array<{
      id: string;
      value: string;
      sequence: number;
    }>;
    hint: string | null;
    media: {
      image: ArrangeSyllablesConfigurationMedia | null;
      audio: ArrangeSyllablesConfigurationMedia | null;
    };
    showReferenceText: boolean;
    allowRetry: boolean;
    clearOnRetry: boolean;
    maximumSyllables: number;
  } | {
    mode: "ORDERED_RECONSTRUCTION";
    interactionMode: "CLICK_ORDER" | "DRAG_ORDER" | "BOTH";
    targetWord: string;
    syllables: Array<{
      id: string;
      value: string;
      sequence: number;
    }>;
    showReferenceText: boolean;
    showTargetSlots: boolean;
    shuffleSyllables: boolean;
    allowRetry: boolean;
    clearOnRetry: boolean;
    maximumSyllables: number;
  };
} {
  const words = normalizeWordSequence(question.words).map((word) => ({
    id: word.id,
    sequence: word.sequence,
    syllables: normalizeSyllableSequence(word.syllables).map((syllable) => ({
      id: syllable.id,
      value: syllable.value.trim().normalize("NFC"),
      sequence: syllable.sequence,
      isMissing: syllable.isMissing,
    })),
  }));

  return {
    arrangeSyllables: {
      mode: "MISSING_SYLLABLES",
      interactionMode: "DRAG_TO_BLANK",
      words,
      distractors: getQuestionChoicePreview(question).map((distractor) => ({
        id: distractor.id,
        value: distractor.value.trim().normalize("NFC"),
        sequence: distractor.sequence,
      })),
      hint: question.hint.trim() ? question.hint.trim().normalize("NFC") : null,
      media: {
        image: mediaToConfiguration(question.image),
        audio: mediaToConfiguration(question.audio),
      },
      showReferenceText: false,
      allowRetry: true,
      clearOnRetry: false,
      maximumSyllables: ARRANGE_SYLLABLES_MAX_SYLLABLES,
    },
  };
}

export function parseArrangeSyllablesConfiguration(configuration: unknown): ParsedArrangeSyllablesConfiguration | null {
  const record = parseRecord(configuration);
  const definition = record ? parseRecord(record.arrangeSyllables) : null;
  if (!definition) return null;

  if (definition.mode === "MISSING_SYLLABLES" || Array.isArray(definition.words)) {
    const words = parseWords(definition.words);
    if (!words) return null;
    const media = parseRecord(definition.media);
    return {
      contractMode: "MISSING_SYLLABLES",
      words,
      distractors: stripDerivedCorrectDistractors(words, parseDistractors(definition.distractors)),
      hint: typeof definition.hint === "string" ? definition.hint : "",
      media: {
        image: mediaFromConfiguration(parseMediaAsset(media?.image)),
        audio: mediaFromConfiguration(parseMediaAsset(media?.audio)),
      },
    };
  }

  if (typeof definition.targetWord === "string" && Array.isArray(definition.syllables)) {
    const syllables = definition.syllables.reduce<ArrangeSyllablesSyllableForm[]>((result, entry) => {
        const syllable = parseRecord(entry);
        if (!syllable || typeof syllable.id !== "string" || typeof syllable.value !== "string" || typeof syllable.sequence !== "number") {
          return result;
        }
        result.push({
          id: syllable.id,
          value: syllable.value,
          sequence: syllable.sequence,
          isMissing: false,
        });
        return result;
      }, []);

    if (syllables.length === 0) return null;

    return {
      contractMode: "ORDERED_RECONSTRUCTION",
      words: [{
        id: crypto.randomUUID(),
        text: typeof definition.targetWord === "string" ? definition.targetWord : syllables.map((syllable) => syllable.value).join(""),
        sequence: 1,
        syllables: normalizeSyllableSequence(syllables),
      }],
      distractors: [],
      hint: "",
      media: { image: null, audio: null },
    };
  }

  return null;
}

export function mapItemDtoToQuestion(item: ArrangeSyllablesItemDto, sequence: number): ArrangeSyllablesQuestionForm {
  const parsed = parseArrangeSyllablesConfiguration(item.configuration);

  return {
    localId: item.questionBankItem.id,
    id: item.questionBankItem.id,
    activityItemId: item.id,
    questionBankItemId: item.questionBankItem.id,
    sequence,
    contractMode: parsed?.contractMode ?? "MISSING_SYLLABLES",
    words: parsed?.words ?? [createEmptyWord(1)],
    distractors: parsed?.distractors ?? [],
    hint: parsed?.hint ?? "",
    image: parsed?.media?.image ?? mediaFromDto(item.questionBankItem.mediaLinks, "PRIMARY_IMAGE"),
    audio: parsed?.media?.audio ?? mediaFromDto(item.questionBankItem.mediaLinks, "REFERENCE_AUDIO"),
    isPersisted: true,
  };
}

export function buildQuestionBankItemContent(question: ArrangeSyllablesQuestionForm): string {
  return getQuestionStructurePreview(question);
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
    content: buildQuestionBankItemContent(question),
    difficulty: "EASY",
    answerType: "NONE",
  };
}

export function buildQuestionBankItemUpdatePayload(question: ArrangeSyllablesQuestionForm): {
  content: string;
  difficulty: "EASY";
  answerType: "NONE";
} {
  return {
    content: buildQuestionBankItemContent(question),
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
  const totalWords = questions.reduce((count, question) => count + question.words.length, 0);
  const totalBlanks = questions.reduce((count, question) => count + getMissingSyllables(question).length, 0);

  return {
    total: questions.length,
    complete,
    incomplete: questions.length - complete,
    totalWords,
    totalBlanks,
  };
}

export function hasValidPersistedContent(questions: ArrangeSyllablesQuestionForm[]): boolean {
  return questions.length >= ARRANGE_SYLLABLES_MIN_ITEMS
    && questions.every((question) => question.isPersisted && isQuestionComplete(question));
}
