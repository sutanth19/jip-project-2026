import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../prisma/migrations/20260726175354_curriculum_foundation/migration.sql",
  import.meta.url,
);

const expectedTables = [
  "content_standards",
  "curriculum_programmes",
  "curriculum_versions",
  "curriculum_years",
  "language_structures",
  "learning_objectives",
  "learning_standards",
  "remedial_skill_standard_mappings",
  "remedial_skills",
  "subjects",
  "suggested_teaching_activities",
] as const;

const expectedIndexes = [
  "UNIQUE:content_standards_programmeId_curriculumYearId_code_key",
  "INDEX:content_standards_domain_idx",
  "INDEX:content_standards_status_idx",
  "UNIQUE:curriculum_programmes_curriculumVersionId_code_key",
  "INDEX:curriculum_programmes_status_idx",
  "INDEX:curriculum_programmes_subjectId_idx",
  "INDEX:curriculum_versions_sourceYear_idx",
  "INDEX:curriculum_versions_status_idx",
  "UNIQUE:curriculum_versions_code_key",
  "UNIQUE:curriculum_years_programmeId_sequence_key",
  "UNIQUE:curriculum_years_programmeId_yearLevel_key",
  "INDEX:curriculum_years_status_idx",
  "UNIQUE:language_structures_programmeId_code_key",
  "UNIQUE:language_structures_programmeId_sequence_key",
  "INDEX:language_structures_status_idx",
  "UNIQUE:learning_objectives_remedialSkillId_sequence_key",
  "INDEX:learning_objectives_status_idx",
  "UNIQUE:learning_standards_contentStandardId_code_key",
  "INDEX:learning_standards_status_idx",
  "UNIQUE:remedial_skill_standard_mappings_remedialSkillId_learningSt_key",
  "INDEX:remedial_skill_standard_mappings_learningStandardId_idx",
  "UNIQUE:remedial_skills_programmeId_code_key",
  "UNIQUE:remedial_skills_programmeId_sequence_key",
  "INDEX:remedial_skills_languageStructureId_idx",
  "INDEX:remedial_skills_status_idx",
  "UNIQUE:subjects_code_key",
  "UNIQUE:subjects_name_key",
  "INDEX:subjects_status_idx",
  "UNIQUE:suggested_teaching_activities_remedialSkillId_sequence_key",
  "INDEX:suggested_teaching_activities_learningObjectiveId_idx",
  "INDEX:suggested_teaching_activities_status_idx",
] as const;

const expectedForeignKeys = [
  'ALTER TABLE "curriculum_programmes" ADD CONSTRAINT "curriculum_programmes_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
  'ALTER TABLE "curriculum_programmes" ADD CONSTRAINT "curriculum_programmes_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
  'ALTER TABLE "curriculum_years" ADD CONSTRAINT "curriculum_years_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
  'ALTER TABLE "language_structures" ADD CONSTRAINT "language_structures_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
  'ALTER TABLE "remedial_skills" ADD CONSTRAINT "remedial_skills_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
  'ALTER TABLE "remedial_skills" ADD CONSTRAINT "remedial_skills_languageStructureId_fkey" FOREIGN KEY ("languageStructureId") REFERENCES "language_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
  'ALTER TABLE "content_standards" ADD CONSTRAINT "content_standards_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
  'ALTER TABLE "content_standards" ADD CONSTRAINT "content_standards_curriculumYearId_fkey" FOREIGN KEY ("curriculumYearId") REFERENCES "curriculum_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
  'ALTER TABLE "learning_standards" ADD CONSTRAINT "learning_standards_contentStandardId_fkey" FOREIGN KEY ("contentStandardId") REFERENCES "content_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
  'ALTER TABLE "remedial_skill_standard_mappings" ADD CONSTRAINT "remedial_skill_standard_mappings_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;',
  'ALTER TABLE "remedial_skill_standard_mappings" ADD CONSTRAINT "remedial_skill_standard_mappings_learningStandardId_fkey" FOREIGN KEY ("learningStandardId") REFERENCES "learning_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;',
  'ALTER TABLE "learning_objectives" ADD CONSTRAINT "learning_objectives_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;',
  'ALTER TABLE "suggested_teaching_activities" ADD CONSTRAINT "suggested_teaching_activities_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;',
  'ALTER TABLE "suggested_teaching_activities" ADD CONSTRAINT "suggested_teaching_activities_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "learning_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
] as const;

test("curriculum foundation migration creates the complete isolated curriculum schema", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const createdEnums = Array.from(
    sql.matchAll(/^CREATE TYPE "([^"]+)"/gm),
    (match) => match[1] ?? "",
  ).sort();
  const createdTables = Array.from(
    sql.matchAll(/^CREATE TABLE "([^"]+)"/gm),
    (match) => match[1] ?? "",
  ).sort();
  const createdIndexes = Array.from(
    sql.matchAll(/^CREATE (UNIQUE )?INDEX "([^"]+)"/gm),
    (match) => `${match[1] ? "UNIQUE" : "INDEX"}:${match[2] ?? ""}`,
  ).sort();

  assert.deepEqual(createdEnums, [
    "CurriculumDomain",
    "CurriculumRecordStatus",
    "CurriculumStatus",
  ]);
  assert.deepEqual(createdTables, [...expectedTables].sort());
  assert.deepEqual(createdIndexes, [...expectedIndexes].sort());
});

test("curriculum foundation migration preserves the required restrictive, cascading, and nullable foreign-key behavior", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const normalizedSql = sql.replace(/\s+/g, " ").trim();

  for (const foreignKey of expectedForeignKeys) {
    assert.ok(
      normalizedSql.includes(foreignKey),
      `Expected curriculum foreign key was not found: ${foreignKey}`,
    );
  }
});

test("curriculum foundation migration has no destructive or unrelated schema operations", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.doesNotMatch(
    sql,
    /\b(?:DROP\s+(?:TABLE|COLUMN|TYPE|INDEX)|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?|ALTER\s+TABLE\s+"[^"]+"\s+DROP)\b/i,
  );
  assert.doesNotMatch(
    sql,
    /ALTER TABLE\s+"(?:users|schools|teachers|students|parents|school_classes|audit_logs)"/i,
  );
});
