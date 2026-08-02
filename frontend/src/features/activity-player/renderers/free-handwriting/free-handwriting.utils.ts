import type { ActivityCompletionSummary, ActivityMedia } from "../../types"
import { buildFreeHandwritingRegions } from "./free-handwriting-layout"
import type { FreeHandwritingActivityItem, FreeHandwritingCompletion, FreeHandwritingHintType, FreeHandwritingLayout, FreeHandwritingMapResult, FreeHandwritingQuestion, FreeHandwritingResponseMode, FreeHandwritingSessionState, FreeHandwritingSettings, FreeHandwritingState, FreeHandwritingStroke, FreeHandwritingTools } from "./free-handwriting.types"

const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|\b(?:javascript|vbscript|data)\s*:|\bscript\b|\bon[a-z]+\s*=)/iu

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isResponseMode(value: unknown): value is FreeHandwritingResponseMode {
  return value === "LETTER" || value === "SYLLABLE" || value === "WORD" || value === "PHRASE" || value === "SENTENCE" || value === "SHORT_RESPONSE"
}

function isHint(value: unknown): value is FreeHandwritingHintType {
  return value === "NONE" || value === "SHOW_PROMPT" || value === "PLAY_PROMPT_AUDIO" || value === "SHOW_PROMPT_IMAGE" || value === "SHOW_WRITING_LINES" || value === "EMPHASIZE_WRITING_AREA"
}

function mapMedia(value: unknown, role: string): ActivityMedia[] | null {
  if (!Array.isArray(value)) return null
  const output: ActivityMedia[] = []
  for (const entry of value) {
    const media = asRecord(entry)
    if (!media || typeof media.key !== "string" || !media.key || (typeof media.url !== "string" && media.url !== null) || (typeof media.mimeType !== "string" && media.mimeType !== null) || (typeof media.altText !== "string" && media.altText !== null) || (typeof media.label !== "string" && media.label !== null)) return null
    output.push({ id: `free-handwriting:${role}:${media.key}`, mediaKey: media.key, mediaRole: role, mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: output.length, isPrimary: output.length === 0, url: media.url })
  }
  return output
}

function mapLayout(value: unknown): FreeHandwritingLayout | null {
  const layout = asRecord(value)
  if (!layout || (layout.lineStyle !== "NONE" && layout.lineStyle !== "BASELINE" && layout.lineStyle !== "TWO_LINE" && layout.lineStyle !== "THREE_LINE" && layout.lineStyle !== "FOUR_LINE") || typeof layout.lineCount !== "number" || !Number.isInteger(layout.lineCount) || typeof layout.lineSpacing !== "number" || !Number.isInteger(layout.lineSpacing) || typeof layout.showTopLine !== "boolean" || typeof layout.showMidline !== "boolean" || typeof layout.showBaseline !== "boolean" || typeof layout.showDescenderLine !== "boolean") return null
  return { lineStyle: layout.lineStyle, lineCount: layout.lineCount, lineSpacing: layout.lineSpacing, showTopLine: layout.showTopLine, showMidline: layout.showMidline, showBaseline: layout.showBaseline, showDescenderLine: layout.showDescenderLine }
}

function mapTools(value: unknown): FreeHandwritingTools | null {
  const tools = asRecord(value)
  if (!tools || tools.allowPen !== true || typeof tools.allowEraser !== "boolean" || typeof tools.allowUndo !== "boolean" || typeof tools.allowRedo !== "boolean" || typeof tools.allowClear !== "boolean" || typeof tools.allowStrokeWidthChange !== "boolean" || typeof tools.defaultStrokeWidth !== "number" || !Number.isInteger(tools.defaultStrokeWidth) || tools.defaultStrokeWidth < 2 || tools.defaultStrokeWidth > 20 || (tools.allowRedo === true && tools.allowUndo !== true)) return null
  return { allowPen: true, allowEraser: tools.allowEraser, allowUndo: tools.allowUndo, allowRedo: tools.allowRedo, allowClear: tools.allowClear, allowStrokeWidthChange: tools.allowStrokeWidthChange, defaultStrokeWidth: tools.defaultStrokeWidth }
}

function mapCompletion(value: unknown): FreeHandwritingCompletion | null {
  const completion = asRecord(value)
  if (!completion || typeof completion.minimumStrokeCount !== "number" || !Number.isInteger(completion.minimumStrokeCount) || completion.minimumStrokeCount < 1 || typeof completion.minimumWritingRegionsUsed !== "number" || !Number.isInteger(completion.minimumWritingRegionsUsed) || completion.minimumWritingRegionsUsed < 1 || typeof completion.requireAllWritingRegions !== "boolean") return null
  return { minimumStrokeCount: completion.minimumStrokeCount, minimumWritingRegionsUsed: completion.minimumWritingRegionsUsed, requireAllWritingRegions: completion.requireAllWritingRegions }
}

function responseModeTitle(mode: FreeHandwritingResponseMode): string {
  return mode === "LETTER" ? "huruf" : mode === "SYLLABLE" ? "suku kata" : mode === "WORD" ? "perkataan" : mode === "PHRASE" ? "frasa" : mode === "SENTENCE" ? "ayat" : "jawapan ringkas"
}

