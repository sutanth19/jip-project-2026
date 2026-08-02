import * as React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Pencil, RotateCcw } from "lucide-react";

import { EmptyState, ErrorState, LoadingState, ManagementPageLayout, PageContainer, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  AdminAccountDetailSkeleton,
  AdminAccountDetailView,
} from "@/features/admin/components/AdminAccountDetailView";
import { AdminAccountSummary } from "@/features/admin/components/AdminAccountSummary";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminRecordDetails } from "@/features/admin/components/AdminRecordDetails";
import {
  SchoolDetailErrorState,
  SchoolDetailSkeleton,
  SchoolDetailView,
} from "@/features/admin/components/SchoolDetailView";
import { getAdminEntity } from "@/features/admin/config";
import { useAdminRecord, useResendSetup, useUpdateAdminRecordStatus } from "@/features/admin/hooks/use-admin-records";
import type { AdminEntityKey } from "@/features/admin/types/admin.types";
import {
  normalizeAdminDetailRecord,
  type AdminStatusTarget,
} from "@/features/admin/utils/admin-account-detail";
import {
  normalizeSchoolDetailRecord,
  type SchoolAccountStatus,
} from "@/features/admin/utils/school-detail";
import { getNestedValue, getRecordId, stringifyValue } from "@/features/admin/utils/record";
import { parseApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-context-value";
import { useAuthStore } from "@/stores/auth-store";

const allowedTargets = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
const adminManagementPageContainerClass = "px-0 py-0 sm:px-0 sm:py-0 lg:px-0 lg:py-0";

function getDevelopmentSetupUrl(payload: unknown): string | null {
  const value = getNestedValue(payload as Record<string, unknown>, "invitation.developmentSetupUrl");
  return typeof value === "string" && value.trim() ? value : null;
}

function getLocationDevelopmentSetupUrl(state: unknown): string | null {
  if (!state || typeof state !== "object" || !("developmentSetupUrl" in state)) {
    return null;
  }

  const value = (state as { developmentSetupUrl?: unknown }).developmentSetupUrl;
  return typeof value === "string" && value.trim() ? value : null;
}

function adminActionErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);

  if (parsed.code === "ADMIN_SETUP_ALREADY_COMPLETED") {
    return "Akaun pentadbir telah selesai disediakan.";
  }

  if (parsed.code === "ADMIN_SETUP_RESEND_NOT_ALLOWED") {
    return "Jemputan setup tidak boleh dihantar semula untuk akaun ini.";
  }

  if (parsed.code === "ADMIN_STATUS_TRANSITION_INVALID") {
    return "Perubahan status pentadbir tidak dibenarkan.";
  }

  return parsed.message;
}

function entityStatusErrorMessage(entityKey: AdminEntityKey, error: unknown): string {
  const parsed = parseApiError(error);

  if (entityKey === "schools") {
    if (parsed.code === "SCHOOL_NOT_FOUND") {
      return "Sekolah tidak ditemui.";
    }

    if (parsed.code === "SCHOOL_STATUS_TRANSITION_INVALID") {
      return "Perubahan status sekolah tidak dibenarkan.";
    }

    if (parsed.status === 404 && !parsed.code) {
      return "Status route is not available.";
    }
  }

  return parsed.message;
}

