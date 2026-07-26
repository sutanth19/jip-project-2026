import assert from "node:assert/strict";
import test from "node:test";

import {
  createContentStandardSchema,
  createCurriculumVersionSchema,
  createLanguageStructureSchema,
  createLearningObjectiveSchema,
  createLearningStandardSchema,
  createProgrammeSchema,
  createRemedialSkillSchema,
  createSkillStandardMappingSchema,
  createSubjectSchema,
  createSuggestedTeachingActivitySchema,
  curriculumTreeQuerySchema,
  listContentStandardsQuerySchema,
  listCurriculumVersionsQuerySchema,
  listLearningObjectivesQuerySchema,
  listLearningStandardsQuerySchema,
  listRemedialSkillsQuerySchema,
  listSkillStandardMappingsQuerySchema,
  listSuggestedTeachingActivitiesQuerySchema,
  skillLearningStandardParamsSchema,
  updateContentStandardSchema,
  updateCurriculumVersionSchema,
  updateLearningObjectiveSchema,
  updateSuggestedTeachingActivitySchema,
  versionIdParamsSchema,
} from "../src/validators/curriculum.validator.js";

const versionId = "11111111-1111-4111-8111-111111111111";
const subjectId = "22222222-2222-4222-8222-222222222222";
const structureId = "33333333-3333-4333-8333-333333333333";
const yearId = "44444444-4444-4444-8444-444444444444";
const learningStandardId = "55555555-5555-4555-8555-555555555555";
const objectiveId = "66666666-6666-4666-8666-666666666666";

function expectInvalid(parse: () => unknown): void {
  assert.throws(parse);
}

