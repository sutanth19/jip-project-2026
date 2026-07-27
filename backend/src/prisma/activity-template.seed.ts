import { Prisma } from "@prisma/client";

import { coreActivityTemplates, type CoreActivityTemplate } from "../data/activity-templates/core-templates.js";
import { prisma } from "../config/prisma.js";
import { validateTemplateSchemas } from "../services/activity-template.service.js";
import { recordAuditEvent } from "../services/audit.service.js";

interface SeedSummary {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(null);
}

function sameItemTypes(
  existing: Array<{ itemType: string; isRequired: boolean; minimumItems: number | null; maximumItems: number | null }>,
  expected: CoreActivityTemplate["acceptedItemTypes"],
): boolean {
  if (existing.length !== expected.length) return false;
  const existingSorted = [...existing].sort((left, right) => left.itemType.localeCompare(right.itemType));
  const expectedSorted = [...expected].sort((left, right) => left.itemType.localeCompare(right.itemType));
  return existingSorted.every((item, index) => {
    const target = expectedSorted[index];
    return target !== undefined && item.itemType === target.itemType && item.isRequired === target.isRequired && item.minimumItems === (target.minimumItems ?? null) && item.maximumItems === (target.maximumItems ?? null);
  });
}

function matchesCoreTemplate(
  existing: {
    name: string;
    description: string | null;
    category: string;
    version: number;
    status: string;
    assessmentMode: string;
    requiresTeacherReview: boolean;
    supportsAutoMarking: boolean;
    supportsMedia: boolean;
    supportsAudio: boolean;
    supportsVideo: boolean;
    supportsDrawing: boolean;
    supportsVoiceRecording: boolean;
    supportsFutureAI: boolean;
    configurationSchema: Prisma.JsonValue;
    contentSchema: Prisma.JsonValue;
    rendererKey: string;
    acceptedItemTypes: Array<{ itemType: string; isRequired: boolean; minimumItems: number | null; maximumItems: number | null }>;
  },
  core: CoreActivityTemplate,
): boolean {
  return existing.name === core.name && existing.description === core.description && existing.category === core.category && existing.version === 1 && existing.status === "ACTIVE" && existing.assessmentMode === core.assessmentMode && existing.requiresTeacherReview === core.requiresTeacherReview && existing.supportsAutoMarking === core.supportsAutoMarking && existing.supportsMedia === core.supportsMedia && existing.supportsAudio === core.supportsAudio && existing.supportsVideo === core.supportsVideo && existing.supportsDrawing === core.supportsDrawing && existing.supportsVoiceRecording === core.supportsVoiceRecording && existing.supportsFutureAI === core.supportsFutureAI && existing.rendererKey === core.rendererKey && canonicalJson(existing.configurationSchema) === canonicalJson(core.configurationSchema) && canonicalJson(existing.contentSchema) === canonicalJson(core.contentSchema) && sameItemTypes(existing.acceptedItemTypes, core.acceptedItemTypes);
}

export async function seedCoreActivityTemplates(): Promise<SeedSummary> {
  const summary: SeedSummary = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
  for (const core of coreActivityTemplates) {
    const schemas = validateTemplateSchemas(core.configurationSchema, core.contentSchema);
    const existing = await prisma.activityTemplate.findUnique({
      where: { code: core.code },
      include: { acceptedItemTypes: true },
    });
    if (existing) {
      if (matchesCoreTemplate(existing, core)) summary.unchanged += 1;
      else summary.skipped += 1;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const created = await tx.activityTemplate.create({
        data: {
          code: core.code,
          name: core.name,
          description: core.description,
          category: core.category,
          version: 1,
          assessmentMode: core.assessmentMode,
          requiresTeacherReview: core.requiresTeacherReview,
          supportsAutoMarking: core.supportsAutoMarking,
          supportsMedia: core.supportsMedia,
          supportsAudio: core.supportsAudio,
          supportsVideo: core.supportsVideo,
          supportsDrawing: core.supportsDrawing,
          supportsVoiceRecording: core.supportsVoiceRecording,
          supportsFutureAI: core.supportsFutureAI,
          configurationSchema: schemas.configurationSchema as Prisma.InputJsonValue,
          contentSchema: schemas.contentSchema as Prisma.InputJsonValue,
          rendererKey: core.rendererKey,
          acceptedItemTypes: {
            create: core.acceptedItemTypes.map((itemType) => ({
              itemType: itemType.itemType,
              isRequired: itemType.isRequired,
              minimumItems: itemType.minimumItems ?? null,
              maximumItems: itemType.maximumItems ?? null,
            })),
          },
        },
      });
      await recordAuditEvent({
        actorUserId: null,
        actorProfileId: null,
        actorRole: null,
        actorName: "Activity template seed",
        action: "ACTIVITY_TEMPLATE_SEEDED",
        resourceType: "ACTIVITY_TEMPLATE",
        resourceId: created.id,
        schoolId: null,
        before: null,
        after: { code: created.code, version: created.version, status: created.status },
        metadata: { source: "core-templates", operation: "created" },
        timestamp: new Date(),
        requestIp: null,
        userAgent: null,
      }, { transactionClient: tx, strict: true });
    });
    summary.created += 1;
  }
  return summary;
}

async function main(): Promise<void> {
  const summary = await seedCoreActivityTemplates();
  console.log(`Activity template seed completed: created=${summary.created}, updated=${summary.updated}, unchanged=${summary.unchanged}, skipped=${summary.skipped}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Activity template seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
