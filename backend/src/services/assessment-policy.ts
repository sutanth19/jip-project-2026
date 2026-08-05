import { AssessmentMethod, QuestionAnswerType } from "@prisma/client";

const MANUAL_RENDERERS = new Set(["tracing", "copy-writing", "free-handwriting", "voice-recording"]);
const COMPLETION_RENDERERS = new Set(["reading"]);
const AUTOMATIC_RENDERERS = new Set([
  "multiple-choice",
  "true-false",
  "matching",
  "drag-drop",
  "fill-blank",
  "arrange-letters",
  "arrange-syllables",
  "word-builder",
]);

function containsShortText(value: unknown): boolean {
  if (typeof value === "string") return value.toUpperCase() === "SHORT_TEXT";
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsShortText);
  return Object.values(value as Record<string, unknown>).some(containsShortText);
}

export function itemAssessmentMethod(rendererKey: string, configuration: unknown, answerType: QuestionAnswerType, templateRequiresTeacherReview: boolean): AssessmentMethod {
  if (COMPLETION_RENDERERS.has(rendererKey)) return AssessmentMethod.COMPLETION;
  if (MANUAL_RENDERERS.has(rendererKey) || templateRequiresTeacherReview) return AssessmentMethod.MANUAL;
  if (rendererKey === "reading-comprehension") return containsShortText(configuration) ? AssessmentMethod.MANUAL : AssessmentMethod.AUTOMATIC;
  if (AUTOMATIC_RENDERERS.has(rendererKey)) return AssessmentMethod.AUTOMATIC;
  if (answerType === QuestionAnswerType.NONE) return AssessmentMethod.COMPLETION;
  return AssessmentMethod.AUTOMATIC;
}

export function assessmentMethod(methods: readonly AssessmentMethod[]): AssessmentMethod {
  const unique = new Set(methods);
  if (unique.size === 1) return methods[0] ?? AssessmentMethod.COMPLETION;
  if (unique.has(AssessmentMethod.MANUAL) && (unique.has(AssessmentMethod.AUTOMATIC) || unique.has(AssessmentMethod.COMPLETION))) return AssessmentMethod.HYBRID;
  if (unique.has(AssessmentMethod.AUTOMATIC) && unique.has(AssessmentMethod.COMPLETION)) return AssessmentMethod.HYBRID;
  return AssessmentMethod.HYBRID;
}

export function defaultPossibleMarks(method: AssessmentMethod, configuredMarks: number | null): number {
  if (configuredMarks !== null && configuredMarks >= 0) return configuredMarks;
  return method === AssessmentMethod.COMPLETION ? 0 : 1;
}
