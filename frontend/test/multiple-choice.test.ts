import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { RadioGroup } from "@/components/ui/radio-group"
import type { ActivityQuestion } from "@/features/activity-player/types"
import { stableShuffle } from "@/features/activity-player/activity-player.utils"
import { MultipleChoiceOption } from "@/features/activity-player/renderers/multiple-choice/MultipleChoiceOption"
import { buildCompletionSummary, canRetryQuestion, createQuestionState, getMultipleChoiceSettings, isExactMultipleChoiceMatch, mapMultipleChoiceQuestion, retryQuestion, selectOption, submitQuestion } from "@/features/activity-player/renderers/multiple-choice/multiple-choice.utils"

const singleChoiceItem: ActivityQuestion = {
  id: "activity-item-1",
  sequence: 0,
  sectionKey: null,
  isRequired: true,
  marks: null,
  configuration: null,
  questionBankItem: {
    id: "question-1",
    type: "QUESTION",
    title: "Pilih jawapan",
    content: "Apakah warna langit?",
    instructions: "Pilih satu jawapan.",
    explanation: "Langit biasanya kelihatan biru pada waktu siang.",
    answerType: "SINGLE_CHOICE",
    correctAnswer: { sequences: [1] },
    difficulty: "EASY",
    status: "ACTIVE",
    programmeId: "programme-1",
    answerOptions: [
      { id: "option-blue", label: "A", content: "Biru", sequence: 1, isCorrect: true, feedback: null, media: [] },
      { id: "option-red", label: "B", content: "Merah", sequence: 2, isCorrect: false, feedback: null, media: [] },
    ],
    mediaLinks: [],
  },
}

const multipleChoiceItem: ActivityQuestion = {
  ...singleChoiceItem,
  id: "activity-item-2",
  questionBankItem: {
    ...singleChoiceItem.questionBankItem,
    id: "question-2",
    answerType: "MULTIPLE_CHOICE",
    answerOptions: [
      { id: "option-1", label: "A", content: "Biru", sequence: 1, isCorrect: true, feedback: null, media: [] },
      { id: "option-2", label: "B", content: "Hijau", sequence: 2, isCorrect: true, feedback: null, media: [] },
      { id: "option-3", label: "C", content: "Merah", sequence: 3, isCorrect: false, feedback: null, media: [] },
    ],
  },
}

const defaultSettings = getMultipleChoiceSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { showExplanation: true } })

function mapped(item: ActivityQuestion) {
  const result = mapMultipleChoiceQuestion(item)
  if (!result.ok) throw new Error("Test fixture is malformed.")
  return result.question
}

describe("Multiple Choice mapping and selection", () => {
  it("maps text, image, and audio option data without exposing correctness to view options", () => {
    const item: ActivityQuestion = { ...singleChoiceItem, questionBankItem: { ...singleChoiceItem.questionBankItem, answerOptions: [{ id: "option-media", label: null, content: "", sequence: 1, isCorrect: true, feedback: null, media: [{ id: "media-1", key: "safe/image.png", mediaKey: "safe/image.png", url: "/media/image.png", mimeType: "image/png", role: "PRIMARY_IMAGE", mediaRole: "PRIMARY_IMAGE", label: "Gambar", originalName: "gambar.png", altText: "Gambar biru", sequence: 0 }, { id: "media-2", key: "safe/audio.mp3", mediaKey: "safe/audio.mp3", url: "/media/audio.mp3", mimeType: "audio/mpeg", role: "REFERENCE_AUDIO", mediaRole: "REFERENCE_AUDIO", label: "Audio", originalName: "audio.mp3", altText: "Audio pilihan", sequence: 1 }] }] } }
    const question = mapped(item)
    expect(question.options[0]?.media[0]?.url).toBe("/media/image.png")
    expect(question.options[0]?.media[1]?.mimeType).toBe("audio/mpeg")
    expect("isCorrect" in (question.options[0] ?? {})).toBe(false)
  })

  it("selects exactly one option for single choice and toggles multiple choice options", () => {
    const single = mapped(singleChoiceItem)
    const multiple = mapped(multipleChoiceItem)
    const singleState = selectOption(selectOption(createQuestionState(single, defaultSettings, "seed"), "option-blue", single.mode), "option-red", single.mode)
    const multipleState = selectOption(selectOption(createQuestionState(multiple, defaultSettings, "seed"), "option-1", multiple.mode), "option-2", multiple.mode)
    expect(singleState.selectedOptionIds).toEqual(["option-red"])
    expect(multipleState.selectedOptionIds).toEqual(["option-1", "option-2"])
  })

  it("keeps randomized option order stable and validates malformed questions safely", () => {
    expect(stableShuffle(["a", "b", "c", "d"], "same-seed")).toEqual(stableShuffle(["a", "b", "c", "d"], "same-seed"))
    expect(mapMultipleChoiceQuestion({ ...singleChoiceItem, questionBankItem: { ...singleChoiceItem.questionBankItem, answerOptions: [] } }).ok).toBe(false)
  })

  it("uses accessible radio semantics, keyboard-focus styling, and reduced-motion-safe transitions", () => {
    const option = mapped(singleChoiceItem).options[0]
    if (!option) throw new Error("Test fixture is missing an option.")
    const markup = renderToStaticMarkup(createElement(RadioGroup, { value: option.id, "aria-label": "Pilih satu jawapan" }, createElement(MultipleChoiceOption, { option, mode: "SINGLE_CHOICE", selected: true, disabled: false, status: "neutral", onSelect: () => undefined })))
    expect(markup).toContain("role=\"radiogroup\"")
    expect(markup).toContain("aria-label=\"A. Biru\"")
    expect(markup).toContain("motion-reduce:transition-none")
  })
})

