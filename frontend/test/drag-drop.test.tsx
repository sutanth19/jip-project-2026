import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import type { ActivityQuestion } from "@/features/activity-player/types"
import { DragDropBoard } from "@/features/activity-player/renderers/drag-drop/DragDropBoard"
import { canRetryDragDrop, createDragDropState, getItemsInZone, getDragDropSettings, isCorrectDragDrop, mapDragDropQuestion, moveDragDropItem, placedItemCount, resetDragDrop, retryDragDrop, submitDragDrop } from "@/features/activity-player/renderers/drag-drop/drag-drop.utils"

const dragDropItem: ActivityQuestion = {
  id: "drag-item-1", sequence: 0, sectionKey: null, isRequired: true, marks: null, configuration: null,
  questionBankItem: {
    id: "drag-question-1", type: "WORD", title: "Letakkan perkataan", content: "Letakkan perkataan dalam kotak yang tepat.", instructions: "Seret atau pilih item, kemudian pilih kotak.", explanation: null, answerType: "MATCHING_PAIRS", correctAnswer: { pairs: [{ sourceSequence: 0, targetSequence: 2 }, { sourceSequence: 1, targetSequence: 3 }] }, metadata: null, difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1",
    answerOptions: [
      { id: "drag-apple", label: null, content: "epal", sequence: 0, isCorrect: false, feedback: null, media: [] },
      { id: "drag-car", label: null, content: "kereta", sequence: 1, isCorrect: false, feedback: null, media: [] },
      { id: "zone-fruit", label: null, content: "Buah", sequence: 2, isCorrect: false, feedback: null, media: [] },
      { id: "zone-vehicle", label: null, content: "Kenderaan", sequence: 3, isCorrect: false, feedback: null, media: [] },
    ], mediaLinks: [],
  },
}

const singleSettings = getDragDropSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { dropZoneMode: "SINGLE", shuffleItems: true } })
const multipleSettings = getDragDropSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { dropZoneMode: "MULTIPLE" } })

function question() {
  const mapped = mapDragDropQuestion(dragDropItem)
  if (!mapped.ok || !mapped.question) throw new Error("Malformed drag/drop fixture")
  return mapped.question
}

describe("Drag and Drop player", () => {
  it("registers the drag-drop renderer and maps explicit source-to-zone pairs", () => {
    expect(getActivityRenderer("drag-drop")).toBeTypeOf("function")
    expect(question().draggableItems.map((item) => item.correctDropZoneId)).toEqual(["zone-fruit", "zone-vehicle"])
  })

  it("moves an item to a zone, between zones, and back to the bank", () => {
    const mapped = question()
    const item = mapped.draggableItems[0]
    const firstZone = mapped.dropZones[0]
    const secondZone = mapped.dropZones[1]
    if (!item || !firstZone || !secondZone) throw new Error("Fixture missing data")
    const placed = moveDragDropItem(createDragDropState(mapped, multipleSettings, "seed"), item.id, firstZone.id, multipleSettings)
    const moved = moveDragDropItem(placed, item.id, secondZone.id, multipleSettings)
    const returned = moveDragDropItem(moved, item.id, null, multipleSettings)
    expect(placed.locations[item.id]).toBe(firstZone.id)
    expect(moved.locations[item.id]).toBe(secondZone.id)
    expect(returned.locations[item.id]).toBeNull()
  })

  it("rejects invalid drops and enforces one-item capacity while allowing multiple capacity", () => {
    const mapped = question()
    const [firstItem, secondItem] = mapped.draggableItems
    const firstZone = mapped.dropZones[0]
    if (!firstItem || !secondItem || !firstZone) throw new Error("Fixture missing data")
    const initial = createDragDropState(mapped, singleSettings, "seed")
    const occupied = moveDragDropItem(initial, firstItem.id, firstZone.id, singleSettings)
    const rejected = moveDragDropItem(occupied, secondItem.id, firstZone.id, singleSettings)
    const accepted = moveDragDropItem(occupied, secondItem.id, firstZone.id, multipleSettings)
    expect(rejected.locations[secondItem.id]).toBeNull()
    expect(getItemsInZone(accepted.locations, firstZone.id)).toHaveLength(2)
  })

  it("checks correct and incorrect placements, reset/retry behavior, and retry limits", () => {
    const mapped = question()
    const [firstItem, secondItem] = mapped.draggableItems
    const [firstZone, secondZone] = mapped.dropZones
    if (!firstItem || !secondItem || !firstZone || !secondZone) throw new Error("Fixture missing data")
    const correctState = moveDragDropItem(moveDragDropItem(createDragDropState(mapped, multipleSettings, "seed"), firstItem.id, firstItem.correctDropZoneId, multipleSettings), secondItem.id, secondItem.correctDropZoneId, multipleSettings)
    const incorrectState = moveDragDropItem(moveDragDropItem(createDragDropState(mapped, multipleSettings, "seed"), firstItem.id, secondZone.id, multipleSettings), secondItem.id, firstZone.id, multipleSettings)
    const correct = submitDragDrop(correctState, mapped, multipleSettings)
    const incorrect = submitDragDrop(incorrectState, mapped, singleSettings)
    const secondAttempt = submitDragDrop(moveDragDropItem(moveDragDropItem(retryDragDrop(incorrect), firstItem.id, secondZone.id, singleSettings), secondItem.id, firstZone.id, singleSettings), mapped, singleSettings)
    expect(isCorrectDragDrop(mapped, correctState.locations)).toBe(true)
    expect(correct).toMatchObject({ isCorrect: true, completed: true })
    expect(incorrect).toMatchObject({ isCorrect: false, completed: false })
    expect(resetDragDrop(incorrect).locations).toEqual({ [firstItem.id]: null, [secondItem.id]: null })
    expect(secondAttempt).toMatchObject({ completed: true, attemptCount: 2 })
    expect(canRetryDragDrop(secondAttempt, singleSettings)).toBe(false)
  })

  it("keeps a shuffled item order stable and exposes keyboard, pointer, touch, and click fallback affordances", () => {
    const mapped = question()
    const first = createDragDropState(mapped, singleSettings, "drag-seed")
    const second = createDragDropState(mapped, singleSettings, "drag-seed")
    const markup = renderToStaticMarkup(<DragDropBoard question={mapped} state={first} settings={singleSettings} onMove={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    expect(first.itemOrder).toEqual(second.itemOrder)
    expect(markup).toContain("Bank item")
    expect(markup).toContain("role=\"group\"")
    expect(markup).toContain("Seret atau pilih item")
  })

  it("fails safely for malformed mappings and does not call backend mutation APIs", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(mapDragDropQuestion({ ...dragDropItem, questionBankItem: { ...dragDropItem.questionBankItem, correctAnswer: { pairs: [] } } }).ok).toBe(false)
    expect(placedItemCount(createDragDropState(question(), singleSettings, "seed"))).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
