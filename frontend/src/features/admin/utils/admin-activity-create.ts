import { z } from "zod";

export const SERET_SUKU_KATA_TEMPLATE_CODE = "ARRANGE_SYLLABLES";
export const SERET_SUKU_KATA_RENDERER_KEY = "arrange-syllables";
export const PEMULIHAN_KHAS_PROGRAMME_CODE = "BM-PEMULIHAN";

export const activityWizardSteps = [
  { id: "information", label: "Maklumat" },
  { id: "curriculum", label: "Kurikulum" },
  { id: "content", label: "Kandungan" },
  { id: "settings", label: "Tetapan" },
  { id: "preview", label: "Pratonton" },
  { id: "publish", label: "Terbitkan" },
] as const;

export type ActivityWizardStepId = typeof activityWizardSteps[number]["id"];

export type ActivityWizardProgress = {
  hasDraft: boolean;
  hasCurriculumLink: boolean;
  hasContent?: boolean;
};

export type ActivityWizardStepState = {
  key: ActivityWizardStepId;
  label: string;
  isCurrent: boolean;
  isCompleted: boolean;
  isAccessible: boolean;
  isLocked: boolean;
  destination?: string;
};

export const activityDifficultyOptions = [
  { value: "BASIC", label: "Mudah" },
  { value: "INTERMEDIATE", label: "Sederhana" },
  { value: "ADVANCED", label: "Sukar" },
] as const;

export const estimatedMinuteOptions = [5, 10, 15, 20, 30] as const;

export const activityBasicInfoDefaults = {
  title: "Seret Suku Kata",
  description: "Aktiviti seret dan lepas untuk melengkapkan perkataan menggunakan suku kata yang betul.",
  instructions: "Seret suku kata yang betul ke ruang jawapan untuk melengkapkan perkataan.",
  difficulty: "BASIC",
  estimatedMinutes: "10",
} as const;

export const activityBasicInfoSchema = z.object({
  title: z.string().trim().min(1, "Nama Aktiviti diperlukan.").max(500, "Nama Aktiviti terlalu panjang."),
  description: z.string().trim().max(10_000, "Penerangan terlalu panjang.").optional(),
  instructions: z.string().trim().min(1, "Arahan kepada Murid diperlukan.").max(10_000, "Arahan kepada Murid terlalu panjang."),
  difficulty: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"], {
    message: "Tahap Kesukaran diperlukan.",
  }),
  estimatedMinutes: z.string().refine(
    (value) => estimatedMinuteOptions.includes(Number(value) as typeof estimatedMinuteOptions[number]),
    "Anggaran Masa diperlukan.",
  ),
});

export type ActivityBasicInfoValues = z.infer<typeof activityBasicInfoSchema>;

export type ActivityTemplateResolution = {
  id: string;
  code?: string | null;
  name: string;
  category?: string | null;
  rendererKey: string;
};

export type ProgrammeResolution = {
  id: string;
  code: string;
  name: string;
  status?: string | null;
  version?: {
    id?: string;
    code?: string | null;
    name?: string | null;
    status?: string | null;
  } | null;
};

export type CreateDigitalActivityPayload = {
  title: string;
  description?: string;
  instructions: string;
  programmeId: string;
  activityTemplateId: string;
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  scoringMode: "TOTAL_SCORE";
  reviewMode: "AUTO";
  totalMarks: number;
  masteryThreshold: number;
  estimatedMinutes: number;
  attemptsAllowed: number;
  timeLimitSeconds: null;
  shuffleItems: boolean;
  showImmediateFeedback: boolean;
  allowRetry: boolean;
  configuration: {
    shuffleSyllables: boolean;
    showReferenceImage: boolean;
    playReferenceAudio: boolean;
    attemptsAllowed: number;
  };
  rewardConfiguration: null;
  presentationSettings: null;
};

export type UpdateDigitalActivityBasicInfoPayload = {
  title: string;
  description?: string;
  instructions: string;
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  estimatedMinutes: number;
};

