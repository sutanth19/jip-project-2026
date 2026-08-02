import { DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { ChevronLeft, ChevronRight, RotateCcw, Send } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getMediaKind } from "../../activity-player.utils"
import { MediaViewer } from "../../components/MediaViewer"
import { DndProvider } from "../../interactions/DndProvider"
import { DroppableLearningZone } from "../../interactions/DroppableLearningZone"
import { canRetryDragDrop, getItemsInZone, placedItemCount } from "./drag-drop.utils"
import { DragDropFeedback } from "./DragDropFeedback"
import { DraggableItemCard } from "./DraggableItemCard"
import { DropZoneCard } from "./DropZoneCard"
import type { DragDropItem, DragDropQuestion, DragDropSettings, DragDropState, DropZone } from "./drag-drop.types"

type DragDropBoardProps = {
  question: DragDropQuestion
  state: DragDropState
  settings: DragDropSettings
  onMove: (itemId: string, zoneId: string | null) => void
  onReset: () => void
  onSubmit: () => void
  onRetry: () => void
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}

function itemResult(item: DragDropItem, state: DragDropState): "neutral" | "correct" | "incorrect" {
  if (!state.submitted || state.isCorrect === null) return "neutral"
  return state.locations[item.id] === item.correctDropZoneId ? "correct" : "incorrect"
}

export function DragDropBoard({ question, state, settings, onMove, onReset, onSubmit, onRetry, onPrevious, onNext, isFirst, isLast }: DragDropBoardProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const image = question.media.find((media) => getMediaKind(media) === "image")
  const audio = question.media.find((media) => getMediaKind(media) === "audio")
  const itemById = new Map(question.draggableItems.map((item) => [item.id, item]))
  const zoneById = new Map(question.dropZones.map((zone) => [zone.id, zone]))
  const orderedItems = state.itemOrder.map((id) => itemById.get(id)).filter((item): item is DragDropItem => Boolean(item))
  const orderedZones = state.zoneOrder.map((id) => zoneById.get(id)).filter((zone): zone is DropZone => Boolean(zone))
  const retryAllowed = canRetryDragDrop(state, settings)
  const chooseItem = (itemId: string) => { if (!state.submitted) setSelectedItemId((current) => current === itemId ? null : itemId) }
  const chooseZone = (zoneId: string | null) => { if (!state.submitted && selectedItemId) { onMove(selectedItemId, zoneId); setSelectedItemId(null) } }
  const onDragStart = (event: DragStartEvent) => setActiveItemId(String(event.active.id).replace("drag-item:", ""))
  const onDragEnd = (event: DragEndEvent) => {
    setActiveItemId(null)
    const itemId = String(event.active.id).replace("drag-item:", "")
    const overId = event.over ? String(event.over.id) : ""
    if (overId === "drag-bank") onMove(itemId, null)
    else if (overId.startsWith("drag-zone:")) onMove(itemId, overId.replace("drag-zone:", ""))
  }
  const reset = () => { setSelectedItemId(null); onReset() }
  const retry = () => { setSelectedItemId(null); onRetry() }
  const bankItems = orderedItems.filter((item) => state.locations[item.id] === null)
  const activeItem = activeItemId ? itemById.get(activeItemId) : null

  return <DndProvider onDragStart={onDragStart} onDragEnd={onDragEnd}><Card className="border-border/80 shadow-sm"><CardHeader className="space-y-3"><p className="text-sm font-semibold text-primary">Seret atau pilih item untuk meletakkannya</p><CardTitle className="text-xl leading-snug sm:text-2xl">{question.title ?? question.prompt}</CardTitle>{question.title ? <p className="text-base leading-7 text-foreground sm:text-lg">{question.prompt}</p> : null}{question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{question.instructions}</p> : null}</CardHeader><CardContent className="space-y-5">{image ? <MediaViewer media={image} className="max-h-80 w-full rounded-2xl object-contain" /> : null}{audio ? <MediaViewer media={audio} /> : null}<p aria-live="polite" className="text-sm text-muted-foreground">{selectedItemId ? "Item dipilih. Pilih zon sasaran atau seret item tersebut." : `${placedItemCount(state)} daripada ${state.requiredCount} item telah diletakkan.`}</p><DroppableLearningZone id="drag-bank" label="Bank item. Pilih zon ini untuk mengembalikan item yang dipilih." disabled={state.submitted} onSelect={() => chooseZone(null)} className="bg-muted/30"><div className="space-y-3"><h3 className="font-semibold">Bank item</h3>{bankItems.length === 0 ? <p className="text-sm text-muted-foreground">Semua item telah diletakkan. Pilih item dalam zon untuk mengalihkannya.</p> : <div className="grid gap-3 sm:grid-cols-2">{bankItems.map((item) => <DraggableItemCard key={item.id} item={item} selected={selectedItemId === item.id} disabled={state.submitted} result={itemResult(item, state)} onSelect={() => chooseItem(item.id)} />)}</div>}</div></DroppableLearningZone><div className="grid gap-4 md:grid-cols-2">{orderedZones.map((zone) => { const zoneItems = getItemsInZone(state.locations, zone.id).map((id) => itemById.get(id)).filter((item): item is DragDropItem => Boolean(item)); return <DropZoneCard key={zone.id} zone={zone} disabled={state.submitted} onSelect={() => chooseZone(zone.id)}><p className="text-sm text-muted-foreground">{zoneItems.length === 0 ? "Letakkan item di sini" : `${zoneItems.length} item diletakkan`}</p><div className="space-y-2">{zoneItems.map((item) => <DraggableItemCard key={item.id} item={item} selected={selectedItemId === item.id} disabled={state.submitted} result={itemResult(item, state)} onSelect={() => chooseItem(item.id)} />)}</div></DropZoneCard>})}</div><DragDropFeedback submitted={state.submitted} isCorrect={state.isCorrect} message={state.feedback} showImmediateFeedback={settings.showImmediateFeedback} /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" className="h-11 min-w-28" disabled={isFirst} onClick={onPrevious}><ChevronLeft /> Sebelum</Button><div className="flex flex-wrap gap-2">{!state.submitted ? <><Button type="button" variant="outline" className="h-11" disabled={placedItemCount(state) === 0} onClick={reset}><RotateCcw /> Set semula</Button><Button type="button" className="h-11 min-w-36" disabled={placedItemCount(state) !== state.requiredCount} onClick={onSubmit}><Send /> Semak jawapan</Button></> : null}{retryAllowed ? <Button type="button" variant="outline" className="h-11" onClick={retry}>Cuba lagi</Button> : null}{state.completed ? <Button type="button" className="h-11 min-w-28" onClick={onNext}>{isLast ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}</div></div></CardContent></Card><DragOverlay dropAnimation={null}>{activeItem ? <Card className="w-56 border-primary bg-card py-0 shadow-lg"><CardContent className="p-3 font-semibold">{activeItem.text}</CardContent></Card> : null}</DragOverlay></DndProvider>
}
