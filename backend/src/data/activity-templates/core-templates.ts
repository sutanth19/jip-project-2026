import {
  ActivityTemplateCategory,
  AssessmentMode,
  QuestionBankItemType,
} from "@prisma/client";

import type { SafeJsonObject } from "../../utils/safe-json-schema.js";

export interface CoreActivityTemplate {
  code: string;
  name: string;
  description: string;
  category: ActivityTemplateCategory;
  assessmentMode: AssessmentMode;
  requiresTeacherReview: boolean;
  supportsAutoMarking: boolean;
  supportsMedia: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  supportsDrawing: boolean;
  supportsVoiceRecording: boolean;
  supportsFutureAI: boolean;
  rendererKey: string;
  configurationSchema: SafeJsonObject;
  contentSchema: SafeJsonObject;
  acceptedItemTypes: Array<{
    itemType: QuestionBankItemType;
    isRequired: boolean;
    minimumItems?: number;
    maximumItems?: number;
  }>;
}

function configuration(properties: SafeJsonObject, required: string[] = []): SafeJsonObject {
  return {
    type: "object",
    title: "Activity configuration",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function accepted(itemTypes: QuestionBankItemType[], minimumItems: number): CoreActivityTemplate["acceptedItemTypes"] {
  return itemTypes.map((itemType) => ({ itemType, isRequired: true, minimumItems }));
}

const contentSchema: SafeJsonObject = {
  type: "object",
  title: "Question bank content",
  properties: {
    items: { type: "array", minLength: 1, items: { type: "string", minLength: 1 } },
  },
  required: ["items"],
};

const readingContentSchema: SafeJsonObject = {
  type: "object",
  title: "Reading item configuration",
  properties: {
    reading: {
      type: "object",
      properties: {
        contentMode: { type: "string", enum: ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE", "PARAGRAPH"] },
        title: { type: "string", maxLength: 200 },
        readingText: { type: "string", minLength: 1, maxLength: 5_000 },
        paragraphs: { type: "array", minLength: 1, items: { type: "object", properties: { id: { type: "string", minLength: 1, maxLength: 100 }, sequence: { type: "number", minimum: 1, maximum: 100 }, text: { type: "string", minLength: 1, maxLength: 5_000 } }, required: ["id", "sequence", "text"] } },
        readingDirection: { type: "string", enum: ["LEFT_TO_RIGHT"] },
        display: { type: "object", description: "Explicit safe guided-reading display settings." },
        syllableUnits: { type: "array", description: "Required only when display.showSyllableBreaks is true; never inferred." },
        readingTools: { type: "object", description: "Explicit audio, timer, replay, pause, and zoom capabilities." },
        completion: { type: "object", description: "Local viewing completion only; not reading assessment." },
        allowRetry: { type: "boolean", default: true },
        hint: { type: "object", description: "Explicit Reading hint type only." },
        media: { type: "object", description: "Optional safe image and audio storage keys." },
      },
      required: ["contentMode", "readingText", "paragraphs", "readingDirection", "display", "readingTools", "completion"],
    },
  },
  required: ["reading"],
};

const readingComprehensionContentSchema: SafeJsonObject = {
  type: "object",
  title: "Reading Comprehension item configuration",
  properties: { readingComprehension: { type: "object", properties: { passage: { type: "object" }, questions: { type: "array", minLength: 1, maxLength: 20 }, showPassageFirst: { type: "boolean" }, allowPassageDuringQuestions: { type: "boolean" }, randomizeQuestions: { type: "boolean" }, showQuestionNumbers: { type: "boolean" }, showImmediateFeedback: { type: "boolean" }, allowRetry: { type: "boolean" } }, required: ["passage", "questions", "showPassageFirst", "allowPassageDuringQuestions", "randomizeQuestions", "showQuestionNumbers", "showImmediateFeedback", "allowRetry"] } },
  required: ["readingComprehension"],
};
const voiceRecordingContentSchema: SafeJsonObject = { type: "object", title: "Voice Recording item configuration", properties: { voiceRecording: { type: "object", properties: { prompt: { type: "object" }, recording: { type: "object" }, instructions: { type: "string", maxLength: 1_000 } }, required: ["prompt", "recording"] } }, required: ["voiceRecording"] };

// The runtime contract is enforced by contracts/fill-blank.contract.ts. This
// schema makes the item-level shape discoverable to the Activity Builder while
// remaining within the registry's intentionally small safe-schema vocabulary.
const fillBlankContentSchema: SafeJsonObject = {
  type: "object",
  title: "Fill in the Blank item configuration",
  properties: {
    fillBlank: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["TYPING", "WORD_BANK", "MIXED"] },
        prompt: { type: "string", minLength: 1, maxLength: 10_000 },
        blanks: {
          type: "array",
          minLength: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              marker: { type: "string", minLength: 11, maxLength: 32, description: "Canonical marker: {{blank:1}}" },
              required: { type: "boolean" },
              inputMode: { type: "string", enum: ["TYPING", "WORD_BANK"] },
              acceptableAnswers: { type: "array", minLength: 1, items: { type: "string", minLength: 1, maxLength: 500 } },
              hint: { type: "object", description: "Optional plain-text hint and optional safe storage media key." },
              placeholder: { type: "string", minLength: 1, maxLength: 255 },
              caseSensitive: { type: "boolean", default: false },
              trimWhitespace: { type: "boolean", default: true },
              collapseWhitespace: { type: "boolean", default: true },
              unicodeNormalization: { type: "string", enum: ["NFC"], default: "NFC" },
            },
            required: ["id", "marker", "required", "inputMode", "acceptableAnswers"],
          },
        },
        wordBank: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              content: { type: "string", minLength: 1, maxLength: 500 },
              mediaKey: { type: "string", description: "Optional safe storage media key." },
              singleUse: { type: "boolean" },
            },
            required: ["id", "content", "singleUse"],
          },
        },
        allowRepeatedWords: { type: "boolean" },
        clearIncorrectOnlyOnRetry: { type: "boolean", default: true },
      },
      required: ["mode", "prompt", "blanks", "wordBank", "allowRepeatedWords"],
    },
  },
  required: ["fillBlank"],
};

