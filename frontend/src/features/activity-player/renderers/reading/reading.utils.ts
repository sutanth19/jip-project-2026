import type { ActivityCompletionSummary } from "../../types"
import type { ActivityMedia, QuestionBankMedia } from "../../types"
import type { ReadingActivityItem, ReadingCompletion, ReadingContentMode, ReadingDisplay, ReadingHintType, ReadingMapResult, ReadingParagraph, ReadingQuestion, ReadingSessionState, ReadingSettings, ReadingState, ReadingTextAlignment, ReadingTools, ReadingSyllableUnit } from "./reading.types"

const UNSAFE = /(?:<\s*\/?\s*[a-z][^>]*>|\b(?:javascript|vbscript|data)\s*:|\bscript\b|\bon[a-z]+\s*=)/iu

const ZOOM_MIN = 75
const ZOOM_MAX = 175
const DEFAULT_COUNTDOWN_SECONDS = 5

export function createReadingState(): ReadingState {
  return { phase: "IDLE", countdownValue: null, elapsedSeconds: 0, currentParagraphIndex: 0, zoomPercent: 100, submitted: false, completed: false, feedback: null, validationMessage: null, hasStarted: false, audioUses: 0, hints: { highlightText: false, firstParagraph: false } }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function safeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim().normalize("NFC")
  if (!text || text.length > max || UNSAFE.test(text) || text.includes("{{") || text.includes("}}")) return null
  return text
}

function isMedia(media: unknown): media is QuestionBankMedia {
  if (!media || typeof media !== "object" || Array.isArray(media)) return false
  const value = media as Record<string, unknown>
  return typeof value.id === "string" && typeof value.key === "string" && typeof value.mediaKey === "string" && typeof value.url === "string" && typeof value.mediaRole === "string" && typeof value.sequence === "number"
}

function toPlayerMedia(media: QuestionBankMedia): ActivityMedia {
  return { id: media.id, mediaKey: media.mediaKey, mediaRole: media.mediaRole, mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: media.sequence, isPrimary: media.sequence === 0, url: media.url }
}

function parseHintType(value: unknown): ReadingHintType | null {
  return value === "NONE" || value === "PLAY_AUDIO" || value === "HIGHLIGHT_TEXT" || value === "SHOW_FIRST_PARAGRAPH" ? value : null
}

function parseContentMode(value: unknown): ReadingContentMode | null {
  return value === "LETTER" || value === "SYLLABLE" || value === "WORD" || value === "PHRASE" || value === "SENTENCE" || value === "PARAGRAPH" ? value : null
}

function parseAlignment(value: unknown): ReadingTextAlignment {
  return value === "CENTER" ? "CENTER" : value === "JUSTIFY" ? "JUSTIFY" : "LEFT"
}

function parseMediaBlock(value: unknown): { image: ActivityMedia[]; audio: ActivityMedia[]; instructionAudio: ActivityMedia[] } | null {
  const media = asRecord(value)
  if (!media) return null
  const image = Array.isArray(media.image) ? media.image.filter(isMedia).map(toPlayerMedia) : []
  const audio = Array.isArray(media.audio) ? media.audio.filter(isMedia).map(toPlayerMedia) : []
  const instructionAudio = Array.isArray(media.instructionAudio) ? media.instructionAudio.filter(isMedia).map(toPlayerMedia) : []
  return { image, audio, instructionAudio }
}

function parseParagraphs(value: unknown): ReadingParagraph[] | null {
  if (!Array.isArray(value)) return null
  const paragraphs = value.map((entry) => {
    const paragraph = asRecord(entry)
    const id = paragraph && typeof paragraph.id === "string" ? paragraph.id.trim() : ""
    const sequence = paragraph && typeof paragraph.sequence === "number" ? paragraph.sequence : Number.NaN
    const text = paragraph ? safeText(paragraph.text, 3_000) : null
    return id && Number.isInteger(sequence) && sequence >= 0 && text ? { id, sequence, text } : null
  })
  if (paragraphs.some((paragraph) => paragraph === null)) return null
  const result = paragraphs.filter((paragraph): paragraph is ReadingParagraph => paragraph !== null)
  if (new Set(result.map((paragraph) => paragraph.id)).size !== result.length) return null
  return result.sort((a, b) => a.sequence - b.sequence)
}

function parseSyllables(value: unknown): ReadingSyllableUnit[] | null {
  if (!Array.isArray(value)) return null
  const syllables = value.map((entry) => {
    const syllable = asRecord(entry)
    const id = syllable && typeof syllable.id === "string" ? syllable.id.trim() : ""
    const sequence = syllable && typeof syllable.sequence === "number" ? syllable.sequence : Number.NaN
    const text = syllable && typeof syllable.value === "string" ? syllable.value.trim().normalize("NFC") : ""
    return id && Number.isInteger(sequence) && sequence >= 0 && text ? { id, sequence, value: text } : null
  })
  if (syllables.some((syllable) => syllable === null)) return null
  const result = syllables.filter((syllable): syllable is ReadingSyllableUnit => syllable !== null)
  if (new Set(result.map((syllable) => syllable.id)).size !== result.length) return null
  return result.sort((a, b) => a.sequence - b.sequence)
}

