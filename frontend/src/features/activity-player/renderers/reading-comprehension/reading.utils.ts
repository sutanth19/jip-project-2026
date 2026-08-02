import type { ActivityCompletionSummary } from "../../types"
import { normalizeAnswer, shuffleQuestions } from "./reading.parser"
import type { ReadingComprehensionConfiguration, ReadingComprehensionQuestion, ReadingComprehensionQuestionState, ReadingComprehensionSessionState, ReadingComprehensionSettings } from "./reading.types"

function questionFeedback(correct: boolean, immediate: boolean): string {
  if (!immediate) return "Jawapan direkod untuk semakan sesi ini."
  return correct ? "Betul." : "Cuba lagi."
}

export function createQuestionState(): ReadingComprehensionQuestionState {
  return { selectedOptionId: null, textAnswer: "", submitted: false, isCorrect: null, completed: false, attemptCount: 0, feedback: null, validationMessage: null }
}

export function createSessionState(questionIds: readonly string[], randomize: boolean, seed: string): ReadingComprehensionSessionState {
  return { stage: "PASSAGE", passageStarted: false, activeQuestionIndex: 0, ...(randomize ? { questionOrder: shuffleQuestions(questionIds, seed) } : {}) }
}

export function getQuestionOrder(questionIds: readonly string[], randomize: boolean, seed: string, session: ReadingComprehensionSessionState): string[] {
  const order = session.questionOrder ?? (randomize ? shuffleQuestions(questionIds, seed) : [...questionIds])
  return order.length === questionIds.length ? order : [...questionIds]
}

export function createStateMap(questions: readonly ReadingComprehensionQuestion[]): Record<string, ReadingComprehensionQuestionState> {
  return Object.fromEntries(questions.map((question) => [question.id, createQuestionState()])) as Record<string, ReadingComprehensionQuestionState>
}

export function selectOption(state: ReadingComprehensionQuestionState, optionId: string): ReadingComprehensionQuestionState {
  if (state.submitted) return state
  return { ...state, selectedOptionId: optionId, textAnswer: "", validationMessage: null }
}

export function setTextAnswer(state: ReadingComprehensionQuestionState, answer: string): ReadingComprehensionQuestionState {
  if (state.submitted) return state
  return { ...state, textAnswer: answer, selectedOptionId: null, validationMessage: null }
}

export function evaluateQuestion(question: ReadingComprehensionQuestion, state: ReadingComprehensionQuestionState, showImmediateFeedback: boolean): ReadingComprehensionQuestionState {
  if (state.submitted) return state
  if (question.type === "SHORT_TEXT") {
    if (!state.textAnswer.trim()) return { ...state, validationMessage: "Sila isi jawapan." }
    const normalizedAnswer = normalizeAnswer(state.textAnswer, false)
    const matches = question.acceptableAnswers.some((answer) => normalizeAnswer(answer, false) === normalizedAnswer)
    return { ...state, submitted: true, isCorrect: matches, attemptCount: state.attemptCount + 1, completed: matches || !showImmediateFeedback, feedback: questionFeedback(matches, showImmediateFeedback) }
  }
  if (!state.selectedOptionId) return { ...state, validationMessage: "Sila pilih jawapan." }
  const matches = question.options.find((option) => option.id === state.selectedOptionId)?.isCorrect === true
  return { ...state, submitted: true, isCorrect: matches, attemptCount: state.attemptCount + 1, completed: matches || !showImmediateFeedback, feedback: questionFeedback(matches, showImmediateFeedback) }
}

export function retryQuestion(state: ReadingComprehensionQuestionState): ReadingComprehensionQuestionState {
  return { ...state, selectedOptionId: null, textAnswer: "", submitted: false, isCorrect: null, completed: false, feedback: null, validationMessage: null }
}

export function buildCompletionSummary(questions: readonly ReadingComprehensionQuestion[], session: Record<string, ReadingComprehensionQuestionState>): ActivityCompletionSummary {
  const results = questions.map((question) => session[question.id]).filter((item): item is ReadingComprehensionQuestionState => Boolean(item))
  return { totalQuestions: questions.length, completedQuestions: results.filter((item) => item.completed).length, correctQuestions: results.filter((item) => item.isCorrect === true).length, incorrectQuestions: results.filter((item) => item.isCorrect === false).length, totalAttempts: results.reduce((total, item) => total + item.attemptCount, 0) }
}

export function getReadingComprehensionSettings(activity: { allowRetry: boolean; showImmediateFeedback: boolean }, configuration: ReadingComprehensionConfiguration): ReadingComprehensionSettings {
  return { allowRetry: activity.allowRetry && configuration.allowRetry, showImmediateFeedback: activity.showImmediateFeedback && configuration.showImmediateFeedback }
}

export function canRetryQuestion(state: ReadingComprehensionQuestionState, settings: ReadingComprehensionSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry
}