const arrangeLettersContentSchema: SafeJsonObject = {
  type: "object",
  title: "Arrange Letters item configuration",
  properties: {
    arrangeLetters: {
      type: "object",
      properties: {
        interactionMode: { type: "string", enum: ["CLICK_ORDER", "DRAG_ORDER", "BOTH"] },
        targetWord: { type: "string", minLength: 1, maxLength: 500 },
        letterUnits: {
          type: "array",
          minLength: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              value: { type: "string", minLength: 1, maxLength: 100 },
              sequence: { type: "number", minimum: 1, maximum: 20 },
            },
            required: ["id", "value", "sequence"],
          },
        },
        showReferenceText: { type: "boolean", default: false },
        showTargetSlots: { type: "boolean", default: true },
        shuffleLetters: { type: "boolean", default: true },
        preserveCase: { type: "boolean", default: false },
        allowRetry: { type: "boolean", default: true },
        clearOnRetry: { type: "boolean", default: false },
        maximumLetters: { type: "number", minimum: 1, maximum: 20, default: 20 },
      },
      required: ["interactionMode", "targetWord", "letterUnits"],
    },
  },
  required: ["arrangeLetters"],
};

const arrangeSyllablesContentSchema: SafeJsonObject = {
  type: "object",
  title: "Arrange Syllables item configuration",
  properties: {
    arrangeSyllables: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["ORDERED_RECONSTRUCTION", "MISSING_SYLLABLES"] },
        interactionMode: { type: "string", enum: ["CLICK_ORDER", "DRAG_ORDER", "BOTH", "DRAG_TO_BLANK"] },
        targetWord: { type: "string", minLength: 1, maxLength: 2_000 },
        syllables: {
          type: "array",
          minLength: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              value: { type: "string", minLength: 1, maxLength: 500 },
              sequence: { type: "number", minimum: 1, maximum: 10 },
            },
            required: ["id", "value", "sequence"],
          },
        },
        words: {
          type: "array",
          minLength: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              sequence: { type: "number", minimum: 1, maximum: 6 },
              syllables: {
                type: "array",
                minLength: 1,
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", minLength: 1, maxLength: 100 },
                    value: { type: "string", minLength: 1, maxLength: 500 },
                    sequence: { type: "number", minimum: 1, maximum: 10 },
                    isMissing: { type: "boolean" },
                  },
                  required: ["id", "value", "sequence", "isMissing"],
                },
              },
            },
            required: ["id", "sequence", "syllables"],
          },
        },
        distractors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              value: { type: "string", minLength: 1, maxLength: 500 },
              sequence: { type: "number", minimum: 1, maximum: 12 },
            },
            required: ["id", "value", "sequence"],
          },
        },
        hint: { type: "string", maxLength: 1_000 },
        showReferenceText: { type: "boolean", default: false },
        showTargetSlots: { type: "boolean", default: true },
        shuffleSyllables: { type: "boolean", default: true },
        allowRetry: { type: "boolean", default: true },
        clearOnRetry: { type: "boolean", default: false },
        maximumSyllables: { type: "number", minimum: 1, maximum: 10, default: 10 },
      },
      required: ["interactionMode"],
    },
  },
  required: ["arrangeSyllables"],
};

