import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookMarked, Check, ChevronDown, LoaderCircle, Save, Search } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { ConfirmDialog, ErrorState, ManagementPageLayout } from "@/components/shared";
import { ActivityWizardStepper, SelectedTemplateSummary } from "@/features/admin/components/AdminActivityCreateWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addAdminActivityCurriculumLink,
  getAdminDigitalActivity,
  getAdminRemedialSkill,
  listAdminContentStandards,
  listAdminCurriculumYears,
  listAdminLearningStandards,
  listAdminRemedialSkills,
  removeAdminActivityCurriculumLink,
} from "@/features/admin/api/admin-activity.api";
import type { AdminActivityRecord } from "@/features/admin/utils/admin-activity";
import {
  activityCurriculumStepSchema,
  buildActivityCurriculumLinkPayload,
  deriveMappedContentStandards,
  deriveMappedLearningStandards,
  formatCurriculumSummary,
  type ActivityCurriculumStepValues,
} from "@/features/admin/utils/admin-activity-curriculum";
import { getActivityWizardProgress } from "@/features/admin/utils/admin-activity-create";
import { parseApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-context-value";

const stepOnePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/maklumat`;
const stepTwoPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kurikulum`;
const stepThreePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kandungan`;

const curriculumQueryKeys = {
  activityDetail: (activityId: string) => ["admin", "activities", "detail", activityId] as const,
  activityList: ["admin", "activities", "list"] as const,
  years: (programmeId: string) => ["admin", "activity-create", "curriculum", "years", programmeId] as const,
  skills: (programmeId: string) => ["admin", "activity-create", "curriculum", "skills", programmeId] as const,
  skillDetail: (skillId: string) => ["admin", "activity-create", "curriculum", "skill", skillId] as const,
  contentStandards: (programmeId: string, curriculumYearId: string) => ["admin", "activity-create", "curriculum", "content-standards", programmeId, curriculumYearId] as const,
  learningStandards: (contentStandardId: string) => ["admin", "activity-create", "curriculum", "learning-standards", contentStandardId] as const,
};

function getCurriculumStepErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);

  switch (parsed.code) {
    case "DIGITAL_ACTIVITY_CURRICULUM_LINK_EXISTS":
      return "Pautan kurikulum ini telah wujud pada aktiviti draf.";
    case "DIGITAL_ACTIVITY_CROSS_VERSION_LINK":
    case "DIGITAL_ACTIVITY_CURRICULUM_LINK_INVALID":
      return "Pilihan kurikulum tidak sah untuk aktiviti ini. Sila semak semula pilihan anda.";
    default:
      return "Pautan kurikulum tidak dapat disimpan. Sila cuba semula.";
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-2 text-sm font-medium text-destructive">{message}</p> : null;
}

function QueryStatusMessage({
  isLoading,
  isError,
  isEmpty,
  loadingMessage,
  emptyMessage,
  errorMessage,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  loadingMessage: string;
  emptyMessage: string;
  errorMessage: string;
  onRetry?: () => void;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{loadingMessage}</p>;
  }

  if (isError) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-destructive">
        <span>{errorMessage}</span>
        {onRetry ? (
          <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={onRetry}>
            Cuba Semula
          </Button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return null;
}

function InlineMappingEmptyState() {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">Pemetaan kurikulum belum tersedia</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Kemahiran ini belum mempunyai pemetaan Standard Kandungan dan Standard Pembelajaran bagi tahun yang dipilih.
      </p>
    </div>
  );
}

function RemedialSkillSelect({
  value,
  id,
  describedBy,
  onChange,
  error,
  disabled,
  skills,
  isLoading,
  isError,
  onRetry,
}: {
  value: string;
  id?: string;
  describedBy?: string;
  onChange: (skillId: string) => void;
  error?: string;
  disabled?: boolean;
  skills: Array<{ id: string; code: string; name: string; sequence: number }>;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const reactId = React.useId();
  const instanceId = reactId.replace(/:/g, "");
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const selected = skills.find((skill) => skill.id === value) ?? null;
  const filtered = skills.filter((skill) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${skill.code} ${skill.name}`.toLowerCase().includes(query);
  });
  const listId = `${instanceId}-remedial-skill-options`;
  const resolvedActiveIndex = filtered.length > 0 ? Math.min(activeIndex, filtered.length - 1) : -1;
  const activeSkill = resolvedActiveIndex >= 0 ? filtered[resolvedActiveIndex] : null;
  const activeOptionId = open && activeSkill ? `${instanceId}-skill-option-${activeSkill.id}` : undefined;

  React.useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleSelect = (skillId: string) => {
    if (isLoading) return;
    onChange(skillId);
    setOpen(false);
    setSearch("");
  };

  const moveActiveOption = (direction: 1 | -1) => {
    if (filtered.length === 0) return;
    setActiveIndex((current) => (current + direction + filtered.length) % filtered.length);
  };

  const handleComboboxKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      moveActiveOption(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      moveActiveOption(-1);
      return;
    }

    if (event.key === "Enter" && open && activeSkill) {
      event.preventDefault();
      handleSelect(activeSkill.id);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <Button
        type="button"
        id={id}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeOptionId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        disabled={disabled}
        className={cn(
          "h-12 w-full justify-between rounded-xl border-input bg-background/40 px-4 text-left shadow-sm hover:border-primary/40 hover:bg-background/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
        )}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleComboboxKeyDown}
      >
        <span className="min-w-0">
          <span className={cn("block truncate text-sm font-semibold", selected ? "text-foreground" : "text-muted-foreground")}>
            {selected ? `${selected.code} · ${selected.name}` : "Pilih kemahiran pemulihan"}
          </span>
          {selected ? <span className="block truncate text-xs text-muted-foreground">Turutan {selected.sequence === 0 ? "KP-PRA" : selected.sequence}</span> : null}
        </span>
        {isLoading ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />}
      </Button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
          <div className="sticky top-0 z-10 border-b border-border bg-popover p-2.5">
            <label className="relative block">
              <span className="sr-only">Cari kod atau nama kemahiran</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Cari kod atau nama kemahiran…"
                className="h-10 rounded-lg bg-background/60 pl-9 text-sm focus-visible:border-primary focus-visible:ring-primary/20"
                autoFocus
                onKeyDown={handleComboboxKeyDown}
              />
            </label>
          </div>

          <div id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-lg p-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Memuatkan senarai kemahiran pemulihan...
              </div>
            ) : null}
            {!isLoading && isError ? (
              <div className="space-y-3 rounded-lg p-3 text-sm">
                <p className="font-semibold text-foreground">Senarai kemahiran pemulihan tidak dapat dimuatkan.</p>
                <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={onRetry}>
                  Cuba Semula
                </Button>
              </div>
            ) : null}
            {!isLoading && !isError && skills.length === 0 ? (
              <div className="space-y-1 rounded-lg p-3 text-sm">
                <p className="font-semibold text-foreground">Tiada kemahiran aktif tersedia.</p>
                <p className="text-muted-foreground">Semak semula data program BM Pemulihan yang diterbitkan.</p>
              </div>
            ) : null}
            {!isLoading && !isError && skills.length > 0 && filtered.length === 0 ? (
              <div className="space-y-1 rounded-lg p-3 text-sm">
                <p className="font-semibold text-foreground">Tiada kemahiran ditemui.</p>
                <p className="text-muted-foreground">Cuba kod atau nama kemahiran yang lain.</p>
              </div>
            ) : null}
            {!isLoading && !isError ? filtered.map((skill, index) => (
              <button
                key={skill.id}
                id={`${instanceId}-skill-option-${skill.id}`}
                type="button"
                role="option"
                aria-selected={skill.id === value}
                data-active={index === resolvedActiveIndex}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  skill.id === value && "bg-primary/10",
                  index === resolvedActiveIndex && "bg-muted",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  handleSelect(skill.id);
                }}
                onClick={() => handleSelect(skill.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{skill.code} · {skill.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">Turutan {skill.sequence === 0 ? "KP-PRA" : skill.sequence}</span>
                </span>
                {skill.id === value ? <Check className="size-4 text-secondary" aria-hidden="true" /> : null}
              </button>
            )) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  activity,
  programmeName,
  curriculumSummary,
}: {
  activity: AdminActivityRecord & {
    programme?: { name: string; code: string } | null;
    template?: { name: string } | null;
  };
  programmeName: string;
  curriculumSummary: string;
}) {
  const primaryLink = activity.curriculumLinks.find((link) => link.isPrimary) ?? null;

  const rows = [
    ["Nama Aktiviti", activity.title],
    ["Templat", activity.template?.name ?? "Seret Suku Kata"],
    ["Program", programmeName],
    ["Kurikulum Dipilih", curriculumSummary],
    ["Status", activity.status],
    ["Kurikulum Sedia Ada", primaryLink ? "Tersedia" : "Belum disimpan"],
  ];

  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-secondary/20 bg-secondary/10 text-secondary">
            <BookMarked className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Ringkasan Aktiviti</h2>
            <p className="text-sm text-muted-foreground">Semakan semasa sebelum meneruskan ke langkah seterusnya.</p>
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

function renderOptionLabel(option: { code?: string | null; name?: string | null; title?: string | null; description?: string | null; yearLevel?: number | null }) {
  if (typeof option.yearLevel === "number") {
    return `Tahun ${option.yearLevel}`;
  }

  if (option.code && option.title) {
    return `${option.code} · ${option.title}`;
  }

  if (option.code && option.name) {
    return `${option.code} · ${option.name}`;
  }

  if (option.code && option.description) {
    return `${option.code} · ${option.description}`;
  }

  return option.name ?? option.title ?? option.description ?? option.code ?? "Tidak tersedia";
}

export function AdminActivityCurriculumPlaceholderPage() {
  const activityId = useParams().activityId ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<ActivityCurriculumStepValues>({
    resolver: zodResolver(activityCurriculumStepSchema),
    defaultValues: {
      curriculumYearId: "",
      remedialSkillId: "",
      contentStandardId: "",
      learningStandardId: "",
    },
    mode: "onChange",
  });

  const activity = useQuery({
    queryKey: curriculumQueryKeys.activityDetail(activityId),
    queryFn: () => getAdminDigitalActivity(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  });

  const programmeId = activity.data?.programme?.id ?? "";
  const programmeName = activity.data?.programme?.name ?? "Program Pemulihan Khas Bahasa Melayu";
  const yearId = useWatch({ control: form.control, name: "curriculumYearId" }) ?? "";
  const skillId = useWatch({ control: form.control, name: "remedialSkillId" }) ?? "";
  const contentStandardId = useWatch({ control: form.control, name: "contentStandardId" }) ?? "";
  const learningStandardId = useWatch({ control: form.control, name: "learningStandardId" }) ?? "";

  const years = useQuery({
    queryKey: curriculumQueryKeys.years(programmeId),
    queryFn: () => listAdminCurriculumYears(programmeId),
    enabled: Boolean(programmeId),
    staleTime: 30_000,
  });

  const skills = useQuery({
    queryKey: curriculumQueryKeys.skills(programmeId),
    queryFn: () => listAdminRemedialSkills(programmeId),
    enabled: Boolean(programmeId && yearId),
    staleTime: 30_000,
  });

  const skillDetail = useQuery({
    queryKey: curriculumQueryKeys.skillDetail(skillId),
    queryFn: () => getAdminRemedialSkill(skillId),
    enabled: Boolean(skillId),
    staleTime: 30_000,
  });

  const contentStandards = useQuery({
    queryKey: curriculumQueryKeys.contentStandards(programmeId, yearId),
    queryFn: () => listAdminContentStandards(programmeId, yearId),
    enabled: Boolean(programmeId && yearId && skillId),
    staleTime: 30_000,
  });

  const learningStandards = useQuery({
    queryKey: curriculumQueryKeys.learningStandards(contentStandardId),
    queryFn: () => listAdminLearningStandards(contentStandardId),
    enabled: Boolean(contentStandardId && skillId),
    staleTime: 30_000,
  });

  const mappedContentStandards = React.useMemo(
    () => deriveMappedContentStandards({
      contentStandards: contentStandards.data ?? [],
      mappings: skillDetail.data?.learningStandardMappings ?? [],
      curriculumYearId: yearId,
    }),
    [contentStandards.data, skillDetail.data?.learningStandardMappings, yearId],
  );

  const mappedLearningStandards = React.useMemo(
    () => deriveMappedLearningStandards({
      learningStandards: learningStandards.data ?? [],
      mappings: skillDetail.data?.learningStandardMappings ?? [],
      contentStandardId,
    }),
    [learningStandards.data, skillDetail.data?.learningStandardMappings, contentStandardId],
  );

  const selectedYear = React.useMemo(
    () => (years.data ?? []).find((item) => item.id === yearId) ?? null,
    [years.data, yearId],
  );
  const selectedSkill = React.useMemo(
    () => (skills.data ?? []).find((item) => item.id === skillId) ?? null,
    [skills.data, skillId],
  );
  const selectedContentStandard = React.useMemo(
    () => mappedContentStandards.find((item) => item.id === contentStandardId) ?? null,
    [mappedContentStandards, contentStandardId],
  );
  const selectedLearningStandard = React.useMemo(
    () => mappedLearningStandards.find((item) => item.id === learningStandardId) ?? null,
    [mappedLearningStandards, learningStandardId],
  );
  const hasSkillMappingGap = Boolean(
    yearId
    && skillId
    && !skillDetail.isLoading
    && !contentStandards.isLoading
    && !skillDetail.isError
    && !contentStandards.isError
    && mappedContentStandards.length === 0,
  );

  const currentPrimaryLink = activity.data?.curriculumLinks.find((link) => link.isPrimary) ?? null;
  const hasInitializedForm = React.useRef(false);

  React.useEffect(() => {
    if (hasInitializedForm.current || !currentPrimaryLink) {
      return;
    }

    form.reset({
      curriculumYearId: currentPrimaryLink.curriculumYear?.id ?? "",
      remedialSkillId: currentPrimaryLink.remedialSkill?.id ?? "",
      contentStandardId: currentPrimaryLink.contentStandard?.id ?? "",
      learningStandardId: currentPrimaryLink.learningStandard?.id ?? "",
    });
    hasInitializedForm.current = true;
  }, [currentPrimaryLink, form]);

  const previousYearId = React.useRef(yearId);
  React.useEffect(() => {
    if (!previousYearId.current) {
      previousYearId.current = yearId;
      return;
    }

    if (previousYearId.current !== yearId) {
      form.setValue("remedialSkillId", "", { shouldDirty: true });
      form.setValue("contentStandardId", "", { shouldDirty: true });
      form.setValue("learningStandardId", "", { shouldDirty: true });
    }

    previousYearId.current = yearId;
  }, [form, yearId]);

  const previousSkillId = React.useRef(skillId);
  React.useEffect(() => {
    if (!previousSkillId.current) {
      previousSkillId.current = skillId;
      return;
    }

    if (previousSkillId.current !== skillId) {
      form.setValue("contentStandardId", "", { shouldDirty: true });
      form.setValue("learningStandardId", "", { shouldDirty: true });
    }

    previousSkillId.current = skillId;
  }, [form, skillId]);

  const previousContentStandardId = React.useRef(contentStandardId);
  React.useEffect(() => {
    if (!previousContentStandardId.current) {
      previousContentStandardId.current = contentStandardId;
      return;
    }

    if (previousContentStandardId.current !== contentStandardId) {
      form.setValue("learningStandardId", "", { shouldDirty: true });
    }

    previousContentStandardId.current = contentStandardId;
  }, [contentStandardId, form]);

  const curriculumSummary = formatCurriculumSummary({
    year: selectedYear,
    skill: selectedSkill,
    contentStandard: selectedContentStandard,
    learningStandard: selectedLearningStandard,
  });

  const saveCurriculum = useMutation({
    mutationFn: async (values: ActivityCurriculumStepValues) => {
      const currentValues = {
        curriculumYearId: currentPrimaryLink?.curriculumYear?.id ?? "",
        remedialSkillId: currentPrimaryLink?.remedialSkill?.id ?? "",
        contentStandardId: currentPrimaryLink?.contentStandard?.id ?? "",
        learningStandardId: currentPrimaryLink?.learningStandard?.id ?? "",
      };

      const isSamePrimary =
        currentValues.curriculumYearId === values.curriculumYearId
        && currentValues.remedialSkillId === values.remedialSkillId
        && currentValues.contentStandardId === values.contentStandardId
        && currentValues.learningStandardId === values.learningStandardId;

      if (isSamePrimary) {
        return "unchanged";
      }

      if (currentPrimaryLink?.id) {
        await removeAdminActivityCurriculumLink(activityId, currentPrimaryLink.id);
      }

      await addAdminActivityCurriculumLink(activityId, buildActivityCurriculumLinkPayload(values));
      return "saved";
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: curriculumQueryKeys.activityDetail(activityId) });
      form.reset(form.getValues());
      toast.success("Pautan kurikulum berjaya disimpan.");
      navigate(stepThreePath(activityId));
    },
    onError: (error) => {
      setServerError(getCurriculumStepErrorMessage(error));
    },
  });

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty || saveCurriculum.isSuccess) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty, saveCurriculum.isSuccess]);

  const handleLeave = () => {
    requestNavigation(stepOnePath(activityId));
  };

  const requestNavigation = (destination: string) => {
    if (form.formState.isDirty && !saveCurriculum.isSuccess) {
      setPendingNavigationPath(destination);
      setDiscardOpen(true);
      return;
    }

    navigate(destination);
  };

  const submit = form.handleSubmit(async (values) => {
    if (saveCurriculum.isPending) {
      return;
    }

    setServerError(null);
    await saveCurriculum.mutateAsync(values);
  });

  const showDraftError = activity.data && activity.data.status !== "DRAFT";

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Maklumat", to: stepOnePath(activityId) },
        { label: "Kurikulum" },
      ]}
      title="Kurikulum"
      description="Pautkan aktiviti draf kepada struktur kurikulum sebelum meneruskan ke kandungan."
      actions={(
        <Button type="button" variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto" onClick={handleLeave}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke Maklumat
        </Button>
      )}
    >
      {activity.isLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Memuatkan aktiviti draf">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-[34rem] rounded-2xl" />
        </div>
      ) : null}

      {activity.isError ? (
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
          description="Langkah Kurikulum hanya boleh dilakukan untuk aktiviti berstatus draf."
          actionLabel="Kembali ke Pengurusan Aktiviti"
          onAction={() => navigate("/admin/aktiviti")}
        />
      ) : null}

      {activity.data && activity.data.status === "DRAFT" ? (
        <div className="space-y-6">
          <SelectedTemplateSummary />
          <ActivityWizardStepper
            activeStep="curriculum"
            progress={getActivityWizardProgress(activity.data)}
            stepLinks={{
              information: stepOnePath(activityId),
              curriculum: stepTwoPath(activityId),
              content: stepThreePath(activityId),
            }}
            onNavigateStep={(destination) => requestNavigation(destination)}
          />

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
                    <BookMarked className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Maklumat Kurikulum</h2>
                    <p className="text-sm leading-6 text-muted-foreground">Lengkapkan pilihan kurikulum secara berperingkat untuk aktiviti draf ini.</p>
                  </div>
                </div>

                <form className="mt-6 space-y-6" onSubmit={submit}>
                  <div className="space-y-2">
                    <Label htmlFor="curriculumYearId">Pemetaan Tahun DSKP <span className="text-destructive">*</span></Label>
                    <Select value={yearId} onValueChange={(value) => form.setValue("curriculumYearId", value, { shouldDirty: true, shouldValidate: true })}>
                      <SelectTrigger id="curriculumYearId" className="w-full !bg-background/40" aria-describedby="curriculumYearId-help curriculumYearId-error" aria-invalid={Boolean(form.formState.errors.curriculumYearId)}>
                        <SelectValue placeholder="Pilih tahun" />
                      </SelectTrigger>
                      <SelectContent>
                        {(years.data ?? []).map((year) => (
                          <SelectItem key={year.id} value={year.id}>
                            {renderOptionLabel({ yearLevel: year.yearLevel })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p id="curriculumYearId-help" className="text-sm leading-6 text-muted-foreground">Digunakan untuk menentukan Standard Kandungan dan Standard Pembelajaran KSSR yang berkaitan.</p>
                    <QueryStatusMessage
                      isLoading={years.isLoading}
                      isError={years.isError}
                      isEmpty={years.isSuccess && (years.data?.length ?? 0) === 0}
                      loadingMessage="Memuatkan senarai tahun..."
                      errorMessage="Senarai tahun tidak dapat dimuatkan."
                      emptyMessage="Tiada tahun aktif tersedia untuk program ini."
                      onRetry={() => void years.refetch()}
                    />
                    <FieldError id="curriculumYearId-error" message={form.formState.errors.curriculumYearId?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="remedialSkillId">Kemahiran Pemulihan <span className="text-destructive">*</span></Label>
                    <RemedialSkillSelect
                      value={skillId}
                      id="remedialSkillId"
                      describedBy="remedialSkillId-help remedialSkillId-error"
                      onChange={(value) => form.setValue("remedialSkillId", value, { shouldDirty: true, shouldValidate: true })}
                      error={form.formState.errors.remedialSkillId?.message}
                      disabled={!yearId || skills.isLoading || skills.isError || (skills.data?.length ?? 0) === 0}
                      skills={skills.data ?? []}
                      isLoading={skills.isLoading}
                      isError={skills.isError}
                      onRetry={() => void skills.refetch()}
                    />
                    <p id="remedialSkillId-help" className="text-sm leading-6 text-muted-foreground">Cari kod atau nama kemahiran untuk melihat semua KP-PRA hingga KP32 dalam turutan rasmi.</p>
                    <QueryStatusMessage
                      isLoading={Boolean(yearId) && skills.isLoading}
                      isError={Boolean(yearId) && skills.isError}
                      isEmpty={Boolean(yearId) && skills.isSuccess && (skills.data?.length ?? 0) === 0}
                      loadingMessage="Memuatkan senarai kemahiran pemulihan..."
                      errorMessage="Senarai kemahiran pemulihan tidak dapat dimuatkan."
                      emptyMessage="Tiada kemahiran aktif tersedia untuk program ini."
                      onRetry={() => void skills.refetch()}
                    />
                    <FieldError id="remedialSkillId-error" message={form.formState.errors.remedialSkillId?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contentStandardId">Standard Kandungan <span className="text-destructive">*</span></Label>
                    <Select value={contentStandardId} onValueChange={(value) => form.setValue("contentStandardId", value, { shouldDirty: true, shouldValidate: true })} disabled={!skillId || contentStandards.isLoading || skillDetail.isLoading || mappedContentStandards.length === 0}>
                      <SelectTrigger id="contentStandardId" className="w-full !bg-background/40" aria-describedby="contentStandardId-help contentStandardId-error" aria-invalid={Boolean(form.formState.errors.contentStandardId)}>
                        <SelectValue placeholder={skillId ? "Pilih Standard Kandungan" : "Pilih kemahiran terlebih dahulu"} />
                      </SelectTrigger>
                      <SelectContent>
                        {mappedContentStandards.map((standard) => (
                          <SelectItem key={standard.id} value={standard.id}>
                            {renderOptionLabel({ code: standard.code, title: standard.title })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p id="contentStandardId-help" className="text-sm leading-6 text-muted-foreground">Standard Kandungan ditapis mengikut tahun dan kemahiran yang dipilih.</p>
                    <QueryStatusMessage
                      isLoading={Boolean(skillId) && (skillDetail.isLoading || contentStandards.isLoading)}
                      isError={Boolean(skillId) && (skillDetail.isError || contentStandards.isError)}
                      isEmpty={Boolean(skillId) && !hasSkillMappingGap && !skillDetail.isLoading && !contentStandards.isLoading && mappedContentStandards.length === 0}
                      loadingMessage="Memuatkan Standard Kandungan yang dipetakan..."
                      errorMessage="Standard Kandungan tidak dapat dimuatkan."
                      emptyMessage="Tiada Standard Kandungan aktif yang dipetakan untuk tahun dan kemahiran ini."
                      onRetry={() => {
                        void skillDetail.refetch();
                        void contentStandards.refetch();
                      }}
                    />
                    {hasSkillMappingGap ? <InlineMappingEmptyState /> : null}
                    <FieldError id="contentStandardId-error" message={form.formState.errors.contentStandardId?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="learningStandardId">Standard Pembelajaran <span className="text-destructive">*</span></Label>
                    <Select value={learningStandardId} onValueChange={(value) => form.setValue("learningStandardId", value, { shouldDirty: true, shouldValidate: true })} disabled={!contentStandardId || learningStandards.isLoading || mappedLearningStandards.length === 0}>
                      <SelectTrigger id="learningStandardId" className="w-full !bg-background/40" aria-describedby="learningStandardId-help learningStandardId-error" aria-invalid={Boolean(form.formState.errors.learningStandardId)}>
                        <SelectValue placeholder={contentStandardId ? "Pilih Standard Pembelajaran" : "Pilih Standard Kandungan terlebih dahulu"} />
                      </SelectTrigger>
                      <SelectContent>
                        {mappedLearningStandards.map((standard) => (
                          <SelectItem key={standard.id} value={standard.id}>
                            {renderOptionLabel({ code: standard.code, description: standard.description })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p id="learningStandardId-help" className="text-sm leading-6 text-muted-foreground">Standard Pembelajaran dipaparkan berdasarkan Standard Kandungan dan pemetaan kemahiran.</p>
                    <QueryStatusMessage
                      isLoading={Boolean(contentStandardId) && learningStandards.isLoading}
                      isError={Boolean(contentStandardId) && learningStandards.isError}
                      isEmpty={Boolean(contentStandardId) && learningStandards.isSuccess && mappedLearningStandards.length === 0}
                      loadingMessage="Memuatkan Standard Pembelajaran yang dipetakan..."
                      errorMessage="Standard Pembelajaran tidak dapat dimuatkan."
                      emptyMessage="Tiada Standard Pembelajaran aktif yang dipetakan untuk Standard Kandungan ini."
                      onRetry={() => void learningStandards.refetch()}
                    />
                    <FieldError id="learningStandardId-error" message={form.formState.errors.learningStandardId?.message} />
                  </div>

                  {serverError ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{serverError}</p> : null}

                  <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" className="h-11 w-full rounded-xl px-5 font-semibold sm:w-auto" onClick={handleLeave} disabled={saveCurriculum.isPending}>
                      Batal
                    </Button>
                    <Button type="submit" className="h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30 sm:w-auto" disabled={saveCurriculum.isPending || !form.formState.isValid}>
                      {saveCurriculum.isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                      {saveCurriculum.isPending ? "Menyimpan Kurikulum..." : "Simpan dan Seterusnya"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <SummaryCard
              activity={activity.data}
              programmeName={programmeName}
              curriculumSummary={curriculumSummary}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Buang perubahan?"
        description="Pilihan kurikulum yang belum disimpan akan hilang jika anda meninggalkan halaman ini."
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

          navigate(stepOnePath(activityId));
        }}
      />
    </ManagementPageLayout>
  );
}
