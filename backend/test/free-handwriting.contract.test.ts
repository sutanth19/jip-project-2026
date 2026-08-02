import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { FREE_HANDWRITING_MAX_BYTES, FreeHandwritingContractError, freeHandwritingPreviewConfiguration, validateFreeHandwritingConfiguration, validateFreeHandwritingMedia } from "../src/contracts/free-handwriting.contract.js";

const imageKey = "activity-image/2026/07/00000000-0000-4000-8000-000000000201.png";
const audioKey = "activity-audio/2026/07/00000000-0000-4000-8000-000000000202.mp3";
function validContract(): unknown { return { freeHandwriting: { responseMode: "WORD", prompt: { text: "Tulis nama gambar ini.", showText: true }, canvas: { width: 1000, height: 500 }, writingLayout: { lineStyle: "FOUR_LINE", lineCount: 3, lineSpacing: 120, showTopLine: true, showMidline: true, showBaseline: true, showDescenderLine: true }, writingDirection: "LEFT_TO_RIGHT", tools: { allowPen: true, allowEraser: true, allowUndo: true, allowRedo: true, allowClear: true, allowStrokeWidthChange: false, defaultStrokeWidth: 6 }, completion: { minimumStrokeCount: 1, minimumWritingRegionsUsed: 1, requireAllWritingRegions: false }, teacherReviewRequired: true, allowRetry: true, clearOnRetry: false, hint: { type: "SHOW_PROMPT" } } }; }
function clone(value: unknown): Record<string, unknown> { return JSON.parse(JSON.stringify(value)) as Record<string, unknown>; }
function definition(value: Record<string, unknown>): Record<string, unknown> { return value.freeHandwriting as Record<string, unknown>; }
function rejects(value: unknown, issue: string): void { assert.throws(() => validateFreeHandwritingConfiguration(value), (caught: unknown) => caught instanceof FreeHandwritingContractError && caught.issues.includes(issue as never)); }

