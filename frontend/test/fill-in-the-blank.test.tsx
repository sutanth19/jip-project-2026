import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import type { ActivityQuestion } from "@/features/activity-player/types"
import { FillBlankQuestion } from "@/features/activity-player/renderers/fill-in-the-blank/FillBlankQuestion"
import { buildFillBlankCompletionSummary, canRetryFillBlank, createFillBlankState, getFillBlankSettings, isFillBlankAnswerCorrect, mapFillBlankQuestion, normalizeFillBlankAnswer, parseFillBlankPrompt, removeFillBlankAnswer, retryFillBlank, selectFillBlankWord, setFillBlankAnswer, submitFillBlank, validateFillBlankRequired } from "@/features/activity-player/renderers/fill-in-the-blank/fill-in-the-blank.utils"

const fillBlankItem: ActivityQuestion = {
  id: "fill-item-1", sequence: 0, sectionKey: null, isRequired: true, marks: null,
  configuration: {
    fillBlank: {
      mode: "MIXED", prompt: "Ali makan {{blank:1}} bersama {{blank:2}}.", allowRepeatedWords: false, clearIncorrectOnlyOnRetry: true,
      blanks: [
        { id: "food", marker: "{{blank:1}}", required: true, inputMode: "WORD_BANK", acceptableAnswers: ["nasi", "Nasi putih"], hint: { text: "Makanan ruji", media: [] }, placeholder: "Pilih makanan", caseSensitive: false, trimWhitespace: true, collapseWhitespace: true, unicodeNormalization: "NFC" },
        { id: "friend", marker: "{{blank:2}}", required: true, inputMode: "TYPING", acceptableAnswers: ["Siti"], hint: { text: null, media: [] }, placeholder: "Taip nama", caseSensitive: false, trimWhitespace: true, collapseWhitespace: true, unicodeNormalization: "NFC" },
      ],
      wordBank: [{ id: "word-nasi", content: "nasi", singleUse: true, media: [] }, { id: "word-roti", content: "roti", singleUse: true, media: [] }],
    },
  },
  questionBankItem: { id: "fill-question-1", type: "SENTENCE", title: "Lengkapkan ayat", content: "Legacy content", answerType: "TEXT", correctAnswer: null, metadata: null, instructions: "Isi semua blank.", explanation: "Ayat yang lengkap lebih mudah difahami.", difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1", answerOptions: [], mediaLinks: [] },
}

const settings = getFillBlankSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { showExplanation: true } })

function question(item: ActivityQuestion = fillBlankItem) {
  const mapped = mapFillBlankQuestion(item)
  if (!mapped.ok) throw new Error("Malformed Fill in the Blank fixture")
  return mapped.question
}

