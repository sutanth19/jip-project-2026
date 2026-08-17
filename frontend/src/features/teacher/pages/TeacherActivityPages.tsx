import { type ReactNode, useMemo, useState } from "react"
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Eye, Info, Layers3, Search, SendHorizonal } from "lucide-react"
import { useMutation } from "@tanstack/react-query"

import { EmptyState, ErrorState, LoadingSpinner, ManagementPageLayout, PageContainer, PageHeader, Pagination, SearchInput } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ActivitySummaryCard } from "@/features/admin/components/ActivitySummaryCard"
import { activityTypeToneClasses } from "@/features/admin/utils/admin-activity-type"
import { getAdminActivityPlaceholderIcon } from "@/features/admin/utils/admin-activity"
import { ActivityProvider } from "@/features/activity-player/ActivityContext"
import { ActivityRenderer } from "@/features/activity-player/ActivityRenderer"
import { useTeacherClassList } from "@/features/teacher/hooks/use-teacher-class-list"
import { useTeacherStudentList } from "@/features/teacher/hooks/use-teacher-student-list"
import { teacherPost } from "@/features/teacher/api/teacher.api"
import { useTeacherActivityCategoryCounts, useTeacherActivityDetail, useTeacherActivityList, useTeacherActivityPreview } from "@/features/teacher/hooks/use-teacher-activities"
import type { TeacherClassListItem } from "@/features/teacher/types/teacher-class.types"
import type { TeacherStudentListItem } from "@/features/teacher/types/teacher-student.types"
import { teacherStudentInitials } from "@/features/teacher/utils/teacher-student"
import {
  defaultTeacherActivityQuery,
  getTeacherActivityCardSummary,
  getTeacherActivityCategoryLabel,
  getTeacherActivityCountLabel,
  getTeacherActivityDomainLabel,
  getTeacherActivityFilterOptions,
  getTeacherActivityPreviewMeta,
  getTeacherActivityResultRange,
  getTeacherActivityResetQuery,
  teacherActivityDomains,
  teacherActivityQueryFromSearchParams,
  type TeacherActivityDomain,
  type TeacherActivityListQuery,
  type TeacherActivityRecord,
} from "@/features/teacher/utils/teacher-activity"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth-store"
import { teacherAssignmentCreateErrorMessage } from "@/features/teacher/utils/teacher-assignment"

type TeacherAssignmentMutationResult = {
  assignment?: {
    id?: string
  }
}

function teacherActivityDomainFromSlug(slug: string | undefined): TeacherActivityDomain | null {
  if (slug === "membaca") return "READING"
  if (slug === "menulis") return "WRITING"
  if (slug === "mengira") return "NUMERACY"
  return null
}

function teacherActivityDomainToSlug(domain: TeacherActivityDomain): string {
  if (domain === "READING") return "membaca"
  if (domain === "WRITING") return "menulis"
  return "mengira"
}