test("Free Handwriting accepts every explicit response mode", () => {
  for (const responseMode of ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE", "SHORT_RESPONSE"] as const) { const contract = clone(validContract()); definition(contract).responseMode = responseMode; assert.equal(validateFreeHandwritingConfiguration(contract).freeHandwriting.responseMode, responseMode); }
});
test("Free Handwriting requires a safe prompt unless safe prompt media is explicit", async () => {
  const missing = clone(validContract()); (definition(missing).prompt as Record<string, unknown>).text = null; (definition(missing).prompt as Record<string, unknown>).showText = false; rejects(missing, "FREE_HANDWRITING_PROMPT_REQUIRED");
  const image = clone(missing); definition(image).media = { promptImageKey: imageKey }; const parsed = validateFreeHandwritingConfiguration(image); assert.equal(parsed.freeHandwriting.prompt.text, null); await validateFreeHandwritingMedia(parsed, async (key) => assert.equal(key, imageKey));
  const html = clone(validContract()); (definition(html).prompt as Record<string, unknown>).text = "<b>Tulis</b>"; rejects(html, "FREE_HANDWRITING_UNSAFE_CONTENT");
  const javascript = clone(validContract()); (definition(javascript).prompt as Record<string, unknown>).text = "javascript:alert(1)"; rejects(javascript, "FREE_HANDWRITING_UNSAFE_CONTENT");
  const url = clone(validContract()); (definition(url).prompt as Record<string, unknown>).text = "https://example.test"; rejects(url, "FREE_HANDWRITING_UNSAFE_CONTENT");
});
test("Free Handwriting validates canvas, layout, regions, direction, tools, review, and hints", () => {
  const width = clone(validContract()); (definition(width).canvas as Record<string, unknown>).width = 399; rejects(width, "FREE_HANDWRITING_CANVAS_INVALID");
  const layout = clone(validContract()); (definition(layout).writingLayout as Record<string, unknown>).lineStyle = "GRID"; rejects(layout, "FREE_HANDWRITING_LAYOUT_INVALID");
  const impossible = clone(validContract()); (definition(impossible).writingLayout as Record<string, unknown>).lineSpacing = 300; rejects(impossible, "FREE_HANDWRITING_LAYOUT_INVALID");
  const regions = clone(validContract()); (definition(regions).completion as Record<string, unknown>).minimumWritingRegionsUsed = 4; rejects(regions, "FREE_HANDWRITING_COMPLETION_INVALID");
  const allRegions = clone(validContract()); (definition(allRegions).completion as Record<string, unknown>).requireAllWritingRegions = true; rejects(allRegions, "FREE_HANDWRITING_COMPLETION_INVALID");
  const pen = clone(validContract()); (definition(pen).tools as Record<string, unknown>).allowPen = false; rejects(pen, "FREE_HANDWRITING_TOOL_CONFIG_INVALID");
  const redo = clone(validContract()); (definition(redo).tools as Record<string, unknown>).allowUndo = false; rejects(redo, "FREE_HANDWRITING_TOOL_CONFIG_INVALID");
  const direction = clone(validContract()); definition(direction).writingDirection = "RIGHT_TO_LEFT"; rejects(direction, "FREE_HANDWRITING_WRITING_DIRECTION_INVALID");
  const review = clone(validContract()); definition(review).teacherReviewRequired = "true"; rejects(review, "FREE_HANDWRITING_REVIEW_CONFIG_INVALID");
  const audioHint = clone(validContract()); definition(audioHint).hint = { type: "PLAY_PROMPT_AUDIO" }; rejects(audioHint, "FREE_HANDWRITING_HINT_INVALID");
});
test("Free Handwriting rejects oversized, deep, polluted, and unsupported contracts", () => {
  const oversized = clone(validContract()); (definition(oversized).prompt as Record<string, unknown>).text = "a".repeat(FREE_HANDWRITING_MAX_BYTES); rejects(oversized, "FREE_HANDWRITING_CONFIGURATION_TOO_LARGE");
  const deep = JSON.parse('{"freeHandwriting":{"responseMode":"WORD","prompt":{"text":"Tulis","showText":true},"canvas":{"width":1000,"height":500},"writingLayout":{"lineStyle":"NONE","lineCount":0,"lineSpacing":24,"showTopLine":false,"showMidline":false,"showBaseline":false,"showDescenderLine":false},"writingDirection":"LEFT_TO_RIGHT","tools":{"allowPen":true,"allowEraser":true,"allowUndo":true,"allowRedo":true,"allowClear":true,"allowStrokeWidthChange":false,"defaultStrokeWidth":6},"completion":{"minimumStrokeCount":1,"minimumWritingRegionsUsed":1,"requireAllWritingRegions":false},"teacherReviewRequired":true,"nested":{"a":{"b":{"c":{"d":{"e":{"f":{"g":1}}}}}}}}}') as unknown; rejects(deep, "FREE_HANDWRITING_CONFIGURATION_TOO_DEEP");
  rejects(JSON.parse('{"freeHandwriting":{"__proto__":{},"responseMode":"WORD"}}') as unknown, "FREE_HANDWRITING_UNSAFE_CONTENT");
});
test("Free Handwriting preview returns only safe contract and media DTOs", () => {
  const contract = clone(validContract()); definition(contract).media = { promptImageKey: imageKey, promptAudioKey: audioKey }; definition(contract).hint = { type: "SHOW_PROMPT_IMAGE" };
  const preview = freeHandwritingPreviewConfiguration(validateFreeHandwritingConfiguration(contract), new Map([[imageKey, { url: "/media/image", mimeType: "image/png", altText: "Buku", label: "/private/tmp/book.png" }], [audioKey, { url: "/media/audio", mimeType: "audio/mpeg", altText: "Arahan", label: "/private/tmp/audio.mp3" }]]));
  assert.equal(preview.freeHandwriting.prompt.text, "Tulis nama gambar ini."); assert.equal(preview.freeHandwriting.canvas.width, 1000); assert.equal(preview.freeHandwriting.tools.allowPen, true); assert.equal(preview.freeHandwriting.completion.minimumStrokeCount, 1); assert.equal(preview.freeHandwriting.teacherReviewRequired, true); assert.equal(preview.freeHandwriting.media.promptImage[0]?.label, null); assert.deepEqual(preview.freeHandwriting.hint.media.map((media) => media.key), [imageKey]);
});
test("Free Handwriting workflow blocks malformed and legacy contracts without changing other previews", async () => {
  const service = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8"); assert.match(service, /FREE_HANDWRITING_CONTRACT_INVALID/); assert.match(service, /DIGITAL_ACTIVITY_PUBLICATION_INVALID/); assert.match(service, /EXPLICIT_FREE_HANDWRITING_CONTRACT_REQUIRED/); assert.match(service, /rendererKey === "free-handwriting"/); assert.match(service, /legacyFreeHandwriting/);
});
test("Free Handwriting adds no assignment, attempt, submission, drawing, assessment, OCR, or AI model", async () => { const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8"); assert.doesNotMatch(schema, /FreeHandwriting(?:Attempt|Submission|Assignment|Drawing|Assessment|Ocr|AI)/); });