const wordBuilderContentSchema: SafeJsonObject = {
  type: "object",
  title: "Word Builder item configuration",
  properties: {
    wordBuilder: {
      type: "object",
      properties: {
        builderMode: { type: "string", enum: ["LETTER", "SYLLABLE"] },
        interactionMode: { type: "string", enum: ["CLICK_ORDER", "DRAG_ORDER", "BOTH"] },
        targetWord: { type: "string", minLength: 1, maxLength: 2_000 },
        units: {
          type: "array",
          minLength: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              value: { type: "string", minLength: 1, maxLength: 500 },
              sequence: { type: "number", minimum: 1, maximum: 12 },
            },
            required: ["id", "value", "sequence"],
          },
        },
        distractors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              value: { type: "string", minLength: 1, maxLength: 500 },
            },
            required: ["id", "value"],
          },
        },
        prompt: {
          type: "object",
          description: "Optional explicit TEXT, IMAGE, or AUDIO prompt using an existing safe media key.",
          properties: {
            type: { type: "string", enum: ["TEXT", "IMAGE", "AUDIO"] },
            text: { type: "string", minLength: 1, maxLength: 2_000 },
            mediaKey: { type: "string", description: "Existing safe storage key for IMAGE or AUDIO prompts." },
          },
        },
        showReferenceText: { type: "boolean", default: false },
        showTargetSlots: { type: "boolean", default: true },
        shuffleUnits: { type: "boolean", default: true },
        allowRetry: { type: "boolean", default: true },
        clearOnRetry: { type: "boolean", default: false },
        allowReuse: { type: "boolean", default: false },
        maximumUnits: { type: "number", minimum: 1, maximum: 12, default: 12 },
        hint: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["NONE", "FIRST_UNIT", "FIRST_TWO_UNITS", "SHOW_IMAGE", "PLAY_AUDIO"] },
          },
        },
      },
      required: ["builderMode", "interactionMode", "targetWord", "units"],
    },
  },
  required: ["wordBuilder"],
};

const tracingContentSchema: SafeJsonObject = {
  type: "object",
  title: "Tracing item configuration",
  properties: {
    tracing: {
      type: "object",
      properties: {
        traceMode: { type: "string", enum: ["LETTER", "NUMBER", "SYLLABLE", "WORD", "SENTENCE"] },
        displayText: { type: "string", minLength: 1, maxLength: 5_000 },
        traceUnits: {
          type: "array",
          minLength: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              value: { type: "string", minLength: 1, maxLength: 2_000 },
              svgPath: { type: "string", minLength: 1, maxLength: 12_000, description: "Explicit safe SVG path data. Never derived from text." },
              sequence: { type: "number", minimum: 1, maximum: 100 },
            },
            required: ["id", "value", "svgPath", "sequence"],
          },
        },
        canvas: {
          type: "object",
          properties: {
            width: { type: "number", minimum: 200, maximum: 2_400 },
            height: { type: "number", minimum: 100, maximum: 1_600 },
          },
          required: ["width", "height"],
        },
        guideStyle: { type: "string", enum: ["DOTTED", "SOLID"], default: "DOTTED" },
        showBaseline: { type: "boolean", default: true },
        showStartDots: { type: "boolean", default: true },
        showStrokeNumbers: { type: "boolean", default: false },
        showGuideArrows: { type: "boolean", default: false },
        allowRetry: { type: "boolean", default: true },
        clearOnRetry: { type: "boolean", default: false },
        minimumAccuracy: { type: "number", minimum: 0, maximum: 100, default: 70 },
        hint: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["NONE", "SHOW_START_POINT", "SHOW_DIRECTION", "SHOW_FULL_TRACE"] },
          },
        },
      },
      required: ["traceMode", "displayText", "traceUnits", "canvas"],
    },
  },
  required: ["tracing"],
};

