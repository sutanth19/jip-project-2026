import { apiRequest } from "@/lib/api"
import type { ActivityPreview } from "@/features/activity-player/types"
import type {
  TeacherActivityDomain,
  TeacherActivityDetailRecord,
  TeacherActivityListQuery,
  TeacherActivityListResult,
  TeacherActivityPreviewRecord,
  TeacherActivityRecord,
} from "@/features/teacher/utils/teacher-activity"
import { getTeacherActivityBackendTemplateCategories } from "@/features/teacher/utils/teacher-activity"

type ListActivitiesPayload = {
  activities?: Array<{
    id: string
    title: string
    status: string
    updatedAt: string
    createdAt: string
    publishedAt: string | null
    description?: string | null
    instructions?: string | null
    estimatedMinutes?: number | null
    attemptsAllowed?: number | null
    template?: {
      id: string
      name: string
      code?: string | null
      category: string | null
      rendererKey: string | null
    } | null
    curriculumLinks?: Array<{
      id?: string
      isPrimary: boolean
      curriculumYear: { id?: string; yearLevel: number; name: string | null } | null
      remedialSkill: { id?: string; code?: string | null; name: string } | null
      contentStandard?: { id: string; code: string; title: string } | null
      learningStandard?: { id: string; code: string } | null
      learningObjective?: { id: string; code: string | null; description: string } | null
    }>
    items?: Array<{ id: string }>
    media?: Array<{
      id: string
      mediaRole: string
      url: string
      altText: string | null
      label: string | null
    }>
  }>
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

type ActivityPreviewPayload = {
  activity?: ActivityPreview & {
    status: string
    programme: {
      id: string
      code: string
      name: string
      version: {
        id: string
        code: string | null
        name: string | null
        status: string | null
      } | null
    } | null
    curriculumLinks: Array<{
      id: string
      isPrimary: boolean
      curriculumYear: { id?: string; yearLevel: number; name: string | null } | null
      remedialSkill: { id?: string; code?: string | null; name: string } | null
      contentStandard: { id: string; code: string; title: string } | null
      learningStandard: { id: string; code: string } | null
      learningObjective: { id: string; code: string | null; description: string } | null
    }>
  }
}

type ActivityDetailPayload = {
  activity?: {
    id: string
    title: string
    status: string
    updatedAt: string
    createdAt: string
    publishedAt: string | null
    description?: string | null
    instructions?: string | null
    estimatedMinutes?: number | null
    attemptsAllowed?: number | null
    template?: {
      id: string
      name: string
      code?: string | null
      category: string | null
      rendererKey: string | null
    } | null
    curriculumLinks?: Array<{
      id?: string
      isPrimary: boolean
      curriculumYear: { id?: string; yearLevel: number; name: string | null } | null
      remedialSkill: { id?: string; code?: string | null; name: string } | null
      contentStandard?: { id: string; code: string; title: string } | null
      learningStandard?: { id: string; code: string } | null
      learningObjective?: { id: string; code: string | null; description: string } | null
    }>
    items?: Array<{ id: string }>
    media?: Array<{
      id: string
      mediaRole: string
      url: string
      altText: string | null
      label: string | null
    }>
  }
}

function normalizeTeacherActivityRecord(record: NonNullable<ListActivitiesPayload["activities"]>[number]): TeacherActivityRecord {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
    publishedAt: record.publishedAt,
    description: record.description ?? null,
    instructions: record.instructions ?? null,
    estimatedMinutes: record.estimatedMinutes ?? null,
    attemptsAllowed: record.attemptsAllowed ?? null,
    template: record.template ?? null,
    curriculumLinks: record.curriculumLinks ?? [],
    items: record.items ?? [],
    media: record.media ?? [],
  }
}

function buildTeacherActivitySearchParams(domain: TeacherActivityDomain, query: Partial<TeacherActivityListQuery>) {
  const categories = getTeacherActivityBackendTemplateCategories(domain)
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") return
    params.set(key, String(value))
  })

  if (categories.length > 0) {
    params.set("templateCategories", categories.join(","))
  }

  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

function emptyTeacherActivityListResult(page: number, limit: number): TeacherActivityListResult {
  return {
    items: [],
    meta: {
      page,
      limit,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: page > 1,
    },
  }
}

export async function listTeacherActivities(
  domain: TeacherActivityDomain,
  query: TeacherActivityListQuery,
): Promise<TeacherActivityListResult> {
  if (getTeacherActivityBackendTemplateCategories(domain).length === 0) {
    return emptyTeacherActivityListResult(query.page, query.limit)
  }

  const payload = await apiRequest<ListActivitiesPayload>(`/digital-activities${buildTeacherActivitySearchParams(domain, query)}`)
  const items = (payload.activities ?? []).map(normalizeTeacherActivityRecord)
  const pagination = payload.pagination ?? {
    page: query.page,
    limit: query.limit,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / Math.max(query.limit, 1))),
    hasNextPage: false,
    hasPreviousPage: query.page > 1,
  }

  return {
    items,
    meta: pagination,
  }
}

export async function getTeacherActivityPreview(activityId: string): Promise<TeacherActivityPreviewRecord> {
  const payload = await apiRequest<ActivityPreviewPayload>(`/digital-activities/${activityId}/preview`)

  if (!payload.activity) {
    throw new Error("TEACHER_ACTIVITY_PREVIEW_NOT_FOUND")
  }

  return payload.activity as TeacherActivityPreviewRecord
}

export async function getTeacherActivityDetail(activityId: string): Promise<TeacherActivityDetailRecord> {
  const payload = await apiRequest<ActivityDetailPayload>(`/digital-activities/${activityId}`)

  if (!payload.activity) {
    throw new Error("TEACHER_ACTIVITY_NOT_FOUND")
  }

  return normalizeTeacherActivityRecord(payload.activity)
}
