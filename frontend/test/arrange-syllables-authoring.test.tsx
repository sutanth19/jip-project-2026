import { describe, expect, it } from "vitest";

import {
  buildArrangeSyllablesConfiguration,
  createEmptyQuestion,
  duplicateQuestion,
  arrangeSyllablesQuestionSchema,
  hasPersistedQuestionIdentity,
  isQuestionDuplicatePendingChange,
  getQuestionChoicePreview,
  getQuestionIncorrectDistractors,
  getQuestionStatus,
  getQuestionStatusLabel,
  mapItemDtoToQuestion,
  reorderQuestionsByIds,
  syncQuestionChoices,
  type ArrangeSyllablesItemDto,
  type ArrangeSyllablesQuestionForm,
} from "@/features/admin/utils/arrange-syllables-content";

function missingSyllableQuestion(): ArrangeSyllablesQuestionForm {
  return {
    localId: "local-1",
    sequence: 1,
    contractMode: "MISSING_SYLLABLES",
    words: [
      {
        id: "word-1",
        text: "bola",
        sequence: 1,
        syllables: [
          { id: "s1", value: "bo", sequence: 1, isMissing: false },
          { id: "s2", value: "la", sequence: 2, isMissing: true },
        ],
      },
      {
        id: "word-2",
        text: "sepak",
        sequence: 2,
        syllables: [
          { id: "s3", value: "se", sequence: 1, isMissing: false },
          { id: "s4", value: "pak", sequence: 2, isMissing: true },
        ],
      },
    ],
    distractors: [
      { id: "d1", value: "ma", sequence: 1 },
      { id: "d2", value: "tik", sequence: 2 },
    ],
    hint: "Cari suku kata hilang.",
    image: null,
    audio: null,
    isPersisted: false,
  };
}

