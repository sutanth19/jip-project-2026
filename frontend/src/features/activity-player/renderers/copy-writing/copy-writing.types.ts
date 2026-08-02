import type { ActivityMedia, ActivityQuestion } from "../../types"

export type CopyWritingContentMode = "LETTER" | "SYLLABLE" | "WORD" | "PHRASE" | "SENTENCE"
export type CopyWritingLineStyle = "NONE" | "BASELINE" | "TWO_LINE" | "THREE_LINE" | "FOUR_LINE"
export type CopyWritingHintType = "NONE" | "SHOW_REFERENCE" | "EMPHASIZE_FIRST_CHARACTER" | "PLAY_REFERENCE_AUDIO" | "SHOW_WRITING_LINES"
export type CopyWritingTool = "PEN" | "ERASER"

export type CopyWritingLayout = { lineStyle: CopyWritingLineStyle; lineCount: number; lineSpacing: number; showTopLine: boolean; showMidline: boolean; showBaseline: boolean; showDescenderLine: boolean }
export type CopyWritingReferenceDisplay = { position: "TOP" | "LEFT" | "ABOVE_EACH_LINE"; fontSize: number; showSyllableBreaks: boolean; syllableSeparator: string }
export type CopyWritingSyllableUnit = { id: string; value: string; sequence: number }
export type CopyWritingTools = { allowPen: boolean; allowEraser: boolean; allowUndo: boolean; allowRedo: boolean; allowClear: boolean; allowStrokeWidthChange: boolean; defaultStrokeWidth: number }
export type CopyWritingCompletion = { minimumStrokeCount: number; requireAllRepetitions: boolean; minimumWritingRegionsUsed: number | null }
export type CopyWritingStroke = { id: string; points: number[]; tool: "PEN"; strokeWidth: number; regionIndex: number; sessionOrder: number }

export type CopyWritingQuestion = {
  itemId: string
  sequence: number
  contentMode: CopyWritingContentMode
  referenceText: string
  repetitionCount: number
  canvasWidth: number
  canvasHeight: number
  writingLayout: CopyWritingLayout
  referenceDisplay: CopyWritingReferenceDisplay
  syllableUnits: CopyWritingSyllableUnit[]
  writingDirection: "LEFT_TO_RIGHT"
  tools: CopyWritingTools
  completion: CopyWritingCompletion
  allowRetry: boolean
  clearOnRetry: boolean
  hintType: CopyWritingHintType
  hintMedia: ActivityMedia[]
  media: { referenceImage: ActivityMedia[]; referenceAudio: ActivityMedia[]; instructionAudio: ActivityMedia[] }
  instructions: string | null
}

export type CopyWritingState = { strokes: CopyWritingStroke[]; redoStrokes: CopyWritingStroke[]; selectedTool: CopyWritingTool; strokeWidth: number; submitted: boolean; isComplete: boolean | null; validation: "EMPTY" | "REGIONS" | null; attemptCount: number; completed: boolean; feedback: string | null }
export type CopyWritingSessionState = Record<string, CopyWritingState>
export type CopyWritingSettings = { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean }
export type CopyWritingMapResult = { ok: true; question: CopyWritingQuestion } | { ok: false; message: string }
export type CopyWritingActivityItem = ActivityQuestion
