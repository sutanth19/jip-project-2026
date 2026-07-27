import assert from "node:assert/strict";
import test from "node:test";

import { coreActivityTemplates } from "../src/data/activity-templates/core-templates.js";
import { assertSafeTemplateSchema } from "../src/utils/safe-json-schema.js";
import {
  createActivityTemplateSchema,
  updateActivityTemplateSchema,
} from "../src/validators/activity-template.validator.js";

test("core activity registry contains eight stable, safe renderer definitions", () => {
  assert.equal(coreActivityTemplates.length, 8);
  assert.equal(new Set(coreActivityTemplates.map((template) => template.code)).size, 8);
  assert.equal(new Set(coreActivityTemplates.map((template) => template.rendererKey)).size, 8);
  for (const template of coreActivityTemplates) {
    assertSafeTemplateSchema(template.configurationSchema);
    assertSafeTemplateSchema(template.contentSchema);
    assert.ok(template.acceptedItemTypes.length > 0);
  }
});

test("template validators enforce immutable contract inputs and reject executable schema content", () => {
  const template = coreActivityTemplates[0];
  assert.ok(template);
  const parsed = createActivityTemplateSchema.parse({ ...template, version: 1 });
  assert.equal(parsed.code, "MULTIPLE_CHOICE");
  assert.throws(() => assertSafeTemplateSchema({ type: "object", properties: { unsafe: { type: "string", default: "javascript:alert(1)" } } }));
  assert.throws(() => assertSafeTemplateSchema({ type: "object", script: "alert(1)" }));
  assert.throws(() => updateActivityTemplateSchema.parse({ code: "CHANGED" }));
  assert.throws(() => updateActivityTemplateSchema.parse({ acceptedItemTypes: [] }));
});

