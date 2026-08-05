import { z } from "zod";

export const activityCurriculumStepSchema = z.object({
  curriculumYearId: z.string().trim().uuid("Tahun diperlukan."),
  remedialSkillId: z.string().trim().uuid("Kemahiran Pemulihan diperlukan."),
  contentStandardId: z.string().trim().uuid("Standard Kandungan diperlukan."),
  learningStandardId: z.string().trim().uuid("Standard Pembelajaran diperlukan."),
});

export type ActivityCurriculumStepValues = z.infer<typeof activityCurriculumStepSchema>;

export type AdminCurriculumYearOption = {
  id: string;
  programmeId: string;
  yearLevel: number;
  name: string;
  sequence: number;
  status: string;
};

export type AdminRemedialSkillOption = {
  id: string;
  programmeId: string;
  languageStructureId: string;
  code: string;
  sequence: number;
  name: string;
  description: string | null;
  status: string;
  isPreparatory: boolean;
};

export type AdminContentStandardOption = {
  id: string;
  programmeId: string;
  curriculumYearId: string;
  code: string;
  title: string;
  description: string | null;
  domain: string;
  sequence: number | null;
  status: string;
  year: {
    id: string;
    yearLevel: number;
    name: string;
    sequence: number;
  };
};

export type AdminLearningStandardOption = {
  id: string;
  contentStandardId: string;
  code: string;
  description: string;
  sequence: number | null;
  status: string;
  contentStandard: {
    id: string;
    code: string;
    title: string;
    domain: string;
  };
  year: {
    id: string;
    yearLevel: number;
    name: string;
    sequence: number;
  };
  programme: {
    id: string;
    code: string;
  };
};

export type AdminLearningObjectiveOption = {
  id: string;
  remedialSkillId: string;
  code: string | null;
  description: string;
  sequence: number;
  status: string;
};

export type AdminSkillLearningStandardMapping = {
  id: string;
  remedialSkillId: string;
  learningStandardId: string;
  isPrimary: boolean;
  notes: string | null;
  learningStandard: {
    id: string;
    code: string;
    description: string;
    sequence: number | null;
    status: string;
  };
  contentStandard: {
    id: string;
    code: string;
    title: string;
    domain: string;
  };
  year: {
    id: string;
    yearLevel: number;
    name: string;
    sequence: number;
  };
};

export type AdminRemedialSkillDetail = {
  skill: AdminRemedialSkillOption;
  objectives: AdminLearningObjectiveOption[];
  learningStandardMappings: AdminSkillLearningStandardMapping[];
};

export type AdminActivityCurriculumLinkPayload = {
  curriculumYearId: string;
  remedialSkillId: string;
  contentStandardId: string;
  learningStandardId: string;
  isPrimary: true;
};

export function buildActivityCurriculumLinkPayload(
  values: ActivityCurriculumStepValues,
): AdminActivityCurriculumLinkPayload {
  return {
    curriculumYearId: values.curriculumYearId,
    remedialSkillId: values.remedialSkillId,
    contentStandardId: values.contentStandardId,
    learningStandardId: values.learningStandardId,
    isPrimary: true,
  };
}

export function deriveMappedContentStandards({
  contentStandards,
  mappings,
  curriculumYearId,
}: {
  contentStandards: AdminContentStandardOption[];
  mappings: AdminSkillLearningStandardMapping[];
  curriculumYearId: string;
}): AdminContentStandardOption[] {
  const allowedIds = new Set(
    mappings
      .filter((mapping) => mapping.year.id === curriculumYearId)
      .map((mapping) => mapping.contentStandard.id),
  );

  return contentStandards.filter((standard) => allowedIds.has(standard.id));
}

export function deriveMappedLearningStandards({
  learningStandards,
  mappings,
  contentStandardId,
}: {
  learningStandards: AdminLearningStandardOption[];
  mappings: AdminSkillLearningStandardMapping[];
  contentStandardId: string;
}): AdminLearningStandardOption[] {
  const allowedIds = new Set(
    mappings
      .filter((mapping) => mapping.contentStandard.id === contentStandardId)
      .map((mapping) => mapping.learningStandard.id),
  );

  return learningStandards.filter((standard) => allowedIds.has(standard.id));
}

export function formatCurriculumSummary(values: {
  year?: AdminCurriculumYearOption | null;
  skill?: AdminRemedialSkillOption | null;
  contentStandard?: AdminContentStandardOption | null;
  learningStandard?: AdminLearningStandardOption | null;
}): string {
  const parts = [
    values.year ? `Tahun ${values.year.yearLevel}` : null,
    values.skill?.code ?? null,
    values.contentStandard?.code ?? null,
    values.learningStandard?.code ?? null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" • ") : "Belum dipilih";
}