export function mapReadingQuestion(item: ReadingActivityItem): ReadingMapResult {
  if (item.legacyReading?.incomplete) return { ok: false, message: "Kontrak bacaan belum lengkap untuk item ini." }
  const root = asRecord(item.configuration)
  const definition = root ? asRecord(root.reading) : null
  if (!definition) return { ok: false, message: "Kontrak bacaan yang lengkap tidak tersedia untuk item ini." }
  const contentMode = parseContentMode(definition.contentMode)
  const title = definition.title === undefined || definition.title === null ? null : safeText(definition.title, 300)
  const readingText = safeText(definition.readingText, 5_000)
  const paragraphs = parseParagraphs(definition.paragraphs)
  const syllableUnits = parseSyllables(definition.syllableUnits)
  const display = asRecord(definition.display)
  const tools = asRecord(definition.readingTools)
  const completion = asRecord(definition.completion)
  const hint = asRecord(definition.hint)
  const media = parseMediaBlock(definition.media)
  if (!contentMode || !readingText || !paragraphs || !display || !tools || !completion || !hint || !media) return { ok: false, message: "Kontrak bacaan item ini tidak sah." }
  const displayConfig: ReadingDisplay = {
    fontSize: typeof display.fontSize === "number" ? display.fontSize : 32,
    lineHeight: typeof display.lineHeight === "number" ? display.lineHeight : 1.8,
    textAlignment: parseAlignment(display.textAlignment),
    showParagraphNumbers: Boolean(display.showParagraphNumbers),
    showSyllableBreaks: Boolean(display.showSyllableBreaks),
    syllableSeparator: typeof display.syllableSeparator === "string" ? display.syllableSeparator : " · ",
    allowZoom: Boolean(display.allowZoom),
  }
  const toolConfig: ReadingTools = {
    showPlayAudio: Boolean(tools.showPlayAudio),
    showReplay: Boolean(tools.showReplay),
    showPause: Boolean(tools.showPause),
    showReadingTimer: Boolean(tools.showReadingTimer),
    allowTextZoom: Boolean(tools.allowTextZoom),
  }
  const completionConfig: ReadingCompletion = {
    requireOpenActivity: Boolean(completion.requireOpenActivity),
    minimumViewingSeconds: typeof completion.minimumViewingSeconds === "number" && completion.minimumViewingSeconds >= 0 ? completion.minimumViewingSeconds : 0,
  }
  const hintType = parseHintType(hint.type)
  const hintMedia = Array.isArray(hint.media) ? hint.media.filter(isMedia).map(toPlayerMedia) : []
  if (!hintType) return { ok: false, message: "Tetapan petunjuk bacaan item ini tidak sah." }
  const readingDirection = definition.readingDirection === "LEFT_TO_RIGHT" ? "LEFT_TO_RIGHT" : null
  if (!readingDirection) return { ok: false, message: "Arah bacaan item ini tidak sah." }
  const allowRetry = typeof definition.allowRetry === "boolean" ? definition.allowRetry : false
  const progressMode = contentMode === "PARAGRAPH" && paragraphs.length > 1 ? "MANUAL_SEGMENTS" : "PLAIN_READING"
  const question: ReadingQuestion = {
    itemId: item.id,
    sequence: item.sequence,
    contentMode,
    title,
    readingText,
    paragraphs,
    readingDirection,
    display: displayConfig,
    syllableUnits: syllableUnits ?? [],
    tools: toolConfig,
    completion: completionConfig,
    allowRetry,
    hintType,
    hintMedia,
    media,
    instructions: typeof definition.instructions === "string" ? safeText(definition.instructions, 1_000) : null,
    progressMode,
  }
  const limitations = [
    "Pemain ini menggunakan kontrak bacaan eksplisit dan tidak membekalkan timedSegments.",
  ]
  if (question.syllableUnits.length === 0 && question.display.showSyllableBreaks) limitations.push("Item ini tidak membekalkan unit suku kata eksplisit; paparan akan kembali kepada teks asal.")
  return { ok: true, question, limitations }
}

export function getReadingSettings(activity: { allowRetry: boolean; showImmediateFeedback: boolean }, question: ReadingQuestion): ReadingSettings {
  return { allowRetry: activity.allowRetry && question.allowRetry, showImmediateFeedback: activity.showImmediateFeedback }
}

export function updateReadingSession(session: ReadingSessionState, itemId: string, state: ReadingState): ReadingSessionState {
  return { ...session, [itemId]: state }
}

