import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import { ArrangeLettersBoard } from "@/features/activity-player/renderers/arrange-letters/ArrangeLettersBoard"
import type { ArrangeLettersQuestion } from "@/features/activity-player/renderers/arrange-letters/arrange-letters.types"
import { arrangedAnswer, buildArrangeLettersCompletionSummary, canRetryArrangeLetters, createArrangeLettersState, getArrangeLettersSettings, isArrangeLettersCorrect, mapArrangeLettersQuestion, normalizeArrangeLettersAnswer, placeArrangeLetter, reorderArrangeLetter, resetArrangeLetters, returnArrangeLetter, retryArrangeLetters, submitArrangeLetters } from "@/features/activity-player/renderers/arrange-letters/arrange-letters.utils"
import type { ActivityQuestion } from "@/features/activity-player/types"

const arrangeLettersItem: ActivityQuestion = {
  id: "arrange-item-1", sequence: 0, sectionKey: null, isRequired: true, marks: null,
  configuration: {
    arrangeLetters: {
      interactionMode: "BOTH", targetWord: "baju",
      letterUnits: [{ id: "b-1", value: "b", sequence: 1 }, { id: "a-1", value: "a", sequence: 2 }, { id: "j-1", value: "j", sequence: 3 }, { id: "u-1", value: "u", sequence: 4 }],
      showReferenceText: false, showTargetSlots: true, shuffleLetters: true, preserveCase: false, allowRetry: true, clearOnRetry: false, maximumLetters: 20,
    },
  },
  questionBankItem: { id: "arrange-question-1", type: "WORD", title: "Susun huruf", content: "Susun huruf untuk membentuk nama pakaian.", answerType: "TEXT", correctAnswer: null, metadata: null, instructions: "Pilih atau seret huruf.", explanation: "Baju ialah pakaian.", difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1", answerOptions: [], mediaLinks: [] },
}

function question(item: ActivityQuestion = arrangeLettersItem): ArrangeLettersQuestion {
  const mapped = mapArrangeLettersQuestion(item)
  if (!mapped.ok) throw new Error("Malformed Arrange Letters fixture")
  return mapped.question
}

function settings(item: ArrangeLettersQuestion = question(), overrides: Partial<{ attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean }> = {}) {
  return getArrangeLettersSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { showExplanation: true }, ...overrides }, item)
}

