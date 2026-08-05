import { getBooleanConfiguration, stableShuffle } from "../../activity-player.utils"
import { clearItemLocations, getItemsInZone, moveItemToZone } from "../../interactions/dnd.utils"
import { getPairingSettings, mapExplicitPairs } from "../../interactions/pairing.utils"
import type { PairingActivityItem, PairingMapResult } from "../../interactions/pairing.types"
import type { DragDropCompletionSummary, DragDropQuestion, DragDropSessionState, DragDropSettings, DragDropState } from "./drag-drop.types"

function getStringConfiguration(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const entry = (value as Record<string, unknown>)[key]
  return typeof entry === "string" ? entry : null
}

export function mapDragDropQuestion(item: PairingActivityItem): PairingMapResult & { question?: DragDropQuestion } {
  const mapped = mapExplicitPairs(item)
  if (!mapped.ok) return mapped
  const draggableItems = mapped.question.pairs.map((pair) => ({ id: pair.left.id, text: pair.left.text, media: pair.left.media, accessibleLabel: pair.left.accessibleLabel, correctDropZoneId: pair.correctRightId }))
  const dropZones = mapped.question.pairs.map((pair) => pair.right).map((right) => ({ id: right.id, text: right.text, media: right.media, accessibleLabel: right.accessibleLabel }))
  if (new Set(draggableItems.map((item) => item.id)).size !== draggableItems.length || new Set(dropZones.map((zone) => zone.id)).size !== dropZones.length) return { ok: false, message: "Item seret atau zon sasaran mengandungi ID pendua." }
  return { ok: true, question: { ...mapped.question, draggableItems, dropZones } }
}

export function getDragDropSettings(activity: Parameters<typeof getPairingSettings>[0]): DragDropSettings {
  const mode = getStringConfiguration(activity.configuration, "dropZoneMode")
  return { ...getPairingSettings(activity), capacity: mode === "SINGLE" ? 1 : mode === "MULTIPLE" ? null : null, shuffleDraggables: getBooleanConfiguration(activity.configuration, ["shuffleItems", "shuffleDraggables"]) }
}

export function createDragDropState(question: DragDropQuestion, settings: DragDropSettings, seed: string): DragDropState {
  const itemIds = question.draggableItems.map((item) => item.id)
  return { locations: clearItemLocations(itemIds), submitted: false, isCorrect: null, attemptCount: 0, completed: false, feedback: null, itemOrder: settings.shuffleDraggables ? stableShuffle(itemIds, `${seed}:${question.itemId}:drag-items`) : itemIds, zoneOrder: question.dropZones.map((zone) => zone.id), requiredCount: itemIds.length }
}

export function moveDragDropItem(state: DragDropState, itemId: string, zoneId: string | null, settings: DragDropSettings): DragDropState {
  if (state.submitted) return state
  const move = moveItemToZone(state.locations, itemId, zoneId, settings.capacity)
  return move.accepted ? { ...state, locations: move.locations } : state
}

export function placedItemCount(state: DragDropState): number {
  return Object.values(state.locations).filter((location) => location !== null).length
}

export function isCorrectDragDrop(question: DragDropQuestion, locations: DragDropState["locations"]): boolean {
  return question.draggableItems.every((item) => locations[item.id] === item.correctDropZoneId)
}

export function canRetryDragDrop(state: DragDropState, settings: DragDropSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function submitDragDrop(state: DragDropState, question: DragDropQuestion, settings: DragDropSettings): DragDropState {
  if (state.submitted || placedItemCount(state) !== state.requiredCount) return state
  const isCorrect = isCorrectDragDrop(question, state.locations)
  const submitted = { ...state, submitted: true, isCorrect, attemptCount: state.attemptCount + 1 }
  const retryAllowed = canRetryDragDrop(submitted, settings)
  const completed = !settings.showImmediateFeedback || isCorrect || !retryAllowed
  const feedback = settings.showImmediateFeedback ? isCorrect ? "Hebat! Semua item berada di tempat yang betul." : retryAllowed ? "Cuba susun semula." : "Bagus kerana mencuba. Mari teruskan ke item seterusnya." : "Jawapan direkod untuk semakan sesi ini."
  return { ...submitted, completed, feedback }
}

export function resetDragDrop(state: DragDropState): DragDropState {
  return { ...state, locations: clearItemLocations(state.itemOrder), submitted: false, isCorrect: null, completed: false, feedback: null }
}

export function retryDragDrop(state: DragDropState): DragDropState {
  return resetDragDrop(state)
}

export function updateDragDropSession(session: DragDropSessionState, itemId: string, state: DragDropState): DragDropSessionState {
  return { ...session, [itemId]: state }
}

export function buildDragDropCompletionSummary(session: DragDropSessionState): DragDropCompletionSummary {
  const results = Object.values(session)
  return { totalQuestions: results.reduce((total, result) => total + result.requiredCount, 0), completedQuestions: results.reduce((total, result) => total + placedItemCount(result), 0), correctQuestions: results.reduce((total, result) => total + (result.isCorrect ? result.requiredCount : 0), 0), incorrectQuestions: results.reduce((total, result) => total + (result.isCorrect === false ? result.requiredCount : 0), 0), totalAttempts: results.reduce((total, result) => total + result.attemptCount, 0) }
}

export { getItemsInZone }
