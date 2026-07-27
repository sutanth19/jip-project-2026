import type { ActivityMedia, ActivityQuestion } from "../../types"

export type MultipleChoiceMode = "SINGLE_CHOICE" | "MULTIPLE_CHOICE"

export type MultipleChoiceOptionView = {
  id: string
  label: string | null
  content: string
  sequence: number
  feedback: string | null
  media: ActivityMedia[]
}

export type MultipleChoiceQuestionModel = {
  itemId: string
  question: string
  title: string | null
  instructions: string | null
  explanation: string | null
  mode: MultipleChoiceMode
  options: MultipleChoiceOptionView[]
  media: ActivityMedia[]
  correctOptionIds: ReadonlySet<string>
}

// Admin/Teacher preview-only model. A future Student Attempt DTO must omit answer keys.

export type MultipleChoiceQuestionState = {
  selectedOptionIds: string[]
  submitted: boolean
  isCorrect: boolean | null
  attemptCount: number
  completed: boolean
  optionOrder: string[]
  feedback: string | null
}

export type MultipleChoiceSessionState = Record<string, MultipleChoiceQuestionState>

export type MultipleChoiceSettings = {
  attemptsAllowed: number | null
  allowRetry: boolean
  showImmediateFeedback: boolean
  showExplanation: boolean
  revealCorrectAnswer: boolean
  randomizeOptions: boolean
}

export type MultipleChoiceMapResult =
  | { ok: true; question: MultipleChoiceQuestionModel }
  | { ok: false; message: string }

export type MultipleChoiceActivityItem = ActivityQuestion
