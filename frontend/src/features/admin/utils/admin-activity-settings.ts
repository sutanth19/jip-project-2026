import { z } from "zod";

import type { AdminActivityDetailRecord } from "@/features/admin/api/admin-activity.api";
import type { ActivityWizardProgress } from "@/features/admin/utils/admin-activity-create";

export const activityScoringModeOptions = [
  { value: "NONE", label: "Tanpa Pemarkahan" },
  { value: "TOTAL_SCORE", label: "Jumlah Markah" },
  { value: "PERCENTAGE", label: "Peratus" },
  { value: "MASTERY_THRESHOLD", label: "Ambang Penguasaan" },
] as const;

export type ActivityScoringModeValue = typeof activityScoringModeOptions[number]["value"];

export type ActivitySettingsTemplateSupport = {
  retrySettings: boolean;
  attemptLimit: boolean;
  immediateFeedbackSetting: boolean;
  masteryThresholdSetting: boolean;
};

export const activitySettingsInitialValues = {
  estimatedMinutes: "",
  hasTimeLimit: false,
  timeLimitMinutes: "",
  attemptsAllowed: "",
  allowRetry: false,
  shuffleItems: false,
  showImmediateFeedback: false,
  scoringMode: "TOTAL_SCORE",
  totalMarks: "",
  masteryThreshold: "",
} as const;

