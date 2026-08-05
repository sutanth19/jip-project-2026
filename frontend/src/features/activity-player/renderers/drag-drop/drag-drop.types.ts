import type { ActivityCompletionSummary } from "../../types"
import type { PairingQuestion, PairingSettings } from "../../interactions/pairing.types"
import type { ItemLocationMap } from "../../interactions/dnd.types"

export type DragDropItem = { id: string; text: string; media: PairingQuestion["pairs"][number]["left"]["media"]; accessibleLabel: string; correctDropZoneId: string }
export type DropZone = { id: string; text: string; media: PairingQuestion["pairs"][number]["right"]["media"]; accessibleLabel: string }
export type DragDropQuestion = Omit<PairingQuestion, "pairs"> & { draggableItems: DragDropItem[]; dropZones: DropZone[] }

export type DragDropState = { locations: ItemLocationMap; submitted: boolean; isCorrect: boolean | null; attemptCount: number; completed: boolean; feedback: string | null; itemOrder: string[]; zoneOrder: string[]; requiredCount: number }
export type DragDropSessionState = Record<string, DragDropState>
export type DragDropSettings = PairingSettings & { capacity: number | null; shuffleDraggables: boolean }
export type DragDropCompletionSummary = ActivityCompletionSummary
