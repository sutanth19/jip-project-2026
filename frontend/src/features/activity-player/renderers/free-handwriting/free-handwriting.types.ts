import type { ActivityMedia, ActivityQuestion } from "../../types"

export type FreeHandwritingResponseMode = "LETTER" | "SYLLABLE" | "WORD" | "PHRASE" | "SENTENCE" | "SHORT_RESPONSE"
export type FreeHandwritingLineStyle = "NONE" | "BASELINE" | "TWO_LINE" | "THREE_LINE" | "FOUR_LINE"
export type FreeHandwritingHintType = "NONE" | "SHOW_PROMPT" | "PLAY_PROMPT_AUDIO" | "SHOW_PROMPT_IMAGE" | "SHOW_WRITING_LINES" | "EMPHASIZE_WRITING_AREA"
export type FreeHandwritingTool = "PEN" | "ERASER"

export type FreeHandwritingLayout = { lineStyle: FreeHandwritingLineStyle; lineCount: number; lineSpacing: number; showTopLine: boolean; showMidline: boolean; showBaseline: boolean; showDescenderLine: boolean }
export type FreeHandwritingTools = { allowPen: boolean; allowEraser: boolean; allowUndo: boolean; allowRedo: boolean; allowClear: boolean; allowStrokeWidthChange: boolean; defaultStrokeWidth: number }
export type FreeHandwritingCompletion = { minimumStrokeCount: number; minimumWritingRegionsUsed: number; requireAllWritingRegions: boolean }
export type FreeHandwritingStroke = { id: string; points: number[]; tool: "PEN"; strokeWidth: number; regionIndex: number; sessionOrder: number }
export type FreeHandwritingRegion = { index: number; top: number; bottom: number }

export type FreeHandwritingQuestion = {
  itemId: string
  sequence: number
  responseMode: FreeHandwritingResponseMode
  promptText: string | null
  showPromptText: boolean
  promptMedia: ActivityMedia[]
  canvasWidth: number
  canvasHeight: number
  writingLayout: FreeHandwritingLayout
  writingDirection: "LEFT_TO_RIGHT"
  tools: FreeHandwritingTools
  completion: FreeHandwritingCompletion
  teacherReviewRequired: boolean
  allowRetry: boolean
  clearOnRetry: boolean
  hintType: FreeHandwritingHintType
  hintMedia: ActivityMedia[]
  instructions: string | null
  instructionAudio: ActivityMedia[]
  supportingMedia: ActivityMedia[]
}

export type FreeHandwritingState = {
  strokes: FreeHandwritingStroke[]
  redoStrokes: FreeHandwritingStroke[]
  selectedTool: FreeHandwritingTool
  strokeWidth: number
  submitted: boolean
  isComplete: boolean | null
  validation: "EMPTY" | "REGIONS" | null
  attemptCount: number
  completed: boolean
  feedback: string | null
}

export type FreeHandwritingSessionState = Record<string, FreeHandwritingState>
export type FreeHandwritingSettings = { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean }
export type FreeHandwritingMapResult = { ok: true; question: FreeHandwritingQuestion } | { ok: false; message: string }
export type FreeHandwritingActivityItem = ActivityQuestion & { legacyFreeHandwriting?: { incomplete?: boolean; reason?: string | null } | null }
