import { getBooleanConfiguration, getMediaKind, stableShuffle } from "../../activity-player.utils"
import type { ActivityCompletionSummary, ActivityMedia, QuestionBankMedia } from "../../types"
import type { ArrangeLettersActivityItem, ArrangeLettersConfiguration, ArrangeLettersMapResult, ArrangeLettersQuestion, ArrangeLettersSessionState, ArrangeLettersSettings, ArrangeLettersState, ArrangeLettersUnit } from "./arrange-letters.types"

const MAX_GRAPHEMES = 20
const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|javascript\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=)/iu

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function graphemes(value: string): string[] {
  if (typeof Intl.Segmenter === "function") return [...new Intl.Segmenter("ms-MY", { granularity: "grapheme" }).segment(value)].map((entry) => entry.segment)
  return Array.from(value.normalize("NFC"))
}

function isQuestionBankMedia(value: unknown): value is QuestionBankMedia {
  const media = asRecord(value)
  return Boolean(media && typeof media.id === "string" && typeof media.mediaKey === "string" && typeof media.url === "string" && typeof media.mediaRole === "string" && typeof media.sequence === "number")
}

function toActivityMedia(media: QuestionBankMedia): ActivityMedia {
  return { id: media.id, mediaKey: media.mediaKey, mediaRole: media.mediaRole, mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: media.sequence, isPrimary: false, url: media.url }
}

function isInteractionMode(value: unknown): value is ArrangeLettersConfiguration["interactionMode"] {
  return value === "CLICK_ORDER" || value === "DRAG_ORDER" || value === "BOTH"
}

function mapUnit(value: unknown): ArrangeLettersUnit | null {
  const unit = asRecord(value)
  if (!unit || typeof unit.id !== "string" || !unit.id || UNSAFE_TEXT.test(unit.id) || typeof unit.value !== "string" || !unit.value || UNSAFE_TEXT.test(unit.value) || typeof unit.sequence !== "number" || !Number.isInteger(unit.sequence)) return null
  return graphemes(unit.value.normalize("NFC")).length === 1 ? { id: unit.id, value: unit.value.normalize("NFC"), sequence: unit.sequence } : null
}

function mapConfiguration(value: unknown): ArrangeLettersConfiguration | null {
  const root = asRecord(value)
  const definition = root ? asRecord(root.arrangeLetters) : null
  if (!definition || !isInteractionMode(definition.interactionMode) || typeof definition.targetWord !== "string" || !definition.targetWord || UNSAFE_TEXT.test(definition.targetWord) || !Array.isArray(definition.letterUnits) || typeof definition.showReferenceText !== "boolean" || typeof definition.showTargetSlots !== "boolean" || typeof definition.shuffleLetters !== "boolean" || typeof definition.preserveCase !== "boolean" || typeof definition.allowRetry !== "boolean" || typeof definition.clearOnRetry !== "boolean" || typeof definition.maximumLetters !== "number" || !Number.isInteger(definition.maximumLetters) || definition.maximumLetters < 1 || definition.maximumLetters > MAX_GRAPHEMES) return null
  const targetWord = definition.targetWord.normalize("NFC")
  const letterUnits = definition.letterUnits.map(mapUnit)
  if (letterUnits.some((unit) => unit === null)) return null
  const units = letterUnits.filter((unit): unit is ArrangeLettersUnit => unit !== null).sort((left, right) => left.sequence - right.sequence)
  const targetGraphemes = graphemes(targetWord)
  if (targetGraphemes.length === 0 || targetGraphemes.length > MAX_GRAPHEMES || targetGraphemes.length > definition.maximumLetters || units.length !== targetGraphemes.length || units.length > MAX_GRAPHEMES || new Set(units.map((unit) => unit.id)).size !== units.length || units.some((unit, index) => unit.sequence !== index + 1) || units.map((unit) => unit.value).join("").normalize("NFC") !== targetWord) return null
  return { interactionMode: definition.interactionMode, targetWord, letterUnits: units, showReferenceText: definition.showReferenceText, showTargetSlots: definition.showTargetSlots, shuffleLetters: definition.shuffleLetters, preserveCase: definition.preserveCase, allowRetry: definition.allowRetry, clearOnRetry: definition.clearOnRetry, maximumLetters: definition.maximumLetters }
}

export function mapArrangeLettersQuestion(item: ArrangeLettersActivityItem): ArrangeLettersMapResult {
  const configuration = mapConfiguration(item.configuration)
  if (!configuration) return { ok: false, message: "Konfigurasi Susun Huruf yang lengkap tidak tersedia untuk item ini." }
  return { ok: true, question: { itemId: item.id, title: item.questionBankItem.title, prompt: item.questionBankItem.content, instructions: item.questionBankItem.instructions, explanation: item.questionBankItem.explanation, media: item.questionBankItem.mediaLinks.filter(isQuestionBankMedia).map(toActivityMedia), configuration } }
}

export function normalizeArrangeLettersAnswer(value: string, preserveCase: boolean): string {
  const normalized = value.normalize("NFC")
  return preserveCase ? normalized : normalized.toLocaleLowerCase("ms-MY")
}

export function arrangedAnswer(question: ArrangeLettersQuestion, arrangedLetterIds: readonly string[]): string {
  const unitById = new Map(question.configuration.letterUnits.map((unit) => [unit.id, unit]))
  return arrangedLetterIds.map((id) => unitById.get(id)?.value ?? "").join("")
}

