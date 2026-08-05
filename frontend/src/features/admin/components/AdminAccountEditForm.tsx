import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  LoaderCircle,
  Mail,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminAccountEditFormSchema,
  buildAdminUpdatePayload,
  getAdminEditChangedFieldSummary,
  getAdminEditDefaultValues,
  isAdminEditSaveEnabled,
  mapAdminEditSubmissionError,
  type AdminAccountEditFieldName,
  type AdminAccountEditValues,
  type AdminAccountUpdatePayload,
} from "@/features/admin/utils/admin-account-edit";
import type { AdminAccountDetail } from "@/features/admin/utils/admin-account-detail";
import { cn } from "@/lib/utils";

const adminEditFieldNames = ["fullName", "email", "phone"] as const;

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      *
    </span>
  );
}

function AdminFormField({
  name,
  label,
  required,
  helper,
  type,
  autoComplete,
  inputMode,
  maxLength,
  icon,
  register,
  errors,
  disabled,
}: {
  name: AdminAccountEditFieldName;
  label: string;
  required?: boolean;
  helper: string;
  type: React.HTMLInputTypeAttribute;
  autoComplete: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  icon: React.ReactNode;
  register: UseFormRegister<AdminAccountEditValues>;
  errors: FieldErrors<AdminAccountEditValues>;
  disabled: boolean;
}) {
  const error = errors[name]?.message;
  const inputId = `admin-edit-${name}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={inputId} className="text-sm font-semibold text-foreground">
        {label} {required ? <RequiredMark /> : null}
      </Label>
      <div className="relative w-full">
        <Input
          id={inputId}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${helperId} ${errorId}` : helperId}
          className={cn(
            "h-12 rounded-xl border-input bg-background/60 pr-12 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
          )}
          {...register(name)}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
      </div>
      {error ? (
        <p id={errorId} className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <p id={helperId} className="text-sm leading-6 text-muted-foreground">
        {helper}
      </p>
    </div>
  );
}

function UnsavedChangesDialog({
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
          <AlertDialogDescription>Perubahan yang belum disimpan akan hilang.</AlertDialogDescription>
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

function SaveConfirmationDialog({
  open,
  changedFields,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  changedFields: Array<{
    name: AdminAccountEditFieldName;
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
          <AlertDialogTitle>Simpan perubahan?</AlertDialogTitle>
          <AlertDialogDescription>
            Pastikan maklumat pentadbir yang dikemas kini adalah betul sebelum disimpan.
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

export function AdminAccountEditForm({
  detail,
  detailPath,
  onSubmit,
}: {
  detail: AdminAccountDetail;
  detailPath: string;
  onSubmit: (payload: AdminAccountUpdatePayload) => Promise<void>;
}) {
  const defaults = React.useMemo(() => getAdminEditDefaultValues(detail), [detail]);
  const navigate = useNavigate();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState<AdminAccountUpdatePayload | null>(null);
  const [pendingValues, setPendingValues] = React.useState<AdminAccountEditValues | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const form = useForm<AdminAccountEditValues>({
    resolver: zodResolver(adminAccountEditFormSchema),
    defaultValues: defaults,
    mode: "onChange",
  });

  React.useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

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

  const isSubmitting = form.formState.isSubmitting || saving;
  const canSave = isAdminEditSaveEnabled({
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
    isSubmitting,
  });

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
    const payload = buildAdminUpdatePayload(values, form.formState.dirtyFields, defaults);

    if (Object.keys(payload).length === 0) {
      form.reset(defaults);
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
      const mapped = mapAdminEditSubmissionError(error);

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
      ? getAdminEditChangedFieldSummary({
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
        <div className="p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <UserRound className="size-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">Maklumat Akaun</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Maklumat ini digunakan untuk pengurusan dan komunikasi akaun.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="space-y-6 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <AdminFormField
                name="fullName"
                label="Nama Penuh"
                required
                helper="Nama penuh pentadbir seperti dalam dokumen rasmi."
                type="text"
                autoComplete="name"
                maxLength={150}
                icon={<UserRound className="size-5" aria-hidden="true" />}
                register={form.register}
                errors={form.formState.errors}
                disabled={isSubmitting}
              />
              <AdminFormField
                name="email"
                label="E-mel"
                required
                helper="Alamat e-mel ini akan digunakan untuk log masuk dan komunikasi."
                type="email"
                autoComplete="email"
                maxLength={254}
                icon={<Mail className="size-5" aria-hidden="true" />}
                register={form.register}
                errors={form.formState.errors}
                disabled={isSubmitting}
              />
              <AdminFormField
                name="phone"
                label="Nombor Telefon"
                helper="Nombor telefon untuk dihubungi apabila diperlukan."
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                icon={<Phone className="size-5" aria-hidden="true" />}
                register={form.register}
                errors={form.formState.errors}
                disabled={isSubmitting}
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

      <UnsavedChangesDialog
        open={discardOpen}
        detailPath={detailPath}
        onOpenChange={setDiscardOpen}
      />
      <SaveConfirmationDialog
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

export function AdminAccountEditView({
  detail,
  path,
  onSubmit,
}: {
  detail: AdminAccountDetail;
  path: string;
  onSubmit: (payload: AdminAccountUpdatePayload) => Promise<void>;
}) {
  const detailPath = `${path}/${detail.id}`;

  return (
    <AdminAccountEditForm detail={detail} detailPath={detailPath} onSubmit={onSubmit} />
  );
}

export function AdminAccountEditSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>
      <div className="space-y-6 border-t border-border p-5 sm:p-6">
        {adminEditFieldNames.map((name) => (
          <div key={name} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/30 p-5 sm:flex-row sm:justify-end sm:p-6">
        <Skeleton className="h-11 rounded-xl sm:w-24" />
        <Skeleton className="h-11 rounded-xl sm:w-44" />
      </div>
    </div>
  );
}
