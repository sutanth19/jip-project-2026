import { getBooleanConfiguration, stableShuffle } from "../activity-player.utils"
import type { ActivityCompletionSummary, ActivityMedia, QuestionBankMedia } from "../types"
import type { ExplicitPair, PairingActivityItem, PairingMapResult, PairingOption, PairingQuestion, PairingSessionState, PairingSettings, PairingState } from "./pairing.types"

type StoredPair = { sourceSequence: number; targetSequence: number }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asStoredPairs(value: unknown): StoredPair[] | null {
  const pairs = asRecord(value)?.pairs
  if (!Array.isArray(pairs) || pairs.length === 0) return null
  const mapped = pairs.map((pair) => {
    const entry = asRecord(pair)
    if (!entry || !Number.isInteger(entry.sourceSequence) || !Number.isInteger(entry.targetSequence) || Number(entry.sourceSequence) < 0 || Number(entry.targetSequence) < 0) return null
    return { sourceSequence: Number(entry.sourceSequence), targetSequence: Number(entry.targetSequence) }
  })
  return mapped.some((pair) => pair === null) ? null : mapped as StoredPair[]
}

function isQuestionBankMedia(value: unknown): value is QuestionBankMedia {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const media = value as Record<string, unknown>
  return typeof media.id === "string" && typeof media.mediaKey === "string" && typeof media.url === "string" && typeof media.mediaRole === "string" && typeof media.sequence === "number"
}

function toPlayerMedia(media: QuestionBankMedia): ActivityMedia {
  return { id: media.id, mediaKey: media.mediaKey, mediaRole: media.mediaRole, mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: media.sequence, isPrimary: false, url: media.url }
}

function toOption(option: PairingActivityItem["questionBankItem"]["answerOptions"][number]): PairingOption {
  return { id: option.id, text: option.content, sequence: option.sequence, media: Array.isArray(option.media) ? option.media.filter(isQuestionBankMedia).map(toPlayerMedia) : [], accessibleLabel: option.label ? `${option.label}. ${option.content}` : option.content }
}

export function mapExplicitPairs(item: PairingActivityItem): PairingMapResult {
  if (item.questionBankItem.answerType !== "MATCHING_PAIRS") return { ok: false, message: "Item ini memerlukan jenis jawapan MATCHING_PAIRS dengan pemetaan pasangan yang disimpan." }
  const storedPairs = asStoredPairs(item.questionBankItem.correctAnswer)
  if (!storedPairs) return { ok: false, message: "Pemetaan pasangan correctAnswer.pairs tidak tersedia dalam pratonton aktiviti." }
  const options = item.questionBankItem.answerOptions.map(toOption)
  const optionBySequence = new Map(options.map((option) => [option.sequence, option]))
  const sourceSequences = new Set<number>()
  const targetSequences = new Set<number>()
  const pairs: ExplicitPair[] = []
  for (const pair of storedPairs) {
    const left = optionBySequence.get(pair.sourceSequence)
    const right = optionBySequence.get(pair.targetSequence)
    if (!left || !right || sourceSequences.has(pair.sourceSequence) || targetSequences.has(pair.targetSequence) || left.id === right.id) return { ok: false, message: "Pemetaan pasangan mengandungi sumber atau sasaran yang tidak sah." }
    sourceSequences.add(pair.sourceSequence)
    targetSequences.add(pair.targetSequence)
    pairs.push({ id: `${left.id}:${right.id}`, left, right, correctRightId: right.id })
  }
  if (pairs.length === 0) return { ok: false, message: "Tiada pasangan yang boleh dimainkan." }
  const question: PairingQuestion = { itemId: item.id, title: item.questionBankItem.title, prompt: item.questionBankItem.content, instructions: item.questionBankItem.instructions, explanation: item.questionBankItem.explanation, media: item.questionBankItem.mediaLinks.filter(isQuestionBankMedia).map(toPlayerMedia), pairs }
  return { ok: true, question }
}

export function getPairingSettings(activity: { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean; configuration: unknown }): PairingSettings {
  return { attemptsAllowed: activity.attemptsAllowed, allowRetry: activity.allowRetry, showImmediateFeedback: activity.showImmediateFeedback, showExplanation: getBooleanConfiguration(activity.configuration, ["showExplanation"]) }
}

export function createPairingState(question: PairingQuestion, settings: { shufflePairs: boolean }, seed: string): PairingState {
  const leftIds = question.pairs.map((pair) => pair.left.id)
  const rightIds = question.pairs.map((pair) => pair.right.id)
  return { assignments: {}, submitted: false, isCorrect: null, attemptCount: 0, completed: false, feedback: null, leftOrder: settings.shufflePairs ? stableShuffle(leftIds, `${seed}:${question.itemId}:left`) : leftIds, rightOrder: settings.shufflePairs ? stableShuffle(rightIds, `${seed}:${question.itemId}:right`) : rightIds, requiredCount: question.pairs.length }
}

export function assignPair(state: PairingState, leftId: string, rightId: string): PairingState {
  if (state.submitted) return state
  const assignments = Object.fromEntries(Object.entries(state.assignments).filter(([assignedLeftId, assignedRightId]) => assignedLeftId !== leftId && assignedRightId !== rightId))
  return { ...state, assignments: { ...assignments, [leftId]: rightId } }
}

export function resetPairs(state: PairingState): PairingState {
  return { ...state, assignments: {}, submitted: false, isCorrect: null, completed: false, feedback: null }
}

export function areAllPairsAssigned(state: PairingState): boolean {
  return Object.keys(state.assignments).length === state.requiredCount && new Set(Object.values(state.assignments)).size === state.requiredCount
}

export function isCorrectPairing(question: PairingQuestion, assignments: Record<string, string>): boolean {
  return question.pairs.every((pair) => assignments[pair.left.id] === pair.correctRightId)
}

export function canRetryPairing(state: PairingState, settings: PairingSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function submitPairing(state: PairingState, question: PairingQuestion, settings: PairingSettings): PairingState {
  if (state.submitted || !areAllPairsAssigned(state)) return state
  const isCorrect = isCorrectPairing(question, state.assignments)
  const submitted = { ...state, submitted: true, isCorrect, attemptCount: state.attemptCount + 1 }
  const retryAllowed = canRetryPairing(submitted, settings)
  const completed = !settings.showImmediateFeedback || isCorrect || !retryAllowed
  const feedback = settings.showImmediateFeedback ? isCorrect ? "Padanan tepat! Hebat!" : retryAllowed ? "Cuba padankan semula." : "Bagus kerana mencuba. Mari teruskan ke item seterusnya." : "Jawapan direkod untuk semakan sesi ini."
  return { ...submitted, completed, feedback }
}

export function retryPairing(state: PairingState): PairingState {
  return resetPairs(state)
}

export function updatePairingSession(session: PairingSessionState, itemId: string, state: PairingState): PairingSessionState {
  return { ...session, [itemId]: state }
}

export function buildPairingCompletionSummary(session: PairingSessionState): ActivityCompletionSummary {
  const results = Object.values(session)
  return { totalQuestions: results.reduce((total, result) => total + result.requiredCount, 0), completedQuestions: results.reduce((total, result) => total + Object.keys(result.assignments).length, 0), correctQuestions: results.reduce((total, result) => total + (result.isCorrect ? result.requiredCount : 0), 0), incorrectQuestions: results.reduce((total, result) => total + (result.isCorrect === false ? result.requiredCount : 0), 0), totalAttempts: results.reduce((total, result) => total + result.attemptCount, 0) }
}
