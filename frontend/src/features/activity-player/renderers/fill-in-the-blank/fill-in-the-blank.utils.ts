import { getBooleanConfiguration } from "../../activity-player.utils"
import type { ActivityCompletionSummary, ActivityMedia, QuestionBankMedia } from "../../types"
import type { FillBlankActivityItem, FillBlankBlank, FillBlankMapResult, FillBlankQuestion, FillBlankSegment, FillBlankSessionState, FillBlankSettings, FillBlankState, FillBlankWordBankEntry } from "./fill-in-the-blank.types"

type PreviewMedia = { key: string; url: string | null; mimeType: string | null; altText: string | null; label: string | null }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isQuestionBankMedia(value: unknown): value is QuestionBankMedia {
  const media = asRecord(value)
  return Boolean(media && typeof media.id === "string" && typeof media.mediaKey === "string" && typeof media.url === "string" && typeof media.mediaRole === "string" && typeof media.sequence === "number")
}

function toActivityMedia(media: QuestionBankMedia): ActivityMedia {
  return { id: media.id, mediaKey: media.mediaKey, mediaRole: media.mediaRole, mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: media.sequence, isPrimary: false, url: media.url }
}

function isPreviewMedia(value: unknown): value is PreviewMedia {
  const media = asRecord(value)
  return Boolean(media && typeof media.key === "string" && (typeof media.url === "string" || media.url === null) && (typeof media.mimeType === "string" || media.mimeType === null) && (typeof media.altText === "string" || media.altText === null) && (typeof media.label === "string" || media.label === null))
}

function toPreviewMedia(media: PreviewMedia, role: string): ActivityMedia {
  return { id: `fill-blank:${role}:${media.key}`, mediaKey: media.key, mediaRole: role, mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: 0, isPrimary: false, url: media.url }
}

function isFillBlankMode(value: unknown): value is FillBlankQuestion["mode"] {
  return value === "TYPING" || value === "WORD_BANK" || value === "MIXED"
}

function isInputMode(value: unknown): value is FillBlankBlank["inputMode"] {
  return value === "TYPING" || value === "WORD_BANK"
}

function toBlank(value: unknown): FillBlankBlank | null {
  const blank = asRecord(value)
  if (!blank || typeof blank.id !== "string" || typeof blank.marker !== "string" || typeof blank.required !== "boolean" || !isInputMode(blank.inputMode) || !Array.isArray(blank.acceptableAnswers) || blank.acceptableAnswers.length === 0 || blank.acceptableAnswers.some((answer) => typeof answer !== "string" || !answer.trim()) || (typeof blank.placeholder !== "string" && blank.placeholder !== null) || typeof blank.caseSensitive !== "boolean" || typeof blank.trimWhitespace !== "boolean" || typeof blank.collapseWhitespace !== "boolean" || blank.unicodeNormalization !== "NFC") return null
  const hint = asRecord(blank.hint)
  if (!hint || (typeof hint.text !== "string" && hint.text !== null) || !Array.isArray(hint.media) || hint.media.some((media) => !isPreviewMedia(media))) return null
  return { id: blank.id, marker: blank.marker, required: blank.required, inputMode: blank.inputMode, acceptableAnswers: [...blank.acceptableAnswers], hint: { text: hint.text, media: hint.media.map((media) => toPreviewMedia(media, "HINT_MEDIA")) }, placeholder: blank.placeholder, caseSensitive: blank.caseSensitive, trimWhitespace: blank.trimWhitespace, collapseWhitespace: blank.collapseWhitespace, unicodeNormalization: "NFC" }
}

function toWordBankEntry(value: unknown): FillBlankWordBankEntry | null {
  const entry = asRecord(value)
  if (!entry || typeof entry.id !== "string" || typeof entry.content !== "string" || !entry.content.trim() || typeof entry.singleUse !== "boolean" || !Array.isArray(entry.media) || entry.media.some((media) => !isPreviewMedia(media))) return null
  return { id: entry.id, content: entry.content, singleUse: entry.singleUse, media: entry.media.map((media) => toPreviewMedia(media, "WORD_BANK_MEDIA")) }
}

const MARKER_PATTERN = /(\{\{blank(?::[1-9]\d*)?\}\}|\[blank(?::[1-9]\d*)?\]|_____)/gu

export function parseFillBlankPrompt(prompt: string, blanks: readonly Pick<FillBlankBlank, "id" | "marker">[]): FillBlankSegment[] | null {
  const blankByMarker = new Map(blanks.map((blank) => [blank.marker, blank.id]))
  const remainingExpressions = prompt.replace(MARKER_PATTERN, "")
  if (remainingExpressions.includes("{{") || remainingExpressions.includes("}}")) return null
  const segments: FillBlankSegment[] = []
  let cursor = 0
  for (const match of prompt.matchAll(MARKER_PATTERN)) {
    const marker = match[0]
    const index = match.index ?? 0
    const blankId = blankByMarker.get(marker)
    if (!blankId) return null
    if (index > cursor) segments.push({ type: "text", content: prompt.slice(cursor, index) })
    segments.push({ type: "blank", blankId })
    cursor = index + marker.length
  }
  if (cursor < prompt.length) segments.push({ type: "text", content: prompt.slice(cursor) })
  return segments.filter((segment) => segment.type === "blank" || segment.content.length > 0)
}

