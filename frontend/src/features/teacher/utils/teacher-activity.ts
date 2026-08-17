import {
  Calculator,
  Clock3,
  BookOpen,
  PencilLine,
  type LucideIcon,
} from "lucide-react"

import type { ActivityPreview } from "@/features/activity-player/types"
import {
  getAdminActivityResultRange,
  getAdminActivityTemplateThumbnail,
  getAdminActivityThumbnail,
} from "@/features/admin/utils/admin-activity"

export type TeacherActivityDomain = "READING" | "WRITING" | "NUMERACY"

export type TeacherActivityRecord = {
  id: string
  title: string
  status: string
  updatedAt: string
  createdAt: string
  publishedAt: string | null
  description: string | null
  instructions: string | null
  estimatedMinutes: number | null
  attemptsAllowed?: number | null
  template: {
    id: string
    name: string
    code?: string | null
    category: string | null
    rendererKey: string | null
  } | null
  curriculumLinks: Array<{
    id?: string
    isPrimary: boolean
    curriculumYear: { id?: string; yearLevel: number; name: string | null } | null
    remedialSkill: { id?: string; code?: string | null; name: string } | null
    contentStandard?: { id: string; code: string; title: string } | null
    learningStandard?: { id: string; code: string } | null
    learningObjective?: { id: string; code: string | null; description: string } | null
  }>
  items: Array<{ id: string }>
  media: Array<{
    id: string
    mediaRole: string
    url: string
    altText: string | null
    label: string | null
  }>
}

