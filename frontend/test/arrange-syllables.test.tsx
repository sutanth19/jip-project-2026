import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import { ArrangeSyllablesBoard } from "@/features/activity-player/renderers/arrange-syllables/ArrangeSyllablesBoard"
import type { ArrangeSyllablesQuestion } from "@/features/activity-player/renderers/arrange-syllables/arrange-syllables.types"
import { buildArrangeSyllablesCompletionSummary, canRetryArrangeSyllables, createArrangeSyllablesState, formedSyllableWord, getArrangeSyllablesSettings, isArrangeSyllablesCorrect, mapArrangeSyllablesQuestion, placeArrangeSyllable, reorderArrangeSyllable, resetArrangeSyllables, returnArrangeSyllable, retryArrangeSyllables, submitArrangeSyllables } from "@/features/activity-player/renderers/arrange-syllables/arrange-syllables.utils"
import type { ActivityQuestion } from "@/features/activity-player/types"

const arrangeSyllablesItem: ActivityQuestion = {
  id: "syllable-item-1", sequence: 0, sectionKey: null, isRequired: true, marks: null,
  configuration: {
    arrangeSyllables: {
      interactionMode: "BOTH", targetWord: "BAJU",
      syllables: [{ id: "ba-1", value: "BA", sequence: 1 }, { id: "ju-1", value: "JU", sequence: 2 }],
      showReferenceText: false, showTargetSlots: true, shuffleSyllables: true, allowRetry: true, clearOnRetry: false, maximumSyllables: 10,
    },
  },
  questionBankItem: { id: "syllable-question-1", type: "WORD", title: "Susun suku kata", content: "Susun suku kata menjadi nama pakaian.", answerType: "TEXT", correctAnswer: null, metadata: null, instructions: "Pilih atau seret suku kata.", explanation: "Baju ialah pakaian.", difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1", answerOptions: [], mediaLinks: [] },
}

function question(item: ActivityQuestion = arrangeSyllablesItem): ArrangeSyllablesQuestion {
  const mapped = mapArrangeSyllablesQuestion(item)
  if (!mapped.ok) throw new Error("Malformed Arrange Syllables fixture")
  return mapped.question
}

function settings(item: ArrangeSyllablesQuestion = question(), overrides: Partial<{ attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean }> = {}) {
  return getArrangeSyllablesSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { showExplanation: true }, ...overrides }, item)
}

