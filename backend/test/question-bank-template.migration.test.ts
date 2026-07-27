import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../prisma/migrations/20260726191158_question_bank_template_registry/migration.sql", import.meta.url);

test("Question Bank and template registry migration only adds requested structures", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  for (const table of ["question_bank_items", "question_bank_curriculum_links", "question_bank_answer_options", "question_bank_media", "activity_templates", "activity_template_item_types"]) {
    assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(sql, /CREATE TYPE "QuestionBankItemType"/);
  assert.match(sql, /CREATE TYPE "ActivityTemplateCategory"/);
  assert.match(sql, /question_bank_answer_options_questionBankItemId_sequence_key/);
  assert.match(sql, /activity_templates_code_key/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP TYPE|TRUNCATE/i);
});