describe("Arrange Letters player", () => {
  it("registers the renderer and maps only the explicit arrangeLetters preview contract", () => {
    expect(getActivityRenderer("arrange-letters")).toBeTypeOf("function")
    expect(question().configuration.letterUnits.map((unit) => unit.id)).toEqual(["b-1", "a-1", "j-1", "u-1"])
    expect(mapArrangeLettersQuestion({ ...arrangeLettersItem, configuration: { targetWord: "baju" } }).ok).toBe(false)
  })

  it("uses NFC grapheme units and preserves repeated-letter identities", () => {
    const unicode = question({ ...arrangeLettersItem, configuration: { arrangeLetters: { ...((arrangeLettersItem.configuration as { arrangeLetters: Record<string, unknown> }).arrangeLetters), targetWord: "A\u0301", letterUnits: [{ id: "accent-1", value: "A\u0301", sequence: 1 }] } } })
    const repeated = question({ ...arrangeLettersItem, configuration: { arrangeLetters: { ...((arrangeLettersItem.configuration as { arrangeLetters: Record<string, unknown> }).arrangeLetters), targetWord: "mama", letterUnits: [{ id: "m-1", value: "m", sequence: 1 }, { id: "a-1", value: "a", sequence: 2 }, { id: "m-2", value: "m", sequence: 3 }, { id: "a-2", value: "a", sequence: 4 }] } } })
    expect(unicode.configuration.targetWord).toBe("Á")
    expect(unicode.configuration.letterUnits[0]?.value).toBe("Á")
    expect(repeated.configuration.letterUnits.map((unit) => unit.id)).toEqual(["m-1", "a-1", "m-2", "a-2"])
  })

  it("fails safely for missing targets, duplicate unit IDs, mismatched units, unsupported modes, and overly long words", () => {
    const source = arrangeLettersItem.configuration as { arrangeLetters: Record<string, unknown> }
    const malformed = (changes: Record<string, unknown>) => mapArrangeLettersQuestion({ ...arrangeLettersItem, configuration: { arrangeLetters: { ...source.arrangeLetters, ...changes } } }).ok
    expect(malformed({ targetWord: "" })).toBe(false)
    expect(malformed({ letterUnits: [{ id: "same", value: "b", sequence: 1 }, { id: "same", value: "a", sequence: 2 }, { id: "j", value: "j", sequence: 3 }, { id: "u", value: "u", sequence: 4 }] })).toBe(false)
    expect(malformed({ letterUnits: [{ id: "b", value: "b", sequence: 1 }] })).toBe(false)
    expect(malformed({ interactionMode: "INVALID" })).toBe(false)
    expect(malformed({ targetWord: "a".repeat(21), letterUnits: Array.from({ length: 21 }, (_, index) => ({ id: `a-${index}`, value: "a", sequence: index + 1 })) })).toBe(false)
  })

  it("supports click placement, return-to-bank, and drag-equivalent reordering with stable unit IDs", () => {
    const mapped = question()
    const initial = createArrangeLettersState(mapped, "activity-1")
    const placed = placeArrangeLetter(placeArrangeLetter(initial, "b-1"), "a-1")
    const returned = returnArrangeLetter(placed, "b-1")
    const completed = ["j-1", "b-1", "u-1", "a-1"].reduce((state, letterId) => placeArrangeLetter(state, letterId), initial)
    const reordered = reorderArrangeLetter(completed, "b-1", 0)
    expect(placed.arrangedLetterIds).toEqual(["b-1", "a-1"])
    expect(returned.arrangedLetterIds).toEqual(["a-1"])
    expect(reordered.arrangedLetterIds).toEqual(["b-1", "j-1", "u-1", "a-1"])
  })

  it("keeps a seeded letter bank stable across rerenders, retry, navigation state, and reset", () => {
    const mapped = question()
    const first = createArrangeLettersState(mapped, "activity-stable")
    const second = createArrangeLettersState(mapped, "activity-stable")
    const placed = placeArrangeLetter(first, first.bankOrder[0] ?? "")
    const retried = retryArrangeLetters({ ...placed, submitted: true, isCorrect: false, attemptCount: 1 }, mapped)
    const reset = resetArrangeLetters(placed)
    expect(first.bankOrder).toEqual(second.bankOrder)
    expect(retried.bankOrder).toEqual(first.bankOrder)
    expect(retried.arrangedLetterIds).toEqual(placed.arrangedLetterIds)
    expect(reset.arrangedLetterIds).toEqual([])
    expect(reset.bankOrder).toEqual(first.bankOrder)
  })

  it("checks complete answers deterministically with case and Unicode settings, without consuming validation-only attempts", () => {
    const mapped = question()
    const initial = createArrangeLettersState(mapped, "activity-1")
    const incomplete = submitArrangeLetters(initial, mapped, settings(mapped))
    const correct = submitArrangeLetters(["b-1", "a-1", "j-1", "u-1"].reduce((state, letterId) => placeArrangeLetter(state, letterId), initial), mapped, settings(mapped))
    const incorrect = submitArrangeLetters(["a-1", "b-1", "j-1", "u-1"].reduce((state, letterId) => placeArrangeLetter(state, letterId), initial), mapped, settings(mapped))
    const caseSensitive = { ...mapped, configuration: { ...mapped.configuration, targetWord: "BAJU", preserveCase: true } }
    expect(incomplete).toMatchObject({ validationError: true, attemptCount: 0 })
    expect(correct).toMatchObject({ isCorrect: true, completed: true, attemptCount: 1 })
    expect(incorrect).toMatchObject({ isCorrect: false, completed: false })
    expect(isArrangeLettersCorrect(caseSensitive, ["b-1", "a-1", "j-1", "u-1"])).toBe(false)
    expect(normalizeArrangeLettersAnswer("A\u0301", false)).toBe("á")
  })

  it("respects delayed feedback, retry limits, per-item retry settings, and clear-on-retry", () => {
    const mapped = question()
    const initial = ["a-1", "b-1", "j-1", "u-1"].reduce((state, letterId) => placeArrangeLetter(state, letterId), createArrangeLettersState(mapped, "activity-1"))
    const wrong = submitArrangeLetters(initial, mapped, settings(mapped))
    const exhausted = submitArrangeLetters(retryArrangeLetters(wrong, mapped), mapped, { ...settings(mapped), attemptsAllowed: 2 })
    const delayed = submitArrangeLetters(initial, mapped, settings(mapped, { showImmediateFeedback: false }))
    const clearQuestion = { ...mapped, configuration: { ...mapped.configuration, clearOnRetry: true } }
    const noRetry = submitArrangeLetters(initial, mapped, settings(mapped, { allowRetry: false }))
    expect(canRetryArrangeLetters(wrong, settings(mapped))).toBe(true)
    expect(exhausted.completed).toBe(true)
    expect(delayed).toMatchObject({ completed: true, feedback: "Jawapan direkod untuk semakan sesi ini." })
    expect(retryArrangeLetters(wrong, clearQuestion).arrangedLetterIds).toEqual([])
    expect(noRetry.completed).toBe(true)
  })

  it("renders reference text, image/audio prompts, keyboard-labelled letter controls, live feedback, and reduced-motion classes", () => {
    const mediaQuestion = question({ ...arrangeLettersItem, configuration: { arrangeLetters: { ...((arrangeLettersItem.configuration as { arrangeLetters: Record<string, unknown> }).arrangeLetters), showReferenceText: true } }, questionBankItem: { ...arrangeLettersItem.questionBankItem, mediaLinks: [{ id: "image", key: "prompt.png", mediaKey: "prompt.png", url: "/media/prompt.png", mimeType: "image/png", role: "PRIMARY_IMAGE", mediaRole: "PRIMARY_IMAGE", label: "Gambar", originalName: "prompt.png", altText: "Baju", sequence: 1 }, { id: "audio", key: "prompt.mp3", mediaKey: "prompt.mp3", url: "/media/prompt.mp3", mimeType: "audio/mpeg", role: "PRIMARY_AUDIO", mediaRole: "PRIMARY_AUDIO", label: "Audio", originalName: "prompt.mp3", altText: null, sequence: 2 }] } })
    const state = createArrangeLettersState(mediaQuestion, "activity-1")
    const markup = renderToStaticMarkup(<ArrangeLettersBoard question={mediaQuestion} state={state} settings={settings(mediaQuestion)} onPlace={() => undefined} onReturn={() => undefined} onReorder={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    expect(markup).toContain("Contoh perkataan: baju")
    expect(markup).toContain("/media/prompt.png")
    expect(markup).toContain("/media/prompt.mp3")
    expect(markup).toContain("aria-live")
    expect(markup).toContain("Kedudukan jawapan 1")
    expect(markup).toContain("motion-reduce:transition-none")
  })

  it("builds a local-only completion summary and never calls backend mutation APIs", () => {
    const mapped = question()
    const initial = createArrangeLettersState(mapped, "activity-1")
    const correct = submitArrangeLetters(["b-1", "a-1", "j-1", "u-1"].reduce((state, letterId) => placeArrangeLetter(state, letterId), initial), mapped, settings(mapped))
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(arrangedAnswer(mapped, correct.arrangedLetterIds)).toBe("baju")
    expect(buildArrangeLettersCompletionSummary({ [mapped.itemId]: correct }, [mapped])).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 1 })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
