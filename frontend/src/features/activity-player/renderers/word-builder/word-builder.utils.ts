import { getBooleanConfiguration, stableShuffle } from "../../activity-player.utils"
import type { ActivityCompletionSummary, ActivityMedia } from "../../types"
import type { WordBuilderActivityItem, WordBuilderHintType, WordBuilderInteractionMode, WordBuilderMapResult, WordBuilderMode, WordBuilderPrompt, WordBuilderQuestion, WordBuilderSessionState, WordBuilderSettings, WordBuilderState, WordBuilderUnit } from "./word-builder.types"

const MAX_UNITS = 12
const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|\b(?:javascript|vbscript|data)\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\b[a-z][a-z0-9+.-]*:\/\/)/iu

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isBuilderMode(value: unknown): value is WordBuilderMode {
  return value === "LETTER" || value === "SYLLABLE"
}

function isInteractionMode(value: unknown): value is WordBuilderInteractionMode {
  return value === "CLICK_ORDER" || value === "DRAG_ORDER" || value === "BOTH"
}

function isHintType(value: unknown): value is WordBuilderHintType {
  return value === "NONE" || value === "FIRST_UNIT" || value === "FIRST_TWO_UNITS" || value === "SHOW_IMAGE" || value === "PLAY_AUDIO"
}

function graphemes(value: string): string[] {
  if (typeof Intl.Segmenter === "function") return [...new Intl.Segmenter("ms-MY", { granularity: "grapheme" }).segment(value)].map((entry) => entry.segment)
  return Array.from(value.normalize("NFC"))
}

function mapTargetUnit(value: unknown, mode: WordBuilderMode): WordBuilderUnit | null {
  const unit = asRecord(value)
  if (!unit || typeof unit.id !== "string" || !unit.id || UNSAFE_TEXT.test(unit.id) || typeof unit.value !== "string" || !unit.value || UNSAFE_TEXT.test(unit.value) || typeof unit.sequence !== "number" || !Number.isInteger(unit.sequence) || (mode === "LETTER" && graphemes(unit.value.normalize("NFC")).length !== 1)) return null
  return { id: unit.id, value: unit.value.normalize("NFC"), sequence: unit.sequence, isDistractor: false }
}

function mapDistractor(value: unknown): WordBuilderUnit | null {
  const unit = asRecord(value)
  if (!unit || typeof unit.id !== "string" || !unit.id || UNSAFE_TEXT.test(unit.id) || typeof unit.value !== "string" || !unit.value || UNSAFE_TEXT.test(unit.value)) return null
  return { id: unit.id, value: unit.value.normalize("NFC"), sequence: null, isDistractor: true }
}

function mapPrompt(value: unknown): WordBuilderPrompt | undefined {
  if (value === null) return null
  const prompt = asRecord(value)
  if (!prompt || (prompt.type !== "TEXT" && prompt.type !== "IMAGE" && prompt.type !== "AUDIO")) return undefined
  if (prompt.type === "TEXT") return typeof prompt.text === "string" && prompt.text && !UNSAFE_TEXT.test(prompt.text) && Array.isArray(prompt.media) && prompt.media.length === 0 ? { type: "TEXT", text: prompt.text, media: null } : undefined
  if (prompt.text !== null || !Array.isArray(prompt.media) || prompt.media.length !== 1) return undefined
  const media = asRecord(prompt.media[0])
  if (!media || typeof media.key !== "string" || !media.key || (typeof media.url !== "string" && media.url !== null) || (typeof media.mimeType !== "string" && media.mimeType !== null) || (typeof media.altText !== "string" && media.altText !== null) || (typeof media.label !== "string" && media.label !== null)) return undefined
  const activityMedia: ActivityMedia = { id: `word-builder:prompt:${media.key}`, mediaKey: media.key, mediaRole: "WORD_BUILDER_PROMPT", mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: 0, isPrimary: true, url: media.url }
  return { type: prompt.type, text: null, media: activityMedia }
}