export function AdminEntityDetailPage({ entityKey }: { entityKey: AdminEntityKey }) {
  const config = getAdminEntity(entityKey);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const toast = useToast();
  const role = useAuthStore((state) => state.role);
  const id = params.id ?? "";
  const record = useAdminRecord(config, id);
  const statusMutation = useUpdateAdminRecordStatus(config);
  const resendMutation = useResendSetup(config);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [resendError, setResendError] = React.useState<string | null>(null);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);
  const [developmentSetupUrl, setDevelopmentSetupUrl] = React.useState<string | null>(() =>
    getLocationDevelopmentSetupUrl(location.state),
  );
  const isAdminAccounts = entityKey === "admins";
  const detail = record.data;
  const safeId = detail ? getRecordId(detail) : id;
  const currentStatus = detail ? stringifyValue(getNestedValue(detail, "user.accountStatus") ?? getNestedValue(detail, "accountStatus")) : undefined;
  const setupStatus = detail ? stringifyValue(getNestedValue(detail, "setupStatus")) : undefined;
  const canResendSetup = currentStatus !== "ARCHIVED" && setupStatus !== "COMPLETED";
  const possibleActions = allowedTargets.filter((status) => status !== currentStatus);

  if (entityKey === "schools") {
    const schoolDetail = normalizeSchoolDetailRecord(detail);
    const fetchError = record.isError ? parseApiError(record.error) : null;
    const isNotFound = fetchError?.status === 404 || fetchError?.code === "SCHOOL_NOT_FOUND";
    const isForbidden = fetchError?.status === 403;
    const detailPath = `${config.path}/${schoolDetail?.id ?? id}`;
    const handleSchoolStatusChange = async (status: SchoolAccountStatus) => {
      setStatusError(null);
      setArchiveError(null);

      try {
        await statusMutation.mutateAsync({ id: schoolDetail?.id ?? id, status });
        await record.refetch();
        toast.success("Status sekolah dikemas kini.");
        return true;
      } catch (error) {
        const message = entityStatusErrorMessage(entityKey, error);
        setStatusError(message);
        if (status === "ARCHIVED") {
          setArchiveError(message);
        }
        toast.error("Status sekolah gagal dikemas kini", message);
        return false;
      }
    };
    const detailActions = (
      <>
        <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto">
          <Link to={config.path}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
        {!isNotFound && !record.isError ? (
          <Button asChild className="h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30 sm:w-auto">
            <Link to={`${detailPath}/edit`}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit Sekolah
            </Link>
          </Button>
        ) : null}
      </>
    );

    return (
      <PageContainer className={adminManagementPageContainerClass}>
        <ManagementPageLayout
          breadcrumb={[
            { label: "Home", to: "/admin" },
            { label: "Sekolah", to: config.path },
            { label: "Butiran Sekolah" },
          ]}
          title="Butiran Sekolah"
          description="Lihat dan urus maklumat sekolah dalam platform Digital MoLIB."
          actions={detailActions}
        >
          {record.isLoading ? <SchoolDetailSkeleton /> : null}
          {record.isError && !isNotFound ? (
            <SchoolDetailErrorState
              title={isForbidden ? "Anda tidak mempunyai kebenaran untuk melihat halaman ini." : "Tidak dapat memuatkan maklumat sekolah. Sila cuba lagi."}
              onRetry={() => void record.refetch()}
              path={config.path}
            />
          ) : null}
          {(!record.isLoading && !record.isError && !schoolDetail) || isNotFound ? (
            <SchoolDetailErrorState
              title="Sekolah tidak ditemui"
              description="Rekod sekolah yang diminta tidak wujud atau telah dipadamkan."
              path={config.path}
            />
          ) : null}
          {schoolDetail ? (
            <SchoolDetailView
              detail={schoolDetail}
              currentRole={role}
              statusPending={statusMutation.isPending}
              statusError={statusError}
              archiveError={archiveError}
              onStatusChange={handleSchoolStatusChange}
              onArchive={() => handleSchoolStatusChange("ARCHIVED")}
            />
          ) : null}
        </ManagementPageLayout>
      </PageContainer>
    );
  }

  if (isAdminAccounts) {
    const adminDetail = normalizeAdminDetailRecord(detail);
    const fetchError = record.isError ? parseApiError(record.error) : null;
    const isNotFound = fetchError?.status === 404 || fetchError?.code === "ADMIN_NOT_FOUND";

    const handleStatusChange = async (status: AdminStatusTarget) => {
      setStatusError(null);
      setArchiveError(null);

      try {
        await statusMutation.mutateAsync({ id: adminDetail?.id ?? id, status });
        await record.refetch();
        toast.success("Status pentadbir dikemas kini.");
        return true;
      } catch (error) {
        const message = adminActionErrorMessage(error);
        setStatusError(message);
        if (status === "ARCHIVED") {
          setArchiveError(message);
        }
        toast.error("Status gagal dikemas kini", message);
        return false;
      }
    };

    const handleArchive = () => handleStatusChange("ARCHIVED");

    const handleResendSetup = () => {
      if (!adminDetail) {
        return;
      }

      setResendError(null);
      resendMutation.mutate(adminDetail.id, {
        onSuccess: (result) => {
          const invitationStatus = stringifyValue(getNestedValue(result as Record<string, unknown>, "invitation.status"));
          setDevelopmentSetupUrl(getDevelopmentSetupUrl(result));
          if (invitationStatus === "SENT") {
            toast.success("Jemputan persediaan dihantar semula.");
          } else {
            const message = "E-mel penyediaan tidak dapat dihantar. Sila cuba lagi.";
            setResendError(message);
            toast.error("E-mel penyediaan tidak dapat dihantar", "Sila cuba lagi.");
          }
          void record.refetch();
        },
        onError: (error) => {
          const message = adminActionErrorMessage(error);
          setResendError(message);
          toast.error("Jemputan gagal dihantar", message);
        },
      });
    };

    const handleCopyDevelopmentSetupUrl = async () => {
      if (!developmentSetupUrl || !navigator.clipboard?.writeText) {
        toast.error("Pautan setup tidak dapat disalin.");
        return;
      }

      try {
        await navigator.clipboard.writeText(developmentSetupUrl);
        toast.success("Pautan setup telah disalin.");
      } catch {
        toast.error("Pautan setup tidak dapat disalin.");
      }
    };

    const detailPath = `${config.path}/${adminDetail?.id ?? id}`;
    const detailActions = (
      <>
        <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto">
          <Link to={config.path}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
        {adminDetail ? (
          <Button asChild className="h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30 sm:w-auto">
            <Link to={`${detailPath}/edit`}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit Pentadbir
            </Link>
          </Button>
        ) : null}
      </>
    );

    return (
      <PageContainer className={adminManagementPageContainerClass}>
        {record.isLoading ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Pentadbir", to: config.path },
              { label: "Butiran Pentadbir" },
            ]}
            title="Butiran Pentadbir"
            description="Lihat dan urus maklumat akaun pentadbir platform Digital MoLIB."
            actions={detailActions}
          >
            <AdminAccountDetailSkeleton />
          </ManagementPageLayout>
        ) : null}
        {record.isError && !isNotFound ? (
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <ErrorState
              title="Tidak dapat memuatkan maklumat pentadbir."
              description="Sila cuba semula atau semak kebenaran akaun."
              actionLabel="Cuba Semula"
              onAction={() => void record.refetch()}
            />
          </div>
        ) : null}
        {(!record.isLoading && !record.isError && !adminDetail) || isNotFound ? (
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <EmptyState
              title="Pentadbir tidak ditemui."
              action={
                <Button asChild>
                  <Link to={config.path}>Kembali ke Senarai Pentadbir</Link>
                </Button>
              }
            />
          </div>
        ) : null}
        {adminDetail ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Pentadbir", to: config.path },
              { label: "Butiran Pentadbir" },
            ]}
            title="Butiran Pentadbir"
            description="Lihat dan urus maklumat akaun pentadbir platform Digital MoLIB."
            actions={detailActions}
          >
            <AdminAccountDetailView
              detail={adminDetail}
              statusPending={statusMutation.isPending}
              resendPending={resendMutation.isPending}
              statusError={statusError}
              resendError={resendError}
              archiveError={archiveError}
              developmentSetupUrl={developmentSetupUrl}
              onStatusChange={handleStatusChange}
              onResendSetup={handleResendSetup}
              onCopyDevelopmentSetupUrl={handleCopyDevelopmentSetupUrl}
              onArchive={handleArchive}
            />
          </ManagementPageLayout>
        ) : null}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AdminPageHeader
        title={isAdminAccounts ? "Pentadbir" : `${config.singular} Detail`}
        description={isAdminAccounts ? "Paparan profil pentadbir platform Digital MoLIB." : config.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(config.path)}>
              <ArrowLeft className="size-4" />
              Kembali
            </Button>
            {detail ? (
              <Button asChild>
                <Link to={`${config.path}/${safeId}/edit`}>
                  <Eye className="size-4" />
                  Kemas Kini
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {record.isLoading ? <LoadingState /> : null}
      {record.isError ? (
        <ErrorState
          title="Rekod tidak dapat dimuatkan"
          description="Sila cuba semula atau semak kebenaran akaun."
          actionLabel="Cuba lagi"
          onAction={() => void record.refetch()}
        />
      ) : null}

      {detail ? (
        <div className="space-y-4">
          <AdminAccountSummary
            fullName={stringifyValue(getNestedValue(detail, "fullName"))}
            email={stringifyValue(getNestedValue(detail, "user.email") ?? getNestedValue(detail, "email"))}
            avatar={typeof getNestedValue(detail, "avatar") === "string" ? String(getNestedValue(detail, "avatar")) : null}
            accountStatus={currentStatus}
            setupStatus={setupStatus}
            isFirstLogin={Boolean(getNestedValue(detail, "user.isFirstLogin") ?? getNestedValue(detail, "isFirstLogin"))}
          />

          <SectionCard title="Maklumat">
            <AdminRecordDetails
              record={{
                phone: getNestedValue(detail, "phone"),
                lastLogin: getNestedValue(detail, "user.lastLogin") ?? getNestedValue(detail, "lastLogin"),
                createdAt: stringifyValue(getNestedValue(detail, "createdAt")),
                updatedAt: stringifyValue(getNestedValue(detail, "updatedAt")),
              }}
            />
          </SectionCard>

          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link to={`${config.path}/${safeId}/edit`}>Kemas Kini</Link>
            </Button>
            {canResendSetup ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  resendMutation.mutate(safeId, {
                    onSuccess: () => toast.success("Jemputan persediaan dihantar semula."),
                    onError: (error) => toast.error("Jemputan gagal dihantar", parseApiError(error).message),
                  })
                }
              >
                <RotateCcw className="size-4" />
                Hantar Semula Setup
              </Button>
            ) : null}
          </div>

          {possibleActions.length ? (
            <SectionCard title="Status Akaun">
              <div className="flex flex-wrap gap-2">
                {possibleActions.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={status === "ARCHIVED" ? "destructive" : "outline"}
                    disabled={statusMutation.isPending}
                    onClick={() => {
                      statusMutation.mutate(
                        { id: safeId, status },
                        {
                          onSuccess: () => toast.success("Status dikemas kini."),
                          onError: (error) => toast.error("Status gagal dikemas kini", entityStatusErrorMessage(entityKey, error)),
                        },
                      );
                    }}
                  >
                    {status === "ACTIVE" ? "Aktifkan" : status === "SUSPENDED" ? "Gantungkan" : "Arkibkan"}
                  </Button>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  );
}