const numericString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} diperlukan.`)
    .refine((value) => /^\d+$/.test(value), `${label} mesti nombor bulat yang sah.`);

export const activitySettingsSchema = z
  .object({
    estimatedMinutes: numericString("Anggaran Masa"),
    hasTimeLimit: z.boolean(),
    timeLimitMinutes: z.string().trim(),
    attemptsAllowed: numericString("Bilangan Percubaan"),
    allowRetry: z.boolean(),
    shuffleItems: z.boolean(),
    showImmediateFeedback: z.boolean(),
    scoringMode: z.enum(["NONE", "TOTAL_SCORE", "PERCENTAGE", "MASTERY_THRESHOLD"], {
      message: "Mod Pemarkahan diperlukan.",
    }),
    totalMarks: z.string().trim(),
    masteryThreshold: z.string().trim(),
  })
  .superRefine((value, context) => {
    const estimatedMinutes = Number(value.estimatedMinutes);
    if (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1_440) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimatedMinutes"],
        message: "Anggaran Masa mesti antara 1 hingga 1440 minit.",
      });
    }

    const attemptsAllowed = Number(value.attemptsAllowed);
    if (!Number.isInteger(attemptsAllowed) || attemptsAllowed < 1 || attemptsAllowed > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attemptsAllowed"],
        message: "Bilangan Percubaan mesti antara 1 hingga 100.",
      });
    }

    if (value.hasTimeLimit) {
      if (!value.timeLimitMinutes) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["timeLimitMinutes"],
          message: "Had Masa diperlukan apabila had masa diaktifkan.",
        });
      } else {
        const timeLimitMinutes = Number(value.timeLimitMinutes);
        if (
          !Number.isInteger(timeLimitMinutes)
          || timeLimitMinutes <= 0
          || timeLimitMinutes > 1_440
          || timeLimitMinutes * 60 > 86_400
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["timeLimitMinutes"],
            message: "Had Masa mesti antara 1 hingga 1440 minit.",
          });
        }
      }
    }

    if (value.scoringMode !== "NONE") {
      const totalMarks = Number(value.totalMarks);
      if (!value.totalMarks) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalMarks"],
          message: "Jumlah Markah diperlukan untuk mod pemarkahan ini.",
        });
      } else if (!Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 100_000) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalMarks"],
          message: "Jumlah Markah mesti antara 1 hingga 100000.",
        });
      }
    }

    if (value.scoringMode === "MASTERY_THRESHOLD") {
      const masteryThreshold = Number(value.masteryThreshold);
      if (!value.masteryThreshold) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["masteryThreshold"],
          message: "Tahap Penguasaan diperlukan untuk mod ini.",
        });
      } else if (!Number.isInteger(masteryThreshold) || masteryThreshold < 1 || masteryThreshold > 100) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["masteryThreshold"],
          message: "Tahap Penguasaan mesti antara 1% hingga 100%.",
        });
      }
    }
  });

export type ActivitySettingsValues = z.infer<typeof activitySettingsSchema>;

export type UpdateDigitalActivitySettingsPayload = {
  estimatedMinutes: number;
  attemptsAllowed: number | null;
  timeLimitSeconds: number | null;
  shuffleItems: boolean;
  showImmediateFeedback: boolean;
  allowRetry: boolean;
  scoringMode: ActivityScoringModeValue;
  totalMarks: number | null;
  masteryThreshold: number | null;
};

type ActivitySettingsScoringSnapshot = {
  scoringMode?: AdminActivityDetailRecord["scoringMode"] | null;
  totalMarks?: number | null;
  items: Array<{ id: string; marks?: number | null }>;
};

const defaultTemplateSupport: ActivitySettingsTemplateSupport = {
  retrySettings: true,
  attemptLimit: true,
  immediateFeedbackSetting: true,
  masteryThresholdSetting: true,
};

export function getActivitySettingsTemplateSupport(
  activity?: Pick<AdminActivityDetailRecord, "template"> | null,
): ActivitySettingsTemplateSupport {
  if (activity?.template?.code === "ARRANGE_SYLLABLES" || activity?.template?.rendererKey === "arrange-syllables") {
    return {
      retrySettings: false,
      attemptLimit: false,
      immediateFeedbackSetting: false,
      masteryThresholdSetting: false,
    };
  }

  return defaultTemplateSupport;
}

export function getActivitySettingsCompletionState(activity?: Pick<AdminActivityDetailRecord, "settingsCompletedAt"> | null) {
  return {
    hasPersistedCompletion: Boolean(activity?.settingsCompletedAt),
    reason: activity?.settingsCompletedAt ? "PERSISTED_SETTINGS_SIGNAL_PRESENT" as const : "MISSING_PERSISTED_SETTINGS_SIGNAL" as const,
  };
}

export function getActivitySettingsFormValues(
  activity?: Pick<
    AdminActivityDetailRecord,
    | "estimatedMinutes"
    | "timeLimitSeconds"
    | "attemptsAllowed"
    | "allowRetry"
    | "shuffleItems"
    | "showImmediateFeedback"
    | "scoringMode"
    | "totalMarks"
    | "masteryThreshold"
    | "template"
  > | null,
): ActivitySettingsValues {
  const templateSupport = getActivitySettingsTemplateSupport(activity);
  const estimatedMinutes = activity?.estimatedMinutes ?? null;
  const attemptsAllowed = activity?.attemptsAllowed ?? null;
  const hasTimeLimit = typeof activity?.timeLimitSeconds === "number" && activity.timeLimitSeconds > 0;
  const timeLimitMinutes = hasTimeLimit ? String((activity?.timeLimitSeconds ?? 0) / 60) : "";
  const scoringMode = activity?.scoringMode ?? "TOTAL_SCORE";
  const normalizedScoringMode =
    !templateSupport.masteryThresholdSetting && scoringMode === "MASTERY_THRESHOLD"
      ? "TOTAL_SCORE"
      : scoringMode;
  const totalMarks =
    typeof activity?.totalMarks === "number"
      ? String(activity.totalMarks)
      : "";
  const masteryThreshold =
    typeof activity?.masteryThreshold === "number"
      ? String(activity.masteryThreshold)
      : "";

  return {
    estimatedMinutes: estimatedMinutes === null ? "" : String(estimatedMinutes),
    hasTimeLimit,
    timeLimitMinutes,
    attemptsAllowed:
      templateSupport.attemptLimit
        ? attemptsAllowed === null ? "" : String(attemptsAllowed)
        : "1",
    allowRetry: templateSupport.retrySettings ? (activity?.allowRetry ?? true) : true,
    shuffleItems: activity?.shuffleItems ?? true,
    showImmediateFeedback: templateSupport.immediateFeedbackSetting ? (activity?.showImmediateFeedback ?? true) : true,
    scoringMode:
      normalizedScoringMode === "NONE"
      || normalizedScoringMode === "TOTAL_SCORE"
      || normalizedScoringMode === "PERCENTAGE"
      || normalizedScoringMode === "MASTERY_THRESHOLD"
        ? normalizedScoringMode
        : "TOTAL_SCORE",
    totalMarks,
    masteryThreshold: templateSupport.masteryThresholdSetting ? masteryThreshold : "",
  };
}

export function buildActivitySettingsUpdatePayload(
  values: ActivitySettingsValues,
  templateSupport: ActivitySettingsTemplateSupport = defaultTemplateSupport,
): UpdateDigitalActivitySettingsPayload {
  const scoringMode =
    !templateSupport.masteryThresholdSetting && values.scoringMode === "MASTERY_THRESHOLD"
      ? "TOTAL_SCORE"
      : values.scoringMode;
  const totalMarks = scoringMode === "NONE" ? null : Number(values.totalMarks);
  const masteryThreshold =
    templateSupport.masteryThresholdSetting && scoringMode === "MASTERY_THRESHOLD"
      ? Number(values.masteryThreshold)
      : null;

  return {
    estimatedMinutes: Number(values.estimatedMinutes),
    attemptsAllowed: templateSupport.attemptLimit ? Number(values.attemptsAllowed) : null,
    timeLimitSeconds: values.hasTimeLimit ? Math.round(Number(values.timeLimitMinutes) * 60) : null,
    shuffleItems: values.shuffleItems,
    showImmediateFeedback: templateSupport.immediateFeedbackSetting ? values.showImmediateFeedback : true,
    allowRetry: templateSupport.retrySettings ? values.allowRetry : true,
    scoringMode,
    totalMarks,
    masteryThreshold,
  };
}

export function getActivitySettingsScoringSyncState(
  activity?: ActivitySettingsScoringSnapshot | null,
): { requiresResync: boolean; allocatedMarks: number; expectedMarks: number | null } {
  if (!activity || activity.scoringMode === "NONE" || !activity.items.length) {
    return { requiresResync: false, allocatedMarks: 0, expectedMarks: activity?.totalMarks ?? null };
  }

  const expectedMarks =
    typeof activity.totalMarks === "number" && activity.totalMarks > 0
      ? activity.totalMarks
      : null;

  if (expectedMarks === null) {
    return { requiresResync: false, allocatedMarks: 0, expectedMarks: null };
  }

  const allocatedMarks = activity.items.reduce(
    (sum, item) => sum + (typeof item.marks === "number" ? item.marks : 0),
    0,
  );
  const hasInvalidItemMarks = activity.items.some(
    (item) => typeof item.marks !== "number" || item.marks < 1,
  );

  return {
    requiresResync: hasInvalidItemMarks || allocatedMarks !== expectedMarks,
    allocatedMarks,
    expectedMarks,
  };
}

export function getActivitySettingsProgress(
  progress: ActivityWizardProgress,
): ActivityWizardProgress & { hasSettings: boolean } {
  return {
    ...progress,
    hasSettings: Boolean(progress.hasSettings),
  };
}
