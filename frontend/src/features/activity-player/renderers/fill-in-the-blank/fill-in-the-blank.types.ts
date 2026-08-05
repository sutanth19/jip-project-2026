import type { ActivityMedia, ActivityQuestion } from "../../types"

export type FillBlankMode = "TYPING" | "WORD_BANK" | "MIXED"
export type FillBlankInputMode = "TYPING" | "WORD_BANK"

export type FillBlankMedia = ActivityMedia

export type FillBlankBlank = {
  id: string
  marker: string
  required: boolean
  inputMode: FillBlankInputMode
  acceptableAnswers: string[]
  hint: { text: string | null; media: FillBlankMedia[] }
  placeholder: string | null
  caseSensitive: boolean
  trimWhitespace: boolean
  collapseWhitespace: boolean
  unicodeNormalization: "NFC"
}

export type FillBlankWordBankEntry = {
  id: string
  content: string
  singleUse: boolean
  media: FillBlankMedia[]
}

export type FillBlankSegment = { type: "text"; content: string } | { type: "blank"; blankId: string }

export type FillBlankQuestion = {
  itemId: string
  title: string | null
  instructions: string | null
  explanation: string | null
  mode: FillBlankMode
  prompt: string
  segments: FillBlankSegment[]
  blanks: FillBlankBlank[]
  wordBank: FillBlankWordBankEntry[]
  allowRepeatedWords: boolean
  clearIncorrectOnlyOnRetry: boolean
  media: ActivityMedia[]
}

export type FillBlankState = {
  answers: Record<string, string>
  wordBankAssignments: Record<string, string>
  activeBlankId: string | null
  submitted: boolean
  isCorrect: boolean | null
  blankCorrectness: Record<string, boolean | null>
  validationErrorIds: string[]
  attemptCount: number
  completed: boolean
  feedback: string | null
  wordBankOrder: string[]
}

export type FillBlankSessionState = Record<string, FillBlankState>

export type FillBlankSettings = {
  attemptsAllowed: number | null
  allowRetry: boolean
  showImmediateFeedback: boolean
  showExplanation: boolean
}

export type FillBlankActivityItem = ActivityQuestion
export type FillBlankMapResult = { ok: true; question: FillBlankQuestion } | { ok: false; message: string }
