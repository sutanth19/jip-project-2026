import { apiRequest } from "@/lib/api";
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
    programme?: ProgrammeResolution | null;
    template?: ActivityTemplateResolution | null;
  };
};

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

export async function listAdminActivities(query: AdminActivityListQuery): Promise<AdminActivityListResult> {
  const payload = await apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivitySearchParams(query)}`);
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

export async function createAdminDigitalActivity(payload: CreateDigitalActivityPayload): Promise<NonNullable<ActivityPayload["activity"]>> {
  const response = await apiRequest<ActivityPayload>("/digital-activities", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.activity?.id) {
    throw new Error("Digital activity create response did not include an activity ID.");
  }

  return response.activity;
}

export async function getAdminDigitalActivity(activityId: string): Promise<NonNullable<ActivityPayload["activity"]>> {
  const response = await apiRequest<ActivityPayload>(`/digital-activities/${activityId}`);

  if (!response.activity?.id) {
    throw new Error("Digital activity detail response did not include an activity ID.");
  }

  return response.activity;
}

export async function updateAdminDigitalActivity(
  activityId: string,
  payload: UpdateDigitalActivityBasicInfoPayload,
): Promise<NonNullable<ActivityPayload["activity"]>> {
  const response = await apiRequest<ActivityPayload>(`/digital-activities/${activityId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.activity?.id) {
    throw new Error("Digital activity update response did not include an activity ID.");
  }

  return response.activity;
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

export async function getAdminActivitySummary(): Promise<AdminActivitySummary> {
  const [all, published, draft, archived] = await Promise.all([
    apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivitySearchParams({ page: 1, limit: 1, sortBy: "updatedAt", sortOrder: "desc" })}`),
    apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivitySearchParams({ page: 1, limit: 1, status: "PUBLISHED", sortBy: "updatedAt", sortOrder: "desc" })}`),
    apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivitySearchParams({ page: 1, limit: 1, status: "DRAFT", sortBy: "updatedAt", sortOrder: "desc" })}`),
    apiRequest<ListActivitiesPayload>(`/digital-activities${toAdminActivitySearchParams({ page: 1, limit: 1, status: "ARCHIVED", sortBy: "updatedAt", sortOrder: "desc" })}`),
  ]);

  return {
    total: all.pagination?.total ?? null,
    published: published.pagination?.total ?? null,
    draft: draft.pagination?.total ?? null,
    archived: archived.pagination?.total ?? null,
  };
}
