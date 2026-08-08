import { useQuery } from "@tanstack/react-query"
import { Eye, FileCheck2, PlayCircle, ShieldCheck, TimerReset } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { ErrorState, ManagementPageLayout } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityProvider } from "@/features/activity-player/ActivityContext"
import { ActivityRenderer } from "@/features/activity-player/ActivityRenderer"
import { useActivityPlayer } from "@/features/activity-player/useActivityPlayer"
import { getAdminDigitalActivityPreview } from "@/features/admin/api/admin-activity.api"
import { ActivityWizardStepper, SelectedTemplateSummary } from "@/features/admin/components/AdminActivityCreateWizard"
import { getActivityWizardProgress } from "@/features/admin/utils/admin-activity-create"

const stepOnePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/maklumat`
const stepTwoPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kurikulum`
const stepThreePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kandungan`
const stepFourPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/tetapan`

const previewQueryKeys = {
  activityPreview: (activityId: string) => ["admin", "activities", "preview", activityId] as const,
}

function PreviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading activity preview step">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}

function PreviewMetaCard({ activityId }: { activityId: string }) {
  const { activity } = useActivityPlayer()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">Mod Pratonton</Badge>
            <Badge variant="outline" className="rounded-full border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">Aktiviti draf</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{activity.title}. Cuba aktiviti seperti murid; percubaan, markah dan kemajuan tidak akan direkodkan.</p>
        </div>
        <Button asChild variant="outline" className="h-11 shrink-0 rounded-xl">
          <Link to={stepFourPath(activityId)}>Kembali ke Tetapan</Link>
        </Button>
      </div>
      <section aria-label="Kandungan aktiviti" className="min-h-0">
        <ActivityRenderer />
      </section>
    </div>
  )
}

function PreviewSummaryCard({
  activity,
  progress,
}: {
  activity: Awaited<ReturnType<typeof getAdminDigitalActivityPreview>>
  progress: ReturnType<typeof getActivityWizardProgress>
}) {
  const rows = [
    { label: "Status", value: activity.status, icon: ShieldCheck, tone: "primary" as const },
    { label: "Program", value: activity.programme?.name ?? "Tidak tersedia", icon: FileCheck2, tone: "secondary" as const },
    { label: "Versi Kurikulum", value: activity.programme?.version?.name ?? "Tidak tersedia", icon: FileCheck2, tone: "secondary" as const },
    { label: "Item", value: String(activity.items.length), icon: PlayCircle, tone: "primary" as const },
    { label: "Tetapan", value: progress.hasSettings ? "Lengkap" : "Belum lengkap", icon: TimerReset, tone: progress.hasSettings ? "success" as const : "warning" as const },
  ]

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
            <Eye className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Ringkasan Pratonton</h2>
            <p className="text-sm leading-6 text-muted-foreground">Semak kandungan, tetapan dan susunan item sebelum diterbitkan.</p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          {rows.map((row) => {
            const Icon = row.icon
            const toneClassName =
              row.tone === "success"
                ? "border-secondary/20 bg-secondary/10 text-secondary"
                : row.tone === "warning"
                  ? "border-warning/20 bg-warning/10 text-warning"
                  : row.tone === "primary"
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-foreground"

            return (
              <div key={row.label} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/30 px-4 py-3">
                <dt className="flex min-w-0 items-center gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${toneClassName}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-medium text-muted-foreground">{row.label}</span>
                </dt>
                <dd className="text-right font-semibold text-foreground">{row.value}</dd>
              </div>
            )
          })}
        </dl>
      </CardContent>
    </Card>
  )
}

export function AdminActivityPreviewPlaceholderPage() {
  const activityId = useParams().activityId ?? ""
  const navigate = useNavigate()

  const preview = useQuery({
    queryKey: previewQueryKeys.activityPreview(activityId),
    queryFn: () => getAdminDigitalActivityPreview(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  })

  const progress = getActivityWizardProgress(preview.data)
  const showDraftError = preview.data && preview.data.status !== "DRAFT"
  const showUnavailableError = preview.data && preview.data.status === "DRAFT" && !progress.hasSettings
  const canPreview = preview.data && preview.data.status === "DRAFT" && progress.hasSettings

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Maklumat", to: stepOnePath(activityId) },
        { label: "Kurikulum", to: stepTwoPath(activityId) },
        { label: "Kandungan", to: stepThreePath(activityId) },
        { label: "Tetapan", to: stepFourPath(activityId) },
        { label: "Pratonton" },
      ]}
      title="Pratonton Aktiviti"
      description="Cuba aktiviti seperti murid tanpa merekod percubaan, markah atau kemajuan."
    >
      {preview.isLoading ? <PreviewSkeleton /> : null}

      {preview.isError ? (
        <ErrorState
          title="Pratonton aktiviti tidak dapat dimuatkan"
          description="Sila cuba semula."
          actionLabel="Cuba Semula"
          onAction={() => {
            void preview.refetch()
          }}
        />
      ) : null}

      {showDraftError ? (
        <ErrorState
          title="Aktiviti draf diperlukan"
          description="Langkah pratonton hanya boleh dibuka untuk aktiviti berstatus draf."
          actionLabel="Kembali ke Pengurusan Aktiviti"
          onAction={() => navigate("/admin/aktiviti")}
        />
      ) : null}

      {showUnavailableError ? (
        <ErrorState
          title="Pratonton belum tersedia"
          description="Selesaikan tetapan aktiviti terlebih dahulu sebelum membuka langkah pratonton."
          actionLabel="Kembali ke Tetapan"
          onAction={() => navigate(stepFourPath(activityId))}
        />
      ) : null}

      {canPreview ? (
        <div className="space-y-6">
          <SelectedTemplateSummary />
          <ActivityWizardStepper
            activeStep="preview"
            progress={progress}
            stepLinks={{
              information: stepOnePath(activityId),
              curriculum: stepTwoPath(activityId),
              content: stepThreePath(activityId),
              settings: stepFourPath(activityId),
            }}
          />

          <ActivityProvider activity={preview.data} previewMode>
            <div className="space-y-6">
              <PreviewMetaCard activityId={activityId} />
              <PreviewSummaryCard activity={preview.data} progress={progress} />
            </div>
          </ActivityProvider>
        </div>
      ) : null}
    </ManagementPageLayout>
  )
}
