import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  getTeacherActivityBackendTemplateCategories,
  getTeacherActivityCardSummary,
  getTeacherActivityCategoryLabel,
  getTeacherActivityCountLabel,
  getTeacherActivityFilterOptions,
  getTeacherActivityPreviewMeta,
  getTeacherActivityResetQuery,
  getTeacherActivityTemplateLabel,
  teacherActivityDomains,
  teacherActivityQueryFromSearchParams,
  type TeacherActivityRecord,
} from "@/features/teacher/utils/teacher-activity"

const sampleActivities: TeacherActivityRecord[] = [
  {
    id: "activity-1",
    title: "Seret Suku Kata",
    status: "PUBLISHED",
    updatedAt: "2026-08-10T09:00:00.000Z",
    createdAt: "2026-08-09T09:00:00.000Z",
    publishedAt: "2026-08-10T10:00:00.000Z",
    description: "Lengkapkan perkataan dengan menyeret suku kata yang betul.",
    instructions: "Pilih jawapan yang sesuai.",
    estimatedMinutes: 10,
    template: {
      id: "template-1",
      name: "Arrange Syllables",
      code: "ARRANGE_SYLLABLES",
      category: "ARRANGEMENT",
      rendererKey: "arrange-syllables",
    },
    curriculumLinks: [
      {
        isPrimary: true,
        curriculumYear: { id: "year-2", yearLevel: 2, name: "Tahun 2" },
        remedialSkill: { id: "kp-4", code: "KP04", name: "Suku kata KV" },
      },
    ],
    items: [{ id: "item-1" }, { id: "item-2" }],
    media: [],
  },
  {
    id: "activity-2",
    title: "Latihan Menulis",
    status: "PUBLISHED",
    updatedAt: "2026-08-10T09:00:00.000Z",
    createdAt: "2026-08-09T09:00:00.000Z",
    publishedAt: "2026-08-10T10:00:00.000Z",
    description: "Salin semula perkataan.",
    instructions: "Ikut panduan yang dipaparkan.",
    estimatedMinutes: 8,
    template: {
      id: "template-2",
      name: "Copy Writing",
      code: "COPY_WRITING",
      category: "WRITING",
      rendererKey: "copy-writing",
    },
    curriculumLinks: [
      {
        isPrimary: true,
        curriculumYear: { id: "year-1", yearLevel: 1, name: "Tahun 1" },
        remedialSkill: { id: "kp-8", code: "KP08", name: "Menyalin perkataan" },
      },
    ],
    items: [{ id: "item-3" }],
    media: [],
  },
]

