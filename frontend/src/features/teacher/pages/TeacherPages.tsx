import { useState, type ChangeEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { CalendarDays, Clock3, FileText, GraduationCap, Layers3, Users } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeacherStats, TeacherTable, SafeDetails } from "@/features/teacher/components/TeacherComponents"
import { useTeacherDashboard, useTeacherDetail, useTeacherList, useTeacherPost } from "@/features/teacher/hooks/use-teacher"
import type { TeacherRecord, TeacherResource } from "@/features/teacher/types/teacher.types"
import { isRecord, text } from "@/features/teacher/utils/teacher-record"
import { apiRequest } from "@/lib/api"

const titles: Record<TeacherResource, string> = {
  classes: "Kelas Saya",
  students: "Murid",
  activities: "Aktiviti Digital",
  assignments: "Tugasan",
  submissions: "Penghantaran",
  assessments: "Penilaian",
  evidence: "Bukti PBD",
  mastery: "Penguasaan PBD",
  notifications: "Notifikasi",
  announcements: "Pengumuman",
  ai: "Draf AI",
}

const paths: Partial<Record<TeacherResource, string>> = {
  classes: "/guru/kelas",
  activities: "/guru/aktiviti",
  assignments: "/guru/tugasan",
  submissions: "/guru/penghantaran",
  assessments: "/guru/penilaian",
}

type AssignmentListRecord = {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  startAt: string | null
  dueAt: string | null
  activity: {
    id: string
    title: string
    rendererKey: string | null
    status: string
  }
  targets: {
    classCount: number
    studentCount: number
    effectiveStudentCount: number
    classes: Array<{ id: string; className: string }>
  }
}

type AssignmentDetailRecord = AssignmentListRecord & {
  instructions: string | null
  priority: string
  isRequired: boolean
  attemptsAllowed: number | null
  showResultsAfterCompletion: boolean
  availableUntil: string | null
  school: {
    id: string
    schoolName: string
  }
  assignedBy: {
    teacherId: string
    name: string
  }
  targets: AssignmentListRecord["targets"] & {
    students: Array<{
      id: string
      fullName: string
      className: string
    }>
  }
  availability: {
    status: string
    isAvailableNow: boolean
    isUpcoming: boolean
    isOverdue: boolean
    isClosed: boolean
  }
}

function State({
  loading,
  error,
  retry,
}: {
  loading: boolean
  error: unknown
  retry: () => void
}) {
  if (loading) {
    return (
      <div className="grid min-h-48 place-items-center">
        <LoadingSpinner label="Memuatkan data..." />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Tidak dapat memuatkan data"
        description="Sila cuba lagi."
        actionLabel="Cuba lagi"
        onAction={retry}
      />
    )
  }

  return null
}

function isAssignmentListRecord(value: TeacherRecord): value is AssignmentListRecord {
  return (
    typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.status === "string"
    && isRecord(value.activity)
    && typeof value.activity.title === "string"
    && isRecord(value.targets)
  )
}

function isAssignmentDetailRecord(value: TeacherRecord): value is AssignmentDetailRecord {
  return (
    isAssignmentListRecord(value)
    && "assignedBy" in value
    && isRecord(value.assignedBy)
    && "school" in value
    && isRecord(value.school)
    && "availability" in value
    && isRecord(value.availability)
  )
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Tidak ditetapkan"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatTargetSummary(record: AssignmentListRecord): string {
  if (record.targets.classCount > 0 && record.targets.studentCount > 0) {
    return `${record.targets.classCount} kelas • ${record.targets.studentCount} murid dipilih`
  }
  if (record.targets.classCount > 0) {
    return `${record.targets.classCount} kelas`
  }
  return `${record.targets.effectiveStudentCount} murid`
}

