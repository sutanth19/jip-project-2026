import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import { FreeHandwritingFeedback } from "@/features/activity-player/renderers/free-handwriting/FreeHandwritingFeedback"
import { FreeHandwritingGuideLayer } from "@/features/activity-player/renderers/free-handwriting/FreeHandwritingGuideLayer"
import { FreeHandwritingHint } from "@/features/activity-player/renderers/free-handwriting/FreeHandwritingHint"
import { FreeHandwritingPrompt } from "@/features/activity-player/renderers/free-handwriting/FreeHandwritingPrompt"
import type { FreeHandwritingQuestion, FreeHandwritingStroke } from "@/features/activity-player/renderers/free-handwriting/free-handwriting.types"
import { buildFreeHandwritingRegions, buildFreeHandwritingRows, freeHandwritingRegionIndex } from "@/features/activity-player/renderers/free-handwriting/free-handwriting-layout"
import { addFreeHandwritingStroke, buildFreeHandwritingCompletionSummary, canRetryFreeHandwriting, clearFreeHandwriting, createFreeHandwritingState, eraseFreeHandwritingStroke, getFreeHandwritingSettings, mapFreeHandwritingQuestion, redoFreeHandwriting, retryFreeHandwriting, submitFreeHandwriting, undoFreeHandwriting, usedFreeHandwritingRegions } from "@/features/activity-player/renderers/free-handwriting/free-handwriting.utils"
import type { ActivityQuestion } from "@/features/activity-player/types"

const freeHandwritingItem: ActivityQuestion = {
  id: "free-item-1", sequence: 0, sectionKey: null, isRequired: true, marks: null,
  configuration: {
    freeHandwriting: {
      responseMode: "WORD",
      prompt: { text: "Tulis nama gambar ini.", showText: true, media: [{ key: "prompt-image.png", url: "/media/prompt-image.png", mimeType: "image/png", altText: "Buku", label: "Imej prompt" }] },
      canvas: { width: 900, height: 420 },
      writingLayout: { lineStyle: "THREE_LINE", lineCount: 2, lineSpacing: 180, showTopLine: true, showMidline: true, showBaseline: true, showDescenderLine: false },
      writingDirection: "LEFT_TO_RIGHT",
      tools: { allowPen: true, allowEraser: true, allowUndo: true, allowRedo: true, allowClear: true, allowStrokeWidthChange: true, defaultStrokeWidth: 6 },
      completion: { minimumStrokeCount: 2, minimumWritingRegionsUsed: 2, requireAllWritingRegions: false },
      teacherReviewRequired: true,
      allowRetry: true,
      clearOnRetry: false,
      hint: { type: "NONE", media: [] },
      media: {
        instructionAudio: [{ key: "instruction.mp3", url: "/media/instruction.mp3", mimeType: "audio/mpeg", altText: null, label: "Arahan audio" }],
        supportingImage: [{ key: "support.png", url: "/media/support.png", mimeType: "image/png", altText: "Sokongan", label: "Sokongan" }],
        supportingVideo: [{ key: "support.mp4", url: "/media/support.mp4", mimeType: "video/mp4", altText: null, label: "Video sokongan" }],
      },
    },
  },
  questionBankItem: { id: "free-question-1", type: "WORD", title: "Tulisan bebas", content: "Legacy prompt tidak digunakan.", answerType: "TEXT", correctAnswer: null, metadata: null, instructions: "Tulis jawapan anda sendiri.", explanation: null, difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1", answerOptions: [], mediaLinks: [] },
}

function question(item: ActivityQuestion | (ActivityQuestion & { legacyFreeHandwriting?: { incomplete?: boolean; reason?: string | null } | null }) = freeHandwritingItem): FreeHandwritingQuestion {
  const mapped = mapFreeHandwritingQuestion(item)
  if (!mapped.ok) throw new Error("Malformed Free Handwriting fixture")
  return mapped.question
}

function settings(item: FreeHandwritingQuestion = question(), overrides: Partial<{ attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean }> = {}) {
  return getFreeHandwritingSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, ...overrides }, item)
}

