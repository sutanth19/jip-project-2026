import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  LoaderCircle,
  Mail,
  Phone,
  UserPlus,
  UserRoundPlus,
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
import {
  adminAccountCreateFormSchema,
  adminCreateDefaultValues,
  buildAdminCreatePayload,
  getAdminCreateSummary,
  isAdminCreateSubmitEnabled,
  mapAdminCreateSubmissionError,
  type AdminAccountCreatePayload,
  type AdminAccountCreateValues,
} from "@/features/admin/utils/admin-account-create";
import type { AdminAccountEditFieldName } from "@/features/admin/utils/admin-account-edit";
import { cn } from "@/lib/utils";
import { ToastContext } from "@/providers/toast-context-value";

export type AdminAccountCreateResult = {
  detailPath: string;
  developmentSetupUrl?: string;
};

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      *
    </span>
  );
}

function CreateFormField({
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
  register: UseFormRegister<AdminAccountCreateValues>;
  errors: FieldErrors<AdminAccountCreateValues>;
  disabled: boolean;
}) {
  const error = errors[name]?.message;
  const inputId = `admin-create-${name}`;
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

function DiscardCreateDialog({
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
          <AlertDialogDescription>Maklumat yang belum disimpan akan hilang.</AlertDialogDescription>
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

function CreateConfirmationDialog({
  open,
  summary,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  summary: Array<{
    name: AdminAccountEditFieldName;
    label: string;
    value: string;
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
          <AlertDialogTitle>Cipta akaun pentadbir?</AlertDialogTitle>
          <AlertDialogDescription>
            Akaun baharu akan dicipta dalam status menunggu. Pentadbir perlu melengkapkan proses penyediaan sebelum boleh log masuk.
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
              <UserPlus className="size-4" aria-hidden="true" />
            )}
            {pending ? "Mencipta..." : "Sahkan dan Cipta"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DevelopmentCreateSuccessDialog({
  result,
  onCopy,
  onOpenSetup,
}: {
  result: AdminAccountCreateResult | null;
  onCopy: () => void;
  onOpenSetup: () => void;
}) {
  return (
    <AlertDialog open={Boolean(result)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <AlertDialogTitle>Pentadbir berjaya dicipta</AlertDialogTitle>
              <AlertDialogDescription>
                Akaun telah dicipta. Gunakan pautan pembangunan ini untuk menguji penyediaan akaun secara tempatan.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              Pembangunan Sahaja
            </span>
            <h3 className="text-sm font-semibold">Pautan setup pembangunan</h3>
          </div>
          <p className="mt-2 text-sm leading-6">
            Gunakan pautan ini hanya untuk ujian pembangunan tempatan.
          </p>
        </div>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 rounded-xl px-5"
            onClick={onCopy}
            aria-label="Salin pautan setup pembangunan"
          >
            <Copy className="size-4" aria-hidden="true" />
            Salin Pautan Setup
          </Button>
          <Button
            type="button"
            className="h-11 gap-2 rounded-xl px-5"
            onClick={onOpenSetup}
            aria-label="Buka pautan setup pembangunan"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Buka Pautan Setup
          </Button>
          {result ? (
            <AlertDialogAction asChild className="h-11 rounded-xl px-5">
              <Link to={result.detailPath} state={{ developmentSetupUrl: result.developmentSetupUrl }}>
                Lihat Butiran
              </Link>
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AdminAccountCreateForm({
  path,
  onSubmit,
}: {
  path: string;
  onSubmit: (payload: AdminAccountCreatePayload) => Promise<AdminAccountCreateResult | void>;
}) {
  const navigate = useNavigate();
  const toast = React.useContext(ToastContext);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [successResult, setSuccessResult] = React.useState<AdminAccountCreateResult | null>(null);
  const [pendingPayload, setPendingPayload] = React.useState<AdminAccountCreatePayload | null>(null);
  const [pendingValues, setPendingValues] = React.useState<AdminAccountCreateValues | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const form = useForm<AdminAccountCreateValues>({
    resolver: zodResolver(adminAccountCreateFormSchema),
    defaultValues: adminCreateDefaultValues,
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

  const isSubmitting = form.formState.isSubmitting || creating;
  const canCreate = isAdminCreateSubmitEnabled({
    isValid: form.formState.isValid,
    isSubmitting,
  });

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
    const payload = buildAdminCreatePayload(values);

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
      const result = await onSubmit(pendingPayload);
      setConfirmOpen(false);
      if (result?.developmentSetupUrl) {
        setSuccessResult(result);
      }
    } catch (error) {
      const mapped = mapAdminCreateSubmissionError(error);

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

  const summary = pendingValues ? getAdminCreateSummary(pendingValues) : [];
  const handleCopyDevelopmentSetupUrl = async () => {
    if (!successResult?.developmentSetupUrl || !navigator.clipboard?.writeText) {
      toast?.error("Pautan setup tidak dapat disalin.");
      return;
    }

    try {
      await navigator.clipboard.writeText(successResult.developmentSetupUrl);
      toast?.success("Pautan setup telah disalin.");
    } catch {
      toast?.error("Pautan setup tidak dapat disalin.");
    }
  };

  const handleOpenDevelopmentSetupUrl = () => {
    if (!successResult?.developmentSetupUrl) {
      return;
    }

    window.open(successResult.developmentSetupUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <form
        className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        onSubmit={submit}
        noValidate
      >
        <div className="p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm">
              <UserRoundPlus className="size-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">Maklumat Akaun</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Maklumat ini digunakan untuk mencipta dan menghubungi akaun pentadbir baharu.
              </p>
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
                <h3 className="text-sm font-semibold text-foreground">Akaun menunggu penyediaan</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Akaun akan dicipta dalam status menunggu. Pentadbir baharu perlu melengkapkan proses penyediaan akaun sebelum boleh log masuk.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <CreateFormField
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
              <CreateFormField
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
              <CreateFormField
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
              className="h-11 min-w-[180px] gap-2 rounded-xl bg-secondary px-6 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30 disabled:opacity-60"
              disabled={!canCreate}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Cipta Pentadbir
            </Button>
          </div>
        </div>
      </form>

      <DiscardCreateDialog open={discardOpen} path={path} onOpenChange={setDiscardOpen} />
      <CreateConfirmationDialog
        open={confirmOpen}
        summary={summary}
        pending={creating}
        error={confirmError}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmCreate}
      />
      <DevelopmentCreateSuccessDialog
        result={successResult}
        onCopy={handleCopyDevelopmentSetupUrl}
        onOpenSetup={handleOpenDevelopmentSetupUrl}
      />
    </>
  );
}
