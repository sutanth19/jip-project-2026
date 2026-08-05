import type { ActivityMedia, ActivityQuestion } from "../../types"

export type ArrangeLettersInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH"

export type ArrangeLettersUnit = {
  id: string
  value: string
  sequence: number
}

export type ArrangeLettersConfiguration = {
  interactionMode: ArrangeLettersInteractionMode
  targetWord: string
  letterUnits: ArrangeLettersUnit[]
  showReferenceText: boolean
  showTargetSlots: boolean
  shuffleLetters: boolean
  preserveCase: boolean
  allowRetry: boolean
  clearOnRetry: boolean
  maximumLetters: number
}

export type ArrangeLettersQuestion = {
  itemId: string
  title: string | null
  prompt: string
  instructions: string | null
  explanation: string | null
  media: ActivityMedia[]
  configuration: ArrangeLettersConfiguration
}

export type ArrangeLettersState = {
  bankOrder: string[]
  arrangedLetterIds: string[]
  submitted: boolean
  isCorrect: boolean | null
  validationError: boolean
  attemptCount: number
  completed: boolean
  feedback: string | null
}

export type ArrangeLettersSessionState = Record<string, ArrangeLettersState>

export type ArrangeLettersSettings = {
  attemptsAllowed: number | null
  allowRetry: boolean
  showImmediateFeedback: boolean
  showExplanation: boolean
}

export type ArrangeLettersMapResult =
  | { ok: true; question: ArrangeLettersQuestion }
  | { ok: false; message: string }

export type ArrangeLettersActivityItem = ActivityQuestion