function stroke(id: string, regionIndex: number, strokeWidth = 6): FreeHandwritingStroke {
  return { id, points: [20, 20 + regionIndex * 180, 80, 60 + regionIndex * 180], tool: "PEN", strokeWidth, regionIndex, sessionOrder: Number(id.replace(/\D/gu, "")) || 1 }
}

describe("Free Handwriting player", () => {
  it("registers the renderer and consumes only the explicit freeHandwriting contract", () => {
    expect(getActivityRenderer("free-handwriting")).toBeTypeOf("function")
    expect(question().promptText).toBe("Tulis nama gambar ini.")
    expect(mapFreeHandwritingQuestion({ ...freeHandwritingItem, configuration: null }).ok).toBe(false)
    expect(mapFreeHandwritingQuestion({ ...freeHandwritingItem, configuration: { freeHandwriting: { prompt: { text: "Tulis", showText: true } } } }).ok).toBe(false)
  })

  it("supports every response mode, text or hidden-media prompts, and rejects missing prompts safely", () => {
    const source = freeHandwritingItem.configuration as { freeHandwriting: Record<string, unknown> }
    const modes = ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE", "SHORT_RESPONSE"] as const
    modes.forEach((mode) => expect(question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, responseMode: mode } } }).responseMode).toBe(mode))
    const hiddenImage = question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, prompt: { text: null, showText: false, media: [{ key: "prompt-image.png", url: "/media/prompt-image.png", mimeType: "image/png", altText: "Buku", label: "Imej prompt" }] } } } })
    const hiddenAudio = question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, prompt: { text: null, showText: false, media: [{ key: "prompt.mp3", url: "/media/prompt.mp3", mimeType: "audio/mpeg", altText: null, label: "Audio prompt" }] } } } })
    expect(hiddenImage.showPromptText).toBe(false)
    expect(hiddenAudio.promptMedia[0]?.url).toBe("/media/prompt.mp3")
    expect(mapFreeHandwritingQuestion({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, prompt: { text: null, showText: false, media: [] } } } }).ok).toBe(false)
  })

  it("builds safe line geometry and writing regions for every supported line style", () => {
    const source = freeHandwritingItem.configuration as { freeHandwriting: Record<string, unknown> }
    const styles = ["NONE", "BASELINE", "TWO_LINE", "THREE_LINE", "FOUR_LINE"] as const
    styles.forEach((lineStyle) => {
      const flags = { showTopLine: lineStyle === "TWO_LINE" || lineStyle === "THREE_LINE" || lineStyle === "FOUR_LINE", showMidline: lineStyle === "THREE_LINE" || lineStyle === "FOUR_LINE", showBaseline: lineStyle !== "NONE", showDescenderLine: lineStyle === "FOUR_LINE" }
      const mapped = question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, writingLayout: { lineStyle, lineCount: lineStyle === "NONE" ? 0 : 2, lineSpacing: 180, ...flags }, completion: { minimumStrokeCount: 1, minimumWritingRegionsUsed: 1, requireAllWritingRegions: false } } } })
      const rows = buildFreeHandwritingRows(mapped)
      const regions = buildFreeHandwritingRegions(mapped)
      expect(regions.length).toBe(lineStyle === "NONE" ? 1 : 2)
      expect(rows.every((row) => row.top >= 0 && row.descender <= mapped.canvasHeight)).toBe(true)
      expect(renderToStaticMarkup(<FreeHandwritingGuideLayer question={mapped} emphasized={false} />)).toContain("svg")
    })
    expect(mapFreeHandwritingQuestion({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, writingLayout: { lineStyle: "THREE_LINE", lineCount: 3, lineSpacing: 200, showTopLine: true, showMidline: true, showBaseline: true, showDescenderLine: false }, canvas: { width: 900, height: 420 } } } }).ok).toBe(false)
  })

  it("tracks strokes, logical regions, erase, undo, redo, and clear using local-only drawing state", () => {
    const mapped = question()
    const initial = createFreeHandwritingState(mapped)
    const one = addFreeHandwritingStroke(initial, stroke("s1", 0))
    const two = addFreeHandwritingStroke(one, stroke("s2", 1, 8))
    const erased = eraseFreeHandwritingStroke(two, "s1")
    const undone = undoFreeHandwriting(two)
    const redone = redoFreeHandwriting(undone)
    expect(freeHandwritingRegionIndex(mapped, 10)).toBe(0)
    expect(freeHandwritingRegionIndex(mapped, 390)).toBe(1)
    expect(two.strokes[1]?.strokeWidth).toBe(8)
    expect(usedFreeHandwritingRegions(two)).toEqual(new Set([0, 1]))
    expect(erased.strokes).toHaveLength(1)
    expect(undone.strokes).toHaveLength(1)
    expect(redone.strokes).toHaveLength(2)
    expect(addFreeHandwritingStroke(undone, stroke("s3", 1)).redoStrokes).toEqual([])
    expect(clearFreeHandwriting(two)).toMatchObject({ strokes: [], redoStrokes: [] })
  })

  it("validates local completion only, never claims textual correctness, and shows teacher-review status separately", () => {
    const mapped = question()
    const initial = createFreeHandwritingState(mapped)
    const empty = submitFreeHandwriting(initial, mapped, settings(mapped))
    const one = submitFreeHandwriting(addFreeHandwritingStroke(initial, stroke("s1", 0)), mapped, settings(mapped))
    const full = submitFreeHandwriting(addFreeHandwritingStroke(addFreeHandwritingStroke(initial, stroke("s1", 0)), stroke("s2", 1)), mapped, settings(mapped))
    expect(empty).toMatchObject({ validation: "EMPTY", attemptCount: 0, feedback: "Sila tulis dahulu." })
    expect(one).toMatchObject({ isComplete: false, attemptCount: 1, feedback: "Cuba lengkapkan ruang tulisan." })
    expect(full).toMatchObject({ isComplete: true, completed: true })
    expect(full.feedback).toContain("Ruang tulisan telah dilengkapkan")
    expect(full.feedback).not.toMatch(/betul|ejaan|kemas|tepat/iu)
    expect(renderToStaticMarkup(<FreeHandwritingFeedback submitted complete message={full.feedback} showImmediateFeedback />)).toContain("aria-live")
  })

  it("respects delayed feedback, retry rules, retry limits, and allowRetry false without backend mutation", () => {
    const mapped = question()
    const initial = addFreeHandwritingStroke(createFreeHandwritingState(mapped), stroke("s1", 0))
    const incomplete = submitFreeHandwriting(initial, mapped, settings(mapped))
    const source = freeHandwritingItem.configuration as { freeHandwriting: Record<string, unknown> }
    const clearQuestion = question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, clearOnRetry: true } } })
    const exhausted = submitFreeHandwriting(retryFreeHandwriting(incomplete, mapped), mapped, { ...settings(mapped), attemptsAllowed: 2 })
    const delayed = submitFreeHandwriting(initial, mapped, settings(mapped, { showImmediateFeedback: false }))
    const noRetry = submitFreeHandwriting(initial, mapped, settings(mapped, { allowRetry: false }))
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(retryFreeHandwriting(incomplete, mapped).strokes).toHaveLength(1)
    expect(retryFreeHandwriting(incomplete, clearQuestion).strokes).toHaveLength(0)
    expect(canRetryFreeHandwriting(incomplete, settings(mapped))).toBe(true)
    expect(exhausted.completed).toBe(true)
    expect(delayed.feedback).toBe("Tulisan direkod untuk semakan sesi ini.")
    expect(noRetry.completed).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it("renders prompt media, instruction audio, supporting media, teacher review messaging, and no model answer", () => {
    const mapped = question()
    const markup = renderToStaticMarkup(<FreeHandwritingPrompt question={mapped} emphasizedPrompt={false} emphasizedImage={false} />)
    expect(markup).toContain("/media/prompt-image.png")
    expect(markup).toContain("/media/instruction.mp3")
    expect(markup).toContain("/media/support.png")
    expect(markup).toContain("/media/support.mp4")
    expect(markup).toContain("Respons perkataan")
    expect(markup).not.toContain("buku</")
  })

  it("renders explicit hint types and fails safely for legacy or malformed hint contracts", () => {
    const source = freeHandwritingItem.configuration as { freeHandwriting: Record<string, unknown> }
    const showPrompt = question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, hint: { type: "SHOW_PROMPT", media: [] } } } })
    const showAudio = question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, hint: { type: "PLAY_PROMPT_AUDIO", media: [{ key: "prompt.mp3", url: "/media/prompt.mp3", mimeType: "audio/mpeg", altText: null, label: "Audio prompt" }] } } } })
    const showImage = question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, hint: { type: "SHOW_PROMPT_IMAGE", media: [{ key: "prompt-image.png", url: "/media/prompt-image.png", mimeType: "image/png", altText: "Buku", label: "Imej prompt" }] } } } })
    const showLines = question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, hint: { type: "SHOW_WRITING_LINES", media: [] } } } })
    const showArea = question({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, hint: { type: "EMPHASIZE_WRITING_AREA", media: [] } } } })
    expect(renderToStaticMarkup(<FreeHandwritingHint question={showPrompt} onShowPrompt={() => undefined} onShowImage={() => undefined} onShowLines={() => undefined} onShowArea={() => undefined} />)).toContain("Lihat petunjuk")
    expect(renderToStaticMarkup(<FreeHandwritingHint question={showAudio} onShowPrompt={() => undefined} onShowImage={() => undefined} onShowLines={() => undefined} onShowArea={() => undefined} />)).toContain("Lihat petunjuk")
    expect(renderToStaticMarkup(<FreeHandwritingHint question={showImage} onShowPrompt={() => undefined} onShowImage={() => undefined} onShowLines={() => undefined} onShowArea={() => undefined} />)).toContain("Lihat petunjuk")
    expect(renderToStaticMarkup(<FreeHandwritingHint question={showLines} onShowPrompt={() => undefined} onShowImage={() => undefined} onShowLines={() => undefined} onShowArea={() => undefined} />)).toContain("Lihat petunjuk")
    expect(renderToStaticMarkup(<FreeHandwritingHint question={showArea} onShowPrompt={() => undefined} onShowImage={() => undefined} onShowLines={() => undefined} onShowArea={() => undefined} />)).toContain("Lihat petunjuk")
    expect(mapFreeHandwritingQuestion({ ...freeHandwritingItem, legacyFreeHandwriting: { incomplete: true, reason: "EXPLICIT_FREE_HANDWRITING_CONTRACT_REQUIRED" } }).ok).toBe(false)
    expect(mapFreeHandwritingQuestion({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, hint: { type: "PLAY_PROMPT_AUDIO", media: [] } } } }).ok).toBe(false)
    expect(mapFreeHandwritingQuestion({ ...freeHandwritingItem, configuration: { freeHandwriting: { ...source.freeHandwriting, hint: { type: "SHOW_PROMPT_IMAGE", media: [] } } } }).ok).toBe(false)
  })

  it("builds local-only completion summaries and keeps existing placeholders unchanged", () => {
    const mapped = question()
    const full = submitFreeHandwriting(addFreeHandwritingStroke(addFreeHandwritingStroke(createFreeHandwritingState(mapped), stroke("s1", 0)), stroke("s2", 1)), mapped, settings(mapped))
    expect(buildFreeHandwritingCompletionSummary({ [mapped.itemId]: full }, [mapped])).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 1 })
    expect(renderToStaticMarkup(<FreeHandwritingGuideLayer question={mapped} emphasized={false} />)).toContain("motion-reduce:transition-none")
    expect(getActivityRenderer("reading")).toBeTypeOf("function")
  })
})
