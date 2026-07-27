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
      caseSensitive: { type: "boolean", default: false },
      accentSensitive: { type: "boolean", default: false },
      acceptableAnswers: { type: "array", items: { type: "string", minLength: 1 } },
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
      showHint: { type: "boolean", default: false },
    }),
    contentSchema,
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
    contentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD], 1),
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
    contentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE], 1),
  },
  {
    code: "READING",
    name: "Reading",
    description: "Bacaan dengan rakaman audio untuk semakan manual guru.",
    category: ActivityTemplateCategory.READING,
    assessmentMode: AssessmentMode.MANUAL,
    requiresTeacherReview: true,
    supportsAutoMarking: false,
    supportsMedia: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsDrawing: false,
    supportsVoiceRecording: true,
    supportsFutureAI: true,
    rendererKey: "reading",
    configurationSchema: configuration({
      countdownSeconds: { type: "number", minimum: 0, maximum: 60, default: 3 },
      displayMode: { type: "string", enum: ["TEXT", "CARD"], default: "TEXT" },
      highlightMode: { type: "string", enum: ["NONE", "WORD", "SYLLABLE"], default: "NONE" },
      moveCompletedText: { type: "boolean", default: false },
      recordingRequired: { type: "boolean", default: true },
      teacherReviewRequired: { type: "boolean", default: true },
      timeLimitSeconds: { type: "number", minimum: 0, maximum: 600, default: 0 },
    }),
    contentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.LETTER, QuestionBankItemType.SYLLABLE, QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE, QuestionBankItemType.PASSAGE], 1),
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
    contentSchema,
    acceptedItemTypes: accepted([QuestionBankItemType.WORD, QuestionBankItemType.PHRASE, QuestionBankItemType.SENTENCE, QuestionBankItemType.PASSAGE, QuestionBankItemType.QUESTION], 1),
  },
];
