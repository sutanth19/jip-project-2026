import assert from "node:assert/strict";
import test from "node:test";

import {
  bmPemulihan2019SeedData,
  type BmPemulihanSeedData,
} from "../src/data/curriculum/bm-pemulihan-2019.js";
import { validateBmPemulihanSeedData } from "../src/prisma/curriculum.seed.js";

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
  };
}

test("BM Pemulihan seed data validates without database access", () => {
  assert.deepEqual(validateBmPemulihanSeedData(), []);
});

test("BM Pemulihan seed contains the exact ordered KP-to-language-structure mapping", () => {
  const actualMapping = bmPemulihan2019SeedData.remedialSkills.map((skill) => [
    skill.code,
    skill.languageStructureCode,
  ]);

  assert.equal(bmPemulihan2019SeedData.remedialSkills.length, 33);
  assert.deepEqual(actualMapping, expectedSkillStructureMapping);
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