test("curriculum create schemas normalize official codes, names, descriptions, and dates", () => {
  const version = createCurriculumVersionSchema.parse({
    code: " bm-pemulihan-2026 ",
    name: "  Bahasa Melayu Pemulihan  ",
    description: "  Keterangan rasmi  ",
    sourceYear: 2026,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: "2026-12-31T00:00:00.000Z",
  });
  const subject = createSubjectSchema.parse({
    code: " bm ",
    name: "  Bahasa Melayu  ",
    description: "  Mata pelajaran  ",
  });
  const programme = createProgrammeSchema.parse({
    curriculumVersionId: versionId,
    subjectId,
    code: " bm-pemulihan ",
    name: "  Program Pemulihan Khas Bahasa Melayu  ",
  });
  const structure = createLanguageStructureSchema.parse({
    code: " suku_kata ",
    name: "  Suku Kata  ",
    sequence: 3,
  });
  const skill = createRemedialSkillSchema.parse({
    languageStructureId: structureId,
    code: " kp-pra ",
    sequence: 0,
    name: "  Prabacaan dan Pratulisan  ",
    description: "  Asas bacaan  ",
    isPreparatory: true,
  });
  const contentStandard = createContentStandardSchema.parse({
    curriculumYearId: yearId,
    code: "  2.1.1   (i)  ",
    title: "  Asas membaca  ",
    domain: "READING",
    sequence: 1,
  });
  const learningStandard = createLearningStandardSchema.parse({
    code: "  2.1.1   (iii)  ",
    description: "  Membaca perkataan  ",
    sequence: 3,
  });
  const objective = createLearningObjectiveSchema.parse({
    code: " obj-01 ",
    description: "  Murid dapat membaca.  ",
    sequence: 1,
  });
  const activity = createSuggestedTeachingActivitySchema.parse({
    learningObjectiveId: objectiveId,
    title: "  Kad imbas  ",
    description: "  Padankan kad huruf.  ",
    sequence: 1,
    sourceReference: "  Buku Panduan 2019  ",
  });

  assert.equal(version.code, "BM-PEMULIHAN-2026");
  assert.equal(version.name, "Bahasa Melayu Pemulihan");
  assert.equal(version.description, "Keterangan rasmi");
  assert.equal(version.effectiveFrom?.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(version.effectiveTo?.toISOString(), "2026-12-31T00:00:00.000Z");
  assert.deepEqual(subject, {
    code: "BM",
    name: "Bahasa Melayu",
    description: "Mata pelajaran",
  });
  assert.equal(programme.code, "BM-PEMULIHAN");
  assert.equal(programme.name, "Program Pemulihan Khas Bahasa Melayu");
  assert.deepEqual(structure, {
    code: "SUKU_KATA",
    name: "Suku Kata",
    sequence: 3,
  });
  assert.equal(skill.code, "KP-PRA");
  assert.equal(skill.name, "Prabacaan dan Pratulisan");
  assert.equal(skill.description, "Asas bacaan");
  assert.equal(skill.isPreparatory, true);
  assert.equal(contentStandard.code, "2.1.1 (i)");
  assert.equal(contentStandard.title, "Asas membaca");
  assert.equal(learningStandard.code, "2.1.1 (iii)");
  assert.equal(learningStandard.description, "Membaca perkataan");
  assert.equal(objective.code, "obj-01");
  assert.equal(objective.description, "Murid dapat membaca.");
  assert.deepEqual(activity, {
    learningObjectiveId: objectiveId,
    title: "Kad imbas",
    description: "Padankan kad huruf.",
    sequence: 1,
    sourceReference: "Buku Panduan 2019",
  });
});

test("curriculum schemas reject mass assignment, malformed identifiers, invalid enums, and invalid values", () => {
  expectInvalid(() =>
    createCurriculumVersionSchema.parse({
      code: "BM-2026",
      name: "BM Pemulihan",
      status: "PUBLISHED",
    }),
  );
  expectInvalid(() =>
    createCurriculumVersionSchema.parse({
      code: "BM-2026",
      name: "BM Pemulihan",
      effectiveFrom: "2026-12-31",
      effectiveTo: "2026-01-01",
    }),
  );
  expectInvalid(() =>
    createProgrammeSchema.parse({
      curriculumVersionId: "not-a-uuid",
      subjectId,
      code: "BM-PEMULIHAN",
      name: "Program Pemulihan",
    }),
  );
  expectInvalid(() =>
    createProgrammeSchema.parse({
      curriculumVersionId: versionId,
      subjectId,
      code: "BM-PEMULIHAN",
      name: "Program Pemulihan",
      subject: { id: subjectId },
    }),
  );
  expectInvalid(() =>
    createLanguageStructureSchema.parse({
      code: "PRA",
      name: "Prabacaan",
      sequence: -1,
    }),
  );
  expectInvalid(() =>
    createRemedialSkillSchema.parse({
      languageStructureId: structureId,
      code: "KP01",
      sequence: 1.5,
      name: "Huruf vokal",
    }),
  );
  expectInvalid(() =>
    createContentStandardSchema.parse({
      curriculumYearId: yearId,
      code: "2.1",
      title: "Asas membaca",
      domain: "SCIENCE",
    }),
  );
  expectInvalid(() =>
    createLearningStandardSchema.parse({
      code: "2.1.1 (i)",
      description: "",
    }),
  );
  expectInvalid(() =>
    createSkillStandardMappingSchema.parse({
      isPrimary: true,
      remedialSkillId: structureId,
    }),
  );
  expectInvalid(() =>
    createSuggestedTeachingActivitySchema.parse({
      learningObjectiveId: "bad-id",
      description: "Padankan kad.",
      sequence: 1,
    }),
  );
  expectInvalid(() => versionIdParamsSchema.parse({ versionId: "bad-id" }));
  expectInvalid(() =>
    skillLearningStandardParamsSchema.parse({
      skillId: structureId,
      learningStandardId,
      programmeId: versionId,
    }),
  );
});

test("curriculum update schemas require an intentional editable field and allow explicit nullable clears", () => {
  assert.deepEqual(updateCurriculumVersionSchema.parse({ description: null }), {
    description: null,
  });
  assert.deepEqual(updateContentStandardSchema.parse({ sequence: null }), {
    sequence: null,
  });
  assert.deepEqual(updateLearningObjectiveSchema.parse({ code: null }), {
    code: null,
  });
  assert.deepEqual(
    updateSuggestedTeachingActivitySchema.parse({
      learningObjectiveId: null,
      title: null,
      sourceReference: null,
    }),
    {
      learningObjectiveId: null,
      title: null,
      sourceReference: null,
    },
  );

  expectInvalid(() => updateCurriculumVersionSchema.parse({}));
  expectInvalid(() => updateContentStandardSchema.parse({}));
  expectInvalid(() => updateLearningObjectiveSchema.parse({}));
  expectInvalid(() => updateSuggestedTeachingActivitySchema.parse({}));
  expectInvalid(() => updateCurriculumVersionSchema.parse({ publishedAt: new Date() }));
});

test("curriculum list and tree schemas provide bounded, allowlisted defaults and normalize query strings", () => {
  assert.deepEqual(listCurriculumVersionsQuerySchema.parse({}), {
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  assert.deepEqual(listRemedialSkillsQuerySchema.parse({}), {
    page: 1,
    limit: 20,
    sortBy: "sequence",
    sortOrder: "asc",
  });
  assert.deepEqual(listContentStandardsQuerySchema.parse({}), {
    page: 1,
    limit: 20,
    sortBy: "sequence",
    sortOrder: "asc",
  });
  assert.deepEqual(listLearningStandardsQuerySchema.parse({}), {
    page: 1,
    limit: 20,
    sortBy: "sequence",
    sortOrder: "asc",
  });
  assert.deepEqual(listLearningObjectivesQuerySchema.parse({}), {
    page: 1,
    limit: 20,
    sortBy: "sequence",
    sortOrder: "asc",
  });
  assert.deepEqual(listSuggestedTeachingActivitiesQuerySchema.parse({}), {
    page: 1,
    limit: 20,
    sortBy: "sequence",
    sortOrder: "asc",
  });
  assert.deepEqual(listSkillStandardMappingsQuerySchema.parse({}), {
    page: 1,
    limit: 20,
  });
  assert.deepEqual(curriculumTreeQuerySchema.parse({}), { include: "summary" });

  assert.deepEqual(
    listRemedialSkillsQuerySchema.parse({
      page: "2",
      limit: "100",
      isPreparatory: "true",
      search: "  suku kata  ",
      sortBy: "name",
      sortOrder: "desc",
    }),
    {
      page: 2,
      limit: 100,
      isPreparatory: true,
      search: "suku kata",
      sortBy: "name",
      sortOrder: "desc",
    },
  );
  assert.deepEqual(
    listContentStandardsQuerySchema.parse({
      yearLevel: "3",
      domain: "READING",
      status: "ACTIVE",
    }),
    {
      page: 1,
      limit: 20,
      yearLevel: 3,
      domain: "READING",
      status: "ACTIVE",
      sortBy: "sequence",
      sortOrder: "asc",
    },
  );
  assert.deepEqual(
    listSkillStandardMappingsQuerySchema.parse({ isPrimary: "false" }),
    { page: 1, limit: 20, isPrimary: false },
  );
  assert.deepEqual(curriculumTreeQuerySchema.parse({ include: "full" }), {
    include: "full",
  });

  expectInvalid(() => listCurriculumVersionsQuerySchema.parse({ limit: 101 }));
  expectInvalid(() => listRemedialSkillsQuerySchema.parse({ isPreparatory: true }));
  expectInvalid(() => listContentStandardsQuerySchema.parse({ sortBy: "rawSql" }));
  expectInvalid(() => curriculumTreeQuerySchema.parse({ include: "all" }));
  expectInvalid(() => curriculumTreeQuerySchema.parse({ include: "summary", audit: true }));
});