const copyWritingContentSchema: SafeJsonObject = {
  type: "object",
  title: "Copy Writing item configuration",
  properties: {
    copyWriting: {
      type: "object",
      properties: {
        contentMode: { type: "string", enum: ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE"] },
        referenceText: { type: "string", minLength: 1, maxLength: 300 },
        repetitionCount: { type: "number", minimum: 1, maximum: 10 },
        canvas: { type: "object", properties: { width: { type: "number", minimum: 400, maximum: 2_000 }, height: { type: "number", minimum: 200, maximum: 1_600 } }, required: ["width", "height"] },
        writingLayout: { type: "object", description: "Explicit child-friendly writing-line geometry." },
        referenceDisplay: { type: "object", description: "Explicit model-text display settings without arbitrary CSS or fonts." },
        syllableUnits: { type: "array", description: "Required only when showSyllableBreaks is true; never generated automatically." },
        writingDirection: { type: "string", enum: ["LEFT_TO_RIGHT"] },
        tools: { type: "object", description: "Allowed handwriting-canvas capabilities only." },
        completion: { type: "object", description: "Local non-empty-canvas completion only; no handwriting assessment." },
        allowRetry: { type: "boolean", default: true },
        clearOnRetry: { type: "boolean", default: false },
        hint: { type: "object", description: "Explicit COPY_WRITING hint type only." },
        media: { type: "object", description: "Optional existing safe media keys; no file content." },
      },
      required: ["contentMode", "referenceText", "repetitionCount", "canvas", "writingLayout", "referenceDisplay", "writingDirection", "tools", "completion"],
    },
  },
  required: ["copyWriting"],
};

const freeHandwritingContentSchema: SafeJsonObject = {
  type: "object",
  title: "Free Handwriting item configuration",
  properties: {
    freeHandwriting: {
      type: "object",
      properties: {
        responseMode: { type: "string", enum: ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE", "SHORT_RESPONSE"] },
        prompt: { type: "object", description: "Explicit safe prompt text and visibility; never inferred from question-bank fields." },
        canvas: { type: "object", properties: { width: { type: "number", minimum: 400, maximum: 2_000 }, height: { type: "number", minimum: 250, maximum: 1_800 } }, required: ["width", "height"] },
        writingLayout: { type: "object", description: "Explicit blank or lined writing-canvas geometry." },
        writingDirection: { type: "string", enum: ["LEFT_TO_RIGHT"] },
        tools: { type: "object", description: "Allowed local handwriting-canvas capabilities only." },
        completion: { type: "object", description: "Local interaction completion only; no correctness or handwriting assessment." },
        teacherReviewRequired: { type: "boolean" },
        allowRetry: { type: "boolean", default: true },
        clearOnRetry: { type: "boolean", default: false },
        hint: { type: "object", description: "Explicit Free Handwriting hint type only." },
        media: { type: "object", description: "Optional safe existing prompt/supporting media keys." },
      },
      required: ["responseMode", "prompt", "canvas", "writingLayout", "writingDirection", "tools", "completion", "teacherReviewRequired"],
    },
  },
  required: ["freeHandwriting"],
};

export const coreActivityTemplates: CoreActivityTemplate[] = [
  {
    code: "MULTIPLE_CHOICE",
    name: "Multiple Choice",
    description: "Pilihan jawapan dengan penandaan automatik.",
    category: ActivityTemplateCategory.QUIZ,
    assessmentMode: AssessmentMode.AUTO,
    requiresTeacherReview: false,
    supportsAutoMarking: true,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "multiple-choice",
    configurationSchema: configuration({
      shuffleOptions: { type: "boolean", default: true },
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
      showExplanation: { type: "boolean", default: false },
      randomizeQuestionOrder: { type: "boolean", default: false },
    }),
    contentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.QUESTION, QuestionBankItemType.WORD, QuestionBankItemType.SENTENCE], 1),
  },
  {
    code: "MATCHING",
    name: "Matching",
    description: "Padankan kandungan dan pasangan yang sepadan.",
    category: ActivityTemplateCategory.MATCHING,
    assessmentMode: AssessmentMode.AUTO,
    requiresTeacherReview: false,
    supportsAutoMarking: true,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "matching",
    configurationSchema: configuration({
      pairMode: { type: "string", enum: ["TEXT", "MEDIA", "MIXED"], default: "TEXT" },
      shufflePairs: { type: "boolean", default: true },
      showLines: { type: "boolean", default: true },
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
    }),
    contentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE, QuestionBankItemType.QUESTION], 2),
  },
  {
    code: "DRAG_DROP",
    name: "Drag and Drop",
    description: "Susun atau letakkan item pada zon sasaran.",
    category: ActivityTemplateCategory.ARRANGEMENT,
    assessmentMode: AssessmentMode.AUTO,
    requiresTeacherReview: false,
    supportsAutoMarking: true,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "drag-drop",
    configurationSchema: configuration({
      dropZoneMode: { type: "string", enum: ["SINGLE", "MULTIPLE"], default: "SINGLE" },
      shuffleItems: { type: "boolean", default: true },
      allowRetry: { type: "boolean", default: true },
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
    }),
    contentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE], 1),
  },
  {
    code: "FILL_BLANK",
    name: "Fill in the Blank",
    description: "Lengkapkan ruang kosong menggunakan jawapan yang disahkan.",
    category: ActivityTemplateCategory.QUIZ,
    assessmentMode: AssessmentMode.HYBRID,
    requiresTeacherReview: false,
    supportsAutoMarking: true,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "fill-blank",
    configurationSchema: configuration({
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
    }),
    contentSchema: fillBlankContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE, QuestionBankItemType.PASSAGE, QuestionBankItemType.QUESTION], 1),
  },
  {
    code: "ARRANGE_SYLLABLES",
    name: "Arrange Syllables",
    description: "Susun suku kata menjadi perkataan yang betul.",
    category: ActivityTemplateCategory.ARRANGEMENT,
    assessmentMode: AssessmentMode.AUTO,
    requiresTeacherReview: false,
    supportsAutoMarking: true,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "arrange-syllables",
    configurationSchema: configuration({
      shuffleSyllables: { type: "boolean", default: true },
      showReferenceImage: { type: "boolean", default: false },
      playReferenceAudio: { type: "boolean", default: false },
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
    }),
    contentSchema: arrangeSyllablesContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD], 1),
  },
  {
    code: "WORD_BUILDER",
    name: "Word Builder",
    description: "Bina perkataan menggunakan huruf atau suku kata yang ditetapkan secara eksplisit.",
    category: ActivityTemplateCategory.ARRANGEMENT,
    assessmentMode: AssessmentMode.AUTO,
    requiresTeacherReview: false,
    supportsAutoMarking: true,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "word-builder",
    configurationSchema: configuration({
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
    }),
    contentSchema: wordBuilderContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD], 1),
  },
  {
    code: "ARRANGE_LETTERS",
    name: "Arrange Letters",
    description: "Susun huruf mengikut urutan untuk membentuk perkataan sasaran.",
    category: ActivityTemplateCategory.ARRANGEMENT,
    assessmentMode: AssessmentMode.AUTO,
    requiresTeacherReview: false,
    supportsAutoMarking: true,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "arrange-letters",
    configurationSchema: configuration({
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
    }),
    contentSchema: arrangeLettersContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.WORD], 1),
  },
  {
    code: "TRACING",
    name: "Tracing",
    description: "Latihan menekap tulisan yang memerlukan semakan guru.",
    category: ActivityTemplateCategory.WRITING,
    assessmentMode: AssessmentMode.HYBRID,
    requiresTeacherReview: true,
    supportsAutoMarking: false,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: true,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "tracing",
    configurationSchema: configuration({
      guideStyle: { type: "string", enum: ["DOTTED", "SOLID"], default: "DOTTED" },
      strokeWidth: { type: "number", minimum: 1, maximum: 100, default: 8 },
      lineStyle: { type: "string", enum: ["DASHED", "SOLID"], default: "DASHED" },
      repetitionCount: { type: "number", minimum: 1, maximum: 20, default: 1 },
      showStartPoint: { type: "boolean", default: true },
      showStrokeDirection: { type: "boolean", default: true },
      completionThreshold: { type: "number", minimum: 1, maximum: 100, default: 80 },
      teacherReviewRequired: { type: "boolean", default: true },
    }),
    contentSchema: tracingContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE], 1),
  },
  {
    code: "COPY_WRITING",
    name: "Copy Writing",
    description: "Menyalin model teks secara bebas pada kanvas tulisan berpandukan garis yang ditetapkan.",
    category: ActivityTemplateCategory.WRITING,
    assessmentMode: AssessmentMode.HYBRID,
    requiresTeacherReview: true,
    supportsAutoMarking: false,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: true,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "copy-writing",
    configurationSchema: configuration({
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
      teacherReviewRequired: { type: "boolean", default: true },
    }),
    contentSchema: copyWritingContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE], 1),
  },
  {
    code: "READING",
    name: "Reading",
    description: "Bacaan berpandu dengan teks, perenggan, audio, sorotan, zum dan pemasa pilihan.",
    category: ActivityTemplateCategory.READING,
    // Prisma's existing AssessmentMode enum has no NONE member. The absence of
    // scoring/review behavior is expressed by the capabilities below and the
    // item contract; MANUAL is retained solely for registry compatibility.
    assessmentMode: AssessmentMode.MANUAL,
    requiresTeacherReview: false,
    supportsAutoMarking: false,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "reading",
    configurationSchema: configuration({ attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 } }),
    contentSchema: readingContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE, QuestionBankItemType.PASSAGE], 1),
  },
  {
    code: "READING_COMPREHENSION",
    name: "Reading Comprehension",
    description: "Bacaan dengan soalan kefahaman yang ditetapkan secara eksplisit.",
    category: ActivityTemplateCategory.READING,
    assessmentMode: AssessmentMode.AUTO,
    requiresTeacherReview: false,
    supportsAutoMarking: true,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "reading",
    configurationSchema: configuration({ attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 } }),
    contentSchema: readingComprehensionContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.PASSAGE, QuestionBankItemType.QUESTION, QuestionBankItemType.SENTENCE], 1),
  },
  {
    code: "FREE_HANDWRITING",
    name: "Free Handwriting",
    description: "Menulis jawapan bebas pada kanvas kosong atau bergaris berdasarkan arahan dan media yang ditetapkan.",
    category: ActivityTemplateCategory.WRITING,
    assessmentMode: AssessmentMode.MANUAL,
    requiresTeacherReview: true,
    supportsAutoMarking: false,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsDrawing: true,
    supportsVoiceRecording: false,
    supportsFutureAI: false,
    rendererKey: "free-handwriting",
    configurationSchema: configuration({ attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 }, teacherReviewRequired: { type: "boolean", default: true } }),
    contentSchema: freeHandwritingContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE, QuestionBankItemType.QUESTION], 1),
  },
  {
    code: "VOICE_RECORDING",
    name: "Voice Recording",
    description: "Rakaman suara untuk semakan manual dan AI masa hadapan.",
    category: ActivityTemplateCategory.SPEAKING,
    assessmentMode: AssessmentMode.MANUAL,
    requiresTeacherReview: true,
    supportsAutoMarking: false,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: true,
    supportsFutureAI: true,
    rendererKey: "voice-recording",
    configurationSchema: configuration({
      maximumDurationSeconds: { type: "number", minimum: 1, maximum: 600, default: 60 },
      minimumDurationSeconds: { type: "number", minimum: 0, maximum: 600, default: 0 },
      countdownSeconds: { type: "number", minimum: 0, maximum: 60, default: 3 },
      playbackAllowed: { type: "boolean", default: true },
      retryLimit: { type: "number", minimum: 0, maximum: 10, default: 1 },
      referenceAudioEnabled: { type: "boolean", default: false },
      teacherReviewRequired: { type: "boolean", default: true },
    }),
    contentSchema: voiceRecordingContentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE, QuestionBankItemType.PASSAGE, QuestionBankItemType.QUESTION], 1),
  },
];
