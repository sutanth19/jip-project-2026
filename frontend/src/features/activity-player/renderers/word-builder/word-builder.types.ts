import type { ActivityMedia, ActivityQuestion } from "../../types"

export type WordBuilderMode = "LETTER" | "SYLLABLE"
export type WordBuilderInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH"
export type WordBuilderHintType = "NONE" | "FIRST_UNIT" | "FIRST_TWO_UNITS" | "SHOW_IMAGE" | "PLAY_AUDIO"

export type WordBuilderUnit = {
  id: string
  value: string
  sequence: number | null
  isDistractor: boolean
}

export type WordBuilderPrompt =
  | { type: "TEXT"; text: string; media: null }
  | { type: "IMAGE" | "AUDIO"; text: null; media: ActivityMedia }
  | null

export type WordBuilderQuestion = {
  itemId: string
  sequence: number
  title: string | null
  instructions: string | null
  explanation: string | null
  builderMode: WordBuilderMode
  interactionMode: WordBuilderInteractionMode
  targetWord: string
  targetUnits: WordBuilderUnit[]
  bankUnits: WordBuilderUnit[]
  prompt: WordBuilderPrompt
  showReferenceText: boolean
  showTargetSlots: boolean
  shuffleUnits: boolean
  allowRetry: boolean
  clearOnRetry: boolean
  allowReuse: boolean
  maximumUnits: number
  hint: WordBuilderHintType
}

export type WordBuilderPlacement = {
  id: string
  unitId: string
}

export type WordBuilderState = {
  bankOrder: string[]
  placements: WordBuilderPlacement[]
  nextPlacementNumber: number
  submitted: boolean
  isCorrect: boolean | null
  validationError: boolean
  attemptCount: number
  completed: boolean
  feedback: string | null
}

export type WordBuilderSessionState = Record<string, WordBuilderState>

export type WordBuilderSettings = {
  attemptsAllowed: number | null
  allowRetry: boolean
  showImmediateFeedback: boolean
  showExplanation: boolean
}

export type WordBuilderMapResult =
  | { ok: true; question: WordBuilderQuestion }
  | { ok: false; message: string }

export type WordBuilderActivityItem = ActivityQuestion