describe("Fill in the Blank player", () => {
  it("registers the renderer and maps the explicit preview configuration", () => {
    expect(getActivityRenderer("fill-blank")).toBeTypeOf("function")
    expect(question().mode).toBe("MIXED")
    expect(question().segments.filter((segment) => segment.type === "blank")).toHaveLength(2)
  })

  it("parses supported safe markers without evaluating template expressions", () => {
    const segments = parseFillBlankPrompt("A {{blank:1}} B [blank:2] C _____", [{ id: "one", marker: "{{blank:1}}" }, { id: "two", marker: "[blank:2]" }, { id: "three", marker: "_____" }])
    expect(segments?.filter((segment) => segment.type === "blank")).toHaveLength(3)
    expect(parseFillBlankPrompt("{{unknown}}", [{ id: "one", marker: "{{blank:1}}" }])).toBeNull()
  })

  it("supports typed answers, word-bank selection, single-use handling, and removal", () => {
    const mapped = question()
    const initial = createFillBlankState(mapped)
    const selected = selectFillBlankWord(initial, mapped, "food", "word-nasi")
    const typed = setFillBlankAnswer(selected, "friend", "Siti")
    const duplicate = selectFillBlankWord({ ...typed, activeBlankId: "food" }, mapped, "food", "word-nasi")
    const removed = removeFillBlankAnswer(typed, "food")
    expect(selected.answers.food).toBe("nasi")
    expect(selected.wordBankAssignments.food).toBe("word-nasi")
    expect(typed.answers.friend).toBe("Siti")
    expect(duplicate.answers.food).toBe("nasi")
    expect(removed.answers.food).toBeUndefined()
  })

  it("normalizes Malay answers deterministically and accepts configured alternatives", () => {
    const food = question().blanks[0]
    if (!food) throw new Error("Food blank missing")
    expect(normalizeFillBlankAnswer("  BAJU   MELAYU ", { ...food, collapseWhitespace: true })).toBe("baju melayu")
    expect(normalizeFillBlankAnswer("e\u0301", { ...food, caseSensitive: true })).toBe("é")
    expect(isFillBlankAnswerCorrect("  NASI ", food)).toBe(true)
    expect(isFillBlankAnswerCorrect("Nasi putih", food)).toBe(true)
  })

  it("validates required blanks without consuming an attempt and permits an empty optional blank", () => {
    const mapped = question()
    const initial = createFillBlankState(mapped)
    const empty = submitFillBlank(initial, mapped, settings)
    const optionalQuestion = { ...mapped, blanks: mapped.blanks.map((blank) => blank.id === "friend" ? { ...blank, required: false } : blank) }
    const optionalState = selectFillBlankWord(createFillBlankState(optionalQuestion), optionalQuestion, "food", "word-nasi")
    expect(empty.attemptCount).toBe(0)
    expect(empty.validationErrorIds).toEqual(["food", "friend"])
    expect(validateFillBlankRequired(optionalQuestion, optionalState.answers)).toEqual([])
  })

  it("checks correct/incorrect answers, supports delayed feedback, and clears only incorrect blanks on retry", () => {
    const mapped = question()
    const correctState = setFillBlankAnswer(selectFillBlankWord(createFillBlankState(mapped), mapped, "food", "word-nasi"), "friend", "Siti")
    const correct = submitFillBlank(correctState, mapped, settings)
    const incorrectState = setFillBlankAnswer(selectFillBlankWord(createFillBlankState(mapped), mapped, "food", "word-nasi"), "friend", "Ali")
    const incorrect = submitFillBlank(incorrectState, mapped, settings)
    const retried = retryFillBlank(incorrect, mapped)
    const delayedSettings = getFillBlankSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: false, configuration: {} })
    const delayed = submitFillBlank(incorrectState, mapped, delayedSettings)
    expect(correct).toMatchObject({ isCorrect: true, completed: true, attemptCount: 1 })
    expect(incorrect).toMatchObject({ isCorrect: false, completed: false, blankCorrectness: { food: true, friend: false } })
    expect(retried.answers).toEqual({ food: "nasi" })
    expect(delayed).toMatchObject({ isCorrect: false, completed: true })
  })

  it("enforces retry limits and allowRetry settings locally", () => {
    const mapped = question()
    const wrong = submitFillBlank(setFillBlankAnswer(selectFillBlankWord(createFillBlankState(mapped), mapped, "food", "word-nasi"), "friend", "Ali"), mapped, settings)
    const exhausted = submitFillBlank(setFillBlankAnswer(retryFillBlank(wrong, mapped), "friend", "Ali"), mapped, settings)
    const noRetrySettings = getFillBlankSettings({ attemptsAllowed: null, allowRetry: false, showImmediateFeedback: true, configuration: {} })
    const noRetry = submitFillBlank(setFillBlankAnswer(selectFillBlankWord(createFillBlankState(mapped), mapped, "food", "word-nasi"), "friend", "Ali"), mapped, noRetrySettings)
    expect(canRetryFillBlank(wrong, settings)).toBe(true)
    expect(exhausted).toMatchObject({ completed: true, attemptCount: 2 })
    expect(canRetryFillBlank(exhausted, settings)).toBe(false)
    expect(noRetry.completed).toBe(true)
  })

  it("keeps word-bank order stable, produces local summaries, and renders accessible feedback/hints", () => {
    const mapped = question()
    const state = createFillBlankState(mapped)
    const summary = buildFillBlankCompletionSummary({ [mapped.itemId]: state }, [mapped])
    const markup = renderToStaticMarkup(<FillBlankQuestion question={mapped} state={state} settings={settings} onTypedAnswer={() => undefined} onActivateBlank={() => undefined} onRemoveAnswer={() => undefined} onSelectWord={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    expect(state.wordBankOrder).toEqual(createFillBlankState(mapped).wordBankOrder)
    expect(summary).toEqual({ totalQuestions: 2, completedQuestions: 0, correctQuestions: 0, incorrectQuestions: 0, totalAttempts: 0 })
    expect(markup).toContain("Bank perkataan")
    expect(markup).toContain("Lihat Petunjuk")
    expect(markup).toContain("aria-live")
    expect(markup).toContain("motion-reduce:transition-none")
  })

  it("handles prompt media, malformed configurations, and local-only answer handling safely", () => {
    const mediaItem: ActivityQuestion = { ...fillBlankItem, questionBankItem: { ...fillBlankItem.questionBankItem, mediaLinks: [{ id: "media-1", key: "activity-image/prompt.png", mediaKey: "activity-image/prompt.png", url: "/media/prompt.png", mimeType: "image/png", role: "PRIMARY_IMAGE", mediaRole: "PRIMARY_IMAGE", label: "Prompt", originalName: "prompt.png", altText: "Gambar prompt", sequence: 0 }] } }
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(question(mediaItem).media[0]?.url).toBe("/media/prompt.png")
    expect(mapFillBlankQuestion({ ...fillBlankItem, configuration: { fillBlank: { mode: "TYPING" } } }).ok).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