export function buildSeretSukuKataCreatePayload({
  values,
  programmeId,
  activityTemplateId,
}: {
  values: ActivityBasicInfoValues;
  programmeId: string;
  activityTemplateId: string;
}): CreateDigitalActivityPayload {
  const description = values.description?.trim();

  return {
    title: values.title.trim(),
    ...(description ? { description } : {}),
    instructions: values.instructions.trim(),
    programmeId,
    activityTemplateId,
    difficulty: values.difficulty,
    scoringMode: "TOTAL_SCORE",
    reviewMode: "AUTO",
    totalMarks: 1,
    masteryThreshold: 80,
    estimatedMinutes: Number(values.estimatedMinutes),
    attemptsAllowed: 1,
    timeLimitSeconds: null,
    shuffleItems: true,
    showImmediateFeedback: true,
    allowRetry: true,
    configuration: {
      shuffleSyllables: true,
      showReferenceImage: false,
      playReferenceAudio: false,
      attemptsAllowed: 1,
    },
    rewardConfiguration: null,
    presentationSettings: null,
  };
}

export function buildSeretSukuKataUpdatePayload({
  values,
}: {
  values: ActivityBasicInfoValues;
}): UpdateDigitalActivityBasicInfoPayload {
  const description = values.description?.trim();

  return {
    title: values.title.trim(),
    ...(description ? { description } : {}),
    instructions: values.instructions.trim(),
    difficulty: values.difficulty,
    estimatedMinutes: Number(values.estimatedMinutes),
  };
}

export function getActivityBasicInfoFormValues(activity?: {
  title?: string | null;
  description?: string | null;
  instructions?: string | null;
  difficulty?: string | null;
  estimatedMinutes?: number | null;
} | null): ActivityBasicInfoValues {
  const difficulty =
    activity?.difficulty === "BASIC"
    || activity?.difficulty === "INTERMEDIATE"
    || activity?.difficulty === "ADVANCED"
      ? activity.difficulty
      : activityBasicInfoDefaults.difficulty;

  const estimatedMinutes = estimatedMinuteOptions.includes(activity?.estimatedMinutes as typeof estimatedMinuteOptions[number])
    ? String(activity?.estimatedMinutes)
    : activityBasicInfoDefaults.estimatedMinutes;

  return {
    title: activity?.title ?? activityBasicInfoDefaults.title,
    description: activity?.description ?? activityBasicInfoDefaults.description,
    instructions: activity?.instructions ?? activityBasicInfoDefaults.instructions,
    difficulty,
    estimatedMinutes,
  };
}

export function findPemulihanProgramme(programmes: ProgrammeResolution[]): ProgrammeResolution | null {
  return programmes.find((programme) => (
    programme.code === PEMULIHAN_KHAS_PROGRAMME_CODE
    && programme.status === "ACTIVE"
    && programme.version?.status === "PUBLISHED"
  )) ?? null;
}

export function findSeretSukuKataTemplate(templates: ActivityTemplateResolution[]): ActivityTemplateResolution | null {
  return templates.find(
    (template) =>
      template.code === SERET_SUKU_KATA_TEMPLATE_CODE
      || template.rendererKey === SERET_SUKU_KATA_RENDERER_KEY,
  ) ?? null;
}

type ActivityWizardProgressSource = {
  id?: string | null;
  curriculumLinks?: Array<{ id?: string; isPrimary: boolean }> | null;
  items?: Array<{ id?: string; configuration?: unknown }> | null;
};

export function getActivityWizardProgress(activity?: ActivityWizardProgressSource | null): ActivityWizardProgress {
  return {
    hasDraft: Boolean(activity?.id),
    hasCurriculumLink: Boolean(activity?.curriculumLinks?.some((link) => link.isPrimary && Boolean(link.id))),
    hasContent: Boolean(activity?.items?.length),
  };
}

export function getActivityWizardStepStates({
  activeStep,
  progress,
  stepLinks = {},
}: {
  activeStep: ActivityWizardStepId;
  progress: ActivityWizardProgress;
  stepLinks?: Partial<Record<ActivityWizardStepId, string>>;
}): ActivityWizardStepState[] {
  const highestAccessibleStep = progress.hasContent ? 4 : progress.hasCurriculumLink ? 3 : progress.hasDraft ? 2 : 1;

  return activityWizardSteps.map((step, index) => {
    const stepNumber = index + 1;
    const isCurrent = step.id === activeStep;
    const isCompleted = stepNumber === 1
      ? progress.hasDraft
      : stepNumber === 2
        ? progress.hasCurriculumLink
        : stepNumber === 3
          ? Boolean(progress.hasContent)
          : false;
    const isAccessible = stepNumber <= highestAccessibleStep;
    const isLocked = !isAccessible;

    return {
      key: step.id,
      label: step.label,
      isCurrent,
      isCompleted,
      isAccessible,
      isLocked,
      destination: stepLinks[step.id],
    };
  });
}
