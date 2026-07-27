import assert from "node:assert/strict";
import test from "node:test";

import { normalizeText } from "../src/services/question-bank.service.js";
import { assertSafeMetadata } from "../src/utils/safe-json-schema.js";
import {
  createAnswerOptionSchema,
  createCurriculumLinkSchema,
  createQuestionBankItemSchema,
  createQuestionBankMediaSchema,
  listQuestionBankItemsQuerySchema,
  reorderOptionsSchema,
  updateQuestionBankItemSchema,
} from "../src/validators/question-bank.validator.js";

const programmeId = "11111111-1111-4111-8111-111111111111";
const skillId = "22222222-2222-4222-8222-222222222222";

test("Question Bank validators accept strict reusable draft fields and normalize duplicate text", () => {
  const item = createQuestionBankItemSchema.parse({
    programmeId,
    type: "WORD",
    title: "  Kata mudah  ",
    content: "  Baju  ",
    languagePattern: " KV + KV ",
    answerType: "NONE",
    difficulty: "BEGINNER",
    metadata: { theme: "pakaian", source: "unit 1" },
  });
  assert.equal(item.title, "Kata mudah");
  assert.equal(item.content, "Baju");
  assert.equal(normalizeText(" Baju \n BAJU "), "baju baju");
  assert.equal(normalizeText(" Baju "), normalizeText("baju"));
  assert.deepEqual(listQuestionBankItemsQuerySchema.parse({}), {
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
});

test("Question Bank validators reject mass assignment, invalid links, invalid reorders, and unsafe metadata", () => {
  assert.throws(() => createQuestionBankItemSchema.parse({ programmeId, type: "WORD", content: "baju", difficulty: "BEGINNER", status: "ACTIVE" }));
  assert.throws(() => updateQuestionBankItemSchema.parse({}));
  assert.throws(() => createCurriculumLinkSchema.parse({}));
  assert.throws(() => createAnswerOptionSchema.parse({ content: "A", sequence: -1 }));
  assert.throws(() => reorderOptionsSchema.parse({ optionIds: [programmeId, programmeId] }));
  assert.throws(() => createQuestionBankMediaSchema.parse({ mediaKey: "../secret.png", mediaRole: "PRIMARY_IMAGE" }));
  assert.throws(() => assertSafeMetadata({ note: "<script>alert(1)</script>" }));
});

