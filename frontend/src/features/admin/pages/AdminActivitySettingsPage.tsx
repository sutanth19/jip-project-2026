import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock3,
  ListOrdered,
  MessageSquareMore,
  Settings2,
  Trophy,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { ConfirmDialog, ErrorState, ManagementPageLayout } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MinimalToggle } from "@/components/ui/toggle";
import {
  getAdminDigitalActivity,
  updateAdminDigitalActivitySettings,
  type AdminActivityDetailRecord,
} from "@/features/admin/api/admin-activity.api";
import { ActivityWizardStepper, SelectedTemplateSummary } from "@/features/admin/components/AdminActivityCreateWizard";
import { AdminActivityWizardStepFooter } from "@/features/admin/components/AdminActivityWizardStepFooter";
import { useActivityWizardStep } from "@/features/admin/hooks/use-activity-wizard-step";
import { getActivityWizardProgress } from "@/features/admin/utils/admin-activity-create";
import {
  activityScoringModeOptions,
  activitySettingsInitialValues,
  activitySettingsSchema,
  buildActivitySettingsUpdatePayload,
  getActivitySettingsCompletionState,
  getActivitySettingsFormValues,
  getActivitySettingsProgress,
  type ActivitySettingsValues,
} from "@/features/admin/utils/admin-activity-settings";
import { parseApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-context-value";

const galleryPath = "/admin/aktiviti/cipta/membaca";
const stepOnePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/maklumat`;
const stepTwoPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kurikulum`;
const stepThreePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kandungan`;
const stepFourPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/tetapan`;
const stepFivePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/pratonton`;

const settingsQueryKeys = {
  activityDetail: (activityId: string) => ["admin", "activities", "detail", activityId] as const,
  activityPreview: (activityId: string) => ["admin", "activities", "preview", activityId] as const,
};

function getSettingsErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);

  switch (parsed.code) {
    case "DIGITAL_ACTIVITY_CONFIGURATION_INVALID":
    case "DIGITAL_ACTIVITY_REVIEW_INVALID":
      return "Tetapan aktiviti tidak dapat disimpan. Sila semak semula nilai yang dipilih.";
    default:
      return "Tetapan aktiviti tidak dapat disimpan. Sila cuba semula.";
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-2 text-sm font-medium text-destructive">{message}</p> : null;
}

function SettingsShellSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuatkan tetapan aktiviti">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description: string;
  icon: typeof Clock3;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-2xl border-border bg-card py-0 shadow-sm", className)}>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ToggleSettingRow({
  id,
  label,
  helper,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  helper: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id} className="cursor-pointer text-sm font-semibold text-foreground">
          {label}
        </Label>
        <p className="text-sm leading-6 text-muted-foreground">{helper}</p>
      </div>
      <MinimalToggle
        id={id}
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
    </div>
  );
}

function StepFourForm({
  form,
  activity,
  serverError,
  onSave,
  onCancel,
  onContinue,
  isSaving,
  canSave,
  canContinue,
}: {
  form: ReturnType<typeof useForm<ActivitySettingsValues>>;
  activity: AdminActivityDetailRecord;
  serverError: string | null;
  onSave: () => void;
  onCancel: () => void;
  onContinue: () => void;
  isSaving: boolean;
  canSave: boolean;
  canContinue: boolean;
}) {
  const errors = form.formState.errors;
  const itemCount = activity.items.length;
  const scoringMode = form.watch("scoringMode");
  const hasTimeLimit = form.watch("hasTimeLimit");
  const allowRetry = form.watch("allowRetry");

  return (
    <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <SettingsSection
        title="Masa"
        description="Tetapkan tempoh aktiviti untuk murid."
        icon={Clock3}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="estimatedMinutes">Anggaran Masa</Label>
            <Input
              id="estimatedMinutes"
              type="number"
              min={1}
              max={1440}
              inputMode="numeric"
              {...form.register("estimatedMinutes")}
              aria-describedby="estimatedMinutes-help estimatedMinutes-error"
              aria-invalid={Boolean(errors.estimatedMinutes)}
              className="h-12 rounded-xl bg-background/40"
            />
            <p id="estimatedMinutes-help" className="text-sm leading-6 text-muted-foreground">
              Anggaran masa untuk menyelesaikan aktiviti.
            </p>
            <FieldError id="estimatedMinutes-error" message={errors.estimatedMinutes?.message} />
          </div>

          <ToggleSettingRow
            id="hasTimeLimit"
            label="Had Masa"
            helper="Aktifkan untuk menetapkan tempoh maksimum murid menyelesaikan aktiviti."
            checked={hasTimeLimit}
            onCheckedChange={(checked) => {
              form.setValue("hasTimeLimit", checked, { shouldDirty: true, shouldValidate: true });
              if (!checked) {
                form.setValue("timeLimitMinutes", "", { shouldDirty: true, shouldValidate: true });
              }
            }}
          />

          {hasTimeLimit ? (
            <div className="space-y-2">
              <Label htmlFor="timeLimitMinutes">Had Masa (Minit)</Label>
              <Input
                id="timeLimitMinutes"
                type="number"
                min={1}
                max={1440}
                step="1"
                inputMode="numeric"
                {...form.register("timeLimitMinutes")}
                aria-describedby="timeLimitMinutes-help timeLimitMinutes-error"
                aria-invalid={Boolean(errors.timeLimitMinutes)}
                className="h-12 rounded-xl bg-background/40"
              />
              <p id="timeLimitMinutes-help" className="text-sm leading-6 text-muted-foreground">
                Aktiviti akan tamat apabila tempoh ini berakhir.
              </p>
              <FieldError id="timeLimitMinutes-error" message={errors.timeLimitMinutes?.message} />
            </div>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Percubaan"
        description="Tetapkan bilangan percubaan yang dibenarkan."
        icon={Settings2}
      >
        <div className="space-y-6">
          <ToggleSettingRow
            id="allowRetry"
            label="Benarkan Cuba Semula"
            helper="Murid boleh mencuba semula selagi masih mempunyai baki percubaan."
            checked={allowRetry}
            onCheckedChange={(checked) => form.setValue("allowRetry", checked, { shouldDirty: true, shouldValidate: true })}
          />

          {allowRetry ? (
            <div className="space-y-2">
              <Label htmlFor="attemptsAllowed">Bilangan Percubaan</Label>
              <Input
                id="attemptsAllowed"
                type="number"
                min={1}
                max={100}
                inputMode="numeric"
                {...form.register("attemptsAllowed")}
                aria-describedby="attemptsAllowed-help attemptsAllowed-error"
                aria-invalid={Boolean(errors.attemptsAllowed)}
                className="h-12 rounded-xl bg-background/40"
              />
              <p id="attemptsAllowed-help" className="text-sm leading-6 text-muted-foreground">
                Tetapkan jumlah maksimum percubaan yang dibenarkan.
              </p>
              <FieldError id="attemptsAllowed-error" message={errors.attemptsAllowed?.message} />
            </div>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Susunan"
        description="Tetapkan cara soalan dipersembahkan kepada murid."
        icon={ListOrdered}
      >
        <ToggleSettingRow
          id="shuffleItems"
          label="Rawakkan Susunan Soalan"
          helper="Susunan soalan akan dirawakkan semasa aktiviti dijalankan."
          checked={form.watch("shuffleItems")}
          onCheckedChange={(checked) => form.setValue("shuffleItems", checked, { shouldDirty: true, shouldValidate: true })}
        />
      </SettingsSection>

      <SettingsSection
        title="Maklum Balas"
        description="Tetapkan bila murid menerima maklum balas."
        icon={MessageSquareMore}
      >
        <ToggleSettingRow
          id="showImmediateFeedback"
          label="Maklum Balas Serta-merta"
          helper="Murid menerima maklum balas selepas menjawab soalan."
          checked={form.watch("showImmediateFeedback")}
          onCheckedChange={(checked) => form.setValue("showImmediateFeedback", checked, { shouldDirty: true, shouldValidate: true })}
        />
      </SettingsSection>

      <SettingsSection
        title="Pemarkahan"
        description="Tetapkan kaedah pemarkahan aktiviti."
        icon={Trophy}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="scoringMode">Mod Pemarkahan</Label>
            <Select
              value={scoringMode}
              onValueChange={(value) => form.setValue("scoringMode", value as ActivitySettingsValues["scoringMode"], { shouldDirty: true, shouldValidate: true })}
            >
              <SelectTrigger
                id="scoringMode"
                className="h-12 w-full rounded-xl bg-background/40"
                aria-describedby="scoringMode-help scoringMode-error"
                aria-invalid={Boolean(errors.scoringMode)}
              >
                <SelectValue placeholder="Pilih mod pemarkahan" />
              </SelectTrigger>
              <SelectContent>
                {activityScoringModeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="scoringMode-help" className="text-sm leading-6 text-muted-foreground">
              Pilih kaedah pemarkahan yang ingin digunakan untuk aktiviti ini.
            </p>
            <FieldError id="scoringMode-error" message={errors.scoringMode?.message} />
          </div>

          {scoringMode !== "NONE" ? (
            <div className="space-y-2">
              <Label htmlFor="totalMarks">Jumlah Markah</Label>
              <Input
                id="totalMarks"
                type="number"
                min={1}
                max={100000}
                inputMode="numeric"
                {...form.register("totalMarks")}
                aria-describedby="totalMarks-help totalMarks-error"
                aria-invalid={Boolean(errors.totalMarks)}
                className="h-12 rounded-xl bg-background/40"
              />
              <p id="totalMarks-help" className="text-sm leading-6 text-muted-foreground">
                Untuk templat ini, nilai yang disokong secara selamat ialah jumlah soalan semasa: {itemCount}.
              </p>
              <FieldError id="totalMarks-error" message={errors.totalMarks?.message} />
            </div>
          ) : null}

          {scoringMode === "MASTERY_THRESHOLD" ? (
            <div className="space-y-2">
              <Label htmlFor="masteryThreshold">Tahap Penguasaan (%)</Label>
              <Input
                id="masteryThreshold"
                type="number"
                min={1}
                max={100}
                inputMode="numeric"
                {...form.register("masteryThreshold")}
                aria-describedby="masteryThreshold-help masteryThreshold-error"
                aria-invalid={Boolean(errors.masteryThreshold)}
                className="h-12 rounded-xl bg-background/40"
              />
              <p id="masteryThreshold-help" className="text-sm leading-6 text-muted-foreground">
                Tetapkan peratus minimum yang perlu dicapai apabila mod ambang penguasaan digunakan.
              </p>
              <FieldError id="masteryThreshold-error" message={errors.masteryThreshold?.message} />
            </div>
          ) : null}
        </div>
      </SettingsSection>

      {serverError ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{serverError}</p> : null}

      <AdminActivityWizardStepFooter
        isSaving={isSaving}
        canSave={canSave}
        canContinue={canContinue}
        onCancel={onCancel}
        onSave={onSave}
        onContinue={onContinue}
      />
    </form>
  );
}

export function AdminActivitySettingsPage() {
  const activityId = useParams().activityId ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const hasInitializedForm = React.useRef(false);

  const form = useForm<ActivitySettingsValues>({
    resolver: zodResolver(activitySettingsSchema),
    defaultValues: activitySettingsInitialValues,
    mode: "onChange",
  });

  const activity = useQuery({
    queryKey: settingsQueryKeys.activityDetail(activityId),
    queryFn: () => getAdminDigitalActivity(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (!activity.data || hasInitializedForm.current) {
      return;
    }

    form.reset(getActivitySettingsFormValues(activity.data));
    hasInitializedForm.current = true;
  }, [activity.data, form]);

  const saveSettings = useMutation({
    mutationFn: async (values: ActivitySettingsValues) => updateAdminDigitalActivitySettings(activityId, buildActivitySettingsUpdatePayload(values)),
    onSuccess: async (savedActivity) => {
      queryClient.setQueryData(settingsQueryKeys.activityDetail(savedActivity.id), savedActivity);
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.activityPreview(savedActivity.id) });
      form.reset(getActivitySettingsFormValues(savedActivity));
      setServerError(null);
      toast.success("Berjaya", "Tetapan aktiviti berjaya disimpan.");
    },
    onError: (error) => {
      setServerError(getSettingsErrorMessage(error));
    },
  });

  const progress = getActivitySettingsProgress(getActivityWizardProgress(activity.data));
  const settingsCompletion = getActivitySettingsCompletionState(activity.data);
  const stepController = useActivityWizardStep({
    form,
    navigate,
    cancelDestination: galleryPath,
    continueDestination: stepFivePath(activityId),
    onSave: async (values) => {
      setServerError(null);
      await saveSettings.mutateAsync(values);
    },
    isSaving: saveSettings.isPending,
    isSaved: settingsCompletion.hasPersistedCompletion,
    isReady: Boolean(activity.data),
    hasHydrated: !activity.isLoading,
  });

  const showDraftError = activity.data && activity.data.status !== "DRAFT";
  const showIncompleteStepsError = activity.data && activity.data.status === "DRAFT" && !(progress.hasCurriculumLink && progress.hasContent);

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Maklumat", to: stepOnePath(activityId) },
        { label: "Kurikulum", to: stepTwoPath(activityId) },
        { label: "Kandungan", to: stepThreePath(activityId) },
        { label: "Tetapan" },
      ]}
      title="Tetapan Aktiviti"
      description="Tetapkan cara aktiviti dijalankan kepada murid."
    >
      {activity.isLoading ? <SettingsShellSkeleton /> : null}

      {activity.isError ? (
        <ErrorState
          title="Tetapan aktiviti tidak dapat dimuatkan"
          description="Sila cuba semula."
          actionLabel="Cuba Semula"
          onAction={() => {
            void activity.refetch();
          }}
        />
      ) : null}

      {showDraftError ? (
        <ErrorState
          title="Aktiviti draf diperlukan"
          description="Langkah Tetapan hanya boleh dilakukan untuk aktiviti berstatus draf."
          actionLabel="Kembali ke Pengurusan Aktiviti"
          onAction={() => navigate("/admin/aktiviti")}
        />
      ) : null}

      {showIncompleteStepsError ? (
        <ErrorState
          title="Lengkapkan langkah sebelumnya dahulu"
          description="Langkah Tetapan memerlukan Kurikulum dan Kandungan yang telah disimpan pada aktiviti draf ini."
          actionLabel={progress.hasCurriculumLink ? "Pergi ke Kandungan" : "Pergi ke Kurikulum"}
          onAction={() => navigate(progress.hasCurriculumLink ? stepThreePath(activityId) : stepTwoPath(activityId))}
        />
      ) : null}

      {activity.data && activity.data.status === "DRAFT" ? (
        <div className="space-y-6">
          <SelectedTemplateSummary />
          <ActivityWizardStepper
            activeStep="settings"
            progress={progress}
            stepLinks={{
              information: stepOnePath(activityId),
              curriculum: stepTwoPath(activityId),
              content: stepThreePath(activityId),
              settings: stepFourPath(activityId),
            }}
            onNavigateStep={(destination) => stepController.requestStepNavigation(destination)}
          />

          <StepFourForm
            form={form}
            activity={activity.data}
            serverError={serverError}
            onSave={stepController.save}
            onCancel={stepController.requestCancel}
            onContinue={stepController.continueToNextStep}
            isSaving={stepController.isSaving}
            canSave={stepController.canSave}
            canContinue={stepController.canContinue}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={stepController.discardDialog.open}
        onOpenChange={stepController.discardDialog.onOpenChange}
        title="Buang perubahan?"
        description="Perubahan yang belum disimpan akan hilang jika anda meninggalkan langkah ini."
        cancelLabel="Teruskan Mengedit"
        confirmLabel="Buang Perubahan"
        variant="destructive"
        onConfirm={stepController.discardDialog.onConfirm}
      />
    </ManagementPageLayout>
  );
}