function completeMessage(question: FreeHandwritingQuestion, showImmediateFeedback: boolean): string {
  if (!showImmediateFeedback) return "Tulisan direkod untuk semakan sesi ini."
  return question.teacherReviewRequired ? "Bagus! Ruang tulisan telah dilengkapkan. Tulisan ini memerlukan semakan guru kemudian." : "Bagus! Ruang tulisan telah dilengkapkan."
}

export function mapFreeHandwritingQuestion(item: FreeHandwritingActivityItem): FreeHandwritingMapResult {
  if (item.legacyFreeHandwriting?.incomplete) return { ok: false, message: "Kontrak Tulisan Bebas belum lengkap untuk item ini." }
  const root = asRecord(item.configuration)
  const definition = root ? asRecord(root.freeHandwriting) : null
  const prompt = definition ? asRecord(definition.prompt) : null
  const canvas = definition ? asRecord(definition.canvas) : null
  const layout = definition ? mapLayout(definition.writingLayout) : null
  const tools = definition ? mapTools(definition.tools) : null
  const completion = definition ? mapCompletion(definition.completion) : null
  const hint = definition ? asRecord(definition.hint) : null
  if (!definition || !isResponseMode(definition.responseMode) || !prompt || !canvas || !layout || !tools || !completion || !hint || !isHint(hint.type) || definition.writingDirection !== "LEFT_TO_RIGHT" || typeof definition.teacherReviewRequired !== "boolean" || typeof definition.allowRetry !== "boolean" || typeof definition.clearOnRetry !== "boolean") return { ok: false, message: "Kontrak Tulisan Bebas yang lengkap tidak tersedia untuk item ini." }
  if (typeof canvas.width !== "number" || !Number.isInteger(canvas.width) || typeof canvas.height !== "number" || !Number.isInteger(canvas.height) || canvas.width < 400 || canvas.height < 250) return { ok: false, message: "Saiz kanvas item ini tidak sah." }
  const lineCount = layout.lineStyle === "NONE" ? 0 : layout.lineCount
  if ((layout.lineStyle === "NONE" && layout.lineCount !== 0) || (layout.lineStyle !== "NONE" && (layout.lineCount < 1 || layout.lineCount > 12 || layout.lineCount * layout.lineSpacing > canvas.height))) return { ok: false, message: "Susun atur garisan item ini tidak sah." }
  const promptText = prompt.text === null || prompt.text === undefined ? null : typeof prompt.text === "string" && prompt.text && !UNSAFE_TEXT.test(prompt.text) ? prompt.text.normalize("NFC") : null
  if (typeof prompt.showText !== "boolean") return { ok: false, message: "Tetapan prompt item ini tidak sah." }
  const promptMedia = mapMedia(prompt.media, "PROMPT")
  const media = asRecord(definition.media)
  const instructionAudio = mapMedia(media?.instructionAudio, "INSTRUCTION_AUDIO")
  const supportingImage = mapMedia(media?.supportingImage, "SUPPORTING_IMAGE")
  const supportingVideo = mapMedia(media?.supportingVideo, "SUPPORTING_VIDEO")
  const hintMedia = mapMedia(hint.media, "HINT")
  if (!promptMedia || !instructionAudio || !supportingImage || !supportingVideo || !hintMedia) return { ok: false, message: "Media item ini tidak sah." }
  if (!promptText && promptMedia.length === 0) return { ok: false, message: "Prompt atau media sokongan diperlukan untuk item ini." }
  if (prompt.showText && !promptText) return { ok: false, message: "Teks prompt item ini tidak sah." }
  if ((hint.type === "PLAY_PROMPT_AUDIO" || hint.type === "SHOW_PROMPT_IMAGE") && hintMedia.length === 0) return { ok: false, message: "Media petunjuk item ini tidak tersedia." }

  const question: FreeHandwritingQuestion = {
    itemId: item.id,
    sequence: item.sequence,
    responseMode: definition.responseMode,
    promptText,
    showPromptText: prompt.showText,
    promptMedia,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    writingLayout: { ...layout, lineCount },
    writingDirection: "LEFT_TO_RIGHT",
    tools,
    completion,
    teacherReviewRequired: definition.teacherReviewRequired,
    allowRetry: definition.allowRetry,
    clearOnRetry: definition.clearOnRetry,
    hintType: hint.type,
    hintMedia,
    instructions: item.questionBankItem.instructions,
    instructionAudio,
    supportingMedia: [...supportingImage, ...supportingVideo],
  }

  const regions = buildFreeHandwritingRegions(question)
  if (completion.minimumWritingRegionsUsed > regions.length || (completion.requireAllWritingRegions && completion.minimumWritingRegionsUsed !== regions.length)) return { ok: false, message: "Peraturan ruang tulisan item ini tidak dapat dipenuhi." }
  return { ok: true, question }
}

