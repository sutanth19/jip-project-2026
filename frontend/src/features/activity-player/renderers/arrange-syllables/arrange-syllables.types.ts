import type { ActivityMedia, ActivityQuestion } from "../../types"

export type ArrangeSyllablesInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH"

export type ArrangeSyllableUnit = {
  id: string
  value: string
  sequence: number
}

export type ArrangeSyllablesQuestion = {
  itemId: string
  sequence: number
  title: string | null
  prompt: string
  instructions: string | null
  explanation: string | null
  targetWord: string
  targetSyllables: ArrangeSyllableUnit[]
  interactionMode: ArrangeSyllablesInteractionMode
  showReferenceText: boolean
  showTargetSlots: boolean
  shuffleSyllables: boolean
  allowRetry: boolean
  clearOnRetry: boolean
  maximumSyllables: number
  media: ActivityMedia[]
}

export type ArrangeSyllablesState = {
  bankOrder: string[]
  arrangedSyllableIds: string[]
  submitted: boolean
  isCorrect: boolean | null
  validationError: boolean
  attemptCount: number
  completed: boolean
  feedback: string | null
}

export type ArrangeSyllablesSessionState = Record<string, ArrangeSyllablesState>

export type ArrangeSyllablesSettings = {
  attemptsAllowed: number | null
  allowRetry: boolean
  showImmediateFeedback: boolean
  showExplanation: boolean
}

export type ArrangeSyllablesMapResult =
  | { ok: true; question: ArrangeSyllablesQuestion }
  | { ok: false; message: string }

export type ArrangeSyllablesActivityItem = ActivityQuestion
