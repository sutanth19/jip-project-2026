import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import { ReadingFeedback } from "@/features/activity-player/renderers/reading/ReadingFeedback"
import { ReadingHint } from "@/features/activity-player/renderers/reading/ReadingHint"
import { ReadingPanel } from "@/features/activity-player/renderers/reading/ReadingPanel"
import type { ReadingQuestion } from "@/features/activity-player/renderers/reading/reading.types"
import { buildReadingCompletionSummary, beginReadingCountdown, countdownTick, createReadingState, finishReading, getReadingSettings, mapReadingQuestion, meetsReadingCompletion, nextReadingParagraph, pauseReading, previousReadingParagraph, readingTextForDisplay, readingTick, resetReading, resumeReading, setReadingHints, updateReadingZoom } from "@/features/activity-player/renderers/reading/reading.utils"
import type { ActivityQuestion } from "@/features/activity-player/types"

const readingItem: ActivityQuestion = {
  id: "reading-item-1",
  sequence: 0,
  sectionKey: null,
  isRequired: true,
  marks: null,
  configuration: {
    reading: {
      contentMode: "PARAGRAPH",
      title: "Mari Membaca",
      readingText: "Ali memakai baju baharu.",
      paragraphs: [{ id: "P1", sequence: 1, text: "Ali memakai baju baharu." }, { id: "P2", sequence: 2, text: "Dia sangat gembira." }],
      readingDirection: "LEFT_TO_RIGHT",
      display: { fontSize: 32, lineHeight: 1.8, textAlignment: "LEFT", showParagraphNumbers: true, showSyllableBreaks: false, syllableSeparator: " · ", allowZoom: true },
      readingTools: { showPlayAudio: true, showReplay: true, showPause: true, showReadingTimer: true, allowTextZoom: true },
      completion: { requireOpenActivity: true, minimumViewingSeconds: 3 },
      allowRetry: true,
      hint: { type: "NONE", media: [] },
      media: {
        image: [{ key: "image.png", url: "/media/image.png", mimeType: "image/png", altText: "Baju", label: "Gambar" }],
        audio: [{ key: "audio.mp3", url: "/media/audio.mp3", mimeType: "audio/mpeg", altText: null, label: "Audio" }],
        instructionAudio: [{ key: "instruction.mp3", url: "/media/instruction.mp3", mimeType: "audio/mpeg", altText: null, label: "Arahan" }],
      },
    },
  },
  questionBankItem: { id: "reading-question-1", type: "READING", title: "Legacy tidak digunakan", content: "Legacy content", answerType: "TEXT", correctAnswer: null, metadata: null, instructions: "Baca teks ini dengan teliti.", explanation: null, difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1", answerOptions: [], mediaLinks: [] },
}

function question(item: ActivityQuestion | (ActivityQuestion & { legacyReading?: { incomplete?: boolean; reason?: string | null } | null }) = readingItem): ReadingQuestion {
  const mapped = mapReadingQuestion(item)
  if (!mapped.ok) throw new Error("Malformed Reading fixture")
  return mapped.question
}

describe("Reading player", () => {
  it("registers the renderer and maps the explicit reading contract without sync fields", () => {
    const mapped = mapReadingQuestion(readingItem)
    expect(getActivityRenderer("reading")).toBeTypeOf("function")
    expect(mapped.ok).toBe(true)
    if (!mapped.ok) return
    expect(mapped.question.progressMode).toBe("MANUAL_SEGMENTS")
    expect(mapped.limitations[0]).toContain("tidak membekalkan timedSegments")
  })

  it("supports all content modes and plain-text reading display", () => {
    const source = readingItem.configuration as { reading: Record<string, unknown> }
    const modes = ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE", "PARAGRAPH"] as const
    modes.forEach((mode) => expect(question({ ...readingItem, configuration: { reading: { ...source.reading, contentMode: mode, readingText: mode === "LETTER" ? "A" : mode === "SYLLABLE" ? "ba" : mode === "WORD" ? "baju" : mode === "PHRASE" ? "baju biru" : mode === "SENTENCE" ? "Ali membaca buku." : "Ali memakai baju baharu." } } }).contentMode).toBe(mode))
  })

  it("uses explicit syllable units only when provided and falls back safely otherwise", () => {
    const source = readingItem.configuration as { reading: Record<string, unknown> }
    const syllableQuestion = question({ ...readingItem, configuration: { reading: { ...source.reading, contentMode: "WORD", readingText: "sekolah", display: { ...(source.reading.display as Record<string, unknown>), showSyllableBreaks: true }, syllableUnits: [{ id: "s1", value: "se", sequence: 1 }, { id: "s2", value: "ko", sequence: 2 }, { id: "s3", value: "lah", sequence: 3 }] } } })
    const missing = mapReadingQuestion({ ...readingItem, configuration: { reading: { ...source.reading, contentMode: "WORD", readingText: "sekolah", display: { ...(source.reading.display as Record<string, unknown>), showSyllableBreaks: true }, syllableUnits: [] } } })
    expect(readingTextForDisplay(syllableQuestion)).toBe("se · ko · lah")
    expect(missing.ok).toBe(true)
    if (missing.ok) expect(missing.limitations.some((entry) => entry.includes("unit suku kata eksplisit"))).toBe(true)
  })

  it("runs local countdown, reading timer, pause, resume, manual paragraph navigation, and completion gating", () => {
    const q = question()
    const started = beginReadingCountdown(createReadingState(q))
    const countdown1 = countdownTick(started)
    const countdown2 = countdownTick({ ...countdown1, countdownValue: 1 })
    const reading1 = readingTick(countdown2, q)
    const paused = pauseReading(reading1)
    const resumed = resumeReading(paused)
    const next = nextReadingParagraph({ ...resumed, phase: "READING" }, q)
    const done = nextReadingParagraph({ ...next, elapsedSeconds: 3 }, q)
    expect(started.phase).toBe("COUNTDOWN")
    expect(countdown2.phase).toBe("READING")
    expect(reading1.elapsedSeconds).toBe(1)
    expect(paused.phase).toBe("PAUSED")
    expect(resumed.phase).toBe("READING")
    expect(previousReadingParagraph(done).currentParagraphIndex).toBe(0)
    expect(meetsReadingCompletion(done, q)).toBe(true)
  })

  it("supports zoom, reset, hint toggles, and readable panel rendering", () => {
    const q = question()
    const zoomed = updateReadingZoom(createReadingState(q), 160)
    const reset = resetReading(zoomed, q)
    const hinted = setReadingHints(reset, { highlightText: true, firstParagraph: false })
    const markup = renderToStaticMarkup(<ReadingPanel question={q} state={hinted} emphasizeCurrent emphasizeFirstParagraph={false} reducedMotion={false} />)
    expect(zoomed.zoomPercent).toBe(160)
    expect(reset.zoomPercent).toBe(160)
    expect(markup).toContain("Panel teks bacaan")
    expect(markup).toContain("1.")
  })

  it("finishes only after local viewing rules are met and never claims pronunciation or comprehension correctness", () => {
    const q = question()
    const settings = getReadingSettings({ allowRetry: true, showImmediateFeedback: true }, q)
    const state = { ...createReadingState(q), hasStarted: true, elapsedSeconds: 3, currentParagraphIndex: 1 }
    const incomplete = finishReading(createReadingState(q), q, settings)
    const complete = finishReading(state, q, settings)
    expect(incomplete.completed).toBe(false)
    expect(incomplete.validationMessage).toContain("Teruskan membaca")
    expect(complete.completed).toBe(true)
    expect(complete.feedback).toBe("Bagus! Aktiviti membaca telah selesai.")
    expect(complete.feedback).not.toMatch(/betul|sebutan|kefahaman|fluency/iu)
    expect(renderToStaticMarkup(<ReadingFeedback show complete message={complete.feedback} />)).toContain("aria-live")
  })

  it("renders explicit hint types, audio controls, and safe legacy failure", () => {
    const source = readingItem.configuration as { reading: Record<string, unknown> }
    const audioHint = question({ ...readingItem, configuration: { reading: { ...source.reading, hint: { type: "PLAY_AUDIO", media: [{ key: "hint.mp3", url: "/media/hint.mp3", mimeType: "audio/mpeg", altText: null, label: "Hint" }] } } } })
    const highlightHint = question({ ...readingItem, configuration: { reading: { ...source.reading, hint: { type: "HIGHLIGHT_TEXT", media: [] } } } })
    const firstParagraphHint = question({ ...readingItem, configuration: { reading: { ...source.reading, hint: { type: "SHOW_FIRST_PARAGRAPH", media: [] } } } })
    expect(renderToStaticMarkup(<ReadingHint question={audioHint} onHighlightText={() => undefined} onShowFirstParagraph={() => undefined} onAudioStart={() => undefined} />)).toContain("Lihat petunjuk")
    expect(renderToStaticMarkup(<ReadingHint question={highlightHint} onHighlightText={() => undefined} onShowFirstParagraph={() => undefined} onAudioStart={() => undefined} />)).toContain("Lihat petunjuk")
    expect(renderToStaticMarkup(<ReadingHint question={firstParagraphHint} onHighlightText={() => undefined} onShowFirstParagraph={() => undefined} onAudioStart={() => undefined} />)).toContain("Lihat petunjuk")
    expect(mapReadingQuestion({ ...readingItem, legacyReading: { incomplete: true, reason: "EXPLICIT_READING_CONTRACT_REQUIRED" } }).ok).toBe(false)
  })

  it("builds local-only summaries and makes no backend mutation calls", () => {
    const q = question()
    const settings = getReadingSettings({ allowRetry: true, showImmediateFeedback: true }, q)
    const complete = finishReading({ ...createReadingState(q), hasStarted: true, elapsedSeconds: 3, currentParagraphIndex: 1 }, q, settings)
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(buildReadingCompletionSummary({ [q.itemId]: complete }, [q])).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 0 })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
