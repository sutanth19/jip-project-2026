import { apiRequest } from "@/lib/api";
import type { ActivityPreview } from "@/features/activity-player/types";
import type {
  AdminActivityCategory,
  AdminActivityListQuery,
  AdminActivityListResult,
  AdminActivityRecord,
  AdminActivitySummary,
  AdminActivityTemplateOption,
} from "@/features/admin/utils/admin-activity";
import { toAdminActivitySearchParams } from "@/features/admin/utils/admin-activity";
import type {
  ActivityTemplateResolution,
  CreateDigitalActivityPayload,
  ProgrammeResolution,
  UpdateDigitalActivityBasicInfoPayload,
} from "@/features/admin/utils/admin-activity-create";
import type { UpdateDigitalActivitySettingsPayload } from "@/features/admin/utils/admin-activity-settings";
import type {
  AdminActivityCurriculumLinkPayload,
  AdminContentStandardOption,
  AdminCurriculumYearOption,
  AdminLearningObjectiveOption,
  AdminLearningStandardOption,
  AdminRemedialSkillDetail,
  AdminRemedialSkillOption,
  AdminSkillLearningStandardMapping,
} from "@/features/admin/utils/admin-activity-curriculum";

type ListActivitiesPayload = {
  activities?: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    createdAt: string;
    publishedAt: string | null;
    difficulty: string | null;
    template?: {
      id: string;
      name: string;
      code?: string | null;
      category: string | null;
      rendererKey: string | null;
    } | null;
    curriculumLinks?: Array<{
      id?: string;
      isPrimary: boolean;
      curriculumYear: { id?: string; yearLevel: number; name: string | null } | null;
      remedialSkill: { id?: string; code?: string | null; name: string } | null;
      contentStandard?: { id: string; code: string; title: string } | null;
      learningStandard?: { id: string; code: string } | null;
      learningObjective?: { id: string; code: string | null; description: string } | null;
    }>;
    items?: Array<{ id: string }>;
    media?: Array<{
      id: string;
      mediaRole: string;
      url: string;
      altText: string | null;
      label: string | null;
    }>;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type ListTemplatesPayload = {
  templates?: Array<{
    id: string;
    code?: string | null;
    name: string;
    category: string | null;
    rendererKey: string;
  }>;
};

type ListProgrammesPayload = {
  programmes?: ProgrammeResolution[];
};

type ListYearsPayload = {
  years?: AdminCurriculumYearOption[];
};

type ListSkillsPayload = {
  remedialSkills?: AdminRemedialSkillOption[];
};

type SkillPayload = {
  skill?: AdminRemedialSkillOption;
  objectives?: AdminLearningObjectiveOption[];
  learningStandardMappings?: AdminSkillLearningStandardMapping[];
};

type ListContentStandardsPayload = {
  contentStandards?: AdminContentStandardOption[];
};

type ListLearningStandardsPayload = {
  learningStandards?: AdminLearningStandardOption[];
};

type ListLearningObjectivesPayload = {
  objectives?: AdminLearningObjectiveOption[];
};

type ActivityCurriculumLinkPayload = {
  link?: {
    id: string;
  };
};

type ActivityPayload = {
  activity?: AdminActivityRecord & {
    code?: string | null;
    description?: string | null;
    instructions?: string | null;
    estimatedMinutes?: number | null;
    scoringMode?: "NONE" | "TOTAL_SCORE" | "PERCENTAGE" | "MASTERY_THRESHOLD" | null;
    reviewMode?: "AUTO" | "TEACHER" | "HYBRID" | "AI_ASSISTED" | null;
    totalMarks?: number | null;
    masteryThreshold?: number | null;
    attemptsAllowed?: number | null;
    timeLimitSeconds?: number | null;
    shuffleItems?: boolean;
    showImmediateFeedback?: boolean;
    allowRetry?: boolean;
    configuration?: unknown;
    rewardConfiguration?: unknown;
    presentationSettings?: unknown;
    settingsCompletedAt?: string | null;
    submittedForReviewAt?: string | null;
    archivedAt?: string | null;
    creator?: {
      userId: string;
      schoolId?: string | null;
      schoolName?: string | null;
      fullName?: string | null;
    } | null;
    programme?: ProgrammeResolution | null;
    template?: ActivityTemplateResolution | null;
    items: Array<{
      id: string;
      marks?: number | null;
      configuration?: unknown;
    }>;
  };
};

type ActivityPreviewPayload = {
  activity?: ActivityPreview & {
    status: string;
    settingsCompletedAt: string | null;
    programme: {
      id: string;
      code: string;
      name: string;
      version: {
        id: string;
        code: string | null;
        name: string | null;
        status: string | null;
      } | null;
    } | null;
    curriculumLinks: Array<{
      id: string;
      isPrimary: boolean;
      curriculumYear: { id?: string; yearLevel: number; name: string | null } | null;
      remedialSkill: { id?: string; code?: string | null; name: string } | null;
      contentStandard: { id: string; code: string; title: string } | null;
      learningStandard: { id: string; code: string } | null;
      learningObjective: { id: string; code: string | null; description: string } | null;
    }>;
  };
};

type ActivityPublishReadinessPayload = {
  readiness?: {
    ready: boolean;
    issues: string[];
    checks: {
      information: boolean;
      curriculum: boolean;
      content: boolean;
      settings: boolean;
      preview: boolean;
    };
  };
};

export type AdminActivityDetailRecord = NonNullable<ActivityPayload["activity"]>;
export type AdminActivityPreviewRecord = NonNullable<ActivityPreviewPayload["activity"]>;
export type AdminActivityPublishReadiness = NonNullable<ActivityPublishReadinessPayload["readiness"]>;

function normalizeActivityRecord(record: NonNullable<ListActivitiesPayload["activities"]>[number]): AdminActivityRecord {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
    publishedAt: record.publishedAt,
    difficulty: record.difficulty,
    template: record.template ?? null,
    curriculumLinks: record.curriculumLinks ?? [],
    items: record.items ?? [],
    media: record.media ?? [],
  };
}