describe("Teacher activity library", () => {
  it("keeps the teacher discovery domains aligned with the existing template contract", () => {
    expect(teacherActivityDomains.map((domain) => domain.label)).toEqual(["Membaca", "Menulis", "Mengira"])
    expect(getTeacherActivityBackendTemplateCategories("READING")).toEqual(["READING", "ARRANGEMENT"])
    expect(getTeacherActivityBackendTemplateCategories("WRITING")).toEqual(["WRITING"])
    expect(getTeacherActivityBackendTemplateCategories("NUMERACY")).toEqual([])

    const teacherUtilsSource = readFileSync(
      new URL("../src/features/teacher/utils/teacher-activity.ts", import.meta.url),
      "utf8",
    )

    expect(teacherUtilsSource).toContain("BookOpen")
    expect(teacherUtilsSource).toContain("PencilLine")
    expect(teacherUtilsSource).toContain("Calculator")
  })

  it("parses teacher activity query params from the URL and resets cleanly", () => {
    const query = teacherActivityQueryFromSearchParams(new URLSearchParams("page=2&search=suku&curriculumYearId=year-2&remedialSkillId=kp-4&activityTemplateId=template-1"))

    expect(query.page).toBe(2)
    expect(query.search).toBe("suku")
    expect(query.curriculumYearId).toBe("year-2")
    expect(query.remedialSkillId).toBe("kp-4")
    expect(query.activityTemplateId).toBe("template-1")
    expect(getTeacherActivityResetQuery()).toEqual({
      page: 1,
      limit: 12,
      search: undefined,
      curriculumYearId: undefined,
      remedialSkillId: undefined,
      activityTemplateId: undefined,
    })
  })

  it("derives real filter options from persisted activity metadata", () => {
    const options = getTeacherActivityFilterOptions(sampleActivities)

    expect(options.years.map((entry) => entry.label)).toEqual(["Tahun 1", "Tahun 2"])
    expect(options.skills.map((entry) => entry.label)).toEqual(["Menyalin perkataan", "Suku kata KV"])
    expect(options.templates.map((entry) => entry.label)).toEqual(["Copy Writing", "Seret Suku Kata"])
  })

  it("keeps real labels for count and arrange-syllables template cards", () => {
    expect(getTeacherActivityCountLabel(0)).toBe("0 Aktiviti Aktif")
    expect(getTeacherActivityTemplateLabel(sampleActivities[0].template)).toBe("Seret Suku Kata")
    expect(getTeacherActivityCategoryLabel(sampleActivities[0].template)).toBe("Membaca")
    expect(getTeacherActivityCategoryLabel(sampleActivities[1].template)).toBe("Menulis")
    expect(getTeacherActivityCategoryLabel(null)).toBe("Tidak tersedia")
  })

  it("restores the teacher card thumbnail fallback and keeps arrangement templates in membaca", () => {
    const summary = getTeacherActivityCardSummary(sampleActivities[0])

    expect(summary.categoryLabel).toBe("Membaca")
    expect(summary.thumbnail).toEqual({
      src: "/src/assets/images/img_.seret.png",
      alt: "Templat Seret Suku Kata",
    })
  })

  it("does not crash preview metadata when curriculum links are absent from the preview contract", () => {
    expect(() => getTeacherActivityPreviewMeta({
      template: {
        code: "ARRANGE_SYLLABLES",
        version: 1,
        rendererKey: "arrange-syllables",
      },
    })).not.toThrow()

    expect(getTeacherActivityPreviewMeta({
      template: {
        code: "ARRANGE_SYLLABLES",
        version: 1,
        rendererKey: "arrange-syllables",
      },
    })).toEqual({
      yearLabel: null,
      skillLabel: null,
      templateLabel: "Seret Suku Kata",
    })
  })

  it("keeps dedicated teacher library and preview entry points in source and routes", () => {
    const routeSource = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8")
    const pageSource = readFileSync(new URL("../src/features/teacher/pages/TeacherActivityPages.tsx", import.meta.url), "utf8")
    const hookSource = readFileSync(new URL("../src/features/teacher/hooks/use-teacher-activities.ts", import.meta.url), "utf8")

    expect(routeSource).toContain('{ path: "aktiviti", element: <TeacherActivityLibraryPage /> }')
    expect(routeSource).toContain('{ path: "aktiviti/:category", element: <TeacherActivityCategoryPage /> }')
    expect(routeSource).toContain('{ path: "aktiviti/:activityId/pratonton", element: <TeacherActivityPreviewPage /> }')
    expect(routeSource).toContain('{ path: "aktiviti/:activityId/tugaskan", element: <TeacherActivityAssignmentPage /> }')
    expect(pageSource).toContain("Aktiviti Pembelajaran")
    expect(pageSource).toContain("Lihat Aktiviti")
    expect(pageSource).toContain("ManagementPageLayout")
    expect(pageSource).toContain('{ label: "Home", to: "/guru" }')
    expect(pageSource).toContain('{ label: "Aktiviti" }')
    expect(pageSource).toContain("flex flex-col gap-3 xl:flex-row xl:items-center")
    expect(pageSource).toContain("getTeacherActivityResultRange(listQuery.data.meta)")
    expect(pageSource).toContain("limit: 100")
    expect(pageSource).toContain("items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3")
    expect(pageSource).toContain("rounded-2xl border-border bg-card py-0 shadow-sm")
    expect(pageSource).toContain("h-11 w-full rounded-xl px-5 font-semibold")
    expect(pageSource).toContain('state={{ from: `/guru/aktiviti/${teacherActivityDomainToSlug(activity.template?.category === "WRITING" ? "WRITING" : "READING")}` }}')
    expect(pageSource).toContain("useTeacherActivityDetail(activityId)")
    expect(pageSource).not.toContain("limit: 200")
    expect(hookSource).toContain('detail: (activityId: string) => ["teacher", "activity-library", "detail", activityId] as const')
    expect(pageSource).toContain("isAvailable ? (")
    expect(pageSource).toContain('aria-label={`${definition.label} akan datang dan belum tersedia`}')
    expect(pageSource).toContain("Akan Datang")
    expect(pageSource).toContain("Tidak pasti bidang yang sesuai?")
    expect(pageSource).toContain("Pratonton Aktiviti")
    expect(pageSource).toContain("Tugaskan")
    expect(pageSource).toContain('Link to={`/guru/aktiviti/${activity.id}/tugaskan`}')
	    expect(pageSource).toContain("Tugaskan Aktiviti")
	    expect(pageSource).toContain("Pilih murid dan tetapan tugasan sebelum menghantar aktiviti.")
	    expect(pageSource).toContain("AssignmentSectionHeader")
	    expect(pageSource).toContain("meta?: ReactNode")
	    expect(pageSource).toContain("number={1}")
	    expect(pageSource).toContain('title="Pilih Murid"')
	    expect(pageSource).toContain('description="Pilih kelas atau cari murid yang ingin menerima tugasan."')
	    expect(pageSource).toContain('meta={`${selectionCount} murid dipilih`}')
	    expect(pageSource).toContain("number={2}")
	    expect(pageSource).toContain('title="Tetapan Tugasan"')
    expect(pageSource).toContain("number={3}")
    expect(pageSource).toContain('title="Semak Sebelum Hantar"')
    expect(pageSource).toContain('title: "Semak & Hantar"')
    expect(pageSource).toContain("Pilih murid sasaran")
    expect(pageSource).toContain("Tetapkan tarikh & arahan")
    expect(pageSource).toContain("Semak dan hantar tugasan")
    expect(pageSource).toContain("Tugaskan kepada seluruh kelas")
    expect(pageSource).toContain("Sesuai dengan tahap murid")
    expect(pageSource).toContain("Tahap murid berbeza")
	    expect(pageSource).toContain("ActivitySummaryCard")
	    expect(pageSource).toContain("Ringkasan Aktiviti")
	    expect(pageSource).not.toContain("Templat Dipilih")
	    expect(pageSource).toContain("Cari Murid")
	    expect(pageSource).not.toContain("<p className=\"text-sm font-medium text-foreground\">Murid Dipilih</p>")
	    expect(pageSource).not.toContain("Sedia untuk ditugaskan")
	    expect(pageSource).toContain("ID murid tidak tersedia")
	    expect(pageSource).toContain("Tahap Pemulihan:")
	    expect(pageSource).toContain("Belum ditetapkan")
	    expect(pageSource).toContain('aria-label={`Pilih ${student.fullName}`}')
	    expect(pageSource).toContain('aria-label="Pilih semua murid"')
	    expect(pageSource).toContain("lg:grid-cols-[minmax(0,1fr)_7.5rem_10.5rem]")
	    expect(pageSource).toContain("border-l-primary bg-primary/5")
	    expect(pageSource).toContain("font-semibold text-foreground")
	    expect(pageSource).toContain("rounded-full text-xs")
	    expect(pageSource).toContain("Memaparkan")
	    expect(pageSource).toContain("? `${students.length} murid`")
	    expect(pageSource).toContain("Arahan Guru (Pilihan)")
    expect(pageSource).toContain("Had percubaan mengikut tetapan aktiviti")
    expect(pageSource).toContain("Semak Sebelum Hantar")
    expect(pageSource).toContain("Sesetengah murid mempunyai tahap pemulihan berbeza. Sila semak sebelum menghantar tugasan.")
    expect(pageSource).toContain("Menghantar Tugasan...")
    expect(pageSource).toContain("border-destructive/30 bg-destructive/10 text-destructive")
    expect(pageSource).toContain("text-destructive")
    expect(pageSource).toContain("<dl className=\"space-y-3 text-sm\">")
    expect(pageSource).toContain("sm:flex-row sm:items-center sm:justify-between")
    expect(pageSource).toContain("rounded-2xl border-border bg-card py-0 shadow-sm")
    expect(pageSource).toContain("overflow-hidden rounded-2xl border border-border bg-card")
    expect(pageSource).toContain("rounded-lg bg-muted/30 px-3 py-2")
    expect(pageSource).toContain("rows={3}")
    expect(pageSource).toContain("sm:flex-row sm:justify-end")
    expect(pageSource).toContain("SendHorizonal")
    expect(pageSource).toContain('teacherPost("/assignments", body)')
    expect(pageSource).toContain("navigate(`/guru/tugasan/${assignment.id}`)")
    expect(pageSource).toContain("teacherAssignmentBackPath")
    expect(pageSource).toContain("useTeacherClassList({")
    expect(pageSource).toContain("useTeacherStudentList({")
    expect(pageSource).not.toContain("getTeacherActivityDomainDescription(domain)")
    expect(pageSource).not.toContain("Aktiviti literasi membaca yang telah diterbitkan untuk murid.")
    expect(pageSource).not.toContain("Cipta Aktiviti")
    expect(pageSource).not.toContain("Padam")
    expect(pageSource).not.toContain("Terbitkan")
  })
})
