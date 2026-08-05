import { DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { ChevronLeft, ChevronRight, RotateCcw, Send } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { MediaViewer } from "../../components/MediaViewer"
import { DndProvider } from "../../interactions/DndProvider"
import { WordBuilderAnswerRow } from "./WordBuilderAnswerRow"
import { WordBuilderBank } from "./WordBuilderBank"
import { WordBuilderFeedback } from "./WordBuilderFeedback"
import { WordBuilderHint } from "./WordBuilderHint"
import type { WordBuilderQuestion, WordBuilderSettings, WordBuilderState } from "./word-builder.types"
import { canRetryWordBuilder, formedBuilderWord } from "./word-builder.utils"

type WordBuilderBoardProps = {
  question: WordBuilderQuestion
  state: WordBuilderState
  settings: WordBuilderSettings
  onPlace: (unitId: string, position?: number) => void
  onReturn: (placementId: string) => void
  onReorder: (placementId: string, position: number) => void
  onReset: () => void
  onSubmit: () => void
  onRetry: () => void
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}

export function WordBuilderBoard({ question, state, settings, onPlace, onReturn, onReorder, onReset, onSubmit, onRetry, onPrevious, onNext, isFirst, isLast }: WordBuilderBoardProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const canDrag = question.interactionMode === "DRAG_ORDER" || question.interactionMode === "BOTH"
  const canClick = question.interactionMode === "CLICK_ORDER" || question.interactionMode === "BOTH"
  const unitsById = useMemo(() => new Map(question.bankUnits.map((unit) => [unit.id, unit])), [question.bankUnits])
  const activeUnitId = activeDragId?.startsWith("word-builder-unit:") ? activeDragId.replace("word-builder-unit:", "") : state.placements.find((placement) => `word-builder-placement:${placement.id}` === activeDragId)?.unitId
  const activeUnit = activeUnitId ? unitsById.get(activeUnitId) : undefined
  const retryAllowed = canRetryWordBuilder(state, settings)
  const isComplete = state.placements.length === question.targetUnits.length
  const studentWord = formedBuilderWord(question, state)
  const onDragStart = (event: DragStartEvent) => setActiveDragId(String(event.active.id))
  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : ""
    if (activeId.startsWith("word-builder-unit:") && overId.startsWith("word-builder-slot:")) onPlace(activeId.replace("word-builder-unit:", ""), Number(overId.replace("word-builder-slot:", "")))
    if (activeId.startsWith("word-builder-placement:")) {
      const placementId = activeId.replace("word-builder-placement:", "")
      if (overId === "word-builder-bank") onReturn(placementId)
      else if (overId.startsWith("word-builder-slot:")) onReorder(placementId, Number(overId.replace("word-builder-slot:", "")))
    }
  }
  return <DndProvider onDragStart={onDragStart} onDragEnd={onDragEnd}><Card className="border-border/80 shadow-sm"><CardHeader className="space-y-3"><p className="text-sm font-semibold text-primary">Bina perkataan menggunakan {question.builderMode === "LETTER" ? "huruf" : "suku kata"}</p><CardTitle className="text-xl leading-snug sm:text-2xl">{question.title ?? "Bina perkataan"}</CardTitle>{question.prompt?.type === "TEXT" ? <p className="text-base leading-7 text-foreground sm:text-lg">{question.prompt.text}</p> : null}{question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{question.instructions}</p> : null}{question.showReferenceText ? <p className="rounded-xl bg-muted px-3 py-2 text-lg font-semibold">Contoh perkataan: {question.targetWord}</p> : null}</CardHeader><CardContent className="space-y-5">{question.prompt?.type === "IMAGE" || question.prompt?.type === "AUDIO" ? <MediaViewer media={question.prompt.media} className={question.prompt.type === "IMAGE" ? "max-h-80 w-full rounded-2xl object-contain" : undefined} /> : null}<WordBuilderAnswerRow question={question} state={state} unitsById={unitsById} disabled={state.submitted} canDrag={canDrag} canClick={canClick} onReturn={onReturn} />{studentWord ? <p className="text-sm text-muted-foreground">Perkataan dibentuk: <span className="font-semibold text-foreground">{studentWord}</span></p> : null}{state.validationError ? <p role="alert" className="text-sm font-medium text-destructive">Sila isi semua kedudukan sebelum menyemak jawapan.</p> : null}<WordBuilderHint key={question.itemId} question={question} /><WordBuilderBank question={question} state={state} units={state.bankOrder.map((id) => unitsById.get(id)).filter((unit): unit is NonNullable<typeof unit> => Boolean(unit))} disabled={state.submitted} canDrag={canDrag} canClick={canClick} onSelect={onPlace} /><WordBuilderFeedback submitted={state.submitted} isCorrect={state.isCorrect} message={state.feedback} explanation={question.explanation} showExplanation={settings.showExplanation} showImmediateFeedback={settings.showImmediateFeedback} /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" className="h-11 min-w-28" disabled={isFirst} onClick={onPrevious}><ChevronLeft /> Sebelum</Button><div className="flex flex-wrap gap-2">{!state.submitted ? <><Button type="button" variant="outline" className="h-11" disabled={state.placements.length === 0} onClick={onReset}><RotateCcw /> Set semula</Button><Button type="button" className="h-11 min-w-36" disabled={!isComplete} onClick={onSubmit}><Send /> Semak jawapan</Button></> : null}{retryAllowed ? <Button type="button" variant="outline" className="h-11" onClick={onRetry}>Cuba lagi</Button> : null}{state.completed ? <Button type="button" className="h-11 min-w-28" onClick={onNext}>{isLast ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}</div></div></CardContent></Card><DragOverlay dropAnimation={null}>{activeUnit ? <Card className="min-w-20 border-primary bg-card py-0 shadow-lg"><CardContent className="flex min-h-16 items-center justify-center px-4 py-2 text-xl font-bold">{activeUnit.value}</CardContent></Card> : null}</DragOverlay></DndProvider>
}
