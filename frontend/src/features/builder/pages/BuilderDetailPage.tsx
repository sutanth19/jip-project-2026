import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Eye, Upload } from "lucide-react";

import { ErrorState, LoadingState, PageContainer, PageHeader, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ActivityWizard } from "@/features/builder/components/ActivityWizard";
import { SafeRecordDetails } from "@/features/builder/components/SafeRecordDetails";
import { getBuilderEntity } from "@/features/builder/config";
import { useBuilderAction, useBuilderRecord } from "@/features/builder/hooks/use-builder-records";
import type { BuilderEntityKey } from "@/features/builder/types/builder.types";
import { getBuilderRecordId } from "@/features/builder/utils/builder-record";
import { parseApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-context-value";
import { useAuthStore } from "@/stores/auth-store";

function actionEndpoint(entityKey: BuilderEntityKey, id: string, action: "publish" | "archive" | "submit-review") {
  if (entityKey === "curriculumVersions") return `/curriculum/versions/${id}/${action}`;
  if (entityKey === "questionBank") return `/question-bank/items/${id}/${action === "publish" ? "activate" : "archive"}`;
  if (entityKey === "digitalActivities") return `/digital-activities/${id}/${action}`;
  if (entityKey === "activityTemplates") return `/activity-templates/${id}/${action === "archive" ? "archive" : "status"}`;
  return "";
}

export function BuilderDetailPage({ entityKey }: { entityKey: BuilderEntityKey }) {
  const config = getBuilderEntity(entityKey);
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const role = useAuthStore((state) => state.role);
  const id = params.id ?? params.versionId ?? "";
  const record = useBuilderRecord(config, id);
  const action = useBuilderAction();
  const canManage = Boolean(role && config.manageRoles.includes(role));
  const canSuperAction = role === "SUPER_ADMIN";

  return (
    <PageContainer>
      <PageHeader
        title={`${config.singular} Detail`}
        description={config.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(config.path)}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali
            </Button>
            {entityKey === "digitalActivities" ? (
              <Button asChild variant="outline">
                <Link to={`${config.path}/${id}/preview`}>
                  <Eye className="size-4" aria-hidden="true" />
                  Pratonton
                </Link>
              </Button>
            ) : null}
            {canManage && config.supportsEdit ? (
              <Button asChild>
                <Link to={`${config.path}/${id}/edit`}>
                  <Edit className="size-4" aria-hidden="true" />
                  Edit
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
      {record.isLoading ? <LoadingState /> : null}
      {record.isError ? <ErrorState title="Rekod tidak dapat dimuatkan" actionLabel="Cuba lagi" onAction={() => void record.refetch()} /> : null}
      {record.data ? (
        <>
          {entityKey === "digitalActivities" ? (
            <SectionCard title="Wizard Aktiviti">
              <ActivityWizard activeStep="preview" />
            </SectionCard>
          ) : null}
          <SectionCard title="Butiran Selamat" description="Answer keys, token, PIN, hash dan storage key mentah ditapis daripada paparan.">
            <SafeRecordDetails record={record.data} />
          </SectionCard>
          <div className="flex flex-wrap gap-2">
            {entityKey === "digitalActivities" && canManage ? (
              <Button
                type="button"
                variant="outline"
                disabled={action.isPending}
                onClick={() =>
                  action.mutate(
                    { endpoint: actionEndpoint(entityKey, getBuilderRecordId(record.data), "submit-review") },
                    {
                      onSuccess: () => toast.success("Aktiviti dihantar untuk semakan."),
                      onError: (error) => toast.error("Gagal menghantar semakan", parseApiError(error).message),
                    },
                  )
                }
              >
                <Upload className="size-4" aria-hidden="true" />
                Hantar semakan
              </Button>
            ) : null}
            {canSuperAction && (entityKey === "digitalActivities" || entityKey === "curriculumVersions") ? (
              <>
                <Button
                  type="button"
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate(
                      { endpoint: actionEndpoint(entityKey, getBuilderRecordId(record.data), "publish") },
                      {
                        onSuccess: () => toast.success("Rekod diterbitkan."),
                        onError: (error) => toast.error("Gagal terbit", parseApiError(error).message),
                      },
                    )
                  }
                >
                  Terbit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate(
                      { endpoint: actionEndpoint(entityKey, getBuilderRecordId(record.data), "archive") },
                      {
                        onSuccess: () => toast.success("Rekod diarkibkan."),
                        onError: (error) => toast.error("Gagal arkib", parseApiError(error).message),
                      },
                    )
                  }
                >
                  Arkib
                </Button>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
