import assert from "node:assert/strict";
import test from "node:test";

import { coreActivityTemplates } from "../src/data/activity-templates/core-templates.js";
import { assertSafeTemplateSchema } from "../src/utils/safe-json-schema.js";
import {
  createActivityTemplateSchema,
  updateActivityTemplateSchema,
} from "../src/validators/activity-template.validator.js";

test("core activity registry contains thirteen stable, safe renderer definitions", () => {
  assert.equal(coreActivityTemplates.length, 13);
  assert.equal(new Set(coreActivityTemplates.map((template) => template.code)).size, 13);
  assert.equal(new Set(coreActivityTemplates.map((template) => template.rendererKey)).size, 12);
  for (const template of coreActivityTemplates) {
    assertSafeTemplateSchema(template.configurationSchema);
    assertSafeTemplateSchema(template.contentSchema);
    assert.ok(template.acceptedItemTypes.length > 0);
  }
});

test("the seeded Reading Comprehension template uses the reading renderer with an explicit item contract", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "READING_COMPREHENSION");
  assert.ok(template);
  assert.equal(template.rendererKey, "reading");
  assert.equal(template.assessmentMode, "AUTO");
  assert.equal(template.supportsFutureAI, false);
  const content = template.contentSchema as { properties: { readingComprehension: { required: string[] } } };
  assert.deepEqual(content.properties.readingComprehension.required, ["passage", "questions", "showPassageFirst", "allowPassageDuringQuestions", "randomizeQuestions", "showQuestionNumbers", "showImmediateFeedback", "allowRetry"]);
});

test("the seeded Voice Recording template advertises the explicit item contract", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "VOICE_RECORDING");
  assert.ok(template);
  assert.equal(template.rendererKey, "voice-recording");
  const content = template.contentSchema as { properties: { voiceRecording: { required: string[] } } };
  assert.deepEqual(content.properties.voiceRecording.required, ["prompt", "recording"]);
});

test("the seeded Free Handwriting template advertises a manual canvas contract without OCR or AI", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "FREE_HANDWRITING");
  assert.ok(template);
  assert.equal(template.rendererKey, "free-handwriting");
  assert.equal(template.assessmentMode, "MANUAL");
  assert.equal(template.requiresTeacherReview, true);
  assert.equal(template.supportsFutureAI, false);
  const content = template.contentSchema as { properties: { freeHandwriting: { required: string[]; properties: { responseMode: { enum: string[] }; writingLayout: unknown; completion: unknown } } } };
  assert.deepEqual(content.properties.freeHandwriting.required, ["responseMode", "prompt", "canvas", "writingLayout", "writingDirection", "tools", "completion", "teacherReviewRequired"]);
  assert.deepEqual(content.properties.freeHandwriting.properties.responseMode.enum, ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE", "SHORT_RESPONSE"]);
  assert.ok(content.properties.freeHandwriting.properties.writingLayout);
  assert.ok(content.properties.freeHandwriting.properties.completion);
});

test("the seeded Arrange Letters template advertises the explicit item contract", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "ARRANGE_LETTERS");
  assert.ok(template);
  assert.equal(template.rendererKey, "arrange-letters");
  const content = template.contentSchema as { properties: { arrangeLetters: { required: string[]; properties: { interactionMode: { enum: string[] }; letterUnits: unknown } } } };
  assert.deepEqual(content.properties.arrangeLetters.required, ["interactionMode", "targetWord", "letterUnits"]);
  assert.deepEqual(content.properties.arrangeLetters.properties.interactionMode.enum, ["CLICK_ORDER", "DRAG_ORDER", "BOTH"]);
  assert.ok(content.properties.arrangeLetters.properties.letterUnits);
});

test("the seeded Arrange Syllables template advertises the explicit item contract", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "ARRANGE_SYLLABLES");
  assert.ok(template);
  assert.equal(template.rendererKey, "arrange-syllables");
  const content = template.contentSchema as { properties: { arrangeSyllables: { required: string[]; properties: { interactionMode: { enum: string[] }; syllables: unknown } } } };
  assert.deepEqual(content.properties.arrangeSyllables.required, ["interactionMode", "targetWord", "syllables"]);
  assert.deepEqual(content.properties.arrangeSyllables.properties.interactionMode.enum, ["CLICK_ORDER", "DRAG_ORDER", "BOTH"]);
  assert.ok(content.properties.arrangeSyllables.properties.syllables);
});