export function mapFillBlankQuestion(item: FillBlankActivityItem): FillBlankMapResult {
  const root = asRecord(item.configuration)
  const definition = root ? asRecord(root.fillBlank) : null
  if (!definition || !isFillBlankMode(definition.mode) || typeof definition.prompt !== "string" || !Array.isArray(definition.blanks) || !Array.isArray(definition.wordBank) || typeof definition.allowRepeatedWords !== "boolean" || typeof definition.clearIncorrectOnlyOnRetry !== "boolean") return { ok: false, message: "Konfigurasi Fill in the Blank yang lengkap tidak tersedia untuk item ini." }
  const blanks = definition.blanks.map(toBlank)
  const wordBank = definition.wordBank.map(toWordBankEntry)
  if (blanks.some((blank) => blank === null) || wordBank.some((entry) => entry === null) || new Set(blanks.map((blank) => blank?.id)).size !== blanks.length || new Set(blanks.map((blank) => blank?.marker)).size !== blanks.length || new Set(wordBank.map((entry) => entry?.id)).size !== wordBank.length) return { ok: false, message: "Blank atau bank perkataan item ini tidak sah." }
  const validBlanks = blanks.filter((blank): blank is FillBlankBlank => blank !== null)
  const validWordBank = wordBank.filter((entry): entry is FillBlankWordBankEntry => entry !== null)
  if (definition.mode === "TYPING" && (validBlanks.some((blank) => blank.inputMode !== "TYPING") || validWordBank.length > 0)) return { ok: false, message: "Mode menaip item ini tidak sepadan dengan konfigurasi blank." }
  if (definition.mode === "WORD_BANK" && (validBlanks.some((blank) => blank.inputMode !== "WORD_BANK") || validWordBank.length === 0)) return { ok: false, message: "Mode bank perkataan item ini tidak lengkap." }
  if (definition.mode === "MIXED" && (!validBlanks.some((blank) => blank.inputMode === "TYPING") || !validBlanks.some((blank) => blank.inputMode === "WORD_BANK") || validWordBank.length === 0)) return { ok: false, message: "Mode campuran item ini tidak lengkap." }
  const segments = parseFillBlankPrompt(definition.prompt, validBlanks)
  if (!segments || segments.filter((segment) => segment.type === "blank").length !== validBlanks.length) return { ok: false, message: "Penanda blank dalam prompt tidak sepadan dengan konfigurasi item." }
  return { ok: true, question: { itemId: item.id, title: item.questionBankItem.title, instructions: item.questionBankItem.instructions, explanation: item.questionBankItem.explanation, mode: definition.mode, prompt: definition.prompt, segments, blanks: validBlanks, wordBank: validWordBank, allowRepeatedWords: definition.allowRepeatedWords, clearIncorrectOnlyOnRetry: definition.clearIncorrectOnlyOnRetry, media: item.questionBankItem.mediaLinks.filter(isQuestionBankMedia).map(toActivityMedia) } }
}

export function normalizeFillBlankAnswer(value: string, blank: Pick<FillBlankBlank, "caseSensitive" | "trimWhitespace" | "collapseWhitespace" | "unicodeNormalization">): string {
  let result = value.normalize(blank.unicodeNormalization)
  if (blank.trimWhitespace) result = result.trim()
  if (blank.collapseWhitespace) result = result.replace(/\s+/gu, " ")
  return blank.caseSensitive ? result : result.toLocaleLowerCase("ms-MY")
}

export function isFillBlankAnswerCorrect(answer: string, blank: FillBlankBlank): boolean {
  const normalized = normalizeFillBlankAnswer(answer, blank)
  return blank.acceptableAnswers.some((acceptable) => normalizeFillBlankAnswer(acceptable, blank) === normalized)
}

export function getFillBlankSettings(activity: { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean; configuration: unknown }): FillBlankSettings {
  return { attemptsAllowed: activity.attemptsAllowed, allowRetry: activity.allowRetry, showImmediateFeedback: activity.showImmediateFeedback, showExplanation: getBooleanConfiguration(activity.configuration, ["showExplanation"]) }
}

export function createFillBlankState(question: FillBlankQuestion): FillBlankState {
  return { answers: {}, wordBankAssignments: {}, activeBlankId: question.blanks.find((blank) => blank.inputMode === "WORD_BANK")?.id ?? null, submitted: false, isCorrect: null, blankCorrectness: {}, validationErrorIds: [], attemptCount: 0, completed: false, feedback: null, wordBankOrder: question.wordBank.map((entry) => entry.id) }
}

export function setFillBlankAnswer(state: FillBlankState, blankId: string, value: string): FillBlankState {
  if (state.submitted) return state
  const wordBankAssignments = { ...state.wordBankAssignments }
  delete wordBankAssignments[blankId]
  return { ...state, answers: { ...state.answers, [blankId]: value }, wordBankAssignments, validationErrorIds: state.validationErrorIds.filter((id) => id !== blankId) }
}