describe("Arrange Syllables player", () => {
  it("registers the renderer, consumes only its explicit contract, and leaves remaining placeholders registered", () => {
    expect(getActivityRenderer("arrange-syllables")).toBeTypeOf("function")
    expect(question().targetSyllables.map((syllable) => syllable.value)).toEqual(["BA", "JU"])
    expect(mapArrangeSyllablesQuestion({ ...arrangeSyllablesItem, configuration: { targetWord: "BAJU" } }).ok).toBe(false)
    expect(getActivityRenderer("word-builder")).toBeTypeOf("function")
  })

  it("sorts explicit sequence values and retains separate IDs for repeated syllables", () => {
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const reordered = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, syllables: [{ id: "ju-1", value: "JU", sequence: 2 }, { id: "ba-1", value: "BA", sequence: 1 }] } } })
    const repeated = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, targetWord: "KAKA", syllables: [{ id: "ka-1", value: "KA", sequence: 1 }, { id: "ka-2", value: "KA", sequence: 2 }] } } })
    expect(reordered.targetSyllables.map((syllable) => syllable.id)).toEqual(["ba-1", "ju-1"])
    expect(repeated.targetSyllables.map((syllable) => syllable.id)).toEqual(["ka-1", "ka-2"])
  })

  it("fails safely for missing or legacy contracts, duplicate identifiers, invalid modes, and reconstruction mismatch", () => {
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const malformed = (changes: Record<string, unknown>) => mapArrangeSyllablesQuestion({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, ...changes } } }).ok
    expect(mapArrangeSyllablesQuestion({ ...arrangeSyllablesItem, configuration: null }).ok).toBe(false)
    expect(malformed({ syllables: [{ id: "same", value: "BA", sequence: 1 }, { id: "same", value: "JU", sequence: 2 }] })).toBe(false)
    expect(malformed({ interactionMode: "UNSUPPORTED" })).toBe(false)
    expect(malformed({ syllables: [{ id: "ba", value: "BA", sequence: 1 }, { id: "ju", value: "KA", sequence: 2 }] })).toBe(false)
    expect(malformed({ maximumSyllables: 1 })).toBe(false)
  })

  it("supports click placement, return-to-bank, and drag-equivalent ordering by stable ID", () => {
    const mapped = question()
    const initial = createArrangeSyllablesState(mapped, "activity-1")
    const placed = placeArrangeSyllable(placeArrangeSyllable(initial, "ba-1"), "ju-1")
    const returned = returnArrangeSyllable(placed, "ba-1")
    const reverse = placeArrangeSyllable(placeArrangeSyllable(initial, "ju-1"), "ba-1")
    const reordered = reorderArrangeSyllable(reverse, "ba-1", 0)
    expect(placed.arrangedSyllableIds).toEqual(["ba-1", "ju-1"])
    expect(returned.arrangedSyllableIds).toEqual(["ju-1"])
    expect(reordered.arrangedSyllableIds).toEqual(["ba-1", "ju-1"])
  })

  it("keeps shuffle stable across rerenders and retries, while an unshuffled bank keeps supplied order", () => {
    const mapped = question()
    const first = createArrangeSyllablesState(mapped, "activity-stable")
    const second = createArrangeSyllablesState(mapped, "activity-stable")
    const wrong = { ...placeArrangeSyllable(first, "ju-1"), submitted: true, isCorrect: false, attemptCount: 1 }
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const noShuffle = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, shuffleSyllables: false } } })
    expect(first.bankOrder).toEqual(second.bankOrder)
    expect(retryArrangeSyllables(wrong, mapped).bankOrder).toEqual(first.bankOrder)
    expect(createArrangeSyllablesState(noShuffle, "activity-stable").bankOrder).toEqual(["ba-1", "ju-1"])
  })

  it("blocks incomplete checks without an attempt, validates correct order, and uses NFC comparison", () => {
    const mapped = question()
    const initial = createArrangeSyllablesState(mapped, "activity-1")
    const incomplete = submitArrangeSyllables(initial, mapped, settings(mapped))
    const correct = submitArrangeSyllables(placeArrangeSyllable(placeArrangeSyllable(initial, "ba-1"), "ju-1"), mapped, settings(mapped))
    const incorrect = submitArrangeSyllables(placeArrangeSyllable(placeArrangeSyllable(initial, "ju-1"), "ba-1"), mapped, settings(mapped))
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const unicodeQuestion = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, targetWord: "A\u0301", syllables: [{ id: "accent-1", value: "A\u0301", sequence: 1 }] } } })
    expect(incomplete).toMatchObject({ validationError: true, attemptCount: 0 })
    expect(correct).toMatchObject({ isCorrect: true, completed: true, feedback: "Hebat! Susunan suku kata betul." })
    expect(incorrect).toMatchObject({ isCorrect: false, completed: false, feedback: "Cuba susun semula." })
    expect(isArrangeSyllablesCorrect(unicodeQuestion, ["accent-1"])).toBe(true)
    expect(formedSyllableWord(mapped, correct.arrangedSyllableIds)).toBe("BAJU")
  })

  it("supports reset, both retry-clear modes, limits, disabled retries, and delayed feedback locally", () => {
    const mapped = question()
    const reverse = placeArrangeSyllable(placeArrangeSyllable(createArrangeSyllablesState(mapped, "activity-1"), "ju-1"), "ba-1")
    const wrong = submitArrangeSyllables(reverse, mapped, settings(mapped))
    const exhausted = submitArrangeSyllables(retryArrangeSyllables(wrong, mapped), mapped, { ...settings(mapped), attemptsAllowed: 2 })
    const clearQuestion = { ...mapped, clearOnRetry: true }
    const delayed = submitArrangeSyllables(reverse, mapped, settings(mapped, { showImmediateFeedback: false }))
    const noRetry = submitArrangeSyllables(reverse, mapped, settings(mapped, { allowRetry: false }))
    expect(resetArrangeSyllables(reverse)).toMatchObject({ arrangedSyllableIds: [], attemptCount: 0 })
    expect(retryArrangeSyllables(wrong, mapped).arrangedSyllableIds).toEqual(["ju-1", "ba-1"])
    expect(retryArrangeSyllables(wrong, clearQuestion).arrangedSyllableIds).toEqual([])
    expect(canRetryArrangeSyllables(wrong, settings(mapped))).toBe(true)
    expect(exhausted.completed).toBe(true)
    expect(delayed).toMatchObject({ completed: true, feedback: "Jawapan direkod untuk semakan sesi ini." })
    expect(noRetry.completed).toBe(true)
  })

  it("renders accessible slots, media, reference text, keyboard labels, live feedback, and reduced-motion classes without exposing hidden targets", () => {
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const mediaQuestion = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, showReferenceText: true } }, questionBankItem: { ...arrangeSyllablesItem.questionBankItem, mediaLinks: [{ id: "image", key: "prompt.png", mediaKey: "prompt.png", url: "/media/prompt.png", mimeType: "image/png", role: "PRIMARY_IMAGE", mediaRole: "PRIMARY_IMAGE", label: "Gambar", originalName: "prompt.png", altText: "Baju", sequence: 1 }, { id: "audio", key: "prompt.mp3", mediaKey: "prompt.mp3", url: "/media/prompt.mp3", mimeType: "audio/mpeg", role: "PRIMARY_AUDIO", mediaRole: "PRIMARY_AUDIO", label: "Audio", originalName: "prompt.mp3", altText: null, sequence: 2 }] } })
    const markup = renderToStaticMarkup(<ArrangeSyllablesBoard question={mediaQuestion} state={createArrangeSyllablesState(mediaQuestion, "activity-1")} settings={settings(mediaQuestion)} onPlace={() => undefined} onReturn={() => undefined} onReorder={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    expect(markup).toContain("Contoh perkataan: BAJU")
    expect(markup).toContain("/media/prompt.png")
    expect(markup).toContain("/media/prompt.mp3")
    expect(markup).toContain("aria-live")
    expect(markup).toContain("Kedudukan suku kata 1")
    expect(markup).toContain("motion-reduce:transition-none")
    const hiddenMarkup = renderToStaticMarkup(<ArrangeSyllablesBoard question={question()} state={createArrangeSyllablesState(question(), "activity-1")} settings={settings()} onPlace={() => undefined} onReturn={() => undefined} onReorder={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    expect(hiddenMarkup).not.toContain("BAJU")
  })

  it("builds local session summaries without backend mutation, score, or attempt persistence", () => {
    const mapped = question()
    const correct = submitArrangeSyllables(placeArrangeSyllable(placeArrangeSyllable(createArrangeSyllablesState(mapped, "activity-1"), "ba-1"), "ju-1"), mapped, settings(mapped))
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(buildArrangeSyllablesCompletionSummary({ [mapped.itemId]: correct }, [mapped])).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 1 })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
