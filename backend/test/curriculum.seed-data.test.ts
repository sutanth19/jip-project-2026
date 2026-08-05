import assert from "node:assert/strict";
import test from "node:test";

import {
  bmPemulihan2019SeedData,
  type BmPemulihanSeedData,
} from "../src/data/curriculum/bm-pemulihan-2019.js";
import {
  BUILT_IN_BM_PEMULIHAN_VERSION_STATUS,
  shouldPromoteBuiltInBmPemulihanVersion,
  validateBmPemulihanSeedData,
} from "../src/prisma/curriculum.seed.js";

const expectedSkillStructureMapping = [
  ["KP-PRA", "PRA"],
  ["KP01", "ABJAD"],
  ["KP02", "ABJAD"],
  ["KP03", "ABJAD"],
  ["KP04", "SUKU_KATA"],
  ["KP05", "PERKATAAN"],
  ["KP06", "PERKATAAN"],
  ["KP07", "PERKATAAN"],
  ["KP08", "PERKATAAN"],
  ["KP09", "SUKU_KATA"],
  ["KP10", "PERKATAAN"],
  ["KP11", "PERKATAAN"],
  ["KP12", "PERKATAAN"],
  ["KP13", "PERKATAAN"],
  ["KP14", "PERKATAAN"],
  ["KP15", "PERKATAAN"],
  ["KP16", "PERKATAAN"],
  ["KP17", "SUKU_KATA"],
  ["KP18", "PERKATAAN"],
  ["KP19", "PERKATAAN"],
  ["KP20", "PERKATAAN"],
  ["KP21", "PERKATAAN"],
  ["KP22", "PERKATAAN"],
  ["KP23", "PERKATAAN"],
  ["KP24", "PERKATAAN"],
  ["KP25", "PERKATAAN"],
  ["KP26", "PERKATAAN"],
  ["KP27", "PERKATAAN"],
  ["KP28", "PERKATAAN"],
  ["KP29", "PERKATAAN"],
  ["KP30", "PERKATAAN"],
  ["KP31", "AYAT"],
  ["KP32", "AYAT"],
] as const;

function cloneSeedData(): BmPemulihanSeedData {
  return {
    ...bmPemulihan2019SeedData,
    version: { ...bmPemulihan2019SeedData.version },
    subject: { ...bmPemulihan2019SeedData.subject },
    programme: { ...bmPemulihan2019SeedData.programme },
    years: bmPemulihan2019SeedData.years.map((year) => ({ ...year })),
    languageStructures: bmPemulihan2019SeedData.languageStructures.map((structure) => ({ ...structure })),
    remedialSkills: bmPemulihan2019SeedData.remedialSkills.map((skill) => ({ ...skill })),
    contentStandards: bmPemulihan2019SeedData.contentStandards.map((contentStandard) => ({
      ...contentStandard,
      learningStandards: contentStandard.learningStandards.map((learningStandard) => ({ ...learningStandard })),
    })),
  };
}

test("BM Pemulihan seed data validates without database access", () => {
  assert.deepEqual(validateBmPemulihanSeedData(), []);
});

test("BM Pemulihan seed keeps the real programme code active and marks the built-in version for publication", () => {
  assert.equal(bmPemulihan2019SeedData.programme.code, "BM-PEMULIHAN");
  assert.equal(bmPemulihan2019SeedData.programme.name, "Program Pemulihan Khas Bahasa Melayu");
  assert.equal(BUILT_IN_BM_PEMULIHAN_VERSION_STATUS, "PUBLISHED");
});

test("built-in BM Pemulihan version promotion only upgrades the valid draft source state", () => {
  assert.equal(shouldPromoteBuiltInBmPemulihanVersion("DRAFT"), true);
  assert.equal(shouldPromoteBuiltInBmPemulihanVersion("PUBLISHED"), false);
  assert.equal(shouldPromoteBuiltInBmPemulihanVersion("ARCHIVED"), false);
});

test("BM Pemulihan seed contains the exact ordered KP-to-language-structure mapping", () => {
  const actualMapping = bmPemulihan2019SeedData.remedialSkills.map((skill) => [
    skill.code,
    skill.languageStructureCode,
  ]);

  assert.equal(bmPemulihan2019SeedData.remedialSkills.length, 33);
  assert.deepEqual(actualMapping, expectedSkillStructureMapping);
});

test("BM Pemulihan seed contains the published curriculum tree used by the wizard", () => {
  const year1Reading = bmPemulihan2019SeedData.contentStandards.find((contentStandard) => contentStandard.yearLevel === 1 && contentStandard.code === "2.1");
  const year2Reading = bmPemulihan2019SeedData.contentStandards.find((contentStandard) => contentStandard.yearLevel === 2 && contentStandard.code === "2.1");
  const year3Grammar = bmPemulihan2019SeedData.contentStandards.find((contentStandard) => contentStandard.yearLevel === 3 && contentStandard.code === "5.3");

  assert.ok(year1Reading);
  assert.ok(year2Reading);
  assert.ok(year3Grammar);
  assert.ok(bmPemulihan2019SeedData.contentStandards.length > 10);

  const year1Learning = year1Reading?.learningStandards.find((learningStandard) => learningStandard.code === "2.1.1 (v)");
  const year2Learning = year2Reading?.learningStandards.find((learningStandard) => learningStandard.code === "2.1.1 (i)");
  const year3Learning = year3Grammar?.learningStandards.find((learningStandard) => learningStandard.code === "5.3.2");

  assert.ok(year1Learning);
  assert.ok(year2Learning);
  assert.ok(year3Learning);
  assert.ok(year2Learning?.skillCodes.includes("KP28"));
  assert.ok(year3Learning?.skillCodes.includes("KP28"));
});

test("BM Pemulihan seed validation rejects an incorrect KP structure mapping", () => {
  const invalidData = cloneSeedData();
  invalidData.remedialSkills = invalidData.remedialSkills.map((skill) =>
    skill.code === "KP17" ? { ...skill, languageStructureCode: "PERKATAAN" } : skill,
  );

  const issues = validateBmPemulihanSeedData(invalidData);

  assert.ok(
    issues.some(
      (entry) =>
        entry.code === "INVALID_SKILL_STRUCTURE" &&
        entry.path === "remedialSkills.KP17.languageStructureCode",
    ),
  );
});

test("BM Pemulihan seed validation detects a missing required KP", () => {
  const invalidData = cloneSeedData();
  invalidData.remedialSkills = invalidData.remedialSkills.filter((skill) => skill.code !== "KP09");

  const issues = validateBmPemulihanSeedData(invalidData);

  assert.ok(
    issues.some(
      (entry) => entry.code === "MISSING_SKILL" && entry.path === "remedialSkills.KP09",
    ),
  );
  assert.ok(issues.some((entry) => entry.code === "INVALID_SKILL_COUNT"));
});
