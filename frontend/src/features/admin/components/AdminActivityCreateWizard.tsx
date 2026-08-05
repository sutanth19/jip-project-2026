import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  LockKeyhole,
  MousePointer2,
  Save,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import seretSukuKataThumbnail from "@/assets/images/img_.seret.png";
import { ConfirmDialog, EmptyState, ErrorState, ManagementPageLayout } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createAdminDigitalActivity,
  getAdminDigitalActivity,
  listAdminActivityTemplatesForCreate,
  listAdminCurriculumProgrammesForCreate,
  updateAdminDigitalActivity,
} from "@/features/admin/api/admin-activity.api";
import {
  activityBasicInfoDefaults,
  activityBasicInfoSchema,
  activityDifficultyOptions,
  activityWizardSteps,
  buildSeretSukuKataCreatePayload,
  buildSeretSukuKataUpdatePayload,
  estimatedMinuteOptions,
  findPemulihanProgramme,
  findSeretSukuKataTemplate,
  getActivityBasicInfoFormValues,
  getActivityWizardProgress,
  getActivityWizardStepStates,
  PEMULIHAN_KHAS_PROGRAMME_CODE,
  SERET_SUKU_KATA_RENDERER_KEY,
  type ActivityBasicInfoValues,
  type ActivityWizardStepId,
} from "@/features/admin/utils/admin-activity-create";
import { parseApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-context-value";

const galleryPath = "/admin/aktiviti/cipta/membaca";
const stepTwoPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kurikulum`;

const adminActivityCreateQueryKeys = {
  programmes: ["admin", "activity-create", "programmes"] as const,
  templates: ["admin", "activity-create", "templates"] as const,
  activityList: ["admin", "activities", "list"] as const,
  activitySummary: ["admin", "activities", "summary"] as const,
  builderActivityList: ["builder", "digitalActivities", "list"] as const,
  activityDetail: (activityId: string) => ["admin", "activities", "detail", activityId] as const,
};

function getActivityCreateErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);

  switch (parsed.code) {
    case "DIGITAL_ACTIVITY_TEMPLATE_INVALID":
      return "Templat Seret Suku Kata tidak tersedia buat masa ini. Sila cuba semula atau hubungi pentadbir sistem.";
    case "DIGITAL_ACTIVITY_CURRICULUM_LINK_INVALID":
      return "Program Pemulihan Khas tidak tersedia untuk penciptaan aktiviti. Sila cuba semula atau hubungi pentadbir sistem.";
    case "DIGITAL_ACTIVITY_CONFIGURATION_INVALID":
      return "Tetapan aktiviti tidak sah. Sila semak maklumat dan cuba semula.";
    default:
      return "Aktiviti tidak dapat disimpan. Sila semak maklumat dan cuba semula.";
  }
}

export function ActivityWizardStepper({
  activeStep,
  progress,
  stepLinks = {},
  onNavigateStep,
}: {
  activeStep: ActivityWizardStepId;
  progress: ReturnType<typeof getActivityWizardProgress>;
  stepLinks?: Partial<Record<ActivityWizardStepId, string>>;
  onNavigateStep?: (destination: string, stepId: ActivityWizardStepId) => void;
}) {
  const steps = React.useMemo(
    () => getActivityWizardStepStates({ activeStep, progress, stepLinks }),
    [activeStep, progress, stepLinks],
  );

  return (
    <nav aria-label="Langkah penciptaan aktiviti">
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {steps.map((step, index) => {
          const isInteractive = step.isAccessible && !step.isCurrent && Boolean(step.destination);

          const sharedClassName = cn(
            "flex h-full min-h-20 w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left text-sm shadow-sm transition-colors",
            step.isCurrent && "border-primary bg-primary/5 text-foreground",
            step.isCompleted && "border-secondary/30 bg-secondary/5 text-foreground",
            step.isLocked && "cursor-not-allowed border-border text-muted-foreground opacity-75",
          );

          const content = (
            <>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  step.isCurrent && "border-primary bg-primary text-primary-foreground",
                  step.isCompleted && "border-secondary bg-secondary text-secondary-foreground",
                  step.isLocked && "border-border bg-muted text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {step.isCompleted ? <CheckCircle2 className="size-4" /> : step.isLocked ? <LockKeyhole className="size-4" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">{step.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {step.isCurrent ? "Aktif" : step.isCompleted ? "Selesai" : step.isLocked ? "Dikunci" : "Tersedia"}
                </span>
              </span>
            </>
          );

          return (
          <li key={step.key}>
              {isInteractive ? (
                onNavigateStep ? (
                  <button
                    type="button"
                    aria-label={`${step.label}: langkah ${step.isCompleted ? "selesai" : "tersedia"}`}
                    className={cn(sharedClassName, "hover:border-secondary/50 hover:bg-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30")}
                    onClick={() => onNavigateStep(step.destination!, step.key)}
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    to={step.destination!}
                    aria-label={`${step.label}: langkah ${step.isCompleted ? "selesai" : "tersedia"}`}
                    className={cn(sharedClassName, "hover:border-secondary/50 hover:bg-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30")}
                  >
                    {content}
                  </Link>
                )
              ) : (
                <div
                  aria-current={step.isCurrent ? "step" : undefined}
                  aria-disabled={step.isLocked ? "true" : undefined}
                  aria-label={`${step.label}: ${step.isCurrent ? "langkah aktif" : step.isCompleted ? "selesai" : step.isLocked ? "dikunci" : "tersedia"}`}
                  className={sharedClassName}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SelectedTemplateSummary() {
  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-sm sm:w-32 sm:flex-none">
          <img
            src={seretSukuKataThumbnail}
            alt="Pratonton templat Seret Suku Kata"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <Badge variant="outline" className="w-fit rounded-full border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
            Templat Dipilih
          </Badge>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Seret Suku Kata</h2>
            <p className="text-sm font-medium text-muted-foreground">Membaca</p>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Lengkapkan perkataan dengan menyeret suku kata yang betul ke ruang jawapan.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateSummaryCard({ programmeName }: { programmeName: string }) {
  const rows = [
    ["Nama Templat", "Seret Suku Kata"],
    ["Kategori", "Membaca"],
    ["Jenis Interaksi", "Seret dan Lepas"],
    ["Program", programmeName],
    ["Status Aktiviti", "Belum Disimpan"],
  ];

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-secondary/20 bg-secondary/10 text-secondary">
            <MousePointer2 className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Ringkasan Templat</h2>
            <p className="text-sm text-muted-foreground">Tetapan tetap untuk aktiviti ini.</p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 rounded-xl bg-muted/30 px-3 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function ContextSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuatkan maklumat penciptaan aktiviti">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {activityWizardSteps.map((step) => (
          <Skeleton key={step.id} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

function FieldError({ message, id }: { message?: string; id: string }) {
  return message ? <p id={id} className="mt-2 text-sm font-medium text-destructive">{message}</p> : null;
}

function ActivityBasicInfoForm({
  form,
  onSubmit,
  onCancel,
  isSubmitting,
  serverError,
}: {
  form: ReturnType<typeof useForm<ActivityBasicInfoValues>>;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  serverError: string | null;
}) {
  const errors = form.formState.errors;

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
            <FileText className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Maklumat Aktiviti</h2>
            <p className="text-sm leading-6 text-muted-foreground">Masukkan maklumat asas untuk aktiviti baharu.</p>
          </div>
        </div>

        <form className="mt-6 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Nama Aktiviti <span className="text-destructive">*</span></Label>
            <Input id="title" {...form.register("title")} aria-describedby="title-help title-error" aria-invalid={Boolean(errors.title)} placeholder="Contoh: Seret Suku Kata Perkataan Mudah" />
            <p id="title-help" className="text-sm leading-6 text-muted-foreground">Gunakan nama yang mudah dikenal pasti oleh pentadbir dan guru.</p>
            <FieldError id="title-error" message={errors.title?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Penerangan</Label>
            <textarea
              id="description"
              {...form.register("description")}
              aria-describedby="description-help description-error"
              aria-invalid={Boolean(errors.description)}
              className="min-h-28 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20"
            />
            <p id="description-help" className="text-sm leading-6 text-muted-foreground">Terangkan tujuan aktiviti secara ringkas.</p>
            <FieldError id="description-error" message={errors.description?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Arahan kepada Murid <span className="text-destructive">*</span></Label>
            <textarea
              id="instructions"
              {...form.register("instructions")}
              aria-describedby="instructions-help instructions-error"
              aria-invalid={Boolean(errors.instructions)}
              className="min-h-28 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20"
            />
            <p id="instructions-help" className="text-sm leading-6 text-muted-foreground">Arahan ini akan dipaparkan kepada murid semasa aktiviti.</p>
            <FieldError id="instructions-error" message={errors.instructions?.message} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Tahap Kesukaran <span className="text-destructive">*</span></Label>
              <Select value={form.watch("difficulty")} onValueChange={(value) => form.setValue("difficulty", value as ActivityBasicInfoValues["difficulty"], { shouldDirty: true, shouldValidate: true })}>
                <SelectTrigger id="difficulty" className="w-full !bg-background/40" aria-describedby="difficulty-error" aria-invalid={Boolean(errors.difficulty)}>
                  <SelectValue placeholder="Pilih tahap kesukaran" />
                </SelectTrigger>
                <SelectContent>
                  {activityDifficultyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="difficulty-error" message={errors.difficulty?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">Anggaran Masa <span className="text-destructive">*</span></Label>
              <Select value={form.watch("estimatedMinutes")} onValueChange={(value) => form.setValue("estimatedMinutes", value, { shouldDirty: true, shouldValidate: true })}>
                <SelectTrigger id="estimatedMinutes" className="w-full !bg-background/40" aria-describedby="estimatedMinutes-error" aria-invalid={Boolean(errors.estimatedMinutes)}>
                  <SelectValue placeholder="Pilih anggaran masa" />
                </SelectTrigger>
                <SelectContent>
                  {estimatedMinuteOptions.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes} minit</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm leading-6 text-muted-foreground">Anggaran ini membantu guru merancang masa aktiviti.</p>
              <FieldError id="estimatedMinutes-error" message={errors.estimatedMinutes?.message} />
            </div>
          </div>

          {serverError ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{serverError}</p> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 w-full rounded-xl px-5 font-semibold sm:w-auto" onClick={onCancel} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" className="h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30 sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {isSubmitting ? "Menyimpan Aktiviti..." : "Simpan dan Seterusnya"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminActivityCreateWizardPage() {
  const activityId = useParams().activityId ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEditMode = Boolean(activityId);
  const form = useForm<ActivityBasicInfoValues>({
    resolver: zodResolver(activityBasicInfoSchema),
    defaultValues: activityBasicInfoDefaults,
    mode: "onChange",
  });

  const programmes = useQuery({
    queryKey: adminActivityCreateQueryKeys.programmes,
    queryFn: listAdminCurriculumProgrammesForCreate,
    staleTime: 30_000,
  });
  const templates = useQuery({
    queryKey: adminActivityCreateQueryKeys.templates,
    queryFn: listAdminActivityTemplatesForCreate,
    staleTime: 30_000,
  });
  const activity = useQuery({
    queryKey: adminActivityCreateQueryKeys.activityDetail(activityId),
    queryFn: () => getAdminDigitalActivity(activityId),
    enabled: isEditMode,
    staleTime: 30_000,
  });

  const programme = findPemulihanProgramme(programmes.data ?? []);
  const template = findSeretSukuKataTemplate(templates.data ?? []);
  const contextReady = programmes.isSuccess && templates.isSuccess && (!isEditMode || activity.isSuccess);
  const contextError = programmes.isError || templates.isError;
  const showDraftError = isEditMode && activity.data && activity.data.status !== "DRAFT";
  const hasInitializedDraft = React.useRef(false);
  const missingContextMessage =
    contextReady && !programme
      ? "Program Pemulihan Khas tidak dapat dikenal pasti. Sila cuba semula atau hubungi pentadbir sistem."
      : contextReady && !template
        ? "Templat Seret Suku Kata tidak dapat dikenal pasti. Sila cuba semula atau hubungi pentadbir sistem."
        : contextReady && activity.data?.programme?.code !== undefined && activity.data.programme.code !== PEMULIHAN_KHAS_PROGRAMME_CODE
          ? "Aktiviti draf ini tidak menggunakan program BM Pemulihan yang disokong untuk wizard ini."
          : contextReady && activity.data?.template?.rendererKey !== undefined && activity.data.template.rendererKey !== SERET_SUKU_KATA_RENDERER_KEY
            ? "Aktiviti draf ini tidak menggunakan templat Seret Suku Kata yang disokong oleh wizard ini."
        : null;

  React.useEffect(() => {
    if (!isEditMode || hasInitializedDraft.current || !activity.data) {
      return;
    }

    form.reset(getActivityBasicInfoFormValues(activity.data));
    hasInitializedDraft.current = true;
  }, [activity.data, form, isEditMode]);

  const saveActivity = useMutation({
    mutationFn: async (values: ActivityBasicInfoValues) => {
      if (isEditMode) {
        return updateAdminDigitalActivity(activityId, buildSeretSukuKataUpdatePayload({ values }));
      }

      if (!programme) {
        throw new Error("PROGRAMME_UNAVAILABLE");
      }

      if (!template) {
        throw new Error("TEMPLATE_UNAVAILABLE");
      }

      return createAdminDigitalActivity(buildSeretSukuKataCreatePayload({
        values,
        programmeId: programme.id,
        activityTemplateId: template.id,
      }));
    },
    onSuccess: async (savedActivity) => {
      await queryClient.invalidateQueries({ queryKey: adminActivityCreateQueryKeys.activityDetail(savedActivity.id) });
      form.reset(form.getValues());
      toast.success(isEditMode ? "Maklumat aktiviti berjaya dikemas kini." : "Aktiviti draf berjaya dicipta.");
      navigate(stepTwoPath(savedActivity.id), { replace: true });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "PROGRAMME_UNAVAILABLE") {
        setServerError("Program Pemulihan Khas tidak dapat dikenal pasti. Sila cuba semula atau hubungi pentadbir sistem.");
        return;
      }

      if (error instanceof Error && error.message === "TEMPLATE_UNAVAILABLE") {
        setServerError("Templat Seret Suku Kata tidak dapat dikenal pasti. Sila cuba semula atau hubungi pentadbir sistem.");
        return;
      }

      setServerError(getActivityCreateErrorMessage(error));
    },
  });

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty || saveActivity.isSuccess) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty, saveActivity.isSuccess]);

  const handleLeave = () => {
    requestNavigation(isEditMode ? stepTwoPath(activityId) : galleryPath);
  };

  const requestNavigation = (destination: string) => {
    if (form.formState.isDirty && !saveActivity.isSuccess) {
      setPendingNavigationPath(destination);
      setDiscardOpen(true);
      return;
    }

    navigate(destination);
  };

  const submit = form.handleSubmit(async (values) => {
    if (saveActivity.isPending) {
      return;
    }

    setServerError(null);
    await saveActivity.mutateAsync(values);
  });

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Pilih Jenis Aktiviti", to: "/admin/aktiviti/cipta" },
        { label: "Galeri Templat Membaca", to: galleryPath },
        ...(isEditMode ? [{ label: "Maklumat Aktiviti" }] : [{ label: "Cipta Aktiviti Seret Suku Kata" }]),
      ]}
      title={isEditMode ? "Maklumat Aktiviti" : "Cipta Aktiviti"}
      description={isEditMode ? "Kemas kini maklumat asas untuk aktiviti Seret Suku Kata." : "Lengkapkan maklumat asas untuk membina aktiviti Seret Suku Kata."}
      actions={(
        <Button type="button" variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto" onClick={handleLeave}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {isEditMode ? "Kembali ke Kurikulum" : "Kembali ke Galeri Templat Membaca"}
        </Button>
      )}
    >
      {programmes.isLoading || templates.isLoading || (isEditMode && activity.isLoading) ? <ContextSkeleton /> : null}

      {contextError ? (
        <ErrorState
          title="Maklumat penciptaan aktiviti tidak dapat dimuatkan"
          description="Sila cuba semula. Jika masalah berterusan, hubungi pentadbir sistem."
          actionLabel="Cuba Semula"
          onAction={() => {
            void programmes.refetch();
            void templates.refetch();
            if (isEditMode) {
              void activity.refetch();
            }
          }}
        />
      ) : null}

      {isEditMode && activity.isError ? (
        <ErrorState
          title="Aktiviti tidak ditemui"
          description="Aktiviti tidak ditemui atau anda tidak mempunyai kebenaran untuk melihat rekod ini."
          actionLabel="Kembali ke Pengurusan Aktiviti"
          onAction={() => navigate("/admin/aktiviti")}
        />
      ) : null}

      {showDraftError ? (
        <ErrorState
          title="Aktiviti draf diperlukan"
          description="Maklumat aktiviti hanya boleh dikemas kini melalui wizard ini apabila status aktiviti masih draf."
          actionLabel="Kembali ke Pengurusan Aktiviti"
          onAction={() => navigate("/admin/aktiviti")}
        />
      ) : null}

      {contextReady && !showDraftError && missingContextMessage ? (
        <ErrorState
          title="Maklumat penciptaan aktiviti tidak dapat dimuatkan"
          description={missingContextMessage}
          actionLabel="Kembali ke Galeri"
          onAction={() => navigate(galleryPath)}
        />
      ) : null}

      {contextReady && !showDraftError && !missingContextMessage && programme && template ? (
        <div className="space-y-6">
          <SelectedTemplateSummary />
          <ActivityWizardStepper
            activeStep="information"
            progress={getActivityWizardProgress(activity.data)}
            stepLinks={{
              curriculum: stepTwoPath(activity.data?.id ?? activityId),
              content: `/admin/aktiviti/${activity.data?.id ?? activityId}/cipta/kandungan`,
            }}
            onNavigateStep={(destination) => requestNavigation(destination)}
          />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <ActivityBasicInfoForm
              form={form}
              onSubmit={submit}
              onCancel={handleLeave}
              isSubmitting={saveActivity.isPending}
              serverError={serverError}
            />
            <TemplateSummaryCard programmeName={programme.name} />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Buang perubahan?"
        description="Maklumat yang belum disimpan akan hilang jika anda meninggalkan halaman ini."
        cancelLabel="Teruskan Mengedit"
        confirmLabel="Buang Perubahan"
        variant="destructive"
        onConfirm={() => {
          setDiscardOpen(false);
          if (pendingNavigationPath) {
            navigate(pendingNavigationPath);
            setPendingNavigationPath(null);
            return;
          }

          navigate(isEditMode ? stepTwoPath(activityId) : galleryPath);
        }}
      />
    </ManagementPageLayout>
  );
}

export function AdminActivityCurriculumPlaceholder({
  title,
  status,
}: {
  title: string;
  status: string;
}) {
  return (
    <div className="space-y-6">
      <SelectedTemplateSummary />
      <ActivityWizardStepper
        activeStep="curriculum"
        progress={{ hasDraft: true, hasCurriculumLink: false }}
      />
      <EmptyState
        icon={<Clock3 className="size-5" aria-hidden="true" />}
        title="Kurikulum"
        description="Pemetaan kurikulum untuk aktiviti ini akan dilaksanakan dalam Sprint 4.2."
        action={(
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              {title} · Status: {status}
            </p>
            <Button asChild variant="outline" className="h-11 rounded-xl px-5">
              <Link to="/admin/aktiviti">Kembali ke Pengurusan Aktiviti</Link>
            </Button>
          </div>
        )}
      />
    </div>
  );
}
