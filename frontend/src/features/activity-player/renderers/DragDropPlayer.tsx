import { useEffect, useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { DragDropBoard } from "./drag-drop/DragDropBoard"
import type { DragDropSessionState } from "./drag-drop/drag-drop.types"
import { buildDragDropCompletionSummary, createDragDropState, mapDragDropQuestion, moveDragDropItem, resetDragDrop, retryDragDrop, submitDragDrop, updateDragDropSession } from "./drag-drop/drag-drop.utils"
import { getDragDropSettings } from "./drag-drop/drag-drop.utils"

const SESSION_KEY = "drag-drop-session"

function asSession(value: unknown): DragDropSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DragDropSessionState : {}
}

export function DragDropPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const mapped = useMemo(() => currentItem ? mapDragDropQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const settings = useMemo(() => getDragDropSettings(activity), [activity])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok && mapped.question ? session[mapped.question.itemId] ?? createDragDropState(mapped.question, settings, activity.id) : null
  useEffect(() => { if (!mapped.ok || !mapped.question || session[mapped.question.itemId]) return; setTemporaryState(SESSION_KEY, updateDragDropSession(session, mapped.question.itemId, createDragDropState(mapped.question, settings, activity.id))) }, [activity.id, mapped, session, setTemporaryState, settings])
  if (!mapped.ok || !mapped.question || !state) return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item seret dan lepas tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>
  const persist = (nextState: typeof state) => { setTemporaryState(SESSION_KEY, updateDragDropSession(session, mapped.question.itemId, nextState)); setAnswer(mapped.question.itemId, nextState.locations) }
  const submit = () => { const nextState = submitDragDrop(state, mapped.question, settings); persist(nextState); if (nextState.completed) markItemCompleted(mapped.question.itemId) }
  const next = () => { const nextSession = updateDragDropSession(session, mapped.question.itemId, state); setTemporaryState(SESSION_KEY, nextSession); setCompletionSummary(buildDragDropCompletionSummary(nextSession)); nextItem() }
  return <DragDropBoard question={mapped.question} state={state} settings={settings} onMove={(itemId, zoneId) => persist(moveDragDropItem(state, itemId, zoneId, settings))} onReset={() => persist(resetDragDrop(state))} onSubmit={submit} onRetry={() => persist(retryDragDrop(state))} onPrevious={previousItem} onNext={next} isFirst={currentIndex === 0} isLast={currentIndex === items.length - 1} />
}