export function createFreeHandwritingState(question: FreeHandwritingQuestion): FreeHandwritingState {
  return { strokes: [], redoStrokes: [], selectedTool: "PEN", strokeWidth: question.tools.defaultStrokeWidth, submitted: false, isComplete: null, validation: null, attemptCount: 0, completed: false, feedback: null }
}

export function addFreeHandwritingStroke(state: FreeHandwritingState, stroke: FreeHandwritingStroke): FreeHandwritingState {
  return state.submitted ? state : { ...state, strokes: [...state.strokes, stroke], redoStrokes: [], validation: null, feedback: null }
}

export function eraseFreeHandwritingStroke(state: FreeHandwritingState, strokeId: string): FreeHandwritingState {
  const stroke = state.strokes.find((entry) => entry.id === strokeId)
  return !stroke || state.submitted ? state : { ...state, strokes: state.strokes.filter((entry) => entry.id !== strokeId), redoStrokes: [...state.redoStrokes, stroke], validation: null, feedback: null }
}

export function undoFreeHandwriting(state: FreeHandwritingState): FreeHandwritingState {
  const stroke = state.strokes.at(-1)
  return !stroke || state.submitted ? state : { ...state, strokes: state.strokes.slice(0, -1), redoStrokes: [...state.redoStrokes, stroke], validation: null, feedback: null }
}

export function redoFreeHandwriting(state: FreeHandwritingState): FreeHandwritingState {
  const stroke = state.redoStrokes.at(-1)
  return !stroke || state.submitted ? state : { ...state, strokes: [...state.strokes, stroke], redoStrokes: state.redoStrokes.slice(0, -1), validation: null, feedback: null }
}

export function clearFreeHandwriting(state: FreeHandwritingState): FreeHandwritingState {
  return { ...state, strokes: [], redoStrokes: [], submitted: false, isComplete: null, validation: null, completed: false, feedback: null }
}

export function usedFreeHandwritingRegions(state: FreeHandwritingState): ReadonlySet<number> {
  return new Set(state.strokes.map((stroke) => stroke.regionIndex))
}

export function getFreeHandwritingSettings(activity: { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean }, question: FreeHandwritingQuestion): FreeHandwritingSettings {
  return { attemptsAllowed: activity.attemptsAllowed, allowRetry: activity.allowRetry && question.allowRetry, showImmediateFeedback: activity.showImmediateFeedback }
}

export function canRetryFreeHandwriting(state: FreeHandwritingState, settings: FreeHandwritingSettings): boolean {
  return state.submitted && state.isComplete === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function submitFreeHandwriting(state: FreeHandwritingState, question: FreeHandwritingQuestion, settings: FreeHandwritingSettings): FreeHandwritingState {
  if (state.submitted) return state
  if (state.strokes.length === 0) return { ...state, validation: "EMPTY", feedback: "Sila tulis dahulu." }
  const usedRegions = usedFreeHandwritingRegions(state)
  const requiredRegions = question.completion.requireAllWritingRegions ? buildFreeHandwritingRegions(question).length : question.completion.minimumWritingRegionsUsed
  if (state.strokes.length < question.completion.minimumStrokeCount || usedRegions.size < requiredRegions) {
    const attempts = state.attemptCount + 1
    return {
      ...state,
      submitted: true,
      isComplete: false,
      validation: "REGIONS",
      attemptCount: attempts,
      completed: !settings.showImmediateFeedback || !settings.allowRetry || (settings.attemptsAllowed !== null && attempts >= settings.attemptsAllowed),
      feedback: settings.showImmediateFeedback ? "Cuba lengkapkan ruang tulisan." : "Tulisan direkod untuk semakan sesi ini.",
    }
  }
  return {
    ...state,
    submitted: true,
    isComplete: true,
    validation: null,
    attemptCount: state.attemptCount + 1,
    completed: true,
    feedback: completeMessage(question, settings.showImmediateFeedback),
  }
}

export function retryFreeHandwriting(state: FreeHandwritingState, question: FreeHandwritingQuestion): FreeHandwritingState {
  return question.clearOnRetry ? { ...clearFreeHandwriting(state), attemptCount: state.attemptCount } : { ...state, submitted: false, isComplete: null, validation: null, completed: false, feedback: null }
}

export function updateFreeHandwritingSession(session: FreeHandwritingSessionState, itemId: string, state: FreeHandwritingState): FreeHandwritingSessionState {
  return { ...session, [itemId]: state }
}

export function buildFreeHandwritingCompletionSummary(session: FreeHandwritingSessionState, questions: readonly FreeHandwritingQuestion[]): ActivityCompletionSummary {
  const states = questions.map((question) => session[question.itemId]).filter((state): state is FreeHandwritingState => Boolean(state))
  return {
    totalQuestions: questions.length,
    completedQuestions: states.filter((state) => state.completed).length,
    correctQuestions: states.filter((state) => state.isComplete === true).length,
    incorrectQuestions: states.filter((state) => state.isComplete === false).length,
    totalAttempts: states.reduce((total, state) => total + state.attemptCount, 0),
  }
}

export function freeHandwritingResponseLabel(mode: FreeHandwritingResponseMode): string {
  return `Respons ${responseModeTitle(mode)}`
}
