import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../prisma/migrations/20260803090000_school_class_unique_by_year_level_normalized_name/migration.sql",
  import.meta.url,
);

test("school class uniqueness migration adds normalized naming and the correct school-year-level constraint", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const normalizedSql = sql.replace(/\s+/g, " ").trim();

  assert.match(sql, /ALTER TABLE "school_classes"\s+ADD COLUMN "normalizedClassName" TEXT;/);
  assert.match(sql, /UPDATE "school_classes"\s+SET "normalizedClassName" = LOWER\(BTRIM\("className"\)\);/);
  assert.match(sql, /ALTER TABLE "school_classes"\s+ALTER COLUMN "normalizedClassName" SET NOT NULL;/);
  assert.match(sql, /DROP INDEX "school_classes_schoolId_className_academicYear_key";/);
  assert.ok(
    normalizedSql.includes(
      'CREATE UNIQUE INDEX "school_classes_schoolId_academicYear_yearLevel_normalizedClassName_key" ON "school_classes"("schoolId", "academicYear", "yearLevel", "normalizedClassName");',
    ),
  );
});

test("school class uniqueness migration does not create a new table or alter unrelated resources", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.doesNotMatch(sql, /CREATE TABLE/i);
  assert.doesNotMatch(sql, /ALTER TABLE\s+"(?:users|schools|teachers|students|parents|audit_logs)"/i);
});
