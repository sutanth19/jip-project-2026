import { getBooleanConfiguration, getMediaKind, stableShuffle } from "../../activity-player.utils"
import type { ActivityCompletionSummary, ActivityMedia, QuestionBankMedia } from "../../types"
import type { ArrangeSyllableUnit, ArrangeSyllablesActivityItem, ArrangeSyllablesInteractionMode, ArrangeSyllablesMapResult, ArrangeSyllablesQuestion, ArrangeSyllablesSessionState, ArrangeSyllablesSettings, ArrangeSyllablesState } from "./arrange-syllables.types"

const MAX_SYLLABLES = 10
const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|javascript\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=)/iu

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

function isInteractionMode(value: unknown): value is ArrangeSyllablesInteractionMode {
  return value === "CLICK_ORDER" || value === "DRAG_ORDER" || value === "BOTH"
}

function mapSyllable(value: unknown): ArrangeSyllableUnit | null {
  const syllable = asRecord(value)
  if (!syllable || typeof syllable.id !== "string" || !syllable.id || UNSAFE_TEXT.test(syllable.id) || typeof syllable.value !== "string" || !syllable.value || UNSAFE_TEXT.test(syllable.value) || typeof syllable.sequence !== "number" || !Number.isInteger(syllable.sequence)) return null
  return { id: syllable.id, value: syllable.value.normalize("NFC"), sequence: syllable.sequence }
}

export function mapArrangeSyllablesQuestion(item: ArrangeSyllablesActivityItem): ArrangeSyllablesMapResult {
  const root = asRecord(item.configuration)
  const definition = root ? asRecord(root.arrangeSyllables) : null
  if (!definition || !isInteractionMode(definition.interactionMode) || typeof definition.targetWord !== "string" || !definition.targetWord || UNSAFE_TEXT.test(definition.targetWord) || !Array.isArray(definition.syllables) || typeof definition.showReferenceText !== "boolean" || typeof definition.showTargetSlots !== "boolean" || typeof definition.shuffleSyllables !== "boolean" || typeof definition.allowRetry !== "boolean" || typeof definition.clearOnRetry !== "boolean" || typeof definition.maximumSyllables !== "number" || !Number.isInteger(definition.maximumSyllables) || definition.maximumSyllables < 1 || definition.maximumSyllables > MAX_SYLLABLES) return { ok: false, message: "Kontrak Susun Suku Kata yang lengkap tidak tersedia untuk item ini." }
  const targetWord = definition.targetWord.normalize("NFC")
  const syllables = definition.syllables.map(mapSyllable)
  if (syllables.some((syllable) => syllable === null)) return { ok: false, message: "Suku kata item ini tidak sah." }
  const targetSyllables = syllables.filter((syllable): syllable is ArrangeSyllableUnit => syllable !== null).sort((left, right) => left.sequence - right.sequence)
  if (targetSyllables.length === 0 || targetSyllables.length > MAX_SYLLABLES || targetSyllables.length > definition.maximumSyllables || new Set(targetSyllables.map((syllable) => syllable.id)).size !== targetSyllables.length || new Set(targetSyllables.map((syllable) => syllable.sequence)).size !== targetSyllables.length || targetSyllables.some((syllable, index) => syllable.sequence !== index + 1) || targetSyllables.map((syllable) => syllable.value).join("").normalize("NFC") !== targetWord) return { ok: false, message: "Susunan suku kata item ini tidak sepadan dengan kontrak aktiviti." }
  return { ok: true, question: { itemId: item.id, sequence: item.sequence, title: item.questionBankItem.title, prompt: item.questionBankItem.content, instructions: item.questionBankItem.instructions, explanation: item.questionBankItem.explanation, targetWord, targetSyllables, interactionMode: definition.interactionMode, showReferenceText: definition.showReferenceText, showTargetSlots: definition.showTargetSlots, shuffleSyllables: definition.shuffleSyllables, allowRetry: definition.allowRetry, clearOnRetry: definition.clearOnRetry, maximumSyllables: definition.maximumSyllables, media: item.questionBankItem.mediaLinks.filter(isQuestionBankMedia).map(toActivityMedia) } }
}

export function formedSyllableWord(question: ArrangeSyllablesQuestion, arrangedSyllableIds: readonly string[]): string {
  const syllableById = new Map(question.targetSyllables.map((syllable) => [syllable.id, syllable]))
  return arrangedSyllableIds.map((id) => syllableById.get(id)?.value ?? "").join("")
}

export function isArrangeSyllablesCorrect(question: ArrangeSyllablesQuestion, arrangedSyllableIds: readonly string[]): boolean {
  return arrangedSyllableIds.length === question.targetSyllables.length && formedSyllableWord(question, arrangedSyllableIds).normalize("NFC") === question.targetWord.normalize("NFC")
}

