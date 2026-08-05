import type { ActivityMedia, ActivityQuestion } from "../../types"

export type ReadingContentMode = "LETTER" | "SYLLABLE" | "WORD" | "PHRASE" | "SENTENCE" | "PARAGRAPH"
export type ReadingTextAlignment = "LEFT" | "CENTER" | "JUSTIFY"
export type ReadingHintType = "NONE" | "PLAY_AUDIO" | "HIGHLIGHT_TEXT" | "SHOW_FIRST_PARAGRAPH"

export type ReadingParagraph = { id: string; sequence: number; text: string }
export type ReadingSyllableUnit = { id: string; value: string; sequence: number }
export type ReadingDisplay = { fontSize: number; lineHeight: number; textAlignment: ReadingTextAlignment; showParagraphNumbers: boolean; showSyllableBreaks: boolean; syllableSeparator: string; allowZoom: boolean }
export type ReadingTools = { showPlayAudio: boolean; showReplay: boolean; showPause: boolean; showReadingTimer: boolean; allowTextZoom: boolean }
export type ReadingCompletion = { requireOpenActivity: boolean; minimumViewingSeconds: number }

export type ReadingQuestion = {
  itemId: string
  sequence: number
  contentMode: ReadingContentMode
  title: string | null
  readingText: string
  paragraphs: ReadingParagraph[]
  readingDirection: "LEFT_TO_RIGHT"
  display: ReadingDisplay
  syllableUnits: ReadingSyllableUnit[]
  tools: ReadingTools
  completion: ReadingCompletion
  allowRetry: boolean
  hintType: ReadingHintType
  hintMedia: ActivityMedia[]
  media: { image: ActivityMedia[]; audio: ActivityMedia[]; instructionAudio: ActivityMedia[] }
  instructions: string | null
  progressMode: "PLAIN_READING" | "MANUAL_SEGMENTS"
}

export type ReadingState = {
  phase: "IDLE" | "COUNTDOWN" | "READING" | "PAUSED" | "COMPLETED"
  countdownValue: number | null
  elapsedSeconds: number
  currentParagraphIndex: number
  zoomPercent: number
  submitted: boolean
  completed: boolean
  feedback: string | null
  validationMessage: string | null
  hasStarted: boolean
  audioUses: number
  hints: { highlightText: boolean; firstParagraph: boolean }
}

export type ReadingSessionState = Record<string, ReadingState> & { questionOrder?: string[]; passageStarted?: boolean; activeQuestionIndex?: number; stage?: "PASSAGE" | "QUESTIONS" | "COMPLETE" }
export type ReadingSettings = { allowRetry: boolean; showImmediateFeedback: boolean }
export type ReadingMapResult = { ok: true; question: ReadingQuestion; limitations: string[] } | { ok: false; message: string }
export type ReadingActivityItem = ActivityQuestion & { legacyReading?: { incomplete?: boolean; reason?: string | null } | null }