export function isArrangeLettersCorrect(question: ArrangeLettersQuestion, arrangedLetterIds: readonly string[]): boolean {
  if (arrangedLetterIds.length !== question.configuration.letterUnits.length) return false
  return normalizeArrangeLettersAnswer(arrangedAnswer(question, arrangedLetterIds), question.configuration.preserveCase) === normalizeArrangeLettersAnswer(question.configuration.targetWord, question.configuration.preserveCase)
}

export function getArrangeLettersSettings(activity: { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean; configuration: unknown }, question: ArrangeLettersQuestion): ArrangeLettersSettings {
  return { attemptsAllowed: activity.attemptsAllowed, allowRetry: activity.allowRetry && question.configuration.allowRetry, showImmediateFeedback: activity.showImmediateFeedback, showExplanation: getBooleanConfiguration(activity.configuration, ["showExplanation"]) }
}

export function createArrangeLettersState(question: ArrangeLettersQuestion, activityId: string): ArrangeLettersState {
  const ids = question.configuration.letterUnits.map((unit) => unit.id)
  return { bankOrder: question.configuration.shuffleLetters ? stableShuffle(ids, `${activityId}:${question.itemId}:arrange-letters`) : ids, arrangedLetterIds: [], submitted: false, isCorrect: null, validationError: false, attemptCount: 0, completed: false, feedback: null }
}

export function placeArrangeLetter(state: ArrangeLettersState, letterId: string, position = state.arrangedLetterIds.length): ArrangeLettersState {
  if (state.submitted || state.arrangedLetterIds.includes(letterId)) return state
  const arrangedLetterIds = [...state.arrangedLetterIds]
  arrangedLetterIds.splice(Math.max(0, Math.min(position, arrangedLetterIds.length)), 0, letterId)
  return { ...state, arrangedLetterIds, validationError: false }
}

export function returnArrangeLetter(state: ArrangeLettersState, letterId: string): ArrangeLettersState {
  if (state.submitted || !state.arrangedLetterIds.includes(letterId)) return state
  return { ...state, arrangedLetterIds: state.arrangedLetterIds.filter((id) => id !== letterId), validationError: false }
}

export function reorderArrangeLetter(state: ArrangeLettersState, letterId: string, position: number): ArrangeLettersState {
  if (state.submitted) return state
  const currentIndex = state.arrangedLetterIds.indexOf(letterId)
  if (currentIndex < 0) return placeArrangeLetter(state, letterId, position)
  const arrangedLetterIds = state.arrangedLetterIds.filter((id) => id !== letterId)
  arrangedLetterIds.splice(Math.max(0, Math.min(position, arrangedLetterIds.length)), 0, letterId)
  return { ...state, arrangedLetterIds, validationError: false }
}

export function resetArrangeLetters(state: ArrangeLettersState): ArrangeLettersState {
  return { ...state, arrangedLetterIds: [], submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function canRetryArrangeLetters(state: ArrangeLettersState, settings: ArrangeLettersSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function submitArrangeLetters(state: ArrangeLettersState, question: ArrangeLettersQuestion, settings: ArrangeLettersSettings): ArrangeLettersState {
  if (state.submitted) return state
  if (state.arrangedLetterIds.length !== question.configuration.letterUnits.length) return { ...state, validationError: true }
  const isCorrect = isArrangeLettersCorrect(question, state.arrangedLetterIds)
  const submitted = { ...state, submitted: true, isCorrect, validationError: false, attemptCount: state.attemptCount + 1 }
  const retryAllowed = canRetryArrangeLetters(submitted, settings)
  const completed = !settings.showImmediateFeedback || isCorrect || !retryAllowed
  const feedback = settings.showImmediateFeedback ? isCorrect ? "Hebat! Susunan huruf betul." : retryAllowed ? "Cuba susun semula." : "Bagus kerana mencuba. Mari teruskan ke perkataan seterusnya." : "Jawapan direkod untuk semakan sesi ini."
  return { ...submitted, completed, feedback }
}

export function retryArrangeLetters(state: ArrangeLettersState, question: ArrangeLettersQuestion): ArrangeLettersState {
  return { ...state, arrangedLetterIds: question.configuration.clearOnRetry ? [] : state.arrangedLetterIds, submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function updateArrangeLettersSession(session: ArrangeLettersSessionState, itemId: string, state: ArrangeLettersState): ArrangeLettersSessionState {
  return { ...session, [itemId]: state }
}

export function buildArrangeLettersCompletionSummary(session: ArrangeLettersSessionState, questions: readonly ArrangeLettersQuestion[]): ActivityCompletionSummary {
  const states = questions.map((question) => session[question.itemId]).filter((state): state is ArrangeLettersState => Boolean(state))
  return { totalQuestions: questions.length, completedQuestions: states.filter((state) => state.completed).length, correctQuestions: states.filter((state) => state.isCorrect === true).length, incorrectQuestions: states.filter((state) => state.isCorrect === false).length, totalAttempts: states.reduce((total, state) => total + state.attemptCount, 0) }
}

export function promptMedia(question: ArrangeLettersQuestion): { image?: ActivityMedia; audio?: ActivityMedia } {
  return { image: question.media.find((media) => getMediaKind(media) === "image"), audio: question.media.find((media) => getMediaKind(media) === "audio") }
}