export function getArrangeSyllablesSettings(activity: { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean; configuration: unknown }, question: ArrangeSyllablesQuestion): ArrangeSyllablesSettings {
  return { attemptsAllowed: activity.attemptsAllowed, allowRetry: activity.allowRetry && question.allowRetry, showImmediateFeedback: activity.showImmediateFeedback, showExplanation: getBooleanConfiguration(activity.configuration, ["showExplanation"]) }
}

export function createArrangeSyllablesState(question: ArrangeSyllablesQuestion, activityId: string): ArrangeSyllablesState {
  const ids = question.targetSyllables.map((syllable) => syllable.id)
  return { bankOrder: question.shuffleSyllables ? stableShuffle(ids, `${activityId}:${question.itemId}:arrange-syllables`) : ids, arrangedSyllableIds: [], submitted: false, isCorrect: null, validationError: false, attemptCount: 0, completed: false, feedback: null }
}

export function placeArrangeSyllable(state: ArrangeSyllablesState, syllableId: string, position = state.arrangedSyllableIds.length): ArrangeSyllablesState {
  if (state.submitted || state.arrangedSyllableIds.includes(syllableId)) return state
  const arrangedSyllableIds = [...state.arrangedSyllableIds]
  arrangedSyllableIds.splice(Math.max(0, Math.min(position, arrangedSyllableIds.length)), 0, syllableId)
  return { ...state, arrangedSyllableIds, validationError: false }
}

export function returnArrangeSyllable(state: ArrangeSyllablesState, syllableId: string): ArrangeSyllablesState {
  if (state.submitted || !state.arrangedSyllableIds.includes(syllableId)) return state
  return { ...state, arrangedSyllableIds: state.arrangedSyllableIds.filter((id) => id !== syllableId), validationError: false }
}

export function reorderArrangeSyllable(state: ArrangeSyllablesState, syllableId: string, position: number): ArrangeSyllablesState {
  if (state.submitted) return state
  if (!state.arrangedSyllableIds.includes(syllableId)) return placeArrangeSyllable(state, syllableId, position)
  const arrangedSyllableIds = state.arrangedSyllableIds.filter((id) => id !== syllableId)
  arrangedSyllableIds.splice(Math.max(0, Math.min(position, arrangedSyllableIds.length)), 0, syllableId)
  return { ...state, arrangedSyllableIds, validationError: false }
}

export function resetArrangeSyllables(state: ArrangeSyllablesState): ArrangeSyllablesState {
  return { ...state, arrangedSyllableIds: [], submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function canRetryArrangeSyllables(state: ArrangeSyllablesState, settings: ArrangeSyllablesSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function submitArrangeSyllables(state: ArrangeSyllablesState, question: ArrangeSyllablesQuestion, settings: ArrangeSyllablesSettings): ArrangeSyllablesState {
  if (state.submitted) return state
  if (state.arrangedSyllableIds.length !== question.targetSyllables.length) return { ...state, validationError: true }
  const isCorrect = isArrangeSyllablesCorrect(question, state.arrangedSyllableIds)
  const submitted = { ...state, submitted: true, isCorrect, validationError: false, attemptCount: state.attemptCount + 1 }
  const retryAllowed = canRetryArrangeSyllables(submitted, settings)
  const completed = !settings.showImmediateFeedback || isCorrect || !retryAllowed
  const feedback = settings.showImmediateFeedback ? isCorrect ? "Hebat! Susunan suku kata betul." : retryAllowed ? "Cuba susun semula." : "Bagus kerana mencuba. Mari teruskan ke perkataan seterusnya." : "Jawapan direkod untuk semakan sesi ini."
  return { ...submitted, completed, feedback }
}

export function retryArrangeSyllables(state: ArrangeSyllablesState, question: ArrangeSyllablesQuestion): ArrangeSyllablesState {
  return { ...state, arrangedSyllableIds: question.clearOnRetry ? [] : state.arrangedSyllableIds, submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function updateArrangeSyllablesSession(session: ArrangeSyllablesSessionState, itemId: string, state: ArrangeSyllablesState): ArrangeSyllablesSessionState {
  return { ...session, [itemId]: state }
}

export function buildArrangeSyllablesCompletionSummary(session: ArrangeSyllablesSessionState, questions: readonly ArrangeSyllablesQuestion[]): ActivityCompletionSummary {
  const states = questions.map((question) => session[question.itemId]).filter((state): state is ArrangeSyllablesState => Boolean(state))
  return { totalQuestions: questions.length, completedQuestions: states.filter((state) => state.completed).length, correctQuestions: states.filter((state) => state.isCorrect === true).length, incorrectQuestions: states.filter((state) => state.isCorrect === false).length, totalAttempts: states.reduce((total, state) => total + state.attemptCount, 0) }
}

export function promptMedia(question: ArrangeSyllablesQuestion): { image?: ActivityMedia; audio?: ActivityMedia } {
  return { image: question.media.find((media) => getMediaKind(media) === "image"), audio: question.media.find((media) => getMediaKind(media) === "audio") }
}
