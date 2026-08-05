import { ArrowLeft, Clock3 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { EmptyState, ManagementPageLayout } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ActivityWizardStepper, SelectedTemplateSummary } from "@/features/admin/components/AdminActivityCreateWizard";
import { getAdminDigitalActivity } from "@/features/admin/api/admin-activity.api";
import { getActivityWizardProgress } from "@/features/admin/utils/admin-activity-create";

export function AdminActivityContentPlaceholderPage() {
  const activityId = useParams().activityId ?? "";
  const stepOnePath = `/admin/aktiviti/${activityId}/cipta/maklumat`;
  const stepTwoPath = `/admin/aktiviti/${activityId}/cipta/kurikulum`;
  const activity = useQuery({
    queryKey: ["admin", "activities", "detail", activityId],
    queryFn: () => getAdminDigitalActivity(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  });

  const progress = getActivityWizardProgress(activity.data);
  const hasCurriculumLink = progress.hasCurriculumLink;

  if (activity.isLoading) {
    return (
      <ManagementPageLayout
        breadcrumb={[
          { label: "Home", to: "/admin" },
          { label: "Aktiviti", to: "/admin/aktiviti" },
          { label: "Maklumat", to: stepOnePath },
          { label: "Kurikulum", to: stepTwoPath },
          { label: "Kandungan" },
        ]}
        title="Kandungan"
        description="Langkah Kandungan akan dilaksanakan dalam Sprint seterusnya."
      >
        <div className="space-y-6" aria-busy="true" aria-label="Memuatkan maklumat kandungan">
          <SelectedTemplateSummary />
        </div>
      </ManagementPageLayout>
    );
  }

  if (activity.isError) {
    return (
      <ManagementPageLayout
        breadcrumb={[
          { label: "Home", to: "/admin" },
          { label: "Aktiviti", to: "/admin/aktiviti" },
          { label: "Maklumat", to: stepOnePath },
          { label: "Kurikulum", to: stepTwoPath },
          { label: "Kandungan" },
        ]}
        title="Kandungan"
        description="Langkah Kandungan akan dilaksanakan dalam Sprint seterusnya."
      >
        <div className="space-y-6">
          <EmptyState
            icon={<Clock3 className="size-5" aria-hidden="true" />}
            title="Aktiviti tidak ditemui"
            description="Aktiviti tidak ditemui atau anda tidak mempunyai kebenaran untuk melihat rekod ini."
            action={(
              <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                <Link to="/admin/aktiviti">Kembali ke Pengurusan Aktiviti</Link>
              </Button>
            )}
          />
        </div>
      </ManagementPageLayout>
    );
  }

  if (!hasCurriculumLink) {
    return (
      <ManagementPageLayout
        breadcrumb={[
          { label: "Home", to: "/admin" },
          { label: "Aktiviti", to: "/admin/aktiviti" },
          { label: "Maklumat", to: stepOnePath },
          { label: "Kurikulum", to: stepTwoPath },
          { label: "Kandungan" },
        ]}
        title="Kandungan"
        description="Langkah Kandungan akan dilaksanakan dalam Sprint seterusnya."
      >
        <div className="space-y-6">
          <SelectedTemplateSummary />
          <ActivityWizardStepper
            activeStep="content"
            progress={progress}
            stepLinks={{
              information: stepOnePath,
              curriculum: stepTwoPath,
            }}
          />
          <EmptyState
            icon={<Clock3 className="size-5" aria-hidden="true" />}
            title="Kurikulum belum lengkap"
            description="Langkah Kandungan hanya boleh dibuka selepas pautan kurikulum sebenar disimpan."
            action={(
              <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                <Link to={stepTwoPath}>Kembali ke Kurikulum</Link>
              </Button>
            )}
          />
        </div>
      </ManagementPageLayout>
    );
  }

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Maklumat", to: stepOnePath },
        { label: "Kurikulum", to: stepTwoPath },
        { label: "Kandungan" },
      ]}
      title="Kandungan"
      description="Langkah Kandungan akan dilaksanakan dalam Sprint seterusnya."
      actions={(
        <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto">
          <Link to={stepTwoPath}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke Kurikulum
          </Link>
        </Button>
      )}
    >
      <div className="space-y-6">
        <SelectedTemplateSummary />
        <ActivityWizardStepper
          activeStep="content"
          progress={progress}
          stepLinks={{
            information: stepOnePath,
            curriculum: stepTwoPath,
          }}
        />
        <EmptyState
          icon={<Clock3 className="size-5" aria-hidden="true" />}
          title="Kandungan"
          description="Langkah Kandungan kekal dikunci dan hanya dipaparkan sebagai placeholder selepas penyimpanan kurikulum berjaya."
        />
      </div>
    </ManagementPageLayout>
  );
}
