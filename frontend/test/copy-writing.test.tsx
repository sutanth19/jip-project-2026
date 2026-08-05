import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import { CopyWritingGuideLayer } from "@/features/activity-player/renderers/copy-writing/CopyWritingGuideLayer"
import { CopyWritingHint } from "@/features/activity-player/renderers/copy-writing/CopyWritingHint"
import { CopyWritingReference } from "@/features/activity-player/renderers/copy-writing/CopyWritingReference"
import type { CopyWritingQuestion, CopyWritingStroke } from "@/features/activity-player/renderers/copy-writing/copy-writing.types"
import { buildWritingRows, writingRegionIndex } from "@/features/activity-player/renderers/copy-writing/copy-writing-layout"
import { addCopyWritingStroke, buildCopyWritingCompletionSummary, canRetryCopyWriting, clearCopyWriting, createCopyWritingState, eraseCopyWritingStroke, getCopyWritingSettings, mapCopyWritingQuestion, redoCopyWriting, retryCopyWriting, submitCopyWriting, undoCopyWriting, usedCopyWritingRegions } from "@/features/activity-player/renderers/copy-writing/copy-writing.utils"
import type { ActivityQuestion } from "@/features/activity-player/types"

const copyWritingItem: ActivityQuestion = {
  id: "copy-item-1", sequence: 0, sectionKey: null, isRequired: true, marks: null,
  configuration: { copyWriting: { contentMode: "WORD", referenceText: "baju", repetitionCount: 2, canvas: { width: 800, height: 400 }, writingLayout: { lineStyle: "THREE_LINE", lineCount: 2, lineSpacing: 180, showTopLine: true, showMidline: true, showBaseline: true, showDescenderLine: false }, referenceDisplay: { position: "TOP", fontSize: 36, showSyllableBreaks: false, syllableSeparator: " · " }, syllableUnits: [], writingDirection: "LEFT_TO_RIGHT", tools: { allowPen: true, allowEraser: true, allowUndo: true, allowRedo: true, allowClear: true, allowStrokeWidthChange: true, defaultStrokeWidth: 5 }, completion: { minimumStrokeCount: 2, requireAllRepetitions: true, minimumWritingRegionsUsed: null }, allowRetry: true, clearOnRetry: false, hint: { type: "NONE", media: [] }, media: { referenceImage: [], referenceAudio: [], instructionAudio: [] } } },
  questionBankItem: { id: "copy-question-1", type: "WORD", title: "Tidak digunakan sebagai rujukan", content: "Tidak digunakan", answerType: "TEXT", correctAnswer: null, metadata: null, instructions: "Salin teks pada ruang tulisan.", explanation: null, difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1", answerOptions: [], mediaLinks: [] },
}

function question(item: ActivityQuestion = copyWritingItem): CopyWritingQuestion { const mapped = mapCopyWritingQuestion(item); if (!mapped.ok) throw new Error("Malformed Copy Writing fixture"); return mapped.question }
function settings(item: CopyWritingQuestion = question(), overrides: Partial<{ attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean }> = {}) { return getCopyWritingSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: {}, ...overrides }, item) }
function stroke(id: string, regionIndex: number): CopyWritingStroke { return { id, points: [20, 20 + regionIndex * 180, 80, 60 + regionIndex * 180], tool: "PEN", strokeWidth: 5, regionIndex, sessionOrder: Number(id.replace(/\D/gu, "")) || 1 } }