export function mapWordBuilderQuestion(item: WordBuilderActivityItem): WordBuilderMapResult {
  const root = asRecord(item.configuration)
  const definition = root ? asRecord(root.wordBuilder) : null
  const builderMode = definition?.builderMode
  const interactionMode = definition?.interactionMode
  const targetWordValue = definition?.targetWord
  const hint = definition ? asRecord(definition.hint) : null
  if (!definition || !isBuilderMode(builderMode) || !isInteractionMode(interactionMode) || typeof targetWordValue !== "string" || !targetWordValue || UNSAFE_TEXT.test(targetWordValue) || !Array.isArray(definition.units) || !Array.isArray(definition.distractors) || typeof definition.showReferenceText !== "boolean" || typeof definition.showTargetSlots !== "boolean" || typeof definition.shuffleUnits !== "boolean" || typeof definition.allowRetry !== "boolean" || typeof definition.clearOnRetry !== "boolean" || typeof definition.allowReuse !== "boolean" || typeof definition.maximumUnits !== "number" || !Number.isInteger(definition.maximumUnits) || definition.maximumUnits < 1 || definition.maximumUnits > MAX_UNITS || !hint || !isHintType(hint.type)) return { ok: false, message: "Kontrak Bina Perkataan yang lengkap tidak tersedia untuk item ini." }
  const prompt = mapPrompt(definition.prompt)
  if (prompt === undefined || (hint.type === "SHOW_IMAGE" && prompt?.type !== "IMAGE") || (hint.type === "PLAY_AUDIO" && prompt?.type !== "AUDIO")) return { ok: false, message: "Prompt atau petunjuk item ini tidak sah." }
  const targetWord = targetWordValue.normalize("NFC")
  const targetUnits = definition.units.map((unit) => mapTargetUnit(unit, builderMode))
  const distractors = definition.distractors.map(mapDistractor)
  if (targetUnits.some((unit) => unit === null) || distractors.some((unit) => unit === null)) return { ok: false, message: "Unit binaan item ini tidak sah." }
  const validTargetUnits = targetUnits.filter((unit): unit is WordBuilderUnit => unit !== null).sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0))
  const validDistractors = distractors.filter((unit): unit is WordBuilderUnit => unit !== null)
  const bankUnits = [...validTargetUnits, ...validDistractors]
  if (validTargetUnits.length === 0 || validTargetUnits.length > definition.maximumUnits || new Set(validTargetUnits.map((unit) => unit.id)).size !== validTargetUnits.length || new Set(validTargetUnits.map((unit) => unit.sequence)).size !== validTargetUnits.length || new Set(bankUnits.map((unit) => unit.id)).size !== bankUnits.length || validTargetUnits.some((unit, index) => unit.sequence !== index + 1) || validTargetUnits.map((unit) => unit.value).join("").normalize("NFC") !== targetWord) return { ok: false, message: "Unit binaan tidak sepadan dengan perkataan sasaran." }
  return { ok: true, question: { itemId: item.id, sequence: item.sequence, title: item.questionBankItem.title, instructions: item.questionBankItem.instructions, explanation: item.questionBankItem.explanation, builderMode, interactionMode, targetWord, targetUnits: validTargetUnits, bankUnits, prompt, showReferenceText: definition.showReferenceText, showTargetSlots: definition.showTargetSlots, shuffleUnits: definition.shuffleUnits, allowRetry: definition.allowRetry, clearOnRetry: definition.clearOnRetry, allowReuse: definition.allowReuse, maximumUnits: definition.maximumUnits, hint: hint.type } }
}

export function createWordBuilderState(question: WordBuilderQuestion, activityId: string): WordBuilderState {
  const ids = question.bankUnits.map((unit) => unit.id)
  return { bankOrder: question.shuffleUnits ? stableShuffle(ids, `${activityId}:${question.itemId}:word-builder`) : ids, placements: [], nextPlacementNumber: 1, submitted: false, isCorrect: null, validationError: false, attemptCount: 0, completed: false, feedback: null }
}

function unitById(question: WordBuilderQuestion): Map<string, WordBuilderUnit> {
  return new Map(question.bankUnits.map((unit) => [unit.id, unit]))
}

export function formedBuilderWord(question: WordBuilderQuestion, state: Pick<WordBuilderState, "placements">): string {
  const units = unitById(question)
  return state.placements.map((placement) => units.get(placement.unitId)?.value ?? "").join("")
}