function normalizeAdminActivityCategory(category: string | null): AdminActivityCategory {
  return category === "WRITING" ? "WRITING" : "READING";
}

function getBackendTemplateCategories(category: AdminActivityCategory | undefined): string[] | undefined {
  if (category === "READING") return ["READING", "ARRANGEMENT"];
  if (category === "WRITING") return ["WRITING"];
  return undefined;
}

function toAdminActivityApiSearchParams(query: Partial<AdminActivityListQuery>) {
  const params = new URLSearchParams(toAdminActivitySearchParams(query).replace(/^\?/, ""));
  const categories = getBackendTemplateCategories(query.templateCategory);

  params.delete("templateCategory");

  if (categories?.length) {
    params.set("templateCategories", categories.join(","));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export async function listAdminActivities(query: AdminActivityListQuery): Promise<AdminActivityListResult> {
  const payload = await apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivityApiSearchParams(query)}`);
  const items = (payload.activities ?? []).map(normalizeActivityRecord);
  const pagination = payload.pagination ?? {
    page: query.page,
    limit: query.limit,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / Math.max(query.limit, 1))),
    hasNextPage: false,
    hasPreviousPage: query.page > 1,
  };

  return {
    items,
    meta: pagination,
  };
}

export async function listAdminActivityTemplateOptions(): Promise<AdminActivityTemplateOption[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    status: "ACTIVE",
    sortBy: "name",
    sortOrder: "asc",
  });
  const payload = await apiRequest<ListTemplatesPayload>(
    `/activity-templates?${params.toString()}`,
  );

  return (payload.templates ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    category: normalizeAdminActivityCategory(template.category),
    rendererKey: template.rendererKey,
  }));
}

export async function listAdminActivityTemplatesForCreate(): Promise<ActivityTemplateResolution[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    status: "ACTIVE",
    sortBy: "name",
    sortOrder: "asc",
  });
  const payload = await apiRequest<ListTemplatesPayload>(`/activity-templates?${params.toString()}`);

  return (payload.templates ?? []).map((template) => ({
    id: template.id,
    code: template.code ?? null,
    name: template.name,
    category: template.category,
    rendererKey: template.rendererKey,
  }));
}

export async function listAdminCurriculumProgrammesForCreate(): Promise<ProgrammeResolution[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    status: "ACTIVE",
    sortBy: "name",
    sortOrder: "asc",
  });
  const payload = await apiRequest<ListProgrammesPayload>(`/curriculum/programmes?${params.toString()}`);

  return payload.programmes ?? [];
}

export async function createAdminDigitalActivity(payload: CreateDigitalActivityPayload): Promise<AdminActivityDetailRecord> {
  const response = await apiRequest<ActivityPayload>("/digital-activities", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.activity?.id) {
    throw new Error("Digital activity create response did not include an activity ID.");
  }

  return response.activity;
}

export async function getAdminDigitalActivity(activityId: string): Promise<AdminActivityDetailRecord> {
  const response = await apiRequest<ActivityPayload>(`/digital-activities/${activityId}`);

  if (!response.activity?.id) {
    throw new Error("Digital activity detail response did not include an activity ID.");
  }

  return response.activity;
}

export async function getAdminDigitalActivityPreview(activityId: string): Promise<AdminActivityPreviewRecord> {
  const response = await apiRequest<ActivityPreviewPayload>(`/digital-activities/${activityId}/preview`);

  if (!response.activity?.id) {
    throw new Error("Digital activity preview response did not include an activity ID.");
  }

  return response.activity;
}

export async function updateAdminDigitalActivity(
  activityId: string,
  payload: UpdateDigitalActivityBasicInfoPayload,
): Promise<AdminActivityDetailRecord> {
  const response = await apiRequest<ActivityPayload>(`/digital-activities/${activityId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.activity?.id) {
    throw new Error("Digital activity update response did not include an activity ID.");
  }

  return response.activity;
}

export async function updateAdminDigitalActivitySettings(
  activityId: string,
  payload: UpdateDigitalActivitySettingsPayload,
): Promise<AdminActivityDetailRecord> {
  const response = await apiRequest<ActivityPayload>(`/digital-activities/${activityId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.activity?.id) {
    throw new Error("Digital activity settings update response did not include an activity ID.");
  }

  return response.activity;
}

export async function deleteAdminDigitalActivity(activityId: string): Promise<void> {
  await apiRequest(`/digital-activities/${activityId}`, {
    method: "DELETE",
  });
}

export async function submitAdminDigitalActivityForReview(activityId: string): Promise<AdminActivityDetailRecord> {
  const response = await apiRequest<ActivityPayload>(`/digital-activities/${activityId}/submit-review`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (!response.activity?.id) {
    throw new Error("Digital activity review submission response did not include an activity ID.");
  }

  return response.activity;
}

export async function publishAdminDigitalActivity(activityId: string): Promise<AdminActivityDetailRecord> {
  const response = await apiRequest<ActivityPayload>(`/digital-activities/${activityId}/publish`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (!response.activity?.id) {
    throw new Error("Digital activity publish response did not include an activity ID.");
  }

  return response.activity;
}

export async function archiveAdminDigitalActivity(activityId: string): Promise<AdminActivityDetailRecord> {
  const response = await apiRequest<ActivityPayload>(`/digital-activities/${activityId}/archive`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (!response.activity?.id) {
    throw new Error("Digital activity archive response did not include an activity ID.");
  }

  return response.activity;
}

export async function getAdminDigitalActivityPublishReadiness(activityId: string): Promise<AdminActivityPublishReadiness> {
  const response = await apiRequest<ActivityPublishReadinessPayload>(`/digital-activities/${activityId}/publish-readiness`);

  if (!response.readiness) {
    throw new Error("Digital activity publish readiness response did not include readiness.");
  }

  return response.readiness;
}

export async function listAdminCurriculumYears(programmeId: string): Promise<AdminCurriculumYearOption[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    status: "ACTIVE",
    sortBy: "sequence",
    sortOrder: "asc",
  });
  const response = await apiRequest<ListYearsPayload>(`/curriculum/programmes/${programmeId}/years?${params.toString()}`);
  return response.years ?? [];
}

export async function listAdminRemedialSkills(programmeId: string): Promise<AdminRemedialSkillOption[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    status: "ACTIVE",
    sortBy: "sequence",
    sortOrder: "asc",
  });
  const response = await apiRequest<ListSkillsPayload>(`/curriculum/programmes/${programmeId}/remedial-skills?${params.toString()}`);
  return response.remedialSkills ?? [];
}

export async function getAdminRemedialSkill(skillId: string): Promise<AdminRemedialSkillDetail> {
  const response = await apiRequest<SkillPayload>(`/curriculum/remedial-skills/${skillId}`);

  if (!response.skill?.id) {
    throw new Error("Curriculum skill response did not include a skill ID.");
  }

  return {
    skill: response.skill,
    objectives: response.objectives ?? [],
    learningStandardMappings: response.learningStandardMappings ?? [],
  };
}

export async function listAdminContentStandards(programmeId: string, curriculumYearId: string): Promise<AdminContentStandardOption[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    status: "ACTIVE",
    curriculumYearId,
    sortBy: "sequence",
    sortOrder: "asc",
  });
  const response = await apiRequest<ListContentStandardsPayload>(`/curriculum/programmes/${programmeId}/content-standards?${params.toString()}`);
  return response.contentStandards ?? [];
}

export async function listAdminLearningStandards(contentStandardId: string): Promise<AdminLearningStandardOption[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    status: "ACTIVE",
    sortBy: "sequence",
    sortOrder: "asc",
  });
  const response = await apiRequest<ListLearningStandardsPayload>(`/curriculum/content-standards/${contentStandardId}/learning-standards?${params.toString()}`);
  return response.learningStandards ?? [];
}

export async function listAdminLearningObjectives(skillId: string): Promise<AdminLearningObjectiveOption[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    status: "ACTIVE",
    sortBy: "sequence",
    sortOrder: "asc",
  });
  const response = await apiRequest<ListLearningObjectivesPayload>(`/curriculum/remedial-skills/${skillId}/objectives?${params.toString()}`);
  return response.objectives ?? [];
}

export async function addAdminActivityCurriculumLink(activityId: string, payload: AdminActivityCurriculumLinkPayload): Promise<string> {
  const response = await apiRequest<ActivityCurriculumLinkPayload>(`/digital-activities/${activityId}/curriculum-links`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.link?.id) {
    throw new Error("Curriculum link response did not include a link ID.");
  }

  return response.link.id;
}

export async function removeAdminActivityCurriculumLink(activityId: string, linkId: string): Promise<void> {
  await apiRequest(`/digital-activities/${activityId}/curriculum-links/${linkId}`, {
    method: "DELETE",
  });
}

export async function getAdminActivitySummary(query: Pick<AdminActivityListQuery, "templateCategory">): Promise<AdminActivitySummary> {
  const [all, published, draft, archived] = await Promise.all([
    apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivityApiSearchParams({ page: 1, limit: 1, sortBy: "updatedAt", sortOrder: "desc", templateCategory: query.templateCategory })}`),
    apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivityApiSearchParams({ page: 1, limit: 1, status: "PUBLISHED", sortBy: "updatedAt", sortOrder: "desc", templateCategory: query.templateCategory })}`),
    apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivityApiSearchParams({ page: 1, limit: 1, status: "DRAFT", sortBy: "updatedAt", sortOrder: "desc", templateCategory: query.templateCategory })}`),
    apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivityApiSearchParams({ page: 1, limit: 1, status: "ARCHIVED", sortBy: "updatedAt", sortOrder: "desc", templateCategory: query.templateCategory })}`),
  ]);

  return {
    total: all.pagination?.total ?? null,
    published: published.pagination?.total ?? null,
    draft: draft.pagination?.total ?? null,
    archived: archived.pagination?.total ?? null,
  };
}
