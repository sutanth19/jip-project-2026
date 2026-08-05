import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Info, LoaderCircle, Mail, Phone, UserPlus, UserRound, UserRoundPlus } from "lucide-react";
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
import { listAdminRecords } from "@/features/admin/api/admin.api";
import { SchoolSelect } from "@/features/admin/components/SchoolSelect";
import { getAdminEntity } from "@/features/admin/config";
import { toSchoolSelectOption } from "@/features/admin/utils/school-select";
import {
  buildTeacherCreatePayload,
  getTeacherCreateSummary,
  isTeacherCreateSubmitEnabled,
  mapTeacherCreateSubmissionError,
  teacherCreateDefaultValues,
  teacherCreateFormSchema,
  type TeacherCreatePayload,
  type TeacherCreateValues,
} from "@/features/admin/utils/teacher-create";
import { cn } from "@/lib/utils";

export type TeacherCreateResult = {
  detailPath: string;
  invitationStatus?: string;
};

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
  name: Exclude<keyof TeacherCreateValues, "schoolId">;
  label: string;
  required?: boolean;
  helper: string;
  type: React.HTMLInputTypeAttribute;
  autoComplete: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  icon: React.ReactNode;
  register: UseFormRegister<TeacherCreateValues>;
  errors: FieldErrors<TeacherCreateValues>;
  disabled: boolean;
}) {
  const error = errors[name]?.message;
  const inputId = `teacher-create-${name}`;
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

function TeacherCreateSuccessDialog({ result, onDone }: { result: TeacherCreateResult | null; onDone: () => void }) {
  const emailSent = result?.invitationStatus === "SENT";

  return (
    <AlertDialog open={Boolean(result)} onOpenChange={(open) => !open && onDone()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <AlertDialogTitle>Guru berjaya dicipta</AlertDialogTitle>
              <AlertDialogDescription>
                {emailSent
                  ? "Akaun guru telah dicipta dan e-mel penyediaan telah dihantar."
                  : "Akaun guru telah dicipta, tetapi e-mel penyediaan tidak dapat dihantar."}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <div
          className={cn(
            "rounded-xl border p-4 text-sm leading-6",
            emailSent
              ? "border-secondary/25 bg-secondary/5 text-muted-foreground"
              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
          )}
        >
          {emailSent
            ? "Guru perlu membuka e-mel tersebut untuk menetapkan kata laluan sebelum log masuk."
            : "Buka Butiran Guru untuk menghantar semula e-mel penyediaan."}
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="outline" className="h-11 rounded-xl px-5" onClick={onDone}>
            Selesai
          </Button>
          {result ? (
            <AlertDialogAction asChild className="h-11 rounded-xl px-5">
              <Link to={result.detailPath}>Lihat Butiran</Link>
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TeacherCreateForm({
  path,
  onSubmit,
  onCancelHandlerChange,
}: {
  path: string;
  onSubmit: (payload: TeacherCreatePayload) => Promise<TeacherCreateResult | void>;
  onCancelHandlerChange?: (handler: (() => void) | null) => void;
}) {
  const navigate = useNavigate();
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [successResult, setSuccessResult] = React.useState<TeacherCreateResult | null>(null);
  const [pendingPayload, setPendingPayload] = React.useState<TeacherCreatePayload | null>(null);
  const [pendingValues, setPendingValues] = React.useState<TeacherCreateValues | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const form = useForm<TeacherCreateValues>({
    resolver: zodResolver(teacherCreateFormSchema),
    defaultValues: teacherCreateDefaultValues,
    mode: "onChange",
  });
  const schoolsQuery = useQuery({
    queryKey: ["admin", "schools", "teacher-create-options"],
    queryFn: () => listAdminRecords(getAdminEntity("schools"), { page: 1, limit: 100, status: "ACTIVE", sortBy: "schoolName", sortOrder: "asc" }),
    staleTime: 60_000,
  });
  const schoolOptions = React.useMemo(
    () => (schoolsQuery.data?.items ?? [])
      .map(toSchoolSelectOption)
      .filter((school): school is NonNullable<typeof school> => Boolean(school))
      .filter((school) => school.accountStatus === "ACTIVE"),
    [schoolsQuery.data?.items],
  );

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty]);

  const isSubmitting = form.formState.isSubmitting || creating;
  const canCreate = isTeacherCreateSubmitEnabled({ isValid: form.formState.isValid, isSubmitting });
  const selectedSchoolName = schoolOptions.find((school) => school.id === pendingValues?.schoolId)?.schoolName ?? null;
  const summary = pendingValues ? getTeacherCreateSummary(pendingValues, selectedSchoolName) : [];

  const handleCancel = React.useCallback(() => {
    if (form.formState.isDirty) {
      setDiscardOpen(true);
      return;
    }

    navigate(path);
  }, [form.formState.isDirty, navigate, path]);

  React.useEffect(() => {
    onCancelHandlerChange?.(handleCancel);
    return () => onCancelHandlerChange?.(null);
  }, [handleCancel, onCancelHandlerChange]);

  const submit = form.handleSubmit((values) => {
    setConfirmError(null);
    setPendingPayload(buildTeacherCreatePayload(values));
    setPendingValues(values);
    setConfirmOpen(true);
  });

  const handleConfirmCreate = async () => {
    if (!pendingPayload) return;
    setCreating(true);
    setConfirmError(null);

    try {
      const result = await onSubmit(pendingPayload);
      setConfirmOpen(false);
      if (result?.detailPath) setSuccessResult(result);
    } catch (error) {
      const mapped = mapTeacherCreateSubmissionError(error);
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

  const handleDone = () => {
    setSuccessResult(null);
    navigate(path, { replace: true });
  };

  return (
    <>
      <form className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm" onSubmit={submit} noValidate>
        <div className="p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm">
              <UserRoundPlus className="size-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">Maklumat Akaun</h2>
              <p className="mt-1 text-sm text-muted-foreground">Maklumat ini digunakan untuk mencipta dan menghubungi akaun guru baharu.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="mx-5 mt-5 rounded-xl border border-secondary/20 bg-secondary/5 p-4 sm:mx-6 sm:mt-6">
            <div className="mx-auto flex w-full max-w-5xl items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Info className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Maklumat Akaun</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Akaun akan dicipta dalam status menunggu. Guru baharu perlu melengkapkan proses penyediaan akaun sebelum log masuk.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <Controller
                control={form.control}
                name="schoolId"
                render={({ field, fieldState }) => {
                  const inputId = "teacher-create-schoolId";
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
            <Button type="submit" className="h-11 min-w-[180px] gap-2 rounded-xl bg-secondary px-6 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30 disabled:opacity-60" disabled={!canCreate}>
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
              {isSubmitting ? "Mencipta..." : "Cipta Guru"}
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
            <AlertDialogDescription>Maklumat yang belum disimpan akan hilang.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5">Teruskan Mengedit</AlertDialogCancel>
            <AlertDialogAction asChild className="h-11 rounded-xl bg-secondary px-5 text-secondary-foreground hover:bg-secondary/90">
              <Link to={path}>Buang Perubahan</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={(nextOpen) => !creating && setConfirmOpen(nextOpen)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cipta akaun guru?</AlertDialogTitle>
            <AlertDialogDescription>Pastikan maklumat guru dan sekolah yang dipilih adalah betul.</AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            {summary.map((field) => (
              <div key={field.name} className="space-y-1">
                <dt className="text-sm font-semibold text-foreground">{field.label}</dt>
                <dd className="break-words text-sm leading-6 text-muted-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
          {confirmError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{confirmError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={creating}>Batal</AlertDialogCancel>
            <Button type="button" className="h-11 gap-2 rounded-xl bg-secondary px-5 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30" disabled={creating} onClick={handleConfirmCreate} aria-live="polite">
              {creating ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
              {creating ? "Mencipta..." : "Cipta Guru"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TeacherCreateSuccessDialog result={successResult} onDone={handleDone} />
      <span className="sr-only" role="status" aria-live="polite">{isSubmitting ? "Akaun guru sedang dicipta." : ""}</span>
    </>
  );
}
