import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"

import { ErrorState, ManagementPageLayout } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityProvider } from "@/features/activity-player/ActivityContext"
import { ActivityRenderer } from "@/features/activity-player/ActivityRenderer"
import { useActivityPlayer } from "@/features/activity-player/useActivityPlayer"
import { getAdminDigitalActivity, getAdminDigitalActivityPreview, updateAdminDigitalActivitySettings } from "@/features/admin/api/admin-activity.api"
import { ActivityWizardStepper, SelectedTemplateSummary } from "@/features/admin/components/AdminActivityCreateWizard"
import { AdminActivityWizardStepFooter } from "@/features/admin/components/AdminActivityWizardStepFooter"
import { useActivityWizardStep } from "@/features/admin/hooks/use-activity-wizard-step"
import { getActivityWizardProgress } from "@/features/admin/utils/admin-activity-create"
import { buildActivitySettingsUpdatePayload, getActivitySettingsFormValues, getActivitySettingsTemplateSupport } from "@/features/admin/utils/admin-activity-settings"
import { parseApiError } from "@/lib/api"
import { useToast } from "@/providers/toast-context-value"

const stepOnePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/maklumat`
const stepTwoPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kurikulum`
const stepThreePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kandungan`
const stepFourPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/tetapan`
const stepSixPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/terbitkan`
const galleryPath = "/admin/aktiviti/cipta/membaca"

const previewQueryKeys = {
  activityPreview: (activityId: string) => ["admin", "activities", "preview", activityId] as const,
  activityDetail: (activityId: string) => ["admin", "activities", "detail", activityId] as const,
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
          <h2 className="text-lg font-semibold text-foreground">{activity.title}</h2>
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

function getPreviewSaveErrorMessage(error: unknown): string {
  const parsed = parseApiError(error)

  switch (parsed.code) {
    case "DIGITAL_ACTIVITY_CONFIGURATION_INVALID":
    case "DIGITAL_ACTIVITY_REVIEW_INVALID":
      return "Tetapan aktiviti tidak dapat disimpan. Sila semak semula konfigurasi semasa."
    default:
      return "Aktiviti tidak dapat disimpan. Sila cuba semula."
  }
}

export function AdminActivityPreviewPlaceholderPage() {
  const activityId = useParams().activityId ?? ""
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const preview = useQuery({
    queryKey: previewQueryKeys.activityPreview(activityId),
    queryFn: () => getAdminDigitalActivityPreview(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  })
  const activityDetail = useQuery({
    queryKey: previewQueryKeys.activityDetail(activityId),
    queryFn: () => getAdminDigitalActivity(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  })

  const savePreviewStep = useMutation({
    mutationFn: async () => {
      if (!activityDetail.data) {
        throw new Error("MISSING_ACTIVITY_DETAIL")
      }

      const values = getActivitySettingsFormValues(activityDetail.data)
      const templateSupport = getActivitySettingsTemplateSupport(activityDetail.data)
      return updateAdminDigitalActivitySettings(
        activityId,
        buildActivitySettingsUpdatePayload(values, templateSupport),
      )
    },
    onSuccess: async (savedActivity) => {
      queryClient.setQueryData(previewQueryKeys.activityDetail(savedActivity.id), savedActivity)
      await queryClient.invalidateQueries({ queryKey: previewQueryKeys.activityPreview(savedActivity.id) })
      toast.success("Berjaya", "Aktiviti berjaya disimpan.")
    },
    onError: (error) => {
      toast.error("Ralat", getPreviewSaveErrorMessage(error))
    },
  })

  const progress = getActivityWizardProgress(preview.data)
  const showDraftError = preview.data && preview.data.status !== "DRAFT"
  const showUnavailableError = preview.data && preview.data.status === "DRAFT" && !progress.hasSettings
  const canPreview = preview.data && preview.data.status === "DRAFT" && progress.hasSettings
  const stepController = useActivityWizardStep({
    form: {
      formState: { isDirty: false },
      handleSubmit: (callback: () => Promise<void>) => () => callback(),
    } as never,
    navigate,
    cancelDestination: galleryPath,
    continueDestination: stepSixPath(activityId),
    onSave: async () => {
      await savePreviewStep.mutateAsync()
    },
    isSaving: savePreviewStep.isPending,
    isSaved: Boolean(preview.data),
    isReady: Boolean(activityDetail.data),
    hasHydrated: !activityDetail.isLoading,
  })

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
              publish: stepSixPath(activityId),
            }}
          />

          <ActivityProvider activity={preview.data} previewMode>
            <div className="space-y-6">
              <PreviewMetaCard activityId={activityId} />
            </div>
          </ActivityProvider>

          <AdminActivityWizardStepFooter
            isSaving={savePreviewStep.isPending}
            canSave={Boolean(activityDetail.data) && !savePreviewStep.isPending}
            canContinue={stepController.canContinue}
            onSave={stepController.save}
            onContinue={stepController.continueToNextStep}
            showCancel={false}
          />
        </div>
      ) : null}
    </ManagementPageLayout>
  )
}
