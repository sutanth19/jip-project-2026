import type { ActivityMedia, ActivityQuestion } from "../../types"

export type ArrangeSyllablesInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH" | "DRAG_TO_BLANK"

export type ArrangeSyllableUnit = {
  id: string
  value: string
  sequence: number
}

export type ArrangeSyllablesLegacyQuestion = {
  mode: "ORDERED_RECONSTRUCTION"
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

export type ArrangeSyllableMissingUnit = ArrangeSyllableUnit & {
  isMissing: boolean
}

export type ArrangeSyllableMissingWord = {
  id: string
  sequence: number
  syllables: ArrangeSyllableMissingUnit[]
}

export type ArrangeSyllablesMissingQuestion = {
  mode: "MISSING_SYLLABLES"
  itemId: string
  sequence: number
  title: string | null
  prompt: string
  instructions: string | null
  explanation: string | null
  words: ArrangeSyllableMissingWord[]
  distractors: ArrangeSyllableUnit[]
  hint: string | null
  showReferenceText: boolean
  allowRetry: boolean
  clearOnRetry: boolean
  maximumSyllables: number
  media: ActivityMedia[]
}

export type ArrangeSyllablesQuestion = ArrangeSyllablesLegacyQuestion | ArrangeSyllablesMissingQuestion

export type ArrangeSyllablesState = {
  bankOrder: string[]
  arrangedSyllableIds: string[]
  submitted: boolean
  isCorrect: boolean | null
  validationError: boolean
  attemptCount: number
  markAwarded: boolean | null
  completed: boolean
  feedback: string | null
}

export type MissingSyllableBlank = {
  id: string
  wordId: string
  syllableId: string
  value: string
  wordSequence: number
  syllableSequence: number
}

export type MissingSyllablesState = {
  bankOrder: string[]
  assignments: Record<string, string>
  submitted: boolean
  isCorrect: boolean | null
  validationError: boolean
  attemptCount: number
  markAwarded: boolean | null
  completed: boolean
  feedback: string | null
}

export type ArrangeSyllablesSessionState = Record<string, ArrangeSyllablesState | MissingSyllablesState>

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
