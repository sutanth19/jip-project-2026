import type { ActivityMedia, ActivityQuestion } from "../../types"

export type ReadingComprehensionQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_TEXT"

export type ReadingComprehensionPassage = {
  title: string
  content: string
  media: ActivityMedia[]
}

export type ReadingComprehensionOption = {
  id: string
  label: string
  content: string
  isCorrect: boolean
}

export type ReadingComprehensionQuestion = {
  id: string
  type: ReadingComprehensionQuestionType
  question: string
  required: boolean
  marks: number
  options: ReadingComprehensionOption[]
  acceptableAnswers: string[]
  explanation: string | null
}

export type ReadingComprehensionConfiguration = {
  passage: ReadingComprehensionPassage
  questions: ReadingComprehensionQuestion[]
  showPassageFirst: boolean
  allowPassageDuringQuestions: boolean
  randomizeQuestions: boolean
  showQuestionNumbers: boolean
  showImmediateFeedback: boolean
  allowRetry: boolean
}

export type ReadingComprehensionQuestionState = {
  selectedOptionId: string | null
  textAnswer: string
  submitted: boolean
  isCorrect: boolean | null
  completed: boolean
  attemptCount: number
  feedback: string | null
  validationMessage: string | null
}

export type ReadingComprehensionSessionState = {
  stage: "PASSAGE" | "QUESTIONS" | "COMPLETE"
  passageStarted: boolean
  activeQuestionIndex: number
  questionOrder?: string[]
  questions?: Record<string, ReadingComprehensionQuestionState>
}

export type ReadingComprehensionSettings = {
  allowRetry: boolean
  showImmediateFeedback: boolean
}

export type ReadingComprehensionMapResult = { ok: true; question: ReadingComprehensionConfiguration; limitations: string[] } | { ok: false; message: string }
export type ReadingComprehensionActivityItem = ActivityQuestion & { legacyReadingComprehension?: { incomplete?: boolean; reason?: string | null } | null }