test("the seeded Word Builder template advertises the explicit item contract", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "WORD_BUILDER");
  assert.ok(template);
  assert.equal(template.rendererKey, "word-builder");
  assert.equal(createActivityTemplateSchema.parse({ ...template, version: 1 }).rendererKey, "word-builder");
  const content = template.contentSchema as { properties: { wordBuilder: { required: string[]; properties: { builderMode: { enum: string[] }; interactionMode: { enum: string[] }; units: unknown; distractors: unknown } } } };
  assert.deepEqual(content.properties.wordBuilder.required, ["builderMode", "interactionMode", "targetWord", "units"]);
  assert.deepEqual(content.properties.wordBuilder.properties.builderMode.enum, ["LETTER", "SYLLABLE"]);
  assert.deepEqual(content.properties.wordBuilder.properties.interactionMode.enum, ["CLICK_ORDER", "DRAG_ORDER", "BOTH"]);
  assert.ok(content.properties.wordBuilder.properties.units);
  assert.ok(content.properties.wordBuilder.properties.distractors);
});

test("the seeded Tracing template advertises the explicit item contract", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "TRACING");
  assert.ok(template);
  assert.equal(template.rendererKey, "tracing");
  const content = template.contentSchema as { properties: { tracing: { required: string[]; properties: { traceMode: { enum: string[] }; traceUnits: unknown; canvas: unknown } } } };
  assert.deepEqual(content.properties.tracing.required, ["traceMode", "displayText", "traceUnits", "canvas"]);
  assert.deepEqual(content.properties.tracing.properties.traceMode.enum, ["LETTER", "NUMBER", "SYLLABLE", "WORD", "SENTENCE"]);
  assert.ok(content.properties.tracing.properties.traceUnits);
  assert.ok(content.properties.tracing.properties.canvas);
});

test("the seeded Copy Writing template advertises the explicit item contract without OCR or AI", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "COPY_WRITING");
  assert.ok(template);
  assert.equal(template.rendererKey, "copy-writing");
  assert.equal(template.assessmentMode, "HYBRID");
  assert.equal(template.requiresTeacherReview, true);
  assert.equal(template.supportsFutureAI, false);
  assert.equal(createActivityTemplateSchema.parse({ ...template, version: 1 }).rendererKey, "copy-writing");
  const content = template.contentSchema as { properties: { copyWriting: { required: string[]; properties: { contentMode: { enum: string[] }; writingLayout: unknown; tools: unknown } } } };
  assert.deepEqual(content.properties.copyWriting.required, ["contentMode", "referenceText", "repetitionCount", "canvas", "writingLayout", "referenceDisplay", "writingDirection", "tools", "completion"]);
  assert.deepEqual(content.properties.copyWriting.properties.contentMode.enum, ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE"]);
  assert.ok(content.properties.copyWriting.properties.writingLayout);
  assert.ok(content.properties.copyWriting.properties.tools);
});

test("the seeded Reading template advertises guided reading without voice or AI assessment", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "READING");
  assert.ok(template);
  assert.equal(template.rendererKey, "reading");
  assert.equal(template.assessmentMode, "MANUAL");
  assert.equal(template.requiresTeacherReview, false);
  assert.equal(template.supportsVoiceRecording, false);
  assert.equal(template.supportsFutureAI, false);
  const content = template.contentSchema as { properties: { reading: { required: string[]; properties: { contentMode: { enum: string[] }; paragraphs: unknown; readingTools: unknown } } } };
  assert.deepEqual(content.properties.reading.required, ["contentMode", "readingText", "paragraphs", "readingDirection", "display", "readingTools", "completion"]);
  assert.deepEqual(content.properties.reading.properties.contentMode.enum, ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE", "PARAGRAPH"]);
  assert.ok(content.properties.reading.properties.paragraphs);
  assert.ok(content.properties.reading.properties.readingTools);
});

test("the seeded Fill in the Blank template advertises the explicit item contract", () => {
  const template = coreActivityTemplates.find((entry) => entry.code === "FILL_BLANK");
  assert.ok(template);
  assert.deepEqual(template.configurationSchema, {
    type: "object",
    title: "Activity configuration",
    properties: {
      attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
    },
  });
  const content = template.contentSchema as { properties: { fillBlank: { required: string[]; properties: { mode: { enum: string[] }; blanks: unknown; wordBank: unknown } } } };
  assert.deepEqual(content.properties.fillBlank.required, ["mode", "prompt", "blanks", "wordBank", "allowRepeatedWords"]);
  assert.deepEqual(content.properties.fillBlank.properties.mode.enum, ["TYPING", "WORD_BANK", "MIXED"]);
  assert.ok(content.properties.fillBlank.properties.blanks);
  assert.ok(content.properties.fillBlank.properties.wordBank);
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