describe("Multiple Choice checking and retry flow", () => {
  it("accepts a correct single answer and rejects an incorrect answer", () => {
    const question = mapped(singleChoiceItem)
    const correct = submitQuestion(selectOption(createQuestionState(question, defaultSettings, "seed"), "option-blue", question.mode), question, defaultSettings)
    const incorrect = submitQuestion(selectOption(createQuestionState(question, defaultSettings, "seed"), "option-red", question.mode), question, defaultSettings)
    expect(correct.isCorrect).toBe(true)
    expect(correct.completed).toBe(true)
    expect(incorrect.isCorrect).toBe(false)
    expect(canRetryQuestion(incorrect, defaultSettings)).toBe(true)
  })

  it("requires an exact multiple-choice match and rejects extra incorrect selections", () => {
    const question = mapped(multipleChoiceItem)
    expect(isExactMultipleChoiceMatch(["option-1", "option-2"], question.correctOptionIds)).toBe(true)
    expect(isExactMultipleChoiceMatch(["option-1", "option-2", "option-3"], question.correctOptionIds)).toBe(false)
  })

  it("does not submit without a selection, clears selection on retry, and enforces retry limits", () => {
    const question = mapped(singleChoiceItem)
    const empty = createQuestionState(question, defaultSettings, "seed")
    const noSubmission = submitQuestion(empty, question, defaultSettings)
    const submitted = submitQuestion(selectOption(empty, "option-red", question.mode), question, defaultSettings)
    const retried = retryQuestion(submitted)
    const exhausted = { ...submitted, attemptCount: 2 }
    expect(noSubmission.attemptCount).toBe(0)
    expect(retried.selectedOptionIds).toEqual([])
    expect(retried.attemptCount).toBe(1)
    expect(canRetryQuestion(exhausted, defaultSettings)).toBe(false)
  })

  it("respects immediate feedback, delayed feedback, explanation settings, and local summaries", () => {
    const question = mapped(singleChoiceItem)
    const delayedSettings = getMultipleChoiceSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: false, configuration: {} })
    const delayed = submitQuestion(selectOption(createQuestionState(question, delayedSettings, "seed"), "option-red", question.mode), question, delayedSettings)
    const immediate = submitQuestion(selectOption(createQuestionState(question, defaultSettings, "seed"), "option-blue", question.mode), question, defaultSettings)
    const summary = buildCompletionSummary([{ id: question.itemId }], { [question.itemId]: immediate })
    expect(delayed.completed).toBe(true)
    expect(delayed.feedback).toContain("direkod")
    expect(defaultSettings.showExplanation).toBe(true)
    expect(summary).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 1 })
  })

  it("keeps local answer handling free from attempt, score, and persistence API calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const question = mapped(singleChoiceItem)
    const state = submitQuestion(selectOption(createQuestionState(question, defaultSettings, "seed"), "option-blue", question.mode), question, defaultSettings)
    expect(state.isCorrect).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