describe("Arrange Syllables authoring contract", () => {
  it("builds the missing-syllable payload for multiple words and blanks", () => {
    const payload = buildArrangeSyllablesConfiguration(missingSyllableQuestion());

    expect(payload.arrangeSyllables.mode).toBe("MISSING_SYLLABLES");
    expect(payload.arrangeSyllables.interactionMode).toBe("DRAG_TO_BLANK");
    expect(payload.arrangeSyllables.words).toHaveLength(2);
    expect(payload.arrangeSyllables.words[0]?.syllables[1]?.isMissing).toBe(true);
    expect(payload.arrangeSyllables.words[1]?.syllables[1]?.isMissing).toBe(true);
    expect(payload.arrangeSyllables.distractors.map((distractor) => distractor.value)).toEqual(["la", "pak", "ma", "tik"]);
    expect(payload.arrangeSyllables.hint).toBe("Cari suku kata hilang.");
  });

  it("keeps editable image and audio references inside the activity configuration", () => {
    const question = {
      ...missingSyllableQuestion(),
      image: {
        mediaKey: "image-1",
        url: "https://example.com/image-1.png",
        mimeType: "image/png",
        originalName: "image-1.png",
        mediaRole: "PRIMARY_IMAGE" as const,
        altText: null,
      },
      audio: {
        mediaKey: "audio-1",
        url: "https://example.com/audio-1.mp3",
        mimeType: "audio/mpeg",
        originalName: "audio-1.mp3",
        mediaRole: "REFERENCE_AUDIO" as const,
        altText: null,
      },
    };

    const payload = buildArrangeSyllablesConfiguration(question);
    const hydrated = mapItemDtoToQuestion({
      id: "item-1",
      sequence: 1,
      sectionKey: null,
      isRequired: true,
      marks: 1,
      configuration: payload,
      questionBankItem: {
        id: "qb-1",
        type: "SYLLABLE",
        title: "BOLA SEPAK",
        content: "bola sepak",
        answerType: "NONE",
        correctAnswer: null,
        difficulty: "EASY",
        status: "ACTIVE",
        programmeId: "programme-1",
        mediaLinks: [],
      },
    }, 1);

    expect(payload.arrangeSyllables.media?.image?.mediaKey).toBe("image-1");
    expect(payload.arrangeSyllables.media?.audio?.mediaKey).toBe("audio-1");
    expect(hydrated.image?.mediaKey).toBe("image-1");
    expect(hydrated.audio?.mediaKey).toBe("audio-1");
  });

  it("duplicates nested IDs for a fresh editable copy", () => {
    const original = missingSyllableQuestion();
    const duplicate = duplicateQuestion(original, 2);

    expect(duplicate.localId).not.toBe(original.localId);
    expect(duplicate.words[0]?.id).not.toBe(original.words[0]?.id);
    expect(duplicate.words[0]?.syllables[0]?.id).not.toBe(original.words[0]?.syllables[0]?.id);
    expect(duplicate.distractors[0]?.id).not.toBe(original.distractors[0]?.id);
    expect(duplicate.isPersisted).toBe(false);
    expect(duplicate.words[0]?.syllables[0]?.value).toBe("bo");
    expect(duplicate.duplicatedFromNormalizedContent).toBe("bo + ____ se + ____");
    expect(isQuestionDuplicatePendingChange(duplicate)).toBe(false);
    expect(getQuestionStatus(duplicate)).toBe("complete");
    expect(getQuestionStatusLabel(duplicate)).toBe("Lengkap");
  });

  it("releases the duplicate blocker once the copied question meaningfully changes", () => {
    const duplicate = duplicateQuestion(missingSyllableQuestion(), 2);
    duplicate.words[0]!.syllables[0]!.value = "ba";

    expect(isQuestionDuplicatePendingChange(duplicate)).toBe(false);
    expect(getQuestionStatus(duplicate)).toBe("incomplete");
    expect(getQuestionStatusLabel(duplicate)).toBe("Belum Lengkap");
  });

  it("treats persisted question-bank and activity IDs as the real update identity", () => {
    const persistedButFlaggedFalse: ArrangeSyllablesQuestionForm = {
      ...missingSyllableQuestion(),
      isPersisted: false,
      questionBankItemId: "qb-1",
      activityItemId: "item-1",
    };

    expect(hasPersistedQuestionIdentity(persistedButFlaggedFalse)).toBe(true);
    expect(hasPersistedQuestionIdentity({
      ...persistedButFlaggedFalse,
      questionBankItemId: undefined,
    })).toBe(false);
    expect(hasPersistedQuestionIdentity({
      ...persistedButFlaggedFalse,
      activityItemId: undefined,
    })).toBe(false);
  });

  it("keeps legacy ordered questions readable on hydration while the new contract is still explicit", () => {
    const item: ArrangeSyllablesItemDto = {
      id: "item-1",
      sequence: 1,
      sectionKey: null,
      isRequired: true,
      marks: 1,
      configuration: {
        arrangeSyllables: {
          interactionMode: "CLICK_ORDER",
          targetWord: "BAJU",
          syllables: [
            { id: "b1", value: "BA", sequence: 1 },
            { id: "j1", value: "JU", sequence: 2 },
          ],
          showReferenceText: false,
          showTargetSlots: true,
          shuffleSyllables: true,
          allowRetry: true,
          clearOnRetry: false,
          maximumSyllables: 10,
        },
      },
      questionBankItem: {
        id: "qb-1",
        type: "SYLLABLE",
        title: "BAJU",
        content: "BAJU",
        answerType: "NONE",
        correctAnswer: null,
        difficulty: "EASY",
        status: "ACTIVE",
        programmeId: "programme-1",
        mediaLinks: [],
      },
    };

    const question = mapItemDtoToQuestion(item, 1);

    expect(question.contractMode).toBe("ORDERED_RECONSTRUCTION");
    expect(question.words[0]?.syllables.map((syllable) => syllable.value)).toEqual(["BA", "JU"]);
  });

  it("rejects duplicate nested IDs in the authoring form", () => {
    const question = missingSyllableQuestion();
    question.words[1]!.syllables[1]!.id = question.words[0]!.syllables[0]!.id;

    expect(arrangeSyllablesQuestionSchema.safeParse(question).success).toBe(false);
  });

  it("creates a new editable question with default blanks and choices", () => {
    const question = createEmptyQuestion(1);

    expect(question.contractMode).toBe("MISSING_SYLLABLES");
    expect(question.words).toHaveLength(1);
    expect(question.distractors).toHaveLength(0);
    expect(question.words[0]?.syllables.some((syllable) => syllable.isMissing)).toBe(true);
  });

  it("keeps correct missing syllables in the persisted choice bank while exposing only wrong distractors for editing", () => {
    const question = syncQuestionChoices(missingSyllableQuestion());

    expect(question.distractors.map((distractor) => distractor.value)).toEqual(["ma", "tik"]);
    expect(getQuestionIncorrectDistractors(question).map((distractor) => distractor.value)).toEqual(["ma", "tik"]);
  });

  it("allows zero distractors in the editor without recreating fields automatically", () => {
    const question = missingSyllableQuestion();
    question.distractors = [];

    expect(arrangeSyllablesQuestionSchema.safeParse(question).success).toBe(true);
    expect(syncQuestionChoices(question).distractors).toHaveLength(0);
    expect(getQuestionChoicePreview(question).map((choice) => choice.value)).toEqual(["la", "pak"]);
  });

  it("persists derived correct answers plus only the remaining distractors after deletion", () => {
    const question = missingSyllableQuestion();
    question.distractors = [
      { id: "d1", value: "ma", sequence: 1 },
      { id: "d2", value: "tik", sequence: 2 },
      { id: "d3", value: "ra", sequence: 3 },
    ];

    const afterDelete = {
      ...question,
      distractors: [
        { id: "d1", value: "ma", sequence: 1 },
        { id: "d3", value: "ra", sequence: 2 },
      ],
    };

    expect(syncQuestionChoices(afterDelete).distractors.map((distractor) => distractor.value)).toEqual(["ma", "ra"]);
    expect(buildArrangeSyllablesConfiguration(afterDelete).arrangeSyllables.distractors.map((distractor) => distractor.value)).toEqual(["la", "pak", "ma", "ra"]);
  });

  it("strips derived correct answers back out when hydrating persisted content after refresh", () => {
    const item: ArrangeSyllablesItemDto = {
      id: "item-2",
      sequence: 1,
      sectionKey: null,
      isRequired: true,
      marks: 1,
      configuration: {
        arrangeSyllables: {
          mode: "MISSING_SYLLABLES",
          interactionMode: "DRAG_TO_BLANK",
          words: [
            {
              id: "word-1",
              sequence: 1,
              syllables: [
                { id: "syllable-1", value: "bo", sequence: 1, isMissing: false },
                { id: "syllable-2", value: "la", sequence: 2, isMissing: true },
              ],
            },
          ],
          distractors: [
            { id: "choice-1", value: "la", sequence: 1 },
            { id: "choice-2", value: "ma", sequence: 2 },
          ],
          hint: null,
          showReferenceText: false,
          allowRetry: true,
          clearOnRetry: false,
          maximumSyllables: 10,
        },
      },
      questionBankItem: {
        id: "qb-2",
        type: "SYLLABLE",
        title: "BOLA",
        content: "BO + ____",
        answerType: "NONE",
        correctAnswer: null,
        difficulty: "EASY",
        status: "ACTIVE",
        programmeId: "programme-1",
        mediaLinks: [],
      },
    };

    const question = mapItemDtoToQuestion(item, 1);

    expect(question.distractors.map((distractor) => distractor.value)).toEqual(["ma"]);
    expect(getQuestionChoicePreview(question).map((choice) => choice.value)).toEqual(["la", "ma"]);
  });

  it("reorders questions by stable local ID without duplicating entries", () => {
    const first = missingSyllableQuestion();
    const second = {
      ...missingSyllableQuestion(),
      localId: "local-2",
      sequence: 1,
      words: [{
        ...missingSyllableQuestion().words[0]!,
        id: "word-9",
        text: "cawan",
        sequence: 1,
        syllables: [
          { id: "cw-1", value: "ca", sequence: 1, isMissing: false },
          { id: "cw-2", value: "wan", sequence: 2, isMissing: true },
        ],
      }],
    };
    const third = {
      ...missingSyllableQuestion(),
      localId: "local-3",
      sequence: 2,
    };

    const reordered = reorderQuestionsByIds([first, second, third], "local-3", "local-1");

    expect(reordered.map((question) => question.localId)).toEqual(["local-3", "local-1", "local-2"]);
    expect(reordered.map((question) => question.sequence)).toEqual([0, 1, 2]);
    expect(new Set(reordered.map((question) => question.localId)).size).toBe(3);
  });
});
