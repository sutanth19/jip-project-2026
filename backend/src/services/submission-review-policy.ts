import { ItemReviewStatus } from "@prisma/client";

const MANUAL_RENDERERS = new Set([
  "tracing",
  "copy-writing",
  "free-handwriting",
  "voice-recording",
]);

function isShortText(configuration: unknown): boolean {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return false;
  const values = Object.values(configuration as Record<string, unknown>);
  return values.some((value) => typeof value === "string" && value.toUpperCase() === "SHORT_TEXT");
}

export function itemReviewStatus(rendererKey: string, configuration: unknown, templateRequiresTeacherReview: boolean): ItemReviewStatus {
  if (MANUAL_RENDERERS.has(rendererKey) || templateRequiresTeacherReview) return ItemReviewStatus.PENDING;
  if (rendererKey === "reading-comprehension" && isShortText(configuration)) return ItemReviewStatus.PENDING;
  return ItemReviewStatus.NOT_REQUIRED;
}

export function requiresManualReview(rendererKey: string, configuration: unknown, templateRequiresTeacherReview: boolean): boolean {
  return itemReviewStatus(rendererKey, configuration, templateRequiresTeacherReview) === ItemReviewStatus.PENDING;
}
