import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { EmptyState, ErrorState, LoadingState, ManagementPageLayout, PageContainer, SectionCard } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  AdminAccountCreateForm,
  type AdminAccountCreateResult,
} from "@/features/admin/components/AdminAccountCreateForm";
import {
  AdminAccountEditSkeleton,
  AdminAccountEditView,
} from "@/features/admin/components/AdminAccountEditForm";
import { AdminAccountForm } from "@/features/admin/components/AdminAccountForm";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { SchoolCreateForm } from "@/features/admin/components/SchoolCreateForm";
import {
  SchoolEditSkeleton,
  SchoolEditView,
} from "@/features/admin/components/SchoolEditForm";
import {
  TeacherCreateForm,
  type TeacherCreateResult,
} from "@/features/admin/components/TeacherCreateForm";
import {
  TeacherEditSkeleton,
  TeacherEditView,
} from "@/features/admin/components/TeacherEditForm";
import { getAdminEntity } from "@/features/admin/config";
import { useAdminRecord, useCreateAdminRecord, useUpdateAdminRecord } from "@/features/admin/hooks/use-admin-records";
import type { AdminEntityKey } from "@/features/admin/types/admin.types";
import type { AdminAccountCreatePayload } from "@/features/admin/utils/admin-account-create";
import type { AdminAccountUpdatePayload } from "@/features/admin/utils/admin-account-edit";
import type { SchoolCreatePayload } from "@/features/admin/utils/school-create";
import type { SchoolUpdatePayload } from "@/features/admin/utils/school-edit";
import type { TeacherCreatePayload } from "@/features/admin/utils/teacher-create";
import type { TeacherUpdatePayload } from "@/features/admin/utils/teacher-edit";
import { normalizeAdminDetailRecord } from "@/features/admin/utils/admin-account-detail";
import { normalizeSchoolDetailRecord } from "@/features/admin/utils/school-detail";
import { normalizeTeacherDetailRecord } from "@/features/admin/utils/teacher-detail";
import { getNestedValue, getRecordId, stringifyValue } from "@/features/admin/utils/record";
import { parseApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-context-value";

type AdminEntityFormPageProps = {
  entityKey: AdminEntityKey;
  mode: "create" | "edit";
};

const adminManagementPageContainerClass = "px-0 py-0 sm:px-0 sm:py-0 lg:px-0 lg:py-0";

export function AdminEntityFormPage({ entityKey, mode }: AdminEntityFormPageProps) {
  const config = getAdminEntity(entityKey);
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [schoolEditDirty, setSchoolEditDirty] = React.useState(false);
  const [schoolEditDiscardOpen, setSchoolEditDiscardOpen] = React.useState(false);
  const teacherCreateCancelHandler = React.useRef<(() => void) | null>(null);
  const setTeacherCreateCancelHandler = React.useCallback((handler: (() => void) | null) => {
    teacherCreateCancelHandler.current = handler;
  }, []);
  const teacherEditCancelHandler = React.useRef<(() => void) | null>(null);
  const setTeacherEditCancelHandler = React.useCallback((handler: (() => void) | null) => {
    teacherEditCancelHandler.current = handler;
  }, []);
  const id = params.id ?? "";
  const isEdit = mode === "edit";
  const detail = useAdminRecord(config, id);
  const createMutation = useCreateAdminRecord(config);
  const updateMutation = useUpdateAdminRecord(config, id);
  const record = detail.data;
  const recordId = record ? getRecordId(record) : id;
  const isAdminEdit = isEdit && config.key === "admins";
  const isAdminCreate = !isEdit && config.key === "admins";
  const isSchoolCreate = !isEdit && config.key === "schools";
  const isSchoolEdit = isEdit && config.key === "schools";
  const isTeacherCreate = !isEdit && config.key === "teachers";
  const isTeacherEdit = isEdit && config.key === "teachers";
  const defaultValues = record
    ? {
        fullName: stringifyValue(getNestedValue(record, "fullName")),
        email: stringifyValue(getNestedValue(record, "user.email") ?? getNestedValue(record, "email")),
        phone: stringifyValue(getNestedValue(record, "phone")) === "-" ? "" : stringifyValue(getNestedValue(record, "phone")),
      }
    : undefined;

  if (isAdminEdit) {
    const adminDetail = normalizeAdminDetailRecord(record);
    const fetchError = detail.isError ? parseApiError(detail.error) : null;
    const isNotFound = fetchError?.status === 404 || fetchError?.code === "ADMIN_NOT_FOUND";

    const handleAdminEditSubmit = async (payload: AdminAccountUpdatePayload) => {
      const updated = await updateMutation.mutateAsync(payload);
      const updatedDetail = normalizeAdminDetailRecord(updated) ?? adminDetail;

      toast.success("Maklumat pentadbir berjaya dikemas kini.");
      navigate(`${config.path}/${updatedDetail?.id ?? id}`, { replace: true });
    };

    const detailPath = `${config.path}/${adminDetail?.id ?? id}`;
    const editActions = (
      <Button
        asChild
        variant="outline"
        className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto"
      >
        <Link to={detailPath}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali
        </Link>
      </Button>
    );

    return (
      <PageContainer className={adminManagementPageContainerClass}>
        {detail.isLoading ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Pentadbir", to: config.path },
              { label: "Butiran Pentadbir", to: detailPath },
              { label: "Edit Pentadbir" },
            ]}
            title="Edit Pentadbir"
            description="Kemas kini maklumat asas dan hubungan pentadbir."
            actions={editActions}
          >
            <AdminAccountEditSkeleton />
          </ManagementPageLayout>
        ) : null}
        {detail.isError && !isNotFound ? (
          <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
            <ErrorState
              title="Tidak dapat memuatkan maklumat pentadbir."
              description="Sila cuba semula atau semak kebenaran akaun."
              actionLabel="Cuba Semula"
              onAction={() => void detail.refetch()}
            />
            <Button asChild variant="outline" className="h-11 rounded-xl px-5">
              <Link to={config.path}>Kembali</Link>
            </Button>
          </div>
        ) : null}
        {(!detail.isLoading && !detail.isError && !adminDetail) || isNotFound ? (
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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
              { label: "Butiran Pentadbir", to: detailPath },
              { label: "Edit Pentadbir" },
            ]}
            title="Edit Pentadbir"
            description="Kemas kini maklumat asas dan hubungan pentadbir."
            actions={editActions}
          >
            <AdminAccountEditView
              detail={adminDetail}
              path={config.path}
              onSubmit={handleAdminEditSubmit}
            />
          </ManagementPageLayout>
        ) : null}
      </PageContainer>
    );
  }

  if (isAdminCreate) {
    const handleAdminCreateSubmit = async (payload: AdminAccountCreatePayload): Promise<AdminAccountCreateResult | void> => {
      const created = await createMutation.mutateAsync(payload);
      const createdDetail = normalizeAdminDetailRecord(created);
      const createdId = String(getNestedValue(created as Record<string, unknown>, "admin.id") ?? createdDetail?.id ?? getRecordId(created as Record<string, unknown>));
      const invitationStatus = stringifyValue(getNestedValue(created as Record<string, unknown>, "invitation.status"));
      const invitationSent = invitationStatus === "SENT";
      const invitationDescription = invitationSent
        ? "Pentadbir berjaya dicipta dan e-mel penyediaan telah dihantar."
        : "Pentadbir berjaya dicipta, tetapi e-mel penyediaan tidak dapat dihantar. Gunakan “Hantar Semula Setup” untuk mencuba lagi.";

      toast.success("Pentadbir berjaya dicipta.", invitationDescription);
      return {
        detailPath: `${config.path}/${createdId}`,
        invitationStatus,
      };
    };

    return (
      <PageContainer className={adminManagementPageContainerClass}>
        <ManagementPageLayout
          breadcrumb={[
            { label: "Home", to: "/admin" },
            { label: "Pentadbir", to: config.path },
            { label: "Tambah Pentadbir" },
          ]}
          title="Tambah Pentadbir"
          description="Cipta akaun pentadbir baharu."
          actions={
            <Button
              asChild
              variant="outline"
              className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto"
            >
              <Link to={config.path}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali
              </Link>
            </Button>
          }
          currentAccent="secondary"
        >
          <AdminAccountCreateForm path={config.path} onSubmit={handleAdminCreateSubmit} />
        </ManagementPageLayout>
      </PageContainer>
    );
  }

  if (isSchoolEdit) {
    const schoolDetail = normalizeSchoolDetailRecord(record);
    const fetchError = detail.isError ? parseApiError(detail.error) : null;
    const isNotFound = fetchError?.status === 404 || fetchError?.code === "SCHOOL_NOT_FOUND";
    const detailPath = `${config.path}/${schoolDetail?.id ?? id}`;

    const handleSchoolEditSubmit = async (payload: SchoolUpdatePayload) => {
      const updated = await updateMutation.mutateAsync(payload);
      const updatedRecord = getNestedValue(updated as Record<string, unknown>, "school");
      const normalizedUpdated = normalizeSchoolDetailRecord(
        (updatedRecord && typeof updatedRecord === "object" ? updatedRecord : updated) as Record<string, unknown>,
      );

      toast.success("Maklumat sekolah berjaya dikemas kini.");
      navigate(`${config.path}/${normalizedUpdated?.id ?? schoolDetail?.id ?? id}`, { replace: true });
    };

    const handleBack = () => {
      if (schoolEditDirty) {
        setSchoolEditDiscardOpen(true);
        return;
      }

      navigate(detailPath);
    };

    const editActions = (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto"
        onClick={handleBack}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali
      </Button>
    );

    return (
      <PageContainer className={adminManagementPageContainerClass}>
        {detail.isLoading ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Sekolah", to: config.path },
              { label: "Butiran Sekolah", to: detailPath },
              { label: "Edit Sekolah" },
            ]}
            title="Edit Sekolah"
            description="Kemas kini maklumat asas dan perhubungan sekolah."
            actions={editActions}
          >
            <SchoolEditSkeleton />
          </ManagementPageLayout>
        ) : null}
        {detail.isError && !isNotFound ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Sekolah", to: config.path },
              { label: "Butiran Sekolah", to: detailPath },
              { label: "Edit Sekolah" },
            ]}
            title="Edit Sekolah"
            description="Kemas kini maklumat asas dan perhubungan sekolah."
            actions={editActions}
          >
            <div className="space-y-4">
              <ErrorState
                title="Tidak dapat memuatkan maklumat sekolah. Sila cuba lagi."
                description="Sila cuba semula atau kembali ke butiran sekolah."
                actionLabel="Cuba Semula"
                onAction={() => void detail.refetch()}
              />
              <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                <Link to={detailPath}>Kembali ke Butiran Sekolah</Link>
              </Button>
            </div>
          </ManagementPageLayout>
        ) : null}
        {(!detail.isLoading && !detail.isError && !schoolDetail) || isNotFound ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Sekolah", to: config.path },
              { label: "Edit Sekolah" },
            ]}
            title="Sekolah tidak ditemui."
            description="Rekod sekolah yang diminta tidak wujud atau telah dipadamkan."
          >
            <EmptyState
              title="Sekolah tidak ditemui."
              action={
                <Button asChild>
                  <Link to={config.path}>Kembali ke Senarai Sekolah</Link>
                </Button>
              }
            />
          </ManagementPageLayout>
        ) : null}
        {schoolDetail ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Sekolah", to: config.path },
              { label: "Butiran Sekolah", to: detailPath },
              { label: "Edit Sekolah" },
            ]}
            title="Edit Sekolah"
            description="Kemas kini maklumat asas dan perhubungan sekolah."
            actions={editActions}
          >
            <SchoolEditView
              detail={schoolDetail}
              path={config.path}
              onSubmit={handleSchoolEditSubmit}
              onDirtyStateChange={setSchoolEditDirty}
            />
          </ManagementPageLayout>
        ) : null}
        <AlertDialog open={schoolEditDiscardOpen} onOpenChange={setSchoolEditDiscardOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
              <AlertDialogDescription>
                Perubahan maklumat sekolah yang belum disimpan akan hilang.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11 rounded-xl px-5">Terus Mengedit</AlertDialogCancel>
              <AlertDialogAction asChild className="h-11 rounded-xl bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                <Link to={detailPath}>Buang Perubahan</Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    );
  }

  if (isSchoolCreate) {
    const handleSchoolCreateSubmit = async (payload: SchoolCreatePayload) => {
      const created = await createMutation.mutateAsync(payload);
      const createdId = String(getNestedValue(created as Record<string, unknown>, "school.id") ?? getRecordId(created as Record<string, unknown>));

      toast.success("Sekolah berjaya dicipta.");
      navigate(`${config.path}/${createdId}`, { replace: true });
    };

    return (
      <PageContainer className={adminManagementPageContainerClass}>
        <ManagementPageLayout
          breadcrumb={[
            { label: "Home", to: "/admin" },
            { label: "Sekolah", to: config.path },
            { label: "Tambah Sekolah" },
          ]}
          title="Tambah Sekolah"
          description="Daftarkan sekolah baharu untuk menggunakan platform Digital Main-LiT."
          actions={
            <Button
              asChild
              variant="outline"
              className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto"
            >
              <Link to={config.path}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali
              </Link>
            </Button>
          }
          currentAccent="secondary"
        >
          <SchoolCreateForm path={config.path} onSubmit={handleSchoolCreateSubmit} />
        </ManagementPageLayout>
      </PageContainer>
    );
  }

  if (isTeacherEdit) {
    const teacherDetail = normalizeTeacherDetailRecord(record);
    const fetchError = detail.isError ? parseApiError(detail.error) : null;
    const isNotFound = fetchError?.status === 404 || fetchError?.code === "TEACHER_NOT_FOUND";
    const detailPath = `${config.path}/${teacherDetail?.id ?? id}`;

    const handleTeacherEditSubmit = async (payload: TeacherUpdatePayload) => {
      const updated = await updateMutation.mutateAsync(payload);
      const updatedDetail = normalizeTeacherDetailRecord(updated) ?? teacherDetail;

      toast.success("Maklumat guru berjaya dikemas kini.");
      navigate(`${config.path}/${updatedDetail?.id ?? teacherDetail?.id ?? id}`, { replace: true });
    };

    const handleBack = () => {
      if (teacherEditCancelHandler.current) {
        teacherEditCancelHandler.current();
        return;
      }

      navigate(detailPath);
    };

    const editActions = (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto"
        onClick={handleBack}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali
      </Button>
    );

    return (
      <PageContainer className={adminManagementPageContainerClass}>
        {detail.isLoading ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Guru", to: config.path },
              { label: "Butiran Guru", to: detailPath },
              { label: "Edit Guru" },
            ]}
            title="Edit Guru"
            description="Kemas kini maklumat guru."
            actions={editActions}
          >
            <TeacherEditSkeleton />
          </ManagementPageLayout>
        ) : null}
        {detail.isError && !isNotFound ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Guru", to: config.path },
              { label: "Butiran Guru", to: detailPath },
              { label: "Edit Guru" },
            ]}
            title="Edit Guru"
            description="Kemas kini maklumat guru."
            actions={editActions}
          >
            <div className="space-y-4">
              <ErrorState
                title="Maklumat guru tidak dapat dimuatkan"
                description="Sila cuba lagi."
                actionLabel="Cuba Lagi"
                onAction={() => void detail.refetch()}
              />
              <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                <Link to={detailPath}>Kembali ke Butiran Guru</Link>
              </Button>
            </div>
          </ManagementPageLayout>
        ) : null}
        {(!detail.isLoading && !detail.isError && !teacherDetail) || isNotFound ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Guru", to: config.path },
              { label: "Edit Guru" },
            ]}
            title="Guru tidak ditemui"
            description="Rekod guru ini tidak wujud atau tidak lagi tersedia."
          >
            <EmptyState
              title="Guru tidak ditemui"
              action={
                <Button asChild>
                  <Link to={config.path}>Kembali ke Senarai Guru</Link>
                </Button>
              }
            />
          </ManagementPageLayout>
        ) : null}
        {teacherDetail ? (
          <ManagementPageLayout
            breadcrumb={[
              { label: "Home", to: "/admin" },
              { label: "Guru", to: config.path },
              { label: "Butiran Guru", to: detailPath },
              { label: "Edit Guru" },
            ]}
            title="Edit Guru"
            description="Kemas kini maklumat guru."
            actions={editActions}
          >
            <TeacherEditView
              detail={teacherDetail}
              path={config.path}
              onSubmit={handleTeacherEditSubmit}
              onCancelHandlerChange={setTeacherEditCancelHandler}
            />
          </ManagementPageLayout>
        ) : null}
      </PageContainer>
    );
  }

  if (isTeacherCreate) {
    const handleTeacherCreateSubmit = async (payload: TeacherCreatePayload): Promise<TeacherCreateResult | void> => {
      const created = await createMutation.mutateAsync(payload);
      const createdId = String(getNestedValue(created as Record<string, unknown>, "teacher.id") ?? getRecordId(created as Record<string, unknown>));
      const invitationStatus = stringifyValue(getNestedValue(created as Record<string, unknown>, "invitation.status"));
      const invitationSent = invitationStatus === "SENT";

      toast.success(
        "Guru berjaya dicipta.",
        invitationSent
          ? "Akaun guru telah dicipta dan e-mel penyediaan telah dihantar."
          : "Akaun guru telah dicipta, tetapi e-mel penyediaan tidak dapat dihantar.",
      );

      return {
        detailPath: `${config.path}/${createdId}`,
        invitationStatus,
      };
    };

    return (
      <PageContainer className={adminManagementPageContainerClass}>
        <ManagementPageLayout
          breadcrumb={[
            { label: "Home", to: "/admin" },
            { label: "Guru", to: config.path },
            { label: "Tambah Guru" },
          ]}
          title="Tambah Guru"
          description="Cipta akaun guru baharu."
          actions={
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto"
              onClick={() => {
                if (teacherCreateCancelHandler.current) {
                  teacherCreateCancelHandler.current();
                  return;
                }
                navigate(config.path);
              }}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali
            </Button>
          }
          currentAccent="secondary"
        >
          <TeacherCreateForm
            path={config.path}
            onSubmit={handleTeacherCreateSubmit}
            onCancelHandlerChange={setTeacherCreateCancelHandler}
          />
        </ManagementPageLayout>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AdminPageHeader
        title={isEdit ? "Edit Pentadbir" : "Tambah Pentadbir"}
        description={isEdit ? "Kemaskini maklumat akaun pentadbir." : "Cipta akaun pentadbir baharu."}
      />

      {isEdit && detail.isLoading ? <LoadingState /> : null}
      {isEdit && detail.isError ? <ErrorState title="Rekod tidak dijumpai" description="Tidak dapat memuatkan data untuk edit." /> : null}

      {!isEdit || record ? (
        <SectionCard title={isEdit ? "Maklumat Akaun" : "Maklumat Akaun"}>
          <AdminAccountForm
            defaultValues={defaultValues}
            submitLabel={isEdit ? "Simpan Perubahan" : "Cipta Pentadbir"}
            cancelLabel="Batal"
            infoText={isEdit ? undefined : "Akaun akan dicipta dalam status menunggu. Pentadbir baharu perlu melengkapkan proses penyediaan akaun sebelum log masuk."}
            onCancel={() => navigate(isEdit ? `${config.path}/${recordId}` : config.path)}
            onSubmit={async (values) => {
              if (isEdit) {
                const updated = await updateMutation.mutateAsync(values);
                toast.success("Pentadbir dikemas kini.");
                navigate(`${config.path}/${getRecordId(updated as Record<string, unknown>)}`, { replace: true });
                return;
              }

              const created = await createMutation.mutateAsync(values);
              toast.success("Pentadbir dicipta.");
              const createdId = String(getNestedValue(created as Record<string, unknown>, "admin.id") ?? getRecordId(created as Record<string, unknown>));
              navigate(`${config.path}/${createdId}`, { replace: true });
            }}
          />
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