export type TeacherActivityListResult = {
  items: TeacherActivityRecord[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export type TeacherActivityListQuery = {
  page: number
  limit: number
  search?: string
  curriculumYearId?: string
  remedialSkillId?: string
  activityTemplateId?: string
}

export type TeacherActivityOption = {
  id: string
  label: string
}

export type TeacherActivityPreviewRecord = ActivityPreview & {
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

export type TeacherActivityDetailRecord = TeacherActivityRecord

export const teacherActivityDomains: Array<{
  value: TeacherActivityDomain
  label: string
  description: string
  icon: LucideIcon
}> = [
  {
    value: "READING",
    label: "Membaca",
    description: "Aktiviti literasi membaca yang telah diterbitkan untuk murid.",
    icon: BookOpen,
  },
  {
    value: "WRITING",
    label: "Menulis",
    description: "Aktiviti menulis yang sedia dipratonton sebelum tugasan dibuka.",
    icon: PencilLine,
  },
  {
    value: "NUMERACY",
    label: "Mengira",
    description: "Kategori ini akan memaparkan aktiviti sebenar sebaik sahaja templat numerasi diterbitkan.",
    icon: Calculator,
  },
] as const

export const defaultTeacherActivityQuery: TeacherActivityListQuery = {
  page: 1,
  limit: 12,
}

export function getTeacherActivityDomainLabel(domain: TeacherActivityDomain): string {
  return teacherActivityDomains.find((entry) => entry.value === domain)?.label ?? domain
}

export function getTeacherActivityDomainDescription(domain: TeacherActivityDomain): string {
  return teacherActivityDomains.find((entry) => entry.value === domain)?.description ?? ""
}

export function getTeacherActivityBackendTemplateCategories(domain: TeacherActivityDomain): string[] {
  if (domain === "READING") return ["READING", "ARRANGEMENT"]
  if (domain === "WRITING") return ["WRITING"]
  return []
}

export function getTeacherActivityPrimaryCurriculumLink(activity: Pick<TeacherActivityRecord, "curriculumLinks">) {
  return activity.curriculumLinks.find((link) => link.isPrimary) ?? activity.curriculumLinks[0] ?? null
}

export function getTeacherActivityTemplateLabel(template?: {
  name?: string | null
  code?: string | null
  rendererKey?: string | null
} | null): string {
  if (template?.name?.trim() === "Seret Suku Kata") {
    return "Seret Suku Kata"
  }

  if (
    template?.code === "ARRANGE_SYLLABLES"
    || template?.rendererKey === "arrange-syllables"
    || template?.name?.trim() === "Arrange Syllables"
  ) {
    return "Seret Suku Kata"
  }

  if (template?.name?.trim()) return template.name.trim()

  if (template?.code) {
    return template.code
      .toLowerCase()
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ")
  }

  return "Tidak tersedia"
}

export function getTeacherActivityCategoryLabel(template?: {
  category?: string | null
  code?: string | null
  rendererKey?: string | null
  name?: string | null
} | null): string {
  if (
    template?.category === "READING"
    || template?.category === "ARRANGEMENT"
    || template?.code === "ARRANGE_SYLLABLES"
    || template?.rendererKey === "arrange-syllables"
    || template?.name?.trim() === "Seret Suku Kata"
    || template?.name?.trim() === "Arrange Syllables"
  ) {
    return "Membaca"
  }

  if (template?.category === "WRITING") return "Menulis"
  if (template?.category === "NUMERACY") return "Mengira"
  return "Tidak tersedia"
}

export function getTeacherActivityYearLabel(activity: Pick<TeacherActivityRecord, "curriculumLinks">): string | null {
  const yearLevel = getTeacherActivityPrimaryCurriculumLink(activity)?.curriculumYear?.yearLevel
  return typeof yearLevel === "number" ? `Tahun ${yearLevel}` : null
}

export function getTeacherActivitySkillLabel(activity: Pick<TeacherActivityRecord, "curriculumLinks">): string | null {
  return getTeacherActivityPrimaryCurriculumLink(activity)?.remedialSkill?.name ?? null
}

export function getTeacherActivityItemCountLabel(activity: Pick<TeacherActivityRecord, "items">): string {
  const count = activity.items.length
  return `${count} ${count === 1 ? "soalan" : "soalan"}`
}

export function getTeacherActivityDurationLabel(activity: Pick<TeacherActivityRecord, "estimatedMinutes">): string | null {
  if (!activity.estimatedMinutes || activity.estimatedMinutes < 1) return null
  return `${activity.estimatedMinutes} minit`
}

export function getTeacherActivityThumbnail(activity: Pick<TeacherActivityRecord, "media" | "title">): { src: string; alt: string } | null {
  return getAdminActivityThumbnail(activity as never)
}

export function getTeacherActivityCountLabel(total: number): string {
  return `${total} Aktiviti Aktif`
}

export function toTeacherActivitySearchParams(query: Partial<TeacherActivityListQuery>) {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") return
    params.set(key, String(value))
  })

  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

export function teacherActivityQueryFromSearchParams(searchParams: URLSearchParams): TeacherActivityListQuery {
  const page = Number(searchParams.get("page") ?? defaultTeacherActivityQuery.page)
  const limit = Number(searchParams.get("limit") ?? defaultTeacherActivityQuery.limit)

  return {
    page: Number.isFinite(page) && page > 0 ? page : defaultTeacherActivityQuery.page,
    limit: Number.isFinite(limit) && limit > 0 ? limit : defaultTeacherActivityQuery.limit,
    search: searchParams.get("search") ?? undefined,
    curriculumYearId: searchParams.get("curriculumYearId") ?? undefined,
    remedialSkillId: searchParams.get("remedialSkillId") ?? undefined,
    activityTemplateId: searchParams.get("activityTemplateId") ?? undefined,
  }
}

export function getTeacherActivityResetQuery(): TeacherActivityListQuery {
  return {
    ...defaultTeacherActivityQuery,
    search: undefined,
    curriculumYearId: undefined,
    remedialSkillId: undefined,
    activityTemplateId: undefined,
  }
}

export function getTeacherActivityPreviewMeta(preview: {
  curriculumLinks?: TeacherActivityRecord["curriculumLinks"]
  template?: TeacherActivityPreviewRecord["template"] | TeacherActivityRecord["template"] | null
}) {
  const curriculumLinks = preview.curriculumLinks ?? []
  const primaryLink = curriculumLinks.find((link) => link.isPrimary) ?? curriculumLinks[0] ?? null

  return {
    yearLabel: typeof primaryLink?.curriculumYear?.yearLevel === "number" ? `Tahun ${primaryLink.curriculumYear.yearLevel}` : null,
    skillLabel: primaryLink?.remedialSkill?.name ?? null,
    templateLabel: getTeacherActivityTemplateLabel(preview.template),
  }
}

export function getTeacherActivityMetaChips(activity: TeacherActivityRecord): string[] {
  return [
    getTeacherActivitySkillLabel(activity),
    getTeacherActivityYearLabel(activity),
    getTeacherActivityItemCountLabel(activity),
    getTeacherActivityDurationLabel(activity),
  ].filter((value): value is string => Boolean(value))
}

export function getTeacherActivityFilterOptions(activities: TeacherActivityRecord[]) {
  const yearMap = new Map<string, TeacherActivityOption>()
  const skillMap = new Map<string, TeacherActivityOption>()
  const templateMap = new Map<string, TeacherActivityOption>()

  for (const activity of activities) {
    const primaryLink = getTeacherActivityPrimaryCurriculumLink(activity)
    if (primaryLink?.curriculumYear?.id) {
      yearMap.set(primaryLink.curriculumYear.id, {
        id: primaryLink.curriculumYear.id,
        label: `Tahun ${primaryLink.curriculumYear.yearLevel}`,
      })
    }
    if (primaryLink?.remedialSkill?.id) {
      skillMap.set(primaryLink.remedialSkill.id, {
        id: primaryLink.remedialSkill.id,
        label: primaryLink.remedialSkill.name,
      })
    }
    if (activity.template?.id) {
      templateMap.set(activity.template.id, {
        id: activity.template.id,
        label: getTeacherActivityTemplateLabel(activity.template),
      })
    }
  }

  const sortByLabel = (left: TeacherActivityOption, right: TeacherActivityOption) => left.label.localeCompare(right.label, "ms")

  return {
    years: [...yearMap.values()].sort(sortByLabel),
    skills: [...skillMap.values()].sort(sortByLabel),
    templates: [...templateMap.values()].sort(sortByLabel),
  }
}

export function getTeacherActivityCardSummary(activity: TeacherActivityRecord) {
  return {
    categoryLabel: getTeacherActivityCategoryLabel(activity.template),
    templateLabel: getTeacherActivityTemplateLabel(activity.template),
    thumbnail: getTeacherActivityThumbnail(activity) ?? getAdminActivityTemplateThumbnail(activity.template),
    chips: getTeacherActivityMetaChips(activity),
  }
}

export const teacherActivityClockIcon = Clock3
export const getTeacherActivityResultRange = getAdminActivityResultRange
