import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle, Mail, Phone, Save, UserRound } from "lucide-react";
import { Controller, useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
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
import { listAdminRecords } from "@/features/admin/api/admin.api";
import { normalizeMediaPreviewUrl } from "@/features/admin/api/media.api";
import { SchoolSelect } from "@/features/admin/components/SchoolSelect";
import { getAdminEntity } from "@/features/admin/config";
import { toSchoolSelectOption, type SchoolSelectOption } from "@/features/admin/utils/school-select";
import {
  buildTeacherUpdatePayload,
  getTeacherEditChangedFieldSummary,
  getTeacherEditDefaultValues,
  isTeacherEditSaveEnabled,
  mapTeacherEditSubmissionError,
  teacherEditFormSchema,
  type TeacherEditFieldName,
  type TeacherEditValues,
  type TeacherUpdatePayload,
} from "@/features/admin/utils/teacher-edit";
import type { TeacherDetail } from "@/features/admin/utils/teacher-detail";
import { cn } from "@/lib/utils";

const teacherEditFieldNames = ["schoolId", "fullName", "email", "phone"] as const;

function RequiredMark() {
  return <span className="text-destructive" aria-hidden="true">*</span>;
}

function TeacherFormField({
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
  name: Exclude<TeacherEditFieldName, "schoolId">;
  label: string;
  required?: boolean;
  helper: string;
  type: React.HTMLInputTypeAttribute;
  autoComplete: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  icon: React.ReactNode;
  register: UseFormRegister<TeacherEditValues>;
  errors: FieldErrors<TeacherEditValues>;
  disabled: boolean;
}) {
  const error = errors[name]?.message;
  const inputId = `teacher-edit-${name}`;
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
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
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
      <p id={helperId} className="text-sm leading-6 text-muted-foreground">{helper}</p>
    </div>
  );
}

function currentSchoolOption(detail: TeacherDetail): SchoolSelectOption | null {
  const school = detail.school;

  if (!school?.id || !school.schoolName || !school.schoolCode) {
    return null;
  }

  return {
    id: school.id,
    schoolName: school.schoolName,
    schoolCode: school.schoolCode,
    logo: school.logo ? normalizeMediaPreviewUrl(school.logo) : null,
    accountStatus: "CURRENT",
  };
}