function TeacherActivityCategoryCard({
  domain,
  count,
}: {
  domain: TeacherActivityDomain
  count: number
}) {
  const definition = teacherActivityDomains.find((entry) => entry.value === domain)

  if (!definition) return null

  const Icon = definition.icon
  const isAvailable = domain !== "NUMERACY"
  const tone = domain === "READING"
    ? activityTypeToneClasses.primary
    : domain === "WRITING"
      ? activityTypeToneClasses.success
      : activityTypeToneClasses.muted

  return (
    <Card
      className={cn(
        "h-full rounded-2xl border-border bg-card py-0 shadow-sm transition-colors",
        isAvailable ? "hover:border-primary/25" : "hover:border-border",
      )}
    >
      <CardContent className="flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl border", tone.icon)}>
            <Icon className="size-5" aria-hidden="true" />
          </div>
          {isAvailable ? (
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
              {getTeacherActivityCountLabel(count)}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-border bg-muted text-muted-foreground"
              aria-label={`${definition.label} akan datang dan belum tersedia`}
            >
              Akan Datang
            </Badge>
          )}
        </div>

        <div className="mt-5 space-y-2">
          <CardTitle className="text-xl font-semibold tracking-tight text-foreground">{definition.label}</CardTitle>
          <CardDescription className="text-sm leading-6 text-muted-foreground">
            {definition.description}
          </CardDescription>
        </div>

        <div className="mt-auto pt-6">
          {isAvailable ? (
            <Button
              asChild
              className={cn("h-11 w-full rounded-xl px-5 font-semibold shadow-sm", tone.button)}
            >
              <Link to={`/guru/aktiviti/${teacherActivityDomainToSlug(domain)}`}>
                Lihat Aktiviti
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              disabled
              variant="outline"
              className="h-11 w-full rounded-xl px-5 font-semibold"
              aria-describedby={`teacher-${domain.toLowerCase()}-unavailable-note`}
            >
              Lihat Aktiviti
            </Button>
          )}
        </div>

        {!isAvailable ? (
          <p id={`teacher-${domain.toLowerCase()}-unavailable-note`} className="sr-only">
            {definition.label} belum tersedia dalam fasa ini.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function TeacherActivityLibraryInfoCard() {
  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="flex items-start gap-4 p-5 sm:p-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
          <Info className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Tidak pasti bidang yang sesuai?</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Membaca memfokuskan aktiviti literasi membaca, manakala Menulis memfokuskan aktiviti penghasilan dan latihan tulisan untuk murid.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function TeacherActivityLibraryPage() {
  const countsQuery = useTeacherActivityCategoryCounts()

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/guru" },
        { label: "Aktiviti" },
      ]}
      title="Aktiviti Pembelajaran"
      description="Pilih bidang untuk melihat aktiviti yang tersedia untuk murid."
    >
      {countsQuery.isLoading ? (
        <div className="grid min-h-48 place-items-center">
          <LoadingSpinner label="Memuatkan ringkasan aktiviti..." />
        </div>
      ) : null}

      {countsQuery.isError ? (
        <ErrorState
          title="Aktiviti tidak dapat dimuatkan"
          description="Sila cuba semula."
          actionLabel="Cuba Lagi"
          onAction={() => {
            countsQuery.queries.forEach((query) => {
              void query.refetch()
            })
          }}
        />
      ) : null}

      {!countsQuery.isLoading && !countsQuery.isError ? (
        <div className="space-y-6">
          <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
            {teacherActivityDomains.map((domain) => (
              <TeacherActivityCategoryCard
                key={domain.value}
                domain={domain.value}
                count={countsQuery.counts[domain.value]}
              />
            ))}
          </div>

          <TeacherActivityLibraryInfoCard />
        </div>
      ) : null}
    </ManagementPageLayout>
  )
}