describe("Copy Writing player", () => {
  it("registers the renderer and maps only the explicit copyWriting contract", () => {
    expect(getActivityRenderer("copy-writing")).toBeTypeOf("function")
    expect(question().referenceText).toBe("baju")
    expect(mapCopyWritingQuestion({ ...copyWritingItem, configuration: null }).ok).toBe(false)
    expect(mapCopyWritingQuestion({ ...copyWritingItem, configuration: { copyWriting: { referenceText: "baju" } } }).ok).toBe(false)
  })

  it("supports all explicit content modes while preserving reference text exactly", () => {
    const source = copyWritingItem.configuration as { copyWriting: Record<string, unknown> }
    const modes = ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE"] as const
    const texts = ["Á", "ba", "baju", "baju baharu", "Saya baca buku."]
    modes.forEach((mode, index) => { const mapped = question({ ...copyWritingItem, configuration: { copyWriting: { ...source.copyWriting, contentMode: mode, referenceText: texts[index], repetitionCount: 1, writingLayout: { ...(source.copyWriting.writingLayout as Record<string, unknown>), lineCount: 1 }, completion: { ...(source.copyWriting.completion as Record<string, unknown>), requireAllRepetitions: false } } } }); expect(mapped.contentMode).toBe(mode); expect(mapped.referenceText).toBe(texts[index]) })
  })

  it("uses explicit syllable units and reference layouts without automatic syllabification", () => {
    const source = copyWritingItem.configuration as { copyWriting: Record<string, unknown> }
    const syllables = question({ ...copyWritingItem, configuration: { copyWriting: { ...source.copyWriting, contentMode: "SYLLABLE", referenceText: "sekolah", referenceDisplay: { position: "ABOVE_EACH_LINE", fontSize: 36, showSyllableBreaks: true, syllableSeparator: " · " }, syllableUnits: [{ id: "se", value: "se", sequence: 1 }, { id: "ko", value: "ko", sequence: 2 }, { id: "lah", value: "lah", sequence: 3 }] } } })
    expect(syllables.syllableUnits.map((unit) => unit.value)).toEqual(["se", "ko", "lah"])
    expect(renderToStaticMarkup(<CopyWritingReference question={syllables} repeat />)).toContain("se · ko · lah")
    expect(mapCopyWritingQuestion({ ...copyWritingItem, configuration: { copyWriting: { ...source.copyWriting, referenceDisplay: { position: "TOP", fontSize: 36, showSyllableBreaks: true, syllableSeparator: " · " }, syllableUnits: [] } } }).ok).toBe(false)
  })

  it("builds safe guide geometry for every line style and keeps it inside the logical canvas", () => {
    const source = copyWritingItem.configuration as { copyWriting: Record<string, unknown> }
    const styles = ["NONE", "BASELINE", "TWO_LINE", "THREE_LINE", "FOUR_LINE"] as const
    styles.forEach((lineStyle) => { const flags = { showTopLine: lineStyle === "TWO_LINE" || lineStyle === "THREE_LINE" || lineStyle === "FOUR_LINE", showMidline: lineStyle === "THREE_LINE" || lineStyle === "FOUR_LINE", showBaseline: lineStyle !== "NONE", showDescenderLine: lineStyle === "FOUR_LINE" }; const mapped = question({ ...copyWritingItem, configuration: { copyWriting: { ...source.copyWriting, writingLayout: { lineStyle, lineCount: 2, lineSpacing: 180, ...flags } } } }); const rows = buildWritingRows(mapped); expect(rows.every((row) => row.top >= 0 && row.descender <= mapped.canvasHeight)).toBe(true); expect(renderToStaticMarkup(<CopyWritingGuideLayer question={mapped} emphasized={false} />)).toContain("svg") })
  })

  it("tracks local strokes, logical regions, erasing, undo, redo, and clear without touching guides or reference text", () => {
    const mapped = question(); const initial = createCopyWritingState(mapped); const one = addCopyWritingStroke(initial, stroke("s1", 0)); const two = addCopyWritingStroke(one, stroke("s2", 1)); const erased = eraseCopyWritingStroke(two, "s1"); const undone = undoCopyWriting(two); const redone = redoCopyWriting(undone)
    expect(writingRegionIndex(mapped, 10)).toBe(0); expect(writingRegionIndex(mapped, 390)).toBe(1)
    expect(usedCopyWritingRegions(two)).toEqual(new Set([0, 1])); expect(erased.strokes).toHaveLength(1); expect(undone.strokes).toHaveLength(1); expect(redone.strokes).toHaveLength(2); expect(clearCopyWriting(two)).toMatchObject({ strokes: [], redoStrokes: [] })
  })

  it("uses local completion only: empty checks are free, minimum strokes and all repetitions are required, and no accuracy claim is made", () => {
    const mapped = question(); const initial = createCopyWritingState(mapped); const empty = submitCopyWriting(initial, mapped, settings(mapped)); const one = submitCopyWriting(addCopyWritingStroke(initial, stroke("s1", 0)), mapped, settings(mapped)); const full = submitCopyWriting(addCopyWritingStroke(addCopyWritingStroke(initial, stroke("s1", 0)), stroke("s2", 1)), mapped, settings(mapped))
    expect(empty).toMatchObject({ validation: "EMPTY", attemptCount: 0, feedback: "Sila tulis dahulu." }); expect(one).toMatchObject({ isComplete: false, attemptCount: 1 }); expect(full).toMatchObject({ isComplete: true, completed: true, feedback: "Bagus! Semua ruang tulisan telah dilengkapkan." }); expect(full.feedback).not.toMatch(/betul|kemas|tepat/iu)
  })

  it("respects delayed feedback, retry-clear rules, retry limits, and disabled retry locally", () => {
    const mapped = question(); const initial = addCopyWritingStroke(createCopyWritingState(mapped), stroke("s1", 0)); const incomplete = submitCopyWriting(initial, mapped, settings(mapped)); const source = copyWritingItem.configuration as { copyWriting: Record<string, unknown> }; const clearQuestion = question({ ...copyWritingItem, configuration: { copyWriting: { ...source.copyWriting, clearOnRetry: true } } }); const exhausted = submitCopyWriting(retryCopyWriting(incomplete, mapped), mapped, { ...settings(mapped), attemptsAllowed: 2 }); const delayed = submitCopyWriting(initial, mapped, settings(mapped, { showImmediateFeedback: false })); const noRetry = submitCopyWriting(initial, mapped, settings(mapped, { allowRetry: false }))
    expect(retryCopyWriting(incomplete, mapped).strokes).toHaveLength(1); expect(retryCopyWriting(incomplete, clearQuestion).strokes).toHaveLength(0); expect(canRetryCopyWriting(incomplete, settings(mapped))).toBe(true); expect(exhausted.completed).toBe(true); expect(delayed.completed).toBe(true); expect(noRetry.completed).toBe(true)
  })

  it("renders explicit hints, media, accessible fallback, and responsive reference positions without raw media keys", () => {
    const source = copyWritingItem.configuration as { copyWriting: Record<string, unknown> }; const imageQuestion = question({ ...copyWritingItem, configuration: { copyWriting: { ...source.copyWriting, referenceDisplay: { position: "LEFT", fontSize: 36, showSyllableBreaks: false, syllableSeparator: " · " }, hint: { type: "EMPHASIZE_FIRST_CHARACTER", media: [] }, media: { referenceImage: [{ key: "image.png", url: "/media/image.png", mimeType: "image/png", altText: "Baju", label: "Gambar" }], referenceAudio: [{ key: "audio.mp3", url: "/media/audio.mp3", mimeType: "audio/mpeg", altText: null, label: "Audio" }], instructionAudio: [] } } } }); const markup = renderToStaticMarkup(<><CopyWritingReference question={imageQuestion} /><CopyWritingHint question={imageQuestion} onShowReference={() => undefined} onShowLines={() => undefined} /></>)
    expect(markup).toContain("/media/image.png"); expect(markup).toContain("/media/audio.mp3"); expect(markup).toContain("Lihat petunjuk"); expect(markup).not.toContain("image.png</")
  })

  it("builds session-only summaries and never calls backend mutation, drawing persistence, OCR, or AI APIs", () => {
    const mapped = question(); const full = submitCopyWriting(addCopyWritingStroke(addCopyWritingStroke(createCopyWritingState(mapped), stroke("s1", 0)), stroke("s2", 1)), mapped, settings(mapped)); const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(buildCopyWritingCompletionSummary({ [mapped.itemId]: full }, [mapped])).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 1 }); expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore()
  })
})