function DiscardTeacherEditDialog({
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
          <AlertDialogDescription>Maklumat yang belum disimpan akan hilang.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 rounded-xl px-5">Teruskan Mengedit</AlertDialogCancel>
          <AlertDialogAction asChild className="h-11 rounded-xl bg-primary px-5 text-primary-foreground hover:bg-primary/90">
            <Link to={detailPath}>Buang Perubahan</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TeacherSaveConfirmationDialog({
  open,
  changedFields,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  changedFields: Array<{
    name: TeacherEditFieldName;
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
          <AlertDialogTitle>Simpan perubahan guru?</AlertDialogTitle>
          <AlertDialogDescription>Pastikan maklumat guru dan sekolah yang dipilih adalah betul.</AlertDialogDescription>
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
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
            {pending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TeacherEditForm({
  detail,
  detailPath,
  onSubmit,
  onCancelHandlerChange,
}: {
  detail: TeacherDetail;
  detailPath: string;
  onSubmit: (payload: TeacherUpdatePayload) => Promise<void>;
  onCancelHandlerChange?: (handler: (() => void) | null) => void;
}) {
  const defaults = React.useMemo(() => getTeacherEditDefaultValues(detail), [detail]);
  const navigate = useNavigate();
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState<TeacherUpdatePayload | null>(null);
  const [pendingValues, setPendingValues] = React.useState<TeacherEditValues | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const form = useForm<TeacherEditValues>({
    resolver: zodResolver(teacherEditFormSchema),
    defaultValues: defaults,
    mode: "onChange",
  });
  const currentOption = React.useMemo(() => currentSchoolOption(detail), [detail]);
  const schoolsQuery = useQuery({
    queryKey: ["admin", "schools", "teacher-edit-options", detail.id],
    queryFn: () => listAdminRecords(getAdminEntity("schools"), { page: 1, limit: 100, status: "ACTIVE", sortBy: "schoolName", sortOrder: "asc" }),
    staleTime: 60_000,
  });
  const schoolOptions = React.useMemo(() => {
    const activeOptions = (schoolsQuery.data?.items ?? [])
      .map(toSchoolSelectOption)
      .filter((school): school is SchoolSelectOption => Boolean(school))
      .filter((school) => school.accountStatus === "ACTIVE");

    if (!currentOption || activeOptions.some((school) => school.id === currentOption.id)) {
      return activeOptions;
    }

    return [currentOption, ...activeOptions];
  }, [currentOption, schoolsQuery.data?.items]);
  const schoolNames = React.useMemo(
    () => Object.fromEntries(schoolOptions.map((school) => [school.id, `${school.schoolName} (${school.schoolCode})`])),
    [schoolOptions],
  );

  React.useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty]);

  const isSubmitting = form.formState.isSubmitting || saving;
  const canSave = isTeacherEditSaveEnabled({
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
    isSubmitting,
  });

  const handleCancel = React.useCallback(() => {
    if (form.formState.isDirty) {
      setDiscardOpen(true);
      return;
    }

    navigate(detailPath);
  }, [detailPath, form.formState.isDirty, navigate]);

  React.useEffect(() => {
    onCancelHandlerChange?.(handleCancel);
    return () => onCancelHandlerChange?.(null);
  }, [handleCancel, onCancelHandlerChange]);

  const submit = form.handleSubmit((values) => {
    setConfirmError(null);
    const payload = buildTeacherUpdatePayload(values, form.formState.dirtyFields, defaults);

    if (Object.keys(payload).length === 0) {
      form.reset(defaults);
      return;
    }

    setPendingPayload(payload);
    setPendingValues(values);
    setConfirmOpen(true);
  });

  const handleConfirmSave = async () => {
    if (!pendingPayload) return;
    setSaving(true);
    setConfirmError(null);

    try {
      await onSubmit(pendingPayload);
      setConfirmOpen(false);
    } catch (error) {
      const mapped = mapTeacherEditSubmissionError(error);

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
      ? getTeacherEditChangedFieldSummary({
          payload: pendingPayload,
          values: pendingValues,
          defaults,
          schoolNames,
        })
      : [];

  return (
    <>
      <form className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm" onSubmit={submit} noValidate>
        <div className="p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <UserRound className="size-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">Maklumat Akaun</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kemas kini maklumat guru dan sekolah tempat guru ini bertugas.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="space-y-6 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <Controller
                control={form.control}
                name="schoolId"
                render={({ field, fieldState }) => {
                  const inputId = "teacher-edit-schoolId";
                  const helperId = `${inputId}-helper`;
                  const errorId = `${inputId}-error`;

                  return (
                    <div className="w-full space-y-2">
                      <Label htmlFor={inputId} className="text-sm font-semibold text-foreground">
                        Sekolah <RequiredMark />
                      </Label>
                      <SchoolSelect
                        id={inputId}
                        describedBy={fieldState.error ? `${helperId} ${errorId}` : helperId}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                        disabled={isSubmitting}
                        schools={schoolOptions}
                        isLoading={schoolsQuery.isLoading}
                        isError={schoolsQuery.isError}
                        onRetry={() => void schoolsQuery.refetch()}
                      />
                      {fieldState.error ? (
                        <p id={errorId} className="flex items-center gap-2 text-sm text-destructive" role="alert">
                          <AlertCircle className="size-4" aria-hidden="true" />
                          {fieldState.error.message}
                        </p>
                      ) : null}
                      <p id={helperId} className="text-sm leading-6 text-muted-foreground">Pilih sekolah tempat guru ini bertugas.</p>
                    </div>
                  );
                }}
              />
              <TeacherFormField name="fullName" label="Nama Penuh" required helper="Nama penuh guru seperti dalam dokumen rasmi." type="text" autoComplete="name" maxLength={150} icon={<UserRound className="size-5" aria-hidden="true" />} register={form.register} errors={form.formState.errors} disabled={isSubmitting} />
              <TeacherFormField name="email" label="E-mel" required helper="Alamat e-mel ini akan digunakan untuk log masuk dan komunikasi." type="email" autoComplete="email" maxLength={254} icon={<Mail className="size-5" aria-hidden="true" />} register={form.register} errors={form.formState.errors} disabled={isSubmitting} />
              <TeacherFormField name="phone" label="Nombor Telefon" helper="Nombor telefon untuk dihubungi apabila diperlukan." type="tel" inputMode="tel" autoComplete="tel" icon={<Phone className="size-5" aria-hidden="true" />} register={form.register} errors={form.formState.errors} disabled={isSubmitting} />
            </div>
          </div>
        </div>

        <div className="w-full border-t border-border bg-muted/30 p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 rounded-xl px-5" disabled={isSubmitting} onClick={handleCancel}>
              Batal
            </Button>
            <Button type="submit" className="h-11 min-w-[180px] gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30 disabled:opacity-60" disabled={!canSave}>
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </form>

      <DiscardTeacherEditDialog open={discardOpen} detailPath={detailPath} onOpenChange={setDiscardOpen} />
      <TeacherSaveConfirmationDialog
        open={confirmOpen}
        changedFields={changedFields}
        pending={saving}
        error={confirmError}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmSave}
      />
      <span className="sr-only" role="status" aria-live="polite">{isSubmitting ? "Maklumat guru sedang disimpan." : ""}</span>
    </>
  );
}

export function TeacherEditView({
  detail,
  path,
  onSubmit,
  onCancelHandlerChange,
}: {
  detail: TeacherDetail;
  path: string;
  onSubmit: (payload: TeacherUpdatePayload) => Promise<void>;
  onCancelHandlerChange?: (handler: (() => void) | null) => void;
}) {
  const detailPath = `${path}/${detail.id}`;

  return (
    <TeacherEditForm
      detail={detail}
      detailPath={detailPath}
      onSubmit={onSubmit}
      onCancelHandlerChange={onCancelHandlerChange}
    />
  );
}

export function TeacherEditSkeleton() {
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
        {teacherEditFieldNames.map((name) => (
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
