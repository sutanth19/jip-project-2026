import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Info,
  LoaderCircle,
  Plus,
  School,
} from "lucide-react";
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
import { uploadMediaFile } from "@/features/admin/api/media.api";
import {
  SchoolFormCardHeader,
  SchoolFormFields,
} from "@/features/admin/components/SchoolFormFields";
import {
  getSchoolLogoPreviewUrl,
  mapSchoolLogoUploadError,
  validateSchoolLogoFile,
} from "@/features/admin/utils/school-logo-upload";
import {
  buildSchoolCreatePayload,
  getSchoolCreateSummary,
  isSchoolCreateSubmitEnabled,
  mapSchoolCreateSubmissionError,
  schoolCreateDefaultValues,
  schoolCreateFormSchema,
  type SchoolCreateFieldName,
  type SchoolCreatePayload,
  type SchoolCreateValues,
} from "@/features/admin/utils/school-create";

function DiscardSchoolCreateDialog({
  open,
  path,
  onOpenChange,
}: {
  open: boolean;
  path: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Buang maklumat yang dimasukkan?</AlertDialogTitle>
          <AlertDialogDescription>
            Maklumat sekolah yang belum disimpan akan hilang.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 rounded-xl px-5">Terus Mengisi</AlertDialogCancel>
          <AlertDialogAction asChild className="h-11 rounded-xl bg-secondary px-5 text-secondary-foreground hover:bg-secondary/90">
            <Link to={path}>Buang Maklumat</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SchoolCreateConfirmationDialog({
  open,
  summary,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  summary: Array<{ name: SchoolCreateFieldName; label: string; value: string }>;
  pending: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cipta sekolah baharu?</AlertDialogTitle>
          <AlertDialogDescription>
            Pastikan maklumat sekolah adalah betul sebelum rekod dicipta.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          {summary.map((field) => (
            <div key={field.name} className="space-y-1">
              <dt className="text-sm font-semibold text-foreground">{field.label}</dt>
              <dd className="break-words text-sm leading-6 text-muted-foreground">{field.value}</dd>
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
            className="h-11 gap-2 rounded-xl bg-secondary px-5 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30"
            disabled={pending}
            onClick={onConfirm}
            aria-live="polite"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <School className="size-4" aria-hidden="true" />
            )}
            {pending ? "Mencipta..." : "Sahkan dan Cipta"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SchoolCreateForm({
  path,
  onSubmit,
}: {
  path: string;
  onSubmit: (payload: SchoolCreatePayload) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState<SchoolCreatePayload | null>(null);
  const [pendingValues, setPendingValues] = React.useState<SchoolCreateValues | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = React.useState<string | null>(null);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState("");
  const [logoPreviewUnavailable, setLogoPreviewUnavailable] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const form = useForm<SchoolCreateValues>({
    resolver: zodResolver(schoolCreateFormSchema),
    defaultValues: schoolCreateDefaultValues,
    mode: "onChange",
  });

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
  const isSubmitting = form.formState.isSubmitting || creating || logoUploading;
  const canCreate = isSchoolCreateSubmitEnabled({
    isValid: form.formState.isValid,
    isSubmitting,
  });

  const handleLogoUpload = async (file: File) => {
    setLogoUploadError(null);
    setLogoPreviewUnavailable(false);
    setLogoPreviewUrl("");
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

    navigate(path);
  };

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    setConfirmError(null);
    const payload = buildSchoolCreatePayload(values);

    setPendingPayload(payload);
    setPendingValues(values);
    setConfirmOpen(true);
  });

  const handleConfirmCreate = async () => {
    if (!pendingPayload) {
      return;
    }

    setCreating(true);
    setConfirmError(null);

    try {
      await onSubmit(pendingPayload);
      setConfirmOpen(false);
    } catch (error) {
      const mapped = mapSchoolCreateSubmissionError(error);

      if (mapped.field) {
        form.setError(mapped.field, { type: "server", message: mapped.message });
        setConfirmOpen(false);
        return;
      }

      setConfirmError(mapped.message);
    } finally {
      setCreating(false);
    }
  };

  const summary = pendingValues ? getSchoolCreateSummary(pendingValues) : [];

  return (
    <>
      <form
        className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        onSubmit={submit}
        noValidate
      >
        <SchoolFormCardHeader description="Maklumat ini digunakan untuk pendaftaran, pengurusan dan komunikasi sekolah." />

        <div className="border-t border-border">
          <div className="mx-5 mt-5 rounded-xl border border-secondary/20 bg-secondary/5 p-4 sm:mx-6 sm:mt-6">
            <div className="mx-auto flex w-full max-w-5xl items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Info className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Sekolah akan diaktifkan selepas dicipta</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Rekod sekolah baharu akan diwujudkan dengan status aktif dan boleh digunakan untuk pendaftaran guru, kelas dan murid.
                </p>
              </div>
            </div>
          </div>

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
                idPrefix="school-create"
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
              className="h-11 min-w-[180px] gap-2 rounded-xl bg-secondary px-6 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30 disabled:opacity-60"
              disabled={!canCreate}
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              {isSubmitting ? "Mencipta..." : "Cipta Sekolah"}
            </Button>
          </div>
        </div>
      </form>

      <DiscardSchoolCreateDialog open={discardOpen} path={path} onOpenChange={setDiscardOpen} />
      <SchoolCreateConfirmationDialog
        open={confirmOpen}
        summary={summary}
        pending={creating}
        error={confirmError}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmCreate}
      />
    </>
  );
}
