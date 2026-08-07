import { useQuery } from "@tanstack/react-query";
import { Eye, FileCheck2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { EmptyState, ErrorState, ManagementPageLayout } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminDigitalActivity } from "@/features/admin/api/admin-activity.api";
import { ActivityWizardStepper, SelectedTemplateSummary } from "@/features/admin/components/AdminActivityCreateWizard";
import { getActivityWizardProgress } from "@/features/admin/utils/admin-activity-create";
import { getActivitySettingsProgress } from "@/features/admin/utils/admin-activity-settings";

const stepOnePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/maklumat`;
const stepTwoPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kurikulum`;
const stepThreePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kandungan`;
const stepFourPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/tetapan`;

const previewQueryKeys = {
  activityDetail: (activityId: string) => ["admin", "activities", "detail", activityId] as const,
};

function PreviewPlaceholderSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading activity preview step">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

export function AdminActivityPreviewPlaceholderPage() {
  const activityId = useParams().activityId ?? "";
  const navigate = useNavigate();

  const activity = useQuery({
    queryKey: previewQueryKeys.activityDetail(activityId),
    queryFn: () => getAdminDigitalActivity(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  });

  const progress = getActivitySettingsProgress(getActivityWizardProgress(activity.data));
  const showDraftError = activity.data && activity.data.status !== "DRAFT";

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
      description="Pratonton aktiviti akan disediakan dalam langkah seterusnya."
    >
      {activity.isLoading ? <PreviewPlaceholderSkeleton /> : null}

      {activity.isError ? (
        <ErrorState
          title="Pratonton aktiviti tidak dapat dimuatkan"
          description="Sila cuba semula."
          actionLabel="Cuba Semula"
          onAction={() => {
            void activity.refetch();
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

      {activity.data && activity.data.status === "DRAFT" ? (
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

          <EmptyState
            icon={<Eye className="size-5" aria-hidden="true" />}
            title="Pratonton aktiviti akan dilengkapkan pada langkah seterusnya"
            description="Langkah ini kini dikekalkan sebagai placeholder selamat. Tetapan yang telah disimpan pada langkah sebelumnya terus dikekalkan pada aktiviti draf yang sama."
            action={
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                onClick={() => navigate(stepFourPath(activityId))}
              >
                Kembali ke Tetapan
              </button>
            }
          />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
                <FileCheck2 className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">Current step status</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  The same draft activity, curriculum link, content payload, and saved settings remain intact on this route. No Step 5 preview or publish behaviour is introduced yet.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ManagementPageLayout>
  );
}
