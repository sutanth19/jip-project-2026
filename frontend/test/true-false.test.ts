import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RadioGroup } from "@/components/ui/radio-group"
import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import type { ActivityQuestion } from "@/features/activity-player/types"
import { TrueFalseOption } from "@/features/activity-player/renderers/true-false/TrueFalseOption"
import { getTrueFalseSettings, mapTrueFalseQuestion } from "@/features/activity-player/renderers/true-false/true-false.utils"
import { buildCompletionSummary, canRetryQuestion, createQuestionState, retryQuestion, selectOption, submitQuestion } from "@/features/activity-player/renderers/multiple-choice/multiple-choice.utils"

const trueFalseItem: ActivityQuestion = {
  id: "true-false-item-1",
  sequence: 0,
  sectionKey: null,
  isRequired: true,
  marks: null,
  configuration: null,
  questionBankItem: {
    id: "true-false-question-1",
    type: "QUESTION",
    title: "Pilih jawapan",
    content: "Matahari terbit di timur.",
    instructions: "Baca pernyataan ini, kemudian pilih jawapan anda.",
    explanation: "Bumi berputar dari barat ke timur, jadi matahari kelihatan terbit di timur.",
    answerType: "BOOLEAN",
    correctAnswer: { value: true },
    difficulty: "EASY",
    status: "ACTIVE",
    programmeId: "programme-1",
    answerOptions: [
      { id: "answer-false", label: null, content: "false", sequence: 0, isCorrect: false, feedback: null, media: [] },
      { id: "answer-true", label: null, content: "true", sequence: 1, isCorrect: true, feedback: null, media: [] },
    ],
    mediaLinks: [],
  },
}

const settings = getTrueFalseSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { showExplanation: true } })

function mappedQuestion(item: ActivityQuestion = trueFalseItem) {
  const result = mapTrueFalseQuestion(item)
  if (!result.ok) throw new Error("Test fixture is malformed.")
  return result.question
}

describe("True / False renderer", () => {
  it("registers the true-false renderer", () => {
    expect(getActivityRenderer("true-false")).toBeTypeOf("function")
  })

  it("maps standardized false and true options to the child-friendly labels", () => {
    const question = mappedQuestion()
    expect(question.options.map((option) => [option.value, option.displayLabel])).toEqual([[true, "BETUL"], [false, "SALAH"]])
    expect(question.correctOptionIds.has("answer-true")).toBe(true)
    expect("isCorrect" in question.options[0]).toBe(false)
  })

  it("rejects a non-boolean question and malformed boolean options safely", () => {
    expect(mapTrueFalseQuestion({ ...trueFalseItem, questionBankItem: { ...trueFalseItem.questionBankItem, answerType: "SINGLE_CHOICE" } }).ok).toBe(false)
    expect(mapTrueFalseQuestion({ ...trueFalseItem, questionBankItem: { ...trueFalseItem.questionBankItem, answerOptions: [{ id: "answer-true", label: null, content: "true", sequence: 0, isCorrect: true, feedback: null, media: [] }] } }).ok).toBe(false)
  })

  it("lets a student switch from false to true before submitting", () => {
    const question = mappedQuestion()
    const initial = createQuestionState(question, settings, "seed")
    const falseOption = question.options.find((option) => option.value === false)
    const trueOption = question.options.find((option) => option.value === true)
    if (!falseOption || !trueOption) throw new Error("True/False options are missing.")
    const switched = selectOption(selectOption(initial, falseOption.id, "SINGLE_CHOICE"), trueOption.id, "SINGLE_CHOICE")
    expect(switched.selectedOptionIds).toEqual([trueOption.id])
  })

  it("checks correct and incorrect answers, permits retries, and locks after retries are exhausted", () => {
    const question = mappedQuestion()
    const trueOption = question.options.find((option) => option.value === true)
    const falseOption = question.options.find((option) => option.value === false)
    if (!trueOption || !falseOption) throw new Error("True/False options are missing.")
    const correct = submitQuestion(selectOption(createQuestionState(question, settings, "seed"), trueOption.id, "SINGLE_CHOICE"), question, settings)
    const incorrect = submitQuestion(selectOption(createQuestionState(question, settings, "seed"), falseOption.id, "SINGLE_CHOICE"), question, settings)
    const exhausted = submitQuestion(selectOption(retryQuestion(incorrect), falseOption.id, "SINGLE_CHOICE"), question, settings)
    expect(correct).toMatchObject({ isCorrect: true, completed: true, attemptCount: 1 })
    expect(incorrect).toMatchObject({ isCorrect: false, completed: false, attemptCount: 1 })
    expect(canRetryQuestion(incorrect, settings)).toBe(true)
    expect(canRetryQuestion(exhausted, settings)).toBe(false)
    expect(exhausted).toMatchObject({ completed: true, attemptCount: 2 })
  })

  it("clears a retry, delays item feedback when configured, and builds a local completion summary", () => {
    const question = mappedQuestion()
    const falseOption = question.options.find((option) => option.value === false)
    if (!falseOption) throw new Error("False option is missing.")
    const incorrect = submitQuestion(selectOption(createQuestionState(question, settings, "seed"), falseOption.id, "SINGLE_CHOICE"), question, settings)
    const retried = retryQuestion(incorrect)
    const delayedSettings = getTrueFalseSettings({ attemptsAllowed: null, allowRetry: true, showImmediateFeedback: false, configuration: { showExplanation: true } })
    const delayed = submitQuestion(selectOption(createQuestionState(question, delayedSettings, "seed"), falseOption.id, "SINGLE_CHOICE"), question, delayedSettings)
    const summary = buildCompletionSummary([{ id: question.itemId }], { [question.itemId]: delayed })
    expect(retried).toMatchObject({ selectedOptionIds: [], submitted: false, attemptCount: 1 })
    expect(delayed).toMatchObject({ completed: true, isCorrect: false })
    expect(delayed.feedback).toContain("direkod")
    expect(summary).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 0, incorrectQuestions: 1, totalAttempts: 1 })
    expect(question.explanation).toContain("Bumi berputar")
  })

  it("renders accessible radio controls with visible focus and reduced-motion-safe transitions", () => {
    const option = mappedQuestion().options[0]
    if (!option) throw new Error("True option is missing.")
    const markup = renderToStaticMarkup(createElement(RadioGroup, { value: option.id, "aria-label": "Pilih Betul atau Salah" }, createElement(TrueFalseOption, { option, selected: true, disabled: false, status: "neutral" })))
    expect(markup).toContain("role=\"radiogroup\"")
    expect(markup).toContain("role=\"radio\"")
    expect(markup).toContain("aria-label=\"BETUL. Pernyataan ini betul.\"")
    expect(markup).toContain("motion-reduce:transition-none")
    expect(markup).toContain("focus-visible")
  })
})
