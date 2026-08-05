import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("curriculum routes keep version publishing restricted to SUPER_ADMIN", async () => {
  const source = await readFile(new URL("../src/routes/curriculum.routes.ts", import.meta.url), "utf8");

  assert.match(source, /const requireCurriculumVersionControl = requireRole\(UserRole\.SUPER_ADMIN\);/);
  assert.match(source, /"\/versions\/:versionId\/publish"/);
});

test("curriculum publication flow keeps the existing draft-to-published lifecycle", async () => {
  const source = await readFile(new URL("../src/services/curriculum.service.ts", import.meta.url), "utf8");

  assert.match(source, /assertDraft\(before\.status\);/);
  assert.match(source, /status: CurriculumStatus\.PUBLISHED/);
});

test("digital activity creation still requires a published curriculum version", async () => {
  const source = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");

  assert.match(source, /programme\.curriculumVersion\.status !== CurriculumStatus\.PUBLISHED/);
  assert.match(source, /DIGITAL_ACTIVITY_CURRICULUM_LINK_INVALID/);
});