function TeacherAssignmentListSection({ rows }: { rows: TeacherRecord[] }) {
  const assignments = rows.filter(isAssignmentListRecord)

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={<Layers3 className="size-5" aria-hidden="true" />}
        title="Tiada tugasan ditemui"
        description="Tugasan yang anda cipta akan dipaparkan di sini."
      />
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="rounded-2xl border-border bg-card py-0 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">{assignment.activity.title}</CardTitle>
                <CardDescription>{assignment.title}</CardDescription>
              </div>
              <StatusBadge status={assignment.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full">
                {formatTargetSummary(assignment)}
              </Badge>
              {assignment.targets.classes[0]?.className ? (
                <Badge variant="secondary" className="rounded-full">
                  {assignment.targets.classes[0].className}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4" aria-hidden="true" />
                <span>{`Tarikh mula: ${formatDateTime(assignment.startAt)}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="size-4" aria-hidden="true" />
                <span>{`Tarikh tamat: ${formatDateTime(assignment.dueAt)}`}</span>
              </div>
            </div>
            <Button asChild className="w-full rounded-xl">
              <Link to={`/guru/tugasan/${assignment.id}`}>Lihat</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TeacherAssignmentDetailSection({ record }: { record: TeacherRecord }) {
  if (!isAssignmentDetailRecord(record)) {
    return <SafeDetails record={record} />
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <div className="space-y-6">
        <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="text-xl">{record.activity.title}</CardTitle>
                <CardDescription>{record.title}</CardDescription>
              </div>
              <StatusBadge status={record.status} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Guru</p>
              <p className="text-sm text-foreground">{record.assignedBy.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sekolah</p>
              <p className="text-sm text-foreground">{record.school.schoolName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tarikh Mula</p>
              <p className="text-sm text-foreground">{formatDateTime(record.startAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tarikh Tamat</p>
              <p className="text-sm text-foreground">{formatDateTime(record.dueAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tersedia Hingga</p>
              <p className="text-sm text-foreground">{formatDateTime(record.availableUntil)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sasaran</p>
              <p className="text-sm text-foreground">{formatTargetSummary(record)}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Arahan Guru</p>
              <p className="text-sm text-foreground">{record.instructions?.trim() || "Tiada arahan tambahan."}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Murid Ditugaskan</CardTitle>
            <CardDescription>
              {`${record.targets.students.length} murid disimpan pada tugasan ini.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {record.targets.students.length > 0 ? (
              record.targets.students.map((student) => (
                <div key={student.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/10 px-4 py-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{student.fullName}</p>
                    <p className="text-sm text-muted-foreground">{student.className}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    {student.id}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState title="Tiada murid direkodkan" description="Tugasan ini belum mempunyai sasaran murid yang boleh dipaparkan." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Ringkasan Tugasan</CardTitle>
            <CardDescription>Maklumat bacaan pantas untuk pengesahan tugasan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="size-4" aria-hidden="true" />
              <span>{record.activity.rendererKey ?? "Templat aktiviti tersedia"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-4" aria-hidden="true" />
              <span>{`${record.targets.effectiveStudentCount} sasaran berkesan`}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="size-4" aria-hidden="true" />
              <span>{record.availability.status}</span>
            </div>
            {record.targets.classes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kelas</p>
                <div className="flex flex-wrap gap-2">
                  {record.targets.classes.map((schoolClass) => (
                    <Badge key={schoolClass.id} variant="secondary" className="rounded-full">
                      {schoolClass.className}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function TeacherDashboardPage() {
  const query = useTeacherDashboard()
  const data = query.data ?? {}
  const summary = isRecord(data.summary) ? data.summary : {}
  const analytics = isRecord(data.analytics) ? data.analytics : {}

  return (
    <main className="space-y-6">
      <PageHeader title="Dashboard Guru" description="Ringkasan kelas dan kemajuan murid anda." />
      <State loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />
      {!query.isLoading && !query.error ? (
        <>
          <TeacherStats
            items={[
              { label: "Kelas Saya", value: summary.totalAssignedClasses },
              { label: "Jumlah Murid", value: summary.totalAssignedStudents },
              { label: "Semakan Menunggu", value: analytics.pendingReviews },
              { label: "Tugasan", value: analytics.assignments },
              { label: "Purata Penguasaan", value: analytics.averageMastery },
              { label: "Trend Penguasaan", value: analytics.masteryTrend },
            ]}
          />
          <TeacherTable
            rows={Array.isArray(data.assignedClasses) ? data.assignedClasses.filter(isRecord) : []}
            detailPath={(row) => `/guru/kelas/${text(row.classId)}`}
            emptyMessage="Belum ada kelas ditetapkan."
          />
        </>
      ) : null}
    </main>
  )
}

export function TeacherListPage({ resource }: { resource: TeacherResource }) {
  const [search, setSearch] = useState("")
  const query = useTeacherList(resource, { page: 1, limit: 20, search: search || undefined })
  const base = paths[resource]

  return (
    <main className="space-y-6">
      <PageHeader title={titles[resource]} description="Data dipaparkan mengikut skop kebenaran guru." />
      <div className="max-w-md">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari..."
          aria-label={`Cari ${titles[resource]}`}
        />
      </div>
      <State loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />
      {!query.isLoading && !query.error ? (
        resource === "assignments" ? (
          <TeacherAssignmentListSection rows={query.data?.records ?? []} />
        ) : (
          <TeacherTable
            rows={query.data?.records ?? []}
            detailPath={base ? (row) => `${base}/${text(row.id ?? row.classId)}` : undefined}
            emptyMessage={`Tiada ${titles[resource].toLowerCase()}.`}
          />
        )
      ) : null}
    </main>
  )
}

export function TeacherDetailPage({ resource }: { resource: TeacherResource }) {
  const params = useParams()
  const id = params.classId ?? params.studentId ?? params.activityId ?? params.assignmentId ?? params.submissionId ?? params.assessmentId ?? ""
  const query = useTeacherDetail(resource, id)

  return (
    <main className="space-y-6">
      <PageHeader title={titles[resource]} description="Maklumat ini tertakluk kepada pengesahan skop oleh backend." />
      <State loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />
      {query.data ? (
        resource === "assignments" ? <TeacherAssignmentDetailSection record={query.data} /> : <SafeDetails record={query.data} />
      ) : null}
      {resource === "submissions" && id ? <ReviewPanel submissionId={id} /> : null}
      {resource === "assessments" && id ? <AdjustmentPanel assessmentId={id} /> : null}
    </main>
  )
}

function ReviewPanel({ submissionId }: { submissionId: string }) {
  const post = useTeacherPost()
  const [feedback, setFeedback] = useState("")

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="font-semibold">Semakan keseluruhan</h2>
      <p className="text-sm text-muted-foreground">
        Mulakan atau lengkapkan semakan hanya selepas backend mengesahkan status dan pemilikan semakan.
      </p>
      <textarea
        className="min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm"
        value={feedback}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setFeedback(event.target.value)}
        placeholder="Maklum balas keseluruhan"
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={post.isPending} onClick={() => post.mutate({ path: `/submissions/${submissionId}/start-review` })}>
          Mulakan semakan
        </Button>
        <Button
          variant="outline"
          disabled={post.isPending || !feedback.trim()}
          onClick={() => post.mutate({ path: `/submissions/${submissionId}/complete-review`, body: { decision: "APPROVED", overallFeedback: feedback } })}
        >
          Luluskan semakan
        </Button>
        <Button
          variant="destructive"
          disabled={post.isPending || !feedback.trim()}
          onClick={() => post.mutate({ path: `/submissions/${submissionId}/complete-review`, body: { decision: "REVISION_REQUIRED", overallFeedback: feedback } })}
        >
          Minta pembetulan
        </Button>
      </div>
      {post.error ? <p className="text-sm text-destructive">{post.error.message}</p> : null}
    </section>
  )
}

function AdjustmentPanel({ assessmentId }: { assessmentId: string }) {
  const post = useTeacherPost()
  const form = useForm<{ newMarks: string; reason: string; notes: string }>({
    defaultValues: { newMarks: "", reason: "", notes: "" },
  })

  return (
    <form
      className="space-y-3 rounded-lg border border-border p-4"
      onSubmit={form.handleSubmit((value) => post.mutate({
        path: `/assessments/${assessmentId}/adjustments`,
        body: {
          newMarks: Number(value.newMarks),
          reason: value.reason,
          notes: value.notes || null,
        },
      }))}
    >
      <h2 className="font-semibold">Pelarasan markah terkawal</h2>
      <Label htmlFor="marks">Markah baharu</Label>
      <Input id="marks" type="number" step="0.01" min="0" {...form.register("newMarks", { required: true })} />
      <Label htmlFor="reason">Sebab (kod backend)</Label>
      <Input id="reason" {...form.register("reason", { required: true })} />
      <Label htmlFor="notes">Nota</Label>
      <textarea id="notes" className="min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm" {...form.register("notes")} />
      <Button disabled={post.isPending} type="submit">Simpan pelarasan</Button>
      {post.error ? <p className="text-sm text-destructive">{post.error.message}</p> : null}
    </form>
  )
}

export function TeacherAssignmentFormPage() {
  const post = useTeacherPost()
  const form = useForm<{ title: string; digitalActivityId: string; classIds: string; instructions: string }>({
    defaultValues: { title: "", digitalActivityId: "", classIds: "", instructions: "" },
  })

  return (
    <main className="space-y-6">
      <PageHeader title="Tambah Tugasan" description="Tugasan diwujudkan sebagai DRAFT mengikut kontrak backend." />
      <form
        className="grid max-w-2xl gap-4 rounded-lg border border-border p-5"
        onSubmit={form.handleSubmit((value) => post.mutate({
          path: "/assignments",
          body: {
            title: value.title,
            digitalActivityId: value.digitalActivityId,
            classIds: value.classIds.split(",").map((id) => id.trim()).filter(Boolean),
            studentIds: [],
            instructions: value.instructions || null,
            isRequired: true,
            showResultsAfterCompletion: false,
          },
        }))}
      >
        <Label>
          Tajuk
          <Input {...form.register("title", { required: true })} />
        </Label>
        <Label>
          ID aktiviti digital diterbitkan
          <Input {...form.register("digitalActivityId", { required: true })} />
        </Label>
        <Label>
          ID kelas dibenarkan (pisahkan koma)
          <Input {...form.register("classIds", { required: true })} />
        </Label>
        <Label>
          Arahan
          <textarea className="min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm" {...form.register("instructions")} />
        </Label>
        <Button disabled={post.isPending} type="submit">Simpan DRAFT</Button>
        {post.error ? <p className="text-sm text-destructive">{post.error.message}</p> : null}
      </form>
    </main>
  )
}

export function TeacherPbdPage() {
  return <TeacherListPage resource="mastery" />
}

export function TeacherReportsPage() {
  return (
    <main className="space-y-6">
      <PageHeader title="Laporan" description="Pilih murid atau kelas daripada halaman berkaitan untuk laporan berautoriti." />
      <EmptyState title="Pilih skop laporan" description="Laporan murid dan kelas menggunakan endpoint laporan yang dilindungi backend." />
    </main>
  )
}

export function TeacherProfilePage() {
  const query = useQuery({
    queryKey: ["teacher", "profile"],
    queryFn: async () => {
      const value = await apiRequest<unknown>("/profile/me")
      return isRecord(value) && isRecord(value.profile) ? value.profile : {}
    },
  })

  return (
    <main className="space-y-6">
      <PageHeader title="Profil Saya" description="Maklumat akaun yang selamat sahaja dipaparkan." />
      <State loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />
      {query.data ? <SafeDetails record={query.data} /> : null}
    </main>
  )
}