export function placeWordBuilderUnit(state: WordBuilderState, question: WordBuilderQuestion, unitId: string, position = state.placements.length): WordBuilderState {
  if (state.submitted || !unitById(question).has(unitId) || (!question.allowReuse && state.placements.some((placement) => placement.unitId === unitId)) || state.placements.length >= question.targetUnits.length) return state
  const placement = { id: `placement:${unitId}:${state.nextPlacementNumber}`, unitId }
  const placements = [...state.placements]
  placements.splice(Math.max(0, Math.min(position, placements.length)), 0, placement)
  return { ...state, placements, nextPlacementNumber: state.nextPlacementNumber + 1, validationError: false }
}

export function returnWordBuilderPlacement(state: WordBuilderState, placementId: string): WordBuilderState {
  if (state.submitted || !state.placements.some((placement) => placement.id === placementId)) return state
  return { ...state, placements: state.placements.filter((placement) => placement.id !== placementId), validationError: false }
}

export function reorderWordBuilderPlacement(state: WordBuilderState, placementId: string, position: number): WordBuilderState {
  if (state.submitted) return state
  const placement = state.placements.find((entry) => entry.id === placementId)
  if (!placement) return state
  const placements = state.placements.filter((entry) => entry.id !== placementId)
  placements.splice(Math.max(0, Math.min(position, placements.length)), 0, placement)
  return { ...state, placements, validationError: false }
}

export function resetWordBuilder(state: WordBuilderState): WordBuilderState {
  return { ...state, placements: [], nextPlacementNumber: 1, submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function isWordBuilderCorrect(question: WordBuilderQuestion, state: WordBuilderState): boolean {
  if (state.placements.length !== question.targetUnits.length) return false
  const units = unitById(question)
  if (state.placements.some((placement) => units.get(placement.unitId)?.isDistractor)) return false
  return formedBuilderWord(question, state).normalize("NFC") === question.targetWord.normalize("NFC")
}

export function getWordBuilderSettings(activity: { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean; configuration: unknown }, question: WordBuilderQuestion): WordBuilderSettings {
  return { attemptsAllowed: activity.attemptsAllowed, allowRetry: activity.allowRetry && question.allowRetry, showImmediateFeedback: activity.showImmediateFeedback, showExplanation: getBooleanConfiguration(activity.configuration, ["showExplanation"]) }
}

export function canRetryWordBuilder(state: WordBuilderState, settings: WordBuilderSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function submitWordBuilder(state: WordBuilderState, question: WordBuilderQuestion, settings: WordBuilderSettings): WordBuilderState {
  if (state.submitted) return state
  if (state.placements.length !== question.targetUnits.length) return { ...state, validationError: true }
  const isCorrect = isWordBuilderCorrect(question, state)
  const submitted = { ...state, submitted: true, isCorrect, validationError: false, attemptCount: state.attemptCount + 1 }
  const retryAllowed = canRetryWordBuilder(submitted, settings)
  const completed = !settings.showImmediateFeedback || isCorrect || !retryAllowed
  const feedback = settings.showImmediateFeedback ? isCorrect ? "Hebat! Jawapan betul." : retryAllowed ? "Cuba lagi." : "Bagus kerana mencuba. Mari teruskan ke perkataan seterusnya." : "Jawapan direkod untuk semakan sesi ini."
  return { ...submitted, completed, feedback }
}

export function retryWordBuilder(state: WordBuilderState, question: WordBuilderQuestion): WordBuilderState {
  return { ...state, placements: question.clearOnRetry ? [] : state.placements, nextPlacementNumber: question.clearOnRetry ? 1 : state.nextPlacementNumber, submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function updateWordBuilderSession(session: WordBuilderSessionState, itemId: string, state: WordBuilderState): WordBuilderSessionState {
  return { ...session, [itemId]: state }
}

export function buildWordBuilderCompletionSummary(session: WordBuilderSessionState, questions: readonly WordBuilderQuestion[]): ActivityCompletionSummary {
  const states = questions.map((question) => session[question.itemId]).filter((state): state is WordBuilderState => Boolean(state))
  return { totalQuestions: questions.length, completedQuestions: states.filter((state) => state.completed).length, correctQuestions: states.filter((state) => state.isCorrect === true).length, incorrectQuestions: states.filter((state) => state.isCorrect === false).length, totalAttempts: states.reduce((total, state) => total + state.attemptCount, 0) }
}
