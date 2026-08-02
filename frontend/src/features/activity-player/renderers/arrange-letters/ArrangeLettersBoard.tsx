import { DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { ChevronLeft, ChevronRight, RotateCcw, Send } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { MediaViewer } from "../../components/MediaViewer"
import { DndProvider } from "../../interactions/DndProvider"
import { ArrangeLettersFeedback } from "./ArrangeLettersFeedback"
import { LetterAnswerRow } from "./LetterAnswerRow"
import { LetterBank } from "./LetterBank"
import type { ArrangeLettersQuestion, ArrangeLettersSettings, ArrangeLettersState } from "./arrange-letters.types"
import { canRetryArrangeLetters, promptMedia } from "./arrange-letters.utils"

type ArrangeLettersBoardProps = {
  question: ArrangeLettersQuestion
  state: ArrangeLettersState
  settings: ArrangeLettersSettings
  onPlace: (letterId: string, position?: number) => void
  onReturn: (letterId: string) => void
  onReorder: (letterId: string, position: number) => void
  onReset: () => void
  onSubmit: () => void
  onRetry: () => void
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}

export function ArrangeLettersBoard({ question, state, settings, onPlace, onReturn, onReorder, onReset, onSubmit, onRetry, onPrevious, onNext, isFirst, isLast }: ArrangeLettersBoardProps) {
  const [activeLetterId, setActiveLetterId] = useState<string | null>(null)
  const canDrag = question.configuration.interactionMode === "DRAG_ORDER" || question.configuration.interactionMode === "BOTH"
  const { image, audio } = promptMedia(question)
  const unitById = new Map(question.configuration.letterUnits.map((unit) => [unit.id, unit]))
  const activeUnit = activeLetterId ? unitById.get(activeLetterId) : undefined
  const activePosition = Math.min(state.arrangedLetterIds.length, question.configuration.letterUnits.length)
  const retryAllowed = canRetryArrangeLetters(state, settings)
  const isComplete = state.arrangedLetterIds.length === question.configuration.letterUnits.length
  const onDragStart = (event: DragStartEvent) => setActiveLetterId(String(event.active.id).replace("arrange-letter:", ""))
  const onDragEnd = (event: DragEndEvent) => {
    setActiveLetterId(null)
    const letterId = String(event.active.id).replace("arrange-letter:", "")
    const overId = event.over ? String(event.over.id) : ""
    if (!unitById.has(letterId)) return
    if (overId === "arrange-bank") onReturn(letterId)
    else if (overId.startsWith("arrange-slot:")) onReorder(letterId, Number(overId.replace("arrange-slot:", "")))
  }
  return <DndProvider onDragStart={onDragStart} onDragEnd={onDragEnd}><Card className="border-border/80 shadow-sm"><CardHeader className="space-y-3"><p className="text-sm font-semibold text-primary">Susun huruf untuk membentuk perkataan</p><CardTitle className="text-xl leading-snug sm:text-2xl">{question.title ?? "Susun huruf"}</CardTitle>{question.prompt ? <p className="text-base leading-7 text-foreground sm:text-lg">{question.prompt}</p> : null}{question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{question.instructions}</p> : null}{question.configuration.showReferenceText ? <p className="rounded-xl bg-muted px-3 py-2 text-sm font-semibold">Contoh perkataan: {question.configuration.targetWord}</p> : null}</CardHeader><CardContent className="space-y-5">{image ? <MediaViewer media={image} className="max-h-80 w-full rounded-2xl object-contain" /> : null}{audio ? <MediaViewer media={audio} /> : null}<LetterAnswerRow units={question.configuration.letterUnits} arrangedLetterIds={state.arrangedLetterIds} showTargetSlots={question.configuration.showTargetSlots} activePosition={activePosition} disabled={state.submitted} canDrag={canDrag} onReturn={onReturn} />{state.validationError ? <p role="alert" className="text-sm font-medium text-destructive">Sila susun semua huruf sebelum menyemak jawapan.</p> : null}<LetterBank units={state.bankOrder.map((id) => unitById.get(id)).filter((unit): unit is NonNullable<typeof unit> => Boolean(unit))} arrangedLetterIds={state.arrangedLetterIds} disabled={state.submitted} canDrag={canDrag} onSelect={(letterId) => onPlace(letterId)} onReturn={() => undefined} /><ArrangeLettersFeedback submitted={state.submitted} isCorrect={state.isCorrect} message={state.feedback} explanation={question.explanation} showExplanation={settings.showExplanation} showImmediateFeedback={settings.showImmediateFeedback} /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" className="h-11 min-w-28" disabled={isFirst} onClick={onPrevious}><ChevronLeft /> Sebelum</Button><div className="flex flex-wrap gap-2">{!state.submitted ? <><Button type="button" variant="outline" className="h-11" disabled={state.arrangedLetterIds.length === 0} onClick={onReset}><RotateCcw /> Set semula</Button><Button type="button" className="h-11 min-w-36" disabled={!isComplete} onClick={onSubmit}><Send /> Semak jawapan</Button></> : null}{retryAllowed ? <Button type="button" variant="outline" className="h-11" onClick={onRetry}>Cuba lagi</Button> : null}{state.completed ? <Button type="button" className="h-11 min-w-28" onClick={onNext}>{isLast ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}</div></div></CardContent></Card><DragOverlay dropAnimation={null}>{activeUnit ? <Card className="w-16 border-primary bg-card py-0 shadow-lg"><CardContent className="flex min-h-16 items-center justify-center p-2 text-2xl font-bold">{activeUnit.value}</CardContent></Card> : null}</DragOverlay></DndProvider>
}