function TeacherActivityCard({ activity }: { activity: TeacherActivityRecord }) {
  const summary = getTeacherActivityCardSummary(activity)

  return (
    <Card className="h-full overflow-hidden rounded-2xl border border-border bg-card py-0 shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/15">
      <div className="aspect-[16/9] border-b border-border bg-muted/50">
        {summary.thumbnail ? (
          <img
            src={summary.thumbnail.src}
            alt={summary.thumbnail.alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted via-card to-muted/60 text-muted-foreground">
            {getAdminActivityPlaceholderIcon(activity.template?.category)}
          </div>
        )}
      </div>
      <div className="flex h-full flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{summary.categoryLabel}</Badge>
          <Badge variant="secondary">{summary.templateLabel}</Badge>
        </div>
        <div className="mt-4 space-y-2">
          <CardTitle className="text-lg">{activity.title}</CardTitle>
          {activity.description ? (
            <CardDescription className="line-clamp-3 text-sm leading-6">
              {activity.description}
            </CardDescription>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.chips.map((chip) => (
            <Badge key={chip} variant="outline" className="rounded-full">
              {chip}
            </Badge>
          ))}
        </div>
        <div className="mt-auto space-y-3 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-11 rounded-xl px-4 font-semibold">
              <Link
                to={`/guru/aktiviti/${activity.id}/pratonton`}
                state={{ from: `/guru/aktiviti/${teacherActivityDomainToSlug(activity.template?.category === "WRITING" ? "WRITING" : "READING")}` }}
              >
                <Eye className="size-4" aria-hidden="true" />
                Pratonton
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-11 rounded-xl px-4 font-semibold">
              <Link to={`/guru/aktiviti/${activity.id}/tugaskan`}>
                Tugaskan
              </Link>
            </Button>
          </div>
          <p id={`teacher-activity-assign-help-${activity.id}`} className="text-xs text-muted-foreground">
            Tugaskan aktiviti ini kepada murid atau seluruh kelas anda.
          </p>
        </div>
      </div>
    </Card>
  )
}

function TeacherActivityFilters({
  query,
  onChange,
  allActivities,
}: {
  query: TeacherActivityListQuery
  onChange: (next: Partial<TeacherActivityListQuery>) => void
  allActivities: TeacherActivityRecord[]
}) {
  const options = useMemo(() => getTeacherActivityFilterOptions(allActivities), [allActivities])

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <SearchInput
          value={query.search ?? ""}
          onChange={(value) => onChange({ search: value || undefined, page: 1 })}
          placeholder="Cari tajuk aktiviti..."
        />

        <Select
          value={query.curriculumYearId ?? "all"}
          onValueChange={(value) => onChange({ curriculumYearId: value === "all" ? undefined : value, page: 1 })}
        >
          <SelectTrigger aria-label="Tapis mengikut tahun" className="!bg-background/40 sm:w-44">
            <SelectValue placeholder="Semua Tahun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahun</SelectItem>
            {options.years.map((option) => (
              <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.remedialSkillId ?? "all"}
          onValueChange={(value) => onChange({ remedialSkillId: value === "all" ? undefined : value, page: 1 })}
        >
          <SelectTrigger aria-label="Tapis mengikut kemahiran pemulihan" className="!bg-background/40 sm:w-64">
            <SelectValue placeholder="Semua Kemahiran Pemulihan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kemahiran Pemulihan</SelectItem>
            {options.skills.map((option) => (
              <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.activityTemplateId ?? "all"}
          onValueChange={(value) => onChange({ activityTemplateId: value === "all" ? undefined : value, page: 1 })}
        >
          <SelectTrigger aria-label="Tapis mengikut templat" className="!bg-background/40 sm:w-64">
            <SelectValue placeholder="Semua Templat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Templat</SelectItem>
            {options.templates.map((option) => (
              <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => onChange(getTeacherActivityResetQuery())}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

function isoStartOfDay(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString()
}

function isoEndOfDay(date: string): string {
  return new Date(`${date}T23:59:59`).toISOString()
}

function remedialSkillMatchLabel(activitySkillId: string | null, student: TeacherStudentListItem) {
  if (!activitySkillId || !student.remedialSkill?.id) {
    return {
      tone: "neutral" as const,
      label: "Tahap murid belum lengkap",
      icon: <Info className="size-3.5" aria-hidden="true" />,
    }
  }

  if (student.remedialSkill.id === activitySkillId) {
    return {
      tone: "success" as const,
      label: "Sesuai dengan tahap murid",
      icon: <CheckCircle2 className="size-3.5" aria-hidden="true" />,
    }
  }

  return {
    tone: "warning" as const,
    label: "Tahap murid berbeza",
    icon: <AlertTriangle className="size-3.5" aria-hidden="true" />,
  }
}

function assignmentBadgeClass(tone: "success" | "warning" | "neutral") {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
  if (tone === "warning") return "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/15 dark:text-destructive"
  return "border-border bg-muted text-muted-foreground"
}

function assignmentStatusLabel(tone: "success" | "warning" | "neutral") {
  if (tone === "success") return "Sesuai"
  if (tone === "warning") return "Tahap Berbeza"
  return "Belum Lengkap"
}

function teacherAssignmentBackPath(templateCategory: string | null | undefined) {
  return `/guru/aktiviti/${teacherActivityDomainToSlug(templateCategory === "WRITING" ? "WRITING" : "READING")}`
}

function AssignmentSectionHeader({
  number,
  title,
  description,
  meta,
}: {
  number: number
  title: string
  description: string
  meta?: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {number} {title}
        </h2>
        {meta ? <div className="text-sm font-medium text-foreground">{meta}</div> : null}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

export function TeacherActivityAssignmentPage() {
  const activityId = useParams().activityId ?? ""
  const navigate = useNavigate()
  const school = useAuthStore((state) => state.school)
  const activityQuery = useTeacherActivityDetail(activityId)
  const classList = useTeacherClassList({
    page: 1,
    limit: 100,
    status: "ACTIVE",
    sortBy: "className",
    sortOrder: "asc",
  }, Boolean(school?.id))
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [assignWholeClass, setAssignWholeClass] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [teacherInstructions, setTeacherInstructions] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)

  const studentList = useTeacherStudentList({
    page: 1,
    limit: 100,
    classId: selectedClassId || undefined,
    search: studentSearch.trim() || undefined,
    status: "ACTIVE",
    sortBy: "fullName",
    sortOrder: "asc",
  }, Boolean(school?.id))

  const assignmentMutation = useMutation<TeacherAssignmentMutationResult, Error, Record<string, unknown>>({
    mutationFn: (body) => teacherPost("/assignments", body) as Promise<TeacherAssignmentMutationResult>,
    onSuccess: (payload) => {
      const assignment = payload.assignment
      if (typeof assignment?.id === "string") {
        navigate(`/guru/tugasan/${assignment.id}`)
        return
      }
      navigate("/guru/tugasan")
    },
  })

  if (!activityId) {
    return <Navigate to="/guru/aktiviti" replace />
  }

  const activity = activityQuery.data
  const classes = classList.data?.classes ?? []
  const students = studentList.data?.students ?? []
  const primaryLink = activity?.curriculumLinks.find((link) => link.isPrimary) ?? activity?.curriculumLinks[0] ?? null
  const activitySkill = primaryLink?.remedialSkill ?? null
  const yearLabel = primaryLink?.curriculumYear?.yearLevel ? `Tahun ${primaryLink.curriculumYear.yearLevel}` : null
  const selectedClass = classes.find((entry) => entry.id === selectedClassId) ?? null
  const backPath = teacherAssignmentBackPath(activity?.template?.category)
  const selectedStudents = students.filter((student) => selectedStudentIds.includes(student.id))
  const selectionCount = assignWholeClass && selectedClass ? students.length : selectedStudents.length
  const unresolvedCount = (assignWholeClass ? students : selectedStudents)
    .filter((student) => remedialSkillMatchLabel(activitySkill?.id ?? null, student).tone === "neutral")
    .length
  const mismatchCount = (assignWholeClass ? students : selectedStudents)
    .filter((student) => remedialSkillMatchLabel(activitySkill?.id ?? null, student).tone === "warning")
    .length
  const matchedCount = Math.max(selectionCount - mismatchCount, 0)
  const hasDateError = Boolean(startDate && dueDate && dueDate < startDate)
  const canSubmit = Boolean(activity && activity.status === "PUBLISHED" && (assignWholeClass ? selectedClassId : selectedStudentIds.length > 0) && !hasDateError && !assignmentMutation.isPending)
  const activitySummaryRows = activity ? [
    { label: "Nama Aktiviti", value: activity.title },
    { label: "Bidang", value: getTeacherActivityCategoryLabel(activity.template) },
    { label: "Kemahiran", value: activitySkill ? `${activitySkill.code ?? ""}${activitySkill.code ? " · " : ""}${activitySkill.name}` : "Tidak tersedia" },
    { label: "Tahun", value: yearLabel ?? "Tidak tersedia" },
    { label: "Templat", value: getTeacherActivityPreviewMeta(activity).templateLabel },
    { label: "Soalan", value: String(activity.items.length) },
    { label: "Had Percubaan", value: `${activity.attemptsAllowed ?? 1} percubaan` },
  ] : []
  const reviewRows = [
    { label: "Murid Dipilih", value: `${selectionCount} murid` },
    { label: "Padanan", value: `${matchedCount} sesuai · ${mismatchCount} tahap berbeza` },
    { label: "Tempoh", value: startDate && dueDate ? `${new Date(`${startDate}T00:00:00`).toLocaleDateString("ms-MY", { day: "2-digit", month: "long", year: "numeric" })} - ${new Date(`${dueDate}T00:00:00`).toLocaleDateString("ms-MY", { day: "2-digit", month: "long", year: "numeric" })}` : "Belum ditetapkan" },
    { label: "Had Percubaan", value: `${activity?.attemptsAllowed ?? 1} percubaan` },
  ]
  const bannerSummary = activity ? getTeacherActivityCardSummary(activity) : null
  const stepItems = [
    { number: 1, title: "Pilih Murid", subtitle: "Pilih murid sasaran" },
    { number: 2, title: "Tetapan Tugasan", subtitle: "Tetapkan tarikh & arahan" },
    { number: 3, title: "Semak & Hantar", subtitle: "Semak dan hantar tugasan" },
  ]

  const toggleStudent = (studentId: string, checked: boolean) => {
    setSelectedStudentIds((current) => {
      if (checked) return [...new Set([...current, studentId])]
      return current.filter((id) => id !== studentId)
    })
  }

  const toggleSelectAll = (checked: boolean) => {
    setSelectedStudentIds(checked ? students.map((student) => student.id) : [])
  }

  const handleSubmit = async () => {
    if (!activity) return
    if (hasDateError) {
      setSubmitError("Tarikh tamat mesti selepas tarikh mula.")
      return
    }
    if (!assignWholeClass && selectedStudentIds.length === 0) {
      setSubmitError("Pilih sekurang-kurangnya seorang murid.")
      return
    }
    if (assignWholeClass && !selectedClassId) {
      setSubmitError("Pilih kelas untuk menugaskan seluruh kelas.")
      return
    }

    setSubmitError(null)
    await assignmentMutation.mutateAsync({
      title: activity.title,
      digitalActivityId: activity.id,
      classIds: assignWholeClass && selectedClassId ? [selectedClassId] : [],
      studentIds: assignWholeClass ? [] : selectedStudentIds,
      instructions: teacherInstructions.trim() || null,
      startAt: startDate ? isoStartOfDay(startDate) : null,
      dueAt: dueDate ? isoEndOfDay(dueDate) : null,
      availableUntil: dueDate ? isoEndOfDay(dueDate) : null,
      isRequired: true,
      attemptsAllowed: activity.attemptsAllowed ?? null,
      showResultsAfterCompletion: false,
    }).catch((error: unknown) => {
      setSubmitError(teacherAssignmentCreateErrorMessage(error))
    })
  }

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/guru" },
        { label: "Aktiviti", to: "/guru/aktiviti" },
        { label: getTeacherActivityCategoryLabel(activity?.template), to: backPath },
        { label: "Tugaskan Aktiviti" },
      ]}
      title="Tugaskan Aktiviti"
      description="Pilih murid dan tetapan tugasan sebelum menghantar aktiviti."
      actions={(
        <Button asChild variant="outline">
          <Link to={backPath}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke Aktiviti
          </Link>
        </Button>
      )}
    >
      {!school?.id ? (
        <div className="mt-6">
          <EmptyState title="Tiada sekolah tersedia" description="Akaun guru ini belum dipautkan kepada sekolah yang aktif." />
        </div>
      ) : null}

      {school?.id && (activityQuery.isLoading || classList.isLoading) ? (
        <div className="grid min-h-48 place-items-center">
          <LoadingSpinner label="Memuatkan borang tugasan..." />
        </div>
      ) : null}

      {school?.id && (activityQuery.isError || classList.isError) ? (
        <ErrorState
          title="Borang tugasan tidak dapat dimuatkan"
          description="Sila cuba semula."
          actionLabel="Cuba Lagi"
          onAction={() => {
            void activityQuery.refetch()
            void classList.refetch()
          }}
        />
      ) : null}

      {school?.id && activity && !activityQuery.isLoading && !activityQuery.isError ? (
        <div className="space-y-8">
          <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <div className="size-24 overflow-hidden rounded-2xl border border-border bg-muted/40">
                  {bannerSummary?.thumbnail ? (
                    <img
                      src={bannerSummary.thumbnail.src}
                      alt={bannerSummary.thumbnail.alt}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted via-card to-muted/60 text-muted-foreground">
                      {getAdminActivityPlaceholderIcon(activity.template?.category)}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">{activity.title}</h2>
                    <p className="text-sm text-muted-foreground">{getTeacherActivityCategoryLabel(activity.template)}</p>
                  </div>
                  {activity.description ? (
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{activity.description}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative py-3">
            <div className="absolute left-12 right-12 top-7 hidden h-px bg-border md:block" aria-hidden="true" />
            <div className="relative z-10 grid gap-4 md:grid-cols-3">
              {stepItems.map((step, index) => (
                <div key={step.number} className="flex flex-col items-center gap-2 px-4 text-center">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-full border text-sm font-semibold shadow-sm",
                    index === 0
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                  )}>
                    {step.number}
                  </div>
                  <div className="space-y-1">
                    <p className={cn("text-sm font-semibold", index === 0 ? "text-primary" : "text-foreground")}>{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
          <div className="space-y-8">
            <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
              <CardContent className="space-y-6 p-5 sm:p-6">
                <AssignmentSectionHeader
                  number={1}
                  title="Pilih Murid"
                  description="Pilih kelas atau cari murid yang ingin menerima tugasan."
                  meta={`${selectionCount} murid dipilih`}
                />

                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)_auto] lg:items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="assignment-class">Kelas</label>
                    <Select
                      value={selectedClassId || "all"}
                      onValueChange={(value) => {
                        const nextClassId = value === "all" ? "" : value
                        setSelectedClassId(nextClassId)
                        setAssignWholeClass(false)
                        setSelectedStudentIds([])
                      }}
                    >
                      <SelectTrigger id="assignment-class" className="rounded-xl">
                        <SelectValue placeholder="Semua Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kelas</SelectItem>
                        {classes.map((schoolClass: TeacherClassListItem) => (
                          <SelectItem key={schoolClass.id} value={schoolClass.id}>
                            {`${schoolClass.yearLevel} ${schoolClass.className}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="assignment-search">Cari Murid</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="assignment-search"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="Cari nama atau ID murid..."
                        className="rounded-xl pl-9"
                      />
                    </div>
                  </div>
                  {!assignWholeClass ? (
                    <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-foreground lg:justify-end">
                      <Checkbox
                        aria-label="Pilih semua murid"
                        checked={students.length > 0 && selectedStudentIds.length === students.length}
                        onCheckedChange={(value) => toggleSelectAll(value === true)}
                      />
                      Pilih Semua
                    </label>
                  ) : null}
                </div>

                {selectedClass ? (
                  <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <Checkbox
                      checked={assignWholeClass}
                      onCheckedChange={(value) => {
                        const checked = value === true
                        setAssignWholeClass(checked)
                        if (checked) setSelectedStudentIds([])
                      }}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-foreground">Tugaskan kepada seluruh kelas</div>
                      <p className="text-sm text-muted-foreground">
                        {`Semua murid aktif dalam ${selectedClass.className} akan menerima tugasan ini.`}
                      </p>
                    </div>
                  </label>
                ) : null}

                {studentList.isLoading ? <LoadingSpinner label="Memuatkan murid..." /> : null}

                {!studentList.isLoading && students.length === 0 ? (
                  <EmptyState title="Tiada murid tersedia" description={selectedClassId ? "Tiada murid tersedia untuk kelas ini." : "Tiada murid aktif ditemui untuk sekolah anda."} />
                ) : null}

                {!studentList.isLoading && students.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
	                    {students.map((student: TeacherStudentListItem) => {
	                      const match = remedialSkillMatchLabel(activitySkill?.id ?? null, student)
	                      return (
	                        <label
	                          key={student.id}
	                          className={cn(
	                            "flex items-center gap-3 border-b border-l-4 border-b-border border-l-transparent px-4 py-3 transition-colors last:border-b-0",
	                            assignWholeClass ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted/20",
	                            selectedStudentIds.includes(student.id) && !assignWholeClass ? "border-l-primary bg-primary/5 ring-1 ring-inset ring-primary/20" : "",
	                          )}
	                        >
	                          <Checkbox
	                            aria-label={`Pilih ${student.fullName}`}
	                            checked={selectedStudentIds.includes(student.id)}
	                            disabled={assignWholeClass}
	                            onCheckedChange={(value) => toggleStudent(student.id, value === true)}
	                          />
	                          <Avatar className="size-10">
	                            {student.avatar ? <AvatarImage src={student.avatar} alt="" /> : null}
	                            <AvatarFallback className="bg-secondary/10 font-semibold text-secondary">
	                              {teacherStudentInitials(student.fullName)}
	                            </AvatarFallback>
	                          </Avatar>
	                          <div className="min-w-0 flex-1">
	                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_7.5rem_10.5rem] lg:items-center">
	                              <div className="min-w-0 space-y-1">
	                                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
	                                  <p className="font-semibold text-foreground">{student.fullName}</p>
	                                  <p className="text-sm text-muted-foreground">{student.studentId || "ID murid tidak tersedia"}</p>
	                                </div>
	                                <div className="flex flex-wrap gap-x-1.5 text-sm">
	                                  <span className="text-muted-foreground">Tahap Pemulihan:</span>
	                                  <span className={student.remedialSkill ? "font-medium text-foreground" : "text-muted-foreground"}>
	                                    {student.remedialSkill ? `${student.remedialSkill.code} · ${student.remedialSkill.name}` : "Belum ditetapkan"}
	                                  </span>
	                                </div>
	                              </div>
	                              <div className="flex items-center lg:justify-end">
	                                <Badge variant="secondary" className="rounded-full text-xs">{student.class ? `Tahun ${student.class.yearLevel} · ${student.class.className}` : "Tiada kelas"}</Badge>
	                              </div>
	                              <div className="flex items-center lg:justify-end">
	                                <Badge variant="outline" className={cn("gap-1 rounded-full text-xs", assignmentBadgeClass(match.tone))}>
	                                  {match.icon}
	                                  {assignmentStatusLabel(match.tone)}
	                                </Badge>
	                              </div>
	                            </div>
	                          </div>
	                        </label>
	                      )
	                    })}
	                  </div>
	                ) : null}

	                {!studentList.isLoading && students.length > 0 ? (
	                  <p className="text-sm text-muted-foreground">
	                    {(studentList.data?.pagination?.total ?? students.length) === students.length
	                      ? `${students.length} murid`
	                      : `Memaparkan ${students.length} daripada ${studentList.data?.pagination?.total ?? students.length} murid`}
	                  </p>
	                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
              <CardContent className="space-y-6 p-5 sm:p-6">
                <AssignmentSectionHeader
                  number={2}
                  title="Tetapan Tugasan"
                  description="Tetapkan tarikh dan arahan untuk tugasan ini."
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="assignment-start-date">Tarikh Mula</label>
                    <Input id="assignment-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="assignment-due-date">Tarikh Tamat</label>
                    <Input id="assignment-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-xl" />
                  </div>
                </div>

                {hasDateError ? (
                  <p className="text-sm text-destructive">Tarikh tamat mesti selepas tarikh mula.</p>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="assignment-instructions">Arahan Guru (Pilihan)</label>
                  <textarea
                    id="assignment-instructions"
                    value={teacherInstructions}
                    onChange={(event) => setTeacherInstructions(event.target.value)}
                    rows={3}
                    className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    placeholder="Tambahkan arahan ringkas untuk murid jika perlu."
                  />
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <Info className="size-4" aria-hidden="true" />
                  {`Had percubaan mengikut tetapan aktiviti: ${activity.attemptsAllowed ?? 1} percubaan.`}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
              <CardContent className="space-y-6 p-5 sm:p-6">
                <AssignmentSectionHeader
                  number={3}
                  title="Semak Sebelum Hantar"
                  description="Semak ringkasan tugasan sebelum menghantarnya."
                />

                <dl className="space-y-3 text-sm">
                  {reviewRows.map((row) => (
                    <div key={row.label} className="flex flex-col gap-1 rounded-xl border border-border bg-background/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="font-semibold text-foreground sm:text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {mismatchCount > 0 || unresolvedCount > 0 ? (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>
                      {mismatchCount > 0
                        ? "Sesetengah murid mempunyai tahap pemulihan berbeza. Sila semak sebelum menghantar tugasan."
                        : "Sesetengah murid belum mempunyai tahap pemulihan yang lengkap. Sila semak senarai di atas."}
                    </p>
                  </div>
                ) : null}
                {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
                {assignmentMutation.error ? <p className="text-sm text-destructive">{assignmentMutation.error.message}</p> : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <ActivitySummaryCard
              icon={ClipboardList}
              title="Ringkasan Aktiviti"
              description="Semak maklumat aktiviti yang akan ditugaskan kepada murid."
              rows={activitySummaryRows}
            />
          </div>
        </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline">
              <Link to={backPath}>Batal</Link>
            </Button>
            <Button type="button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
              <SendHorizonal className="size-4" aria-hidden="true" />
              {assignmentMutation.isPending ? "Menghantar Tugasan..." : "Tugaskan Aktiviti"}
            </Button>
          </div>
        </div>
      ) : null}
    </ManagementPageLayout>
  )
}


export function TeacherActivityCategoryPage() {
  const params = useParams()
  const resolvedDomain = teacherActivityDomainFromSlug(params.category)
  const domain = resolvedDomain ?? "READING"
  const [searchParams, setSearchParams] = useSearchParams()

  const query = teacherActivityQueryFromSearchParams(searchParams)
  const listQuery = useTeacherActivityList(domain, query)
  const filterOptionsQuery = useTeacherActivityList(domain, { ...defaultTeacherActivityQuery, page: 1, limit: 100 })

  if (!resolvedDomain) {
    return <Navigate to="/guru/aktiviti" replace />
  }

  const updateQuery = (next: Partial<TeacherActivityListQuery>) => {
    const merged = { ...query, ...next }
    const normalized = {
      ...merged,
      search: merged.search?.trim() ? merged.search.trim() : undefined,
    }
    const params = new URLSearchParams()

    Object.entries(normalized).forEach(([key, value]) => {
      if (value === undefined || value === "" || (key === "page" && value === defaultTeacherActivityQuery.page) || (key === "limit" && value === defaultTeacherActivityQuery.limit)) {
        return
      }
      params.set(key, String(value))
    })

    setSearchParams(params, { replace: true })
  }

  return (
    <PageContainer>
      <main className="space-y-6">
        <PageHeader
          title={getTeacherActivityDomainLabel(domain)}
          description="Pilih aktiviti yang sesuai dengan tahap dan kemahiran murid."
          actions={(
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/guru/aktiviti">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Kembali ke Aktiviti
                </Link>
              </Button>
            </div>
          )}
        />

        <TeacherActivityFilters
          query={query}
          onChange={updateQuery}
          allActivities={filterOptionsQuery.data?.items ?? []}
        />

        {listQuery.isLoading ? (
          <div className="grid min-h-48 place-items-center">
            <LoadingSpinner label="Memuatkan senarai aktiviti..." />
          </div>
        ) : null}

        {listQuery.isError ? (
          <ErrorState
            title="Senarai aktiviti tidak dapat dimuatkan"
            description="Sila cuba semula."
            actionLabel="Cuba Lagi"
            onAction={() => {
              void listQuery.refetch()
            }}
          />
        ) : null}

        {!listQuery.isLoading && !listQuery.isError && listQuery.data ? (
          <div className="space-y-6">
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-foreground">{getTeacherActivityResultRange(listQuery.data.meta)}</p>
            </div>

            {listQuery.data.items.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {listQuery.data.items.map((activity) => (
                  <TeacherActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Layers3 className="size-5" aria-hidden="true" />}
                title={`Tiada aktiviti ${getTeacherActivityDomainLabel(domain).toLowerCase()} buat masa ini`}
                description="Apabila aktiviti yang sepadan diterbitkan, ia akan dipaparkan di sini untuk dipratonton oleh guru."
              />
            )}

            {listQuery.data.meta.totalPages > 1 ? (
              <Pagination
                page={listQuery.data.meta.page}
                totalPages={listQuery.data.meta.totalPages}
                onPageChange={(page) => updateQuery({ page })}
              />
            ) : null}
          </div>
        ) : null}
      </main>
    </PageContainer>
  )
}

export function TeacherActivityPreviewPage() {
  const activityId = useParams().activityId ?? ""
  const location = useLocation()
  const previewQuery = useTeacherActivityPreview(activityId)
  const detailQuery = useTeacherActivityDetail(activityId)

  if (!activityId) {
    return <Navigate to="/guru/aktiviti" replace />
  }

  const fallbackReturnPath = detailQuery.data
    ? `/guru/aktiviti/${teacherActivityDomainToSlug(
      getTeacherActivityCategoryLabel(detailQuery.data.template) === "Menulis" ? "WRITING" : "READING",
    )}`
    : "/guru/aktiviti"
  const returnPath = typeof location.state === "object" && location.state && "from" in location.state && typeof location.state.from === "string"
    ? location.state.from
    : fallbackReturnPath
  const previewMeta = detailQuery.data ? getTeacherActivityPreviewMeta(detailQuery.data) : null
  const previewError = previewQuery.error instanceof ApiError ? previewQuery.error : null
  const detailError = detailQuery.error instanceof ApiError ? detailQuery.error : null
  const notFoundError = previewError?.status === 404 || detailError?.status === 404
  const forbiddenError = previewError?.status === 403 || detailError?.status === 403
  const isLoading = previewQuery.isLoading || detailQuery.isLoading
  const isError = previewQuery.isError || detailQuery.isError

  return (
    <PageContainer>
      <main className="space-y-6">
        <PageHeader
          title="Pratonton Aktiviti"
          description="Semak aktiviti seperti murid tanpa mengubah kandungan atau tetapan aktiviti."
          actions={(
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link to={returnPath}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Kembali ke Aktiviti
                </Link>
              </Button>
              <Button type="button" variant="secondary" className="rounded-xl" disabled aria-describedby="teacher-preview-assign-help">
                Tugaskan
              </Button>
            </div>
          )}
        />

        <p id="teacher-preview-assign-help" className="text-sm text-muted-foreground">
          Fungsi tugasan akan tersedia pada fasa seterusnya.
        </p>

        {isLoading ? (
          <div className="grid min-h-48 place-items-center">
            <LoadingSpinner label="Memuatkan pratonton aktiviti..." />
          </div>
        ) : null}

        {isError ? (
          <ErrorState
            title={notFoundError ? "Aktiviti tidak ditemui" : forbiddenError ? "Akses tidak dibenarkan" : "Pratonton aktiviti tidak dapat dimuatkan"}
            description={
              notFoundError
                ? "Aktiviti ini tidak tersedia untuk pratonton guru."
                : forbiddenError
                  ? "Anda tidak dibenarkan mengakses pratonton aktiviti ini."
                  : "Sila cuba semula."
            }
            actionLabel="Cuba Lagi"
            onAction={() => {
              void previewQuery.refetch()
              void detailQuery.refetch()
            }}
          />
        ) : null}

        {previewQuery.data && detailQuery.data ? (
          <ActivityProvider activity={previewQuery.data} previewMode>
            <div className="space-y-6">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Mod Pratonton Guru</Badge>
                    <Badge variant="outline">{previewMeta?.templateLabel}</Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{previewQuery.data.title}</CardTitle>
                    {previewQuery.data.instructions ? (
                      <CardDescription className="text-sm leading-6">
                        {previewQuery.data.instructions}
                      </CardDescription>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewMeta?.skillLabel ? (
                      <Badge variant="outline">{previewMeta.skillLabel}</Badge>
                    ) : null}
                    {previewMeta?.yearLabel ? (
                      <Badge variant="outline">{previewMeta.yearLabel}</Badge>
                    ) : null}
                    <Badge variant="outline">{`${previewQuery.data.items.length} soalan`}</Badge>
                  </div>
                </CardHeader>
              </Card>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <p>
                    Paparan ini menggunakan renderer aktiviti sebenar dalam mod baca sahaja. Tiada kawalan authoring, simpanan, atau penerbitan dipaparkan kepada guru.
                  </p>
                </div>
                <div className="font-literacy">
                  <ActivityRenderer />
                </div>
              </div>
            </div>
          </ActivityProvider>
        ) : null}
      </main>
    </PageContainer>
  )
}
