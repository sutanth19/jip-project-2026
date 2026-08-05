import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

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
import { Skeleton } from "@/components/ui/skeleton";
import { uploadMediaFile } from "@/features/admin/api/media.api";
import {
  SchoolFormCardHeader,
  SchoolFormFields,
} from "@/features/admin/components/SchoolFormFields";
import { schoolCreateFormSchema } from "@/features/admin/utils/school-create";
import {
  buildSchoolUpdatePayload,
  getSchoolEditChangedFieldSummary,
  getSchoolEditDefaultValues,
  isSchoolEditSaveEnabled,
  mapSchoolEditSubmissionError,
  type SchoolEditValues,
  type SchoolUpdatePayload,
} from "@/features/admin/utils/school-edit";
import {
  getSchoolLogoPreviewUrl,
  mapSchoolLogoUploadError,
  validateSchoolLogoFile,
} from "@/features/admin/utils/school-logo-upload";
import type { SchoolDetail } from "@/features/admin/utils/school-detail";

function DiscardSchoolEditDialog({
  open,
  detailPath,
  onOpenChange,
}: {
  open: boolean;
  detailPath: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
  );
}

function SchoolSaveConfirmationDialog({
  open,
  changedFields,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  changedFields: Array<{
    name: keyof SchoolUpdatePayload;
    label: string;
    before: string;
    after: string;
  }>;
  pending: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Simpan perubahan sekolah?</AlertDialogTitle>
          <AlertDialogDescription>
            Pastikan maklumat sekolah yang dikemas kini adalah betul.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          {changedFields.map((field) => (
            <div key={field.name} className="space-y-1">
              <dt className="text-sm font-semibold text-foreground">{field.label}</dt>
              <dd className="grid gap-1 text-sm leading-6 text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <span className="break-words">{field.before}</span>
                <span className="hidden text-muted-foreground sm:inline" aria-hidden="true">
                  {"->"}
                </span>
                <span className="font-medium text-foreground sm:text-right">{field.after}</span>
              </dd>
            </div>
          ))}
        </dl>

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={pending}>
            Batal
          </AlertDialogCancel>
          <Button
            type="button"
            className="h-11 gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30"
            disabled={pending}
            onClick={onConfirm}
            aria-live="polite"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {pending ? "Menyimpan..." : "Sahkan dan Simpan"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SchoolEditForm({
  detail,
  detailPath,
  onSubmit,
  onDirtyStateChange,
}: {
  detail: SchoolDetail;
  detailPath: string;
  onSubmit: (payload: SchoolUpdatePayload) => Promise<void>;
  onDirtyStateChange?: (dirty: boolean) => void;
}) {
  const defaults = React.useMemo(() => getSchoolEditDefaultValues(detail), [detail]);
  const navigate = useNavigate();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState<SchoolUpdatePayload | null>(null);
  const [pendingValues, setPendingValues] = React.useState<SchoolEditValues | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = React.useState<string | null>(null);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState("");
  const [logoPreviewUnavailable, setLogoPreviewUnavailable] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const form = useForm<SchoolEditValues>({
    resolver: zodResolver(schoolCreateFormSchema),
    defaultValues: defaults,
    mode: "onChange",
  });

  React.useEffect(() => {
    form.reset(defaults);
    onDirtyStateChange?.(false);
  }, [defaults, form, onDirtyStateChange]);

  React.useEffect(() => {
    onDirtyStateChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyStateChange]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty]);

  const logoValue = useWatch({ control: form.control, name: "logo" }) ?? "";
  const selectedLogoPreviewUrl = logoPreviewUrl || getSchoolLogoPreviewUrl(logoValue);
  const isSubmitting = form.formState.isSubmitting || saving || logoUploading;
  const canSave = isSchoolEditSaveEnabled({
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
    isSubmitting,
  });

  const handleLogoUpload = async (file: File) => {
    setLogoUploadError(null);
    setLogoPreviewUnavailable(false);
    const validationError = validateSchoolLogoFile(file);

    if (validationError) {
      setLogoUploadError(validationError);
      form.setError("logo", { type: "manual", message: validationError });
      return;
    }

    setLogoUploading(true);

    try {
      const uploaded = await uploadMediaFile({ file, purpose: "SCHOOL_LOGO" });
      form.setValue("logo", uploaded.url, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setLogoPreviewUrl(uploaded.url);
      setLogoPreviewUnavailable(false);
      form.clearErrors("logo");
    } catch (error) {
      const message = mapSchoolLogoUploadError(error);
      setLogoUploadError(message);
      form.setError("logo", { type: "server", message });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoRemove = () => {
    setLogoUploadError(null);
    setLogoPreviewUrl("");
    setLogoPreviewUnavailable(false);
    form.setValue("logo", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.clearErrors("logo");
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      setDiscardOpen(true);
      return;
    }

    navigate(detailPath);
  };

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    setConfirmError(null);
    const payload = buildSchoolUpdatePayload(values, form.formState.dirtyFields, defaults);

    if (Object.keys(payload).length === 0) {
      form.reset(defaults);
      onDirtyStateChange?.(false);
      return;
    }

    setPendingPayload(payload);
    setPendingValues(values);
    setConfirmOpen(true);
  });

  const handleConfirmSave = async () => {
    if (!pendingPayload) {
      return;
    }

    setSaving(true);
    setConfirmError(null);

    try {
      await onSubmit(pendingPayload);
      setConfirmOpen(false);
    } catch (error) {
      const mapped = mapSchoolEditSubmissionError(error);

      if (mapped.field) {
        form.setError(mapped.field, { type: "server", message: mapped.message });
        setConfirmOpen(false);
        return;
      }

      setConfirmError(mapped.message);
    } finally {
      setSaving(false);
    }
  };

  const changedFields =
    pendingPayload && pendingValues
      ? getSchoolEditChangedFieldSummary({
          payload: pendingPayload,
          values: pendingValues,
          defaults,
        })
      : [];

  return (
    <>
      <form
        className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        onSubmit={submit}
        noValidate
      >
        <SchoolFormCardHeader description="Kemas kini maklumat pendaftaran, perhubungan dan identiti sekolah." />

        <div className="border-t border-border">
          <div className="space-y-6 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <SchoolFormFields
                register={form.register}
                errors={form.formState.errors}
                disabled={isSubmitting}
                logoPreviewUrl={selectedLogoPreviewUrl}
                hasUploadedLogo={Boolean(logoValue)}
                logoPreviewUnavailable={logoPreviewUnavailable}
                logoUploading={logoUploading}
                logoError={logoUploadError ?? form.formState.errors.logo?.message}
                onLogoUpload={(file) => {
                  void handleLogoUpload(file);
                }}
                onLogoRemove={handleLogoRemove}
                onLogoPreviewError={() => setLogoPreviewUnavailable(true)}
                idPrefix="school-edit"
              />

              {serverError ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  {serverError}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="w-full border-t border-border bg-muted/30 p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-5"
              disabled={isSubmitting}
              onClick={handleCancel}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="h-11 min-w-[180px] gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30 disabled:opacity-60"
              disabled={!canSave}
            >
              <Save className="size-4" aria-hidden="true" />
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </form>

      <DiscardSchoolEditDialog
        open={discardOpen}
        detailPath={detailPath}
        onOpenChange={setDiscardOpen}
      />
      <SchoolSaveConfirmationDialog
        open={confirmOpen}
        changedFields={changedFields}
        pending={saving}
        error={confirmError}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmSave}
      />
    </>
  );
}

export function SchoolEditView({
  detail,
  path,
  onSubmit,
  onDirtyStateChange,
}: {
  detail: SchoolDetail;
  path: string;
  onSubmit: (payload: SchoolUpdatePayload) => Promise<void>;
  onDirtyStateChange?: (dirty: boolean) => void;
}) {
  const detailPath = `${path}/${detail.id}`;

  return (
    <SchoolEditForm
      detail={detail}
      detailPath={detailPath}
      onSubmit={onSubmit}
      onDirtyStateChange={onDirtyStateChange}
    />
  );
}

export function SchoolEditSkeleton() {
  const fieldNames = [
    "schoolCode",
    "schoolName",
    "principalName",
    "contactEmail",
    "phone",
    "address",
    "logo",
  ];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="space-y-6 border-t border-border p-5 sm:p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {fieldNames.map((name) => (
            <div key={name} className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className={name === "address" ? "h-32 rounded-xl" : name === "logo" ? "h-40 rounded-xl" : "h-12 rounded-xl"} />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/30 p-5 sm:flex-row sm:justify-end sm:p-6">
        <Skeleton className="h-11 rounded-xl sm:w-24" />
        <Skeleton className="h-11 rounded-xl sm:w-44" />
      </div>
    </div>
  );
}