export function selectFillBlankWord(state: FillBlankState, question: FillBlankQuestion, blankId: string, entryId: string): FillBlankState {
  if (state.submitted) return state
  const blank = question.blanks.find((candidate) => candidate.id === blankId)
  const entry = question.wordBank.find((candidate) => candidate.id === entryId)
  if (!blank || blank.inputMode !== "WORD_BANK" || !entry) return state
  const usedByAnotherBlank = Object.entries(state.wordBankAssignments).some(([assignedBlankId, assignedEntryId]) => assignedBlankId !== blankId && assignedEntryId === entry.id)
  if (entry.singleUse && usedByAnotherBlank) return state
  return { ...state, answers: { ...state.answers, [blankId]: entry.content }, wordBankAssignments: { ...state.wordBankAssignments, [blankId]: entry.id }, activeBlankId: blankId, validationErrorIds: state.validationErrorIds.filter((id) => id !== blankId) }
}

export function removeFillBlankAnswer(state: FillBlankState, blankId: string): FillBlankState {
  if (state.submitted) return state
  const answers = { ...state.answers }
  const wordBankAssignments = { ...state.wordBankAssignments }
  delete answers[blankId]
  delete wordBankAssignments[blankId]
  return { ...state, answers, wordBankAssignments, activeBlankId: blankId, validationErrorIds: state.validationErrorIds.filter((id) => id !== blankId) }
}

export function validateFillBlankRequired(question: FillBlankQuestion, answers: FillBlankState["answers"]): string[] {
  return question.blanks.filter((blank) => blank.required && !answers[blank.id]?.trim()).map((blank) => blank.id)
}

export function canRetryFillBlank(state: FillBlankState, settings: FillBlankSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function submitFillBlank(state: FillBlankState, question: FillBlankQuestion, settings: FillBlankSettings): FillBlankState {
  if (state.submitted) return state
  const validationErrorIds = validateFillBlankRequired(question, state.answers)
  if (validationErrorIds.length > 0) return { ...state, validationErrorIds }
  const blankCorrectness = Object.fromEntries(question.blanks.map((blank) => [blank.id, state.answers[blank.id] ? isFillBlankAnswerCorrect(state.answers[blank.id] ?? "", blank) : null]))
  const isCorrect = question.blanks.filter((blank) => blank.required).every((blank) => blankCorrectness[blank.id] === true)
  const submitted = { ...state, submitted: true, isCorrect, blankCorrectness, validationErrorIds: [], attemptCount: state.attemptCount + 1 }
  const retryAllowed = canRetryFillBlank(submitted, settings)
  const completed = !settings.showImmediateFeedback || isCorrect || !retryAllowed
  const feedback = settings.showImmediateFeedback ? isCorrect ? "Tahniah! Jawapan betul." : retryAllowed ? "Cuba lagi. Ada jawapan yang perlu diperbaiki." : "Bagus kerana mencuba. Mari teruskan ke item seterusnya." : "Jawapan direkod untuk semakan sesi ini."
  return { ...submitted, completed, feedback }
}

export function retryFillBlank(state: FillBlankState, question: FillBlankQuestion): FillBlankState {
  const answers = question.clearIncorrectOnlyOnRetry ? Object.fromEntries(Object.entries(state.answers).filter(([blankId]) => state.blankCorrectness[blankId] !== false)) : {}
  const wordBankAssignments = question.clearIncorrectOnlyOnRetry ? Object.fromEntries(Object.entries(state.wordBankAssignments).filter(([blankId]) => state.blankCorrectness[blankId] !== false)) : {}
  return { ...state, answers, wordBankAssignments, submitted: false, isCorrect: null, blankCorrectness: {}, validationErrorIds: [], completed: false, feedback: null }
}

export function updateFillBlankSession(session: FillBlankSessionState, itemId: string, state: FillBlankState): FillBlankSessionState {
  return { ...session, [itemId]: state }
}

export function buildFillBlankCompletionSummary(session: FillBlankSessionState, questions: readonly FillBlankQuestion[]): ActivityCompletionSummary {
  const results = questions.map((question) => ({ question, state: session[question.itemId] })).filter((entry): entry is { question: FillBlankQuestion; state: FillBlankState } => Boolean(entry.state))
  return { totalQuestions: results.reduce((total, entry) => total + entry.question.blanks.length, 0), completedQuestions: results.reduce((total, entry) => total + entry.question.blanks.filter((blank) => Boolean(entry.state.answers[blank.id])).length, 0), correctQuestions: results.reduce((total, entry) => total + Object.values(entry.state.blankCorrectness).filter((correct) => correct === true).length, 0), incorrectQuestions: results.reduce((total, entry) => total + Object.values(entry.state.blankCorrectness).filter((correct) => correct === false).length, 0), totalAttempts: results.reduce((total, entry) => total + entry.state.attemptCount, 0) }
}
