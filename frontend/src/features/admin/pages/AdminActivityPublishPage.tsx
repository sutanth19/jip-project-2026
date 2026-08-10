import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, CircleAlert, ClipboardList, Eye, FileCheck2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ConfirmDialog, ErrorState, ManagementPageLayout } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminDigitalActivity,
  getAdminDigitalActivityPublishReadiness,
  publishAdminDigitalActivity,
  type AdminActivityPublishReadiness,
  type AdminActivityDetailRecord,
} from "@/features/admin/api/admin-activity.api";
import { ActivityWizardStepper, SelectedTemplateSummary } from "@/features/admin/components/AdminActivityCreateWizard";
import { getAdminActivityStatusLabel, getAdminActivityTemplateLabel } from "@/features/admin/utils/admin-activity";
import { getActivityWizardProgress } from "@/features/admin/utils/admin-activity-create";
import { activityScoringModeOptions } from "@/features/admin/utils/admin-activity-settings";
import { useCurrentUser } from "@/hooks/use-auth";
import { ApiError, parseApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-context-value";

const stepOnePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/maklumat`;
const stepTwoPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kurikulum`;
const stepThreePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kandungan`;
const stepFourPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/tetapan`;
const stepFivePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/pratonton`;

const publishQueryKeys = {
  activityDetail: (activityId: string) => ["admin", "activities", "detail", activityId] as const,
  activityPreview: (activityId: string) => ["admin", "activities", "preview", activityId] as const,
  activityList: ["admin", "activities", "list"] as const,
  activitySummary: ["admin", "activities", "summary"] as const,
  builderActivityList: ["builder", "digitalActivities", "list"] as const,
};

type PublishAction =
  | { type: "publish"; label: string; title: string; description: string; confirmLabel: string }
  | null;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function getPublishErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);
  const details = error instanceof ApiError ? (error as ApiError & { details?: { issues?: string[] } }).details : undefined;
  const issues = Array.isArray(details?.issues) ? details.issues : [];

  switch (parsed.code) {
    case "DIGITAL_ACTIVITY_PUBLICATION_INVALID":
    case "DIGITAL_ACTIVITY_REVIEW_INVALID":
      if (issues.includes("SCORING_INVALID")) {
        return "Jumlah markah aktiviti belum sepadan dengan markah item yang disimpan.";
      }
      return "Aktiviti belum memenuhi syarat untuk diaktifkan. Sila lengkapkan semua semakan yang ditandakan.";
    case "DIGITAL_ACTIVITY_STATUS_TRANSITION_INVALID":
      return "Status aktiviti semasa tidak membenarkan tindakan ini.";
    case "DIGITAL_ACTIVITY_ACCESS_DENIED":
      return "Anda tidak dibenarkan mengurus status aktiviti ini.";
    default:
      return "Tindakan status aktiviti tidak berjaya. Sila cuba semula.";
  }
}

function statusTone(status: string) {
  if (status === "PUBLISHED") return "border-secondary/20 bg-secondary/10 text-secondary";
  if (status === "IN_REVIEW") return "border-warning/20 bg-warning/10 text-warning";
  if (status === "ARCHIVED") return "border-border bg-muted text-muted-foreground";
  return "border-primary/20 bg-primary/10 text-primary";
}

function getActivityStatusLabel(status: string) {
  if (status === "DRAFT") {
    return "Draf";
  }

  if (status === "PUBLISHED") {
    return "Aktif";
  }

  return getAdminActivityStatusLabel(status);
}

function getScoringModeLabel(scoringMode: AdminActivityDetailRecord["scoringMode"]) {
  return activityScoringModeOptions.find((option) => option.value === scoringMode)?.label ?? "Tidak tersedia";
}

function deriveContentCounts(activity: AdminActivityDetailRecord) {
  let imageCount = 0;
  let audioCount = 0;
  let hintCount = 0;

  for (const item of activity.items) {
    const configuration = asRecord(item.configuration);
    const arrangeSyllables = asRecord(configuration?.arrangeSyllables);
    const media = asRecord(arrangeSyllables?.media);
    const image = asRecord(media?.image);
    const audio = asRecord(media?.audio);

    if (typeof arrangeSyllables?.hint === "string" && arrangeSyllables.hint.trim()) {
      hintCount += 1;
    }
    if (typeof image?.url === "string" && image.url.trim()) {
      imageCount += 1;
    }
    if (typeof audio?.url === "string" && audio.url.trim()) {
      audioCount += 1;
    }
  }

  return { imageCount, audioCount, hintCount };
}

function getPublishAction(activity: AdminActivityDetailRecord, role: string | null): PublishAction {
  if (activity.status === "DRAFT" && role === "SUPER_ADMIN") {
    return {
      type: "publish",
      label: "Aktifkan Aktiviti",
      title: "Aktifkan Aktiviti?",
      description: "Aktiviti ini akan diaktifkan dan tersedia untuk digunakan dalam aliran pengajaran.",
      confirmLabel: "Aktifkan Aktiviti",
    };
  }

  return null;
}

function getReadinessRows(activity: AdminActivityDetailRecord, readiness?: AdminActivityPublishReadiness) {
  return [
    { key: "information", label: "Maklumat", value: readiness?.checks.information ? "Lengkap" : "Belum lengkap", ready: readiness?.checks.information ?? false },
    { key: "curriculum", label: "Kurikulum", value: readiness?.checks.curriculum ? "Lengkap" : "Belum lengkap", ready: readiness?.checks.curriculum ?? false },
    { key: "content", label: "Kandungan", value: readiness?.checks.content ? `${activity.items.length} soalan` : "Belum lengkap", ready: readiness?.checks.content ?? false },
    { key: "settings", label: "Tetapan", value: readiness?.checks.settings ? "Lengkap" : "Belum lengkap", ready: readiness?.checks.settings ?? false },
    { key: "preview", label: "Pratonton", value: readiness?.checks.preview ? "Tersedia" : "Belum tersedia", ready: readiness?.checks.preview ?? false },
  ];
}

function getPrimaryReadinessMessage(readiness?: AdminActivityPublishReadiness): string | null {
  if (!readiness || readiness.ready) return null;
  if (readiness.issues.includes("SCORING_INVALID")) return "Markah item belum sepadan dengan jumlah markah. Kembali ke Tetapan dan simpan semula tetapan pemarkahan.";
  if (readiness.issues.includes("CURRICULUM_LINK_REQUIRED") || readiness.issues.includes("PRIMARY_LINK_REQUIRED")) return "Pautan kurikulum utama masih belum lengkap.";
  if (readiness.issues.includes("ITEM_REQUIRED") || readiness.issues.includes("ITEM_INVALID") || readiness.issues.includes("ARRANGE_SYLLABLES_CONTRACT_INVALID")) return "Kandungan aktiviti masih belum memenuhi syarat penerbitan.";
  if (readiness.issues.includes("CONFIGURATION_INVALID")) return "Konfigurasi aktiviti masih belum sah untuk diterbitkan.";
  return "Aktiviti belum memenuhi semua syarat untuk diaktifkan.";
}

function PublishSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuatkan langkah penerbitan aktiviti">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Skeleton className="h-80 rounded-2xl" />
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ activity }: { activity: AdminActivityDetailRecord }) {
  const primaryLink = activity.curriculumLinks.find((link) => link.isPrimary) ?? activity.curriculumLinks[0] ?? null;
  const counts = deriveContentCounts(activity);
  const rows = [
    { label: "Nama Aktiviti", value: activity.title || "Tidak tersedia" },
    { label: "Templat", value: getAdminActivityTemplateLabel(activity.template) },
    { label: "Tahun", value: primaryLink?.curriculumYear?.name ?? "Tidak tersedia" },
    { label: "Kemahiran Pemulihan", value: primaryLink?.remedialSkill?.name ?? "Tidak tersedia" },
    { label: "Standard Kandungan", value: primaryLink?.contentStandard ? `${primaryLink.contentStandard.code} ${primaryLink.contentStandard.title}` : "Tidak tersedia" },
    { label: "Standard Pembelajaran", value: primaryLink?.learningStandard?.code ?? "Tidak tersedia" },
    ...(primaryLink?.learningObjective?.description
      ? [{ label: "Objektif Pembelajaran", value: primaryLink.learningObjective.description }]
      : []),
    { label: "Jumlah Soalan", value: String(activity.items.length) },
    { label: "Imej", value: `${counts.imageCount}` },
    { label: "Audio", value: `${counts.audioCount}` },
    { label: "Petunjuk", value: `${counts.hintCount}/${activity.items.length}` },
    { label: "Anggaran Masa", value: activity.estimatedMinutes ? `${activity.estimatedMinutes} minit` : "Tidak tersedia" },
    ...(activity.timeLimitSeconds ? [{ label: "Had Masa", value: `${Math.floor(activity.timeLimitSeconds / 60)} minit` }] : []),
    { label: "Mod Pemarkahan", value: getScoringModeLabel(activity.scoringMode) },
    ...(typeof activity.totalMarks === "number" ? [{ label: "Jumlah Markah", value: `${activity.totalMarks}` }] : []),
    { label: "Rawak Item", value: activity.shuffleItems ? "Ya" : "Tidak" },
  ];

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <ClipboardList className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Ringkasan Aktiviti</h2>
            <p className="text-sm leading-6 text-muted-foreground">Semak maklumat utama aktiviti sebelum menyimpan sebagai draf atau mengaktifkannya.</p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/30 px-4 py-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="max-w-[55%] text-right font-semibold text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function StatusCard({
  activity,
  action,
  isPending,
  canActivate,
  onSaveDraft,
  onOpenConfirm,
}: {
  activity: AdminActivityDetailRecord;
  action: PublishAction;
  isPending: boolean;
  canActivate: boolean;
  onSaveDraft: () => void;
  onOpenConfirm: () => void;
}) {
  const helperText = activity.status === "DRAFT"
    ? "Aktiviti masih dalam status draf. Semak maklumat sebelum mengaktifkannya."
      : activity.status === "PUBLISHED"
        ? "Aktiviti ini aktif dan tersedia untuk digunakan mengikut aliran sistem."
        : activity.status === "ARCHIVED"
          ? "Aktiviti ini telah diarkibkan dan tidak boleh diaktifkan semula melalui langkah ini."
          : "Aktiviti ini masih menggunakan aliran status semasa sistem.";

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Status Aktiviti</h2>
              <p className="text-sm leading-6 text-muted-foreground">{helperText}</p>
            </div>
          </div>
          <Badge className={cn("shrink-0 rounded-full border px-3 py-1 text-sm font-semibold", statusTone(activity.status))}>
            {getActivityStatusLabel(activity.status)}
          </Badge>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Status Semasa</span>
          <span className="text-right font-semibold text-foreground">{getActivityStatusLabel(activity.status)}</span>
        </div>

        <div className="grid gap-3">
          <Button asChild variant="outline" className="h-11 w-full rounded-xl px-5 font-semibold">
            <Link to={stepFivePath(activity.id)}>
              <Eye className="size-4" aria-hidden="true" />
              Lihat Pratonton
            </Link>
          </Button>
          {activity.status === "DRAFT" ? (
            <Button
              type="button"
              variant="success"
              className="h-11 w-full rounded-xl px-5 font-semibold"
              disabled={isPending}
              onClick={onSaveDraft}
            >
              <Save className="size-4" aria-hidden="true" />
              Simpan sebagai Draf
            </Button>
          ) : null}
          {action ? (
            <Button
              type="button"
              className="h-11 w-full rounded-xl px-5 font-semibold"
              disabled={isPending || !canActivate}
              onClick={onOpenConfirm}
            >
              <BookOpenCheck className="size-4" aria-hidden="true" />
              {action.label}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistCard({
  activity,
  readiness,
}: {
  activity: AdminActivityDetailRecord;
  readiness?: AdminActivityPublishReadiness;
}) {
  const rows = getReadinessRows(activity, readiness);
  const primaryMessage = getPrimaryReadinessMessage(readiness);

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-warning/20 bg-warning/10 text-warning">
            <CircleAlert className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Semakan</h2>
            <p className="text-sm leading-6 text-muted-foreground">Pastikan semua langkah aktiviti telah lengkap sebelum diaktifkan.</p>
          </div>
        </div>

        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={cn("flex size-9 items-center justify-center rounded-xl border", row.ready ? "border-secondary/20 bg-secondary/10 text-secondary" : "border-warning/20 bg-warning/10 text-warning")}>
                  {row.ready ? <FileCheck2 className="size-4" aria-hidden="true" /> : <CircleAlert className="size-4" aria-hidden="true" />}
                </span>
                <span className="font-medium text-foreground">{row.label}</span>
              </div>
              <span className={cn("text-sm font-semibold", row.ready ? "text-secondary" : "text-warning")}>{row.value}</span>
            </li>
          ))}
        </ul>

        {primaryMessage ? (
          <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            {primaryMessage}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminActivityPublishPage() {
  const activityId = useParams().activityId ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const currentUser = useCurrentUser();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [returnConfirmOpen, setReturnConfirmOpen] = React.useState(false);

  const activity = useQuery({
    queryKey: publishQueryKeys.activityDetail(activityId),
    queryFn: () => getAdminDigitalActivity(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  });

  const readiness = useQuery({
    queryKey: [...publishQueryKeys.activityDetail(activityId), "publish-readiness"] as const,
    queryFn: () => getAdminDigitalActivityPublishReadiness(activityId),
    enabled: Boolean(activityId) && activity.isSuccess,
    staleTime: 30_000,
  });

  const progress = getActivityWizardProgress(activity.data);
  const action = activity.data ? getPublishAction(activity.data, currentUser?.role ?? null) : null;
  const canActivate = Boolean(action) && Boolean(readiness.data?.ready) && !readiness.isLoading;

  const lifecycleMutation = useMutation({
    mutationFn: async () => {
      if (!activity.data || !action) {
        throw new Error("Publish action is not available.");
      }

      return publishAdminDigitalActivity(activity.data.id);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(publishQueryKeys.activityDetail(updated.id), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: publishQueryKeys.activityPreview(updated.id) }),
        queryClient.invalidateQueries({ queryKey: publishQueryKeys.activityList }),
        queryClient.invalidateQueries({ queryKey: publishQueryKeys.activitySummary }),
        queryClient.invalidateQueries({ queryKey: publishQueryKeys.builderActivityList }),
        queryClient.invalidateQueries({ queryKey: [...publishQueryKeys.activityDetail(updated.id), "publish-readiness"] }),
      ]);

      toast.success(
        "Berjaya",
        "Aktiviti berjaya diaktifkan.",
      );
      setConfirmOpen(false);
    },
    onError: (error) => {
      toast.error("Ralat", getPublishErrorMessage(error));
    },
  });

  const showUnavailableError = activity.data && !progress.hasSettings;
  const hasUnsavedStepSixChanges = false;
  const returnDescription = hasUnsavedStepSixChanges
    ? "Perubahan yang belum disimpan akan hilang jika anda kembali ke Pengurusan Aktiviti. Adakah anda pasti mahu meneruskan?"
    : "Anda akan kembali ke Pengurusan Aktiviti. Adakah anda pasti mahu meneruskan?";

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Maklumat", to: stepOnePath(activityId) },
        { label: "Kurikulum", to: stepTwoPath(activityId) },
        { label: "Kandungan", to: stepThreePath(activityId) },
        { label: "Tetapan", to: stepFourPath(activityId) },
        { label: "Pratonton", to: stepFivePath(activityId) },
        { label: "Terbitkan" },
      ]}
      title="Terbitkan Aktiviti"
      description="Semak ringkasan aktiviti dan urus statusnya sebelum digunakan dalam pembelajaran."
    >
      {activity.isLoading ? <PublishSkeleton /> : null}

      {activity.isError ? (
        <ErrorState
          title="Langkah penerbitan tidak dapat dimuatkan"
          description="Sila cuba semula."
          actionLabel="Cuba Semula"
          onAction={() => {
            void activity.refetch();
          }}
        />
      ) : null}

      {showUnavailableError ? (
        <ErrorState
          title="Langkah penerbitan belum tersedia"
          description="Selesaikan tetapan aktiviti terlebih dahulu sebelum meneruskan ke langkah Terbitkan."
          actionLabel="Kembali ke Tetapan"
          onAction={() => navigate(stepFourPath(activityId))}
        />
      ) : null}

      {activity.data && progress.hasSettings ? (
        <div className="space-y-6">
          <SelectedTemplateSummary />
          <ActivityWizardStepper
            activeStep="publish"
            progress={progress}
            stepLinks={{
              information: stepOnePath(activityId),
              curriculum: stepTwoPath(activityId),
              content: stepThreePath(activityId),
              settings: stepFourPath(activityId),
              preview: stepFivePath(activityId),
              publish: `/admin/aktiviti/${activityId}/cipta/terbitkan`,
            }}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <SummaryCard activity={activity.data} />
            <div className="space-y-6">
              <StatusCard
                activity={activity.data}
                action={action}
                isPending={lifecycleMutation.isPending || readiness.isLoading}
                canActivate={canActivate}
                onSaveDraft={() => {
                  toast.success("Berjaya", "Aktiviti kekal disimpan sebagai draf.");
                }}
                onOpenConfirm={() => setConfirmOpen(true)}
              />
              <ChecklistCard activity={activity.data} readiness={readiness.data} />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-none">
              <Button
                type="button"
                variant="destructive"
                className="h-11 w-full rounded-xl px-5 font-semibold sm:w-auto"
                onClick={() => setReturnConfirmOpen(true)}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali ke Pengurusan Aktiviti
              </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl px-5 font-semibold"
                onClick={() => navigate(stepFivePath(activityId))}
              >
                Kembali ke Pratonton
              </Button>
              {action ? (
                <Button
                  type="button"
                  className="h-11 rounded-xl px-5 font-semibold"
                  disabled={lifecycleMutation.isPending || !canActivate}
                  onClick={() => setConfirmOpen(true)}
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  {action.label}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={action?.title ?? "Sahkan tindakan?"}
        description={action?.description}
        confirmLabel={action?.confirmLabel ?? "Sahkan"}
        isLoading={lifecycleMutation.isPending}
        onConfirm={() => {
          lifecycleMutation.mutate();
        }}
      />

      <ConfirmDialog
        open={returnConfirmOpen}
        onOpenChange={setReturnConfirmOpen}
        title="Kembali ke Pengurusan Aktiviti?"
        description={returnDescription}
        confirmLabel="Kembali"
        cancelLabel="Batal"
        variant="destructive"
        onConfirm={() => {
          navigate("/admin/aktiviti");
        }}
      />
    </ManagementPageLayout>
  );
}