export function beginReadingCountdown(state: ReadingState): ReadingState {
  if (state.phase === "COUNTDOWN" || state.phase === "READING") return state
  return { ...state, phase: "COUNTDOWN", countdownValue: DEFAULT_COUNTDOWN_SECONDS, hasStarted: true, submitted: false, completed: false, feedback: null, validationMessage: null }
}

export function countdownTick(state: ReadingState): ReadingState {
  if (state.phase !== "COUNTDOWN" || state.countdownValue === null) return state
  if (state.countdownValue <= 1) return { ...state, phase: "READING", countdownValue: null }
  return { ...state, countdownValue: state.countdownValue - 1 }
}

export function readingTick(state: ReadingState): ReadingState {
  if (state.phase !== "READING" || state.completed) return state
  return { ...state, elapsedSeconds: state.elapsedSeconds + 1 }
}

export function pauseReading(state: ReadingState): ReadingState {
  return state.phase === "READING" ? { ...state, phase: "PAUSED" } : state
}

export function resumeReading(state: ReadingState): ReadingState {
  return state.phase === "PAUSED" ? { ...state, phase: "READING" } : state
}

export function nextReadingParagraph(state: ReadingState, question: ReadingQuestion): ReadingState {
  if (question.progressMode !== "MANUAL_SEGMENTS") return state
  return { ...state, currentParagraphIndex: Math.min(question.paragraphs.length - 1, state.currentParagraphIndex + 1) }
}

export function previousReadingParagraph(state: ReadingState): ReadingState {
  return { ...state, currentParagraphIndex: Math.max(0, state.currentParagraphIndex - 1) }
}

export function updateReadingZoom(state: ReadingState, zoomPercent: number): ReadingState {
  return { ...state, zoomPercent: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomPercent)) }
}

export function markReadingAudioUsed(state: ReadingState): ReadingState {
  return { ...state, audioUses: state.audioUses + 1 }
}

export function setReadingHints(state: ReadingState, hints: ReadingState["hints"]): ReadingState {
  return { ...state, hints }
}

export function resetReading(state: ReadingState): ReadingState {
  return { ...state, phase: "IDLE", countdownValue: null, elapsedSeconds: 0, currentParagraphIndex: 0, submitted: false, completed: false, feedback: null, validationMessage: null, hasStarted: false, audioUses: 0, hints: { highlightText: false, firstParagraph: false } }
}

export function meetsReadingCompletion(state: ReadingState, question: ReadingQuestion): boolean {
  const opened = question.completion.requireOpenActivity ? state.hasStarted : true
  const viewed = state.elapsedSeconds >= question.completion.minimumViewingSeconds
  const reachedEnd = question.progressMode === "MANUAL_SEGMENTS" ? state.currentParagraphIndex >= question.paragraphs.length - 1 : true
  return opened && viewed && reachedEnd
}

export function finishReading(state: ReadingState, question: ReadingQuestion, settings: ReadingSettings): ReadingState {
  if (!meetsReadingCompletion(state, question)) return { ...state, validationMessage: "Teruskan membaca sehingga aktiviti selesai." }
  return { ...state, phase: "COMPLETED", submitted: true, completed: true, feedback: settings.showImmediateFeedback ? "Bagus! Aktiviti membaca telah selesai." : "Aktiviti membaca direkod untuk sesi ini." }
}

export function readingCompletionHelp(state: ReadingState, question: ReadingQuestion): string | null {
  if (meetsReadingCompletion(state, question)) return null
  if (question.completion.minimumViewingSeconds > state.elapsedSeconds) return `Teruskan membaca sekurang-kurangnya ${question.completion.minimumViewingSeconds - state.elapsedSeconds} saat lagi.`
  if (question.progressMode === "MANUAL_SEGMENTS" && state.currentParagraphIndex < question.paragraphs.length - 1) return "Teruskan ke perenggan seterusnya sehingga bacaan selesai."
  return "Teruskan membaca sehingga aktiviti selesai."
}

export function buildReadingCompletionSummary(session: ReadingSessionState, questions: readonly ReadingQuestion[]): ActivityCompletionSummary {
  const states = questions.map((question) => session[question.itemId]).filter((state): state is ReadingState => Boolean(state))
  return { totalQuestions: questions.length, completedQuestions: states.filter((state) => state.completed).length, correctQuestions: states.filter((state) => state.completed).length, incorrectQuestions: states.filter((state) => !state.completed && state.hasStarted).length, totalAttempts: 0 }
}

export function readingTextForDisplay(question: ReadingQuestion): string {
  if (question.display.showSyllableBreaks && question.syllableUnits.length > 0) return question.syllableUnits.map((unit) => unit.value).join(question.display.syllableSeparator)
  return question.readingText
}

export function readingAlignmentClass(question: ReadingQuestion): string {
  return question.display.textAlignment === "CENTER" ? "text-center" : question.display.textAlignment === "JUSTIFY" ? "text-justify" : "text-left"
}

export { ZOOM_MAX, ZOOM_MIN }
