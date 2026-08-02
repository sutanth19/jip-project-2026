import type { ActivityMedia, ActivityQuestion } from "../types"

export type PairingOption = {
  id: string
  text: string
  sequence: number
  media: ActivityMedia[]
  accessibleLabel: string
}

export type ExplicitPair = {
  id: string
  left: PairingOption
  right: PairingOption
  correctRightId: string
}

export type PairingQuestion = {
  itemId: string
  title: string | null
  prompt: string
  instructions: string | null
  explanation: string | null
  media: ActivityMedia[]
  pairs: ExplicitPair[]
}

export type PairingState = {
  assignments: Record<string, string>
  submitted: boolean
  isCorrect: boolean | null
  attemptCount: number
  completed: boolean
  feedback: string | null
  leftOrder: string[]
  rightOrder: string[]
  requiredCount: number
}

export type PairingSessionState = Record<string, PairingState>
export type PairingMapResult = { ok: true; question: PairingQuestion } | { ok: false; message: string }
export type PairingActivityItem = ActivityQuestion

export type PairingSettings = {
  attemptsAllowed: number | null
  allowRetry: boolean
  showImmediateFeedback: boolean
  showExplanation: boolean
}
