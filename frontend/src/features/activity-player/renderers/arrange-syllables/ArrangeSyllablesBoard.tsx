import { DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { ChevronLeft, ChevronRight, RotateCcw, Send } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { MediaViewer } from "../../components/MediaViewer"
import { DndProvider } from "../../interactions/DndProvider"
import { ArrangeSyllablesFeedback } from "./ArrangeSyllablesFeedback"
import { SyllableAnswerRow } from "./SyllableAnswerRow"
import { SyllableBank } from "./SyllableBank"
import type { ArrangeSyllablesLegacyQuestion, ArrangeSyllablesSettings, ArrangeSyllablesState } from "./arrange-syllables.types"
import { canRetryArrangeSyllables, formedSyllableWord, promptMedia } from "./arrange-syllables.utils"

type ArrangeSyllablesBoardProps = {
  question: ArrangeSyllablesLegacyQuestion
  state: ArrangeSyllablesState
  settings: ArrangeSyllablesSettings
  onPlace: (syllableId: string, position?: number) => void
  onReturn: (syllableId: string) => void
  onReorder: (syllableId: string, position: number) => void
  onReset: () => void
  onSubmit: () => void
  onRetry: () => void
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}

export function ArrangeSyllablesBoard({ question, state, settings, onPlace, onReturn, onReorder, onReset, onSubmit, onRetry, onPrevious, onNext, isFirst, isLast }: ArrangeSyllablesBoardProps) {
  const [activeSyllableId, setActiveSyllableId] = useState<string | null>(null)
  const canDrag = question.interactionMode === "DRAG_ORDER" || question.interactionMode === "BOTH"
  const canClick = question.interactionMode === "CLICK_ORDER" || question.interactionMode === "BOTH"
  const { image, audio } = promptMedia(question)
  const syllableById = useMemo(() => new Map(question.targetSyllables.map((syllable) => [syllable.id, syllable])), [question.targetSyllables])
  const activeSyllable = activeSyllableId ? syllableById.get(activeSyllableId) : undefined
  const activePosition = Math.min(state.arrangedSyllableIds.length, question.targetSyllables.length)
  const retryAllowed = canRetryArrangeSyllables(state, settings)
  const isComplete = state.arrangedSyllableIds.length === question.targetSyllables.length
  const studentWord = formedSyllableWord(question, state.arrangedSyllableIds)
  const onDragStart = (event: DragStartEvent) => setActiveSyllableId(String(event.active.id).replace("arrange-syllable:", ""))
  const onDragEnd = (event: DragEndEvent) => {
    setActiveSyllableId(null)
    const syllableId = String(event.active.id).replace("arrange-syllable:", "")
    const overId = event.over ? String(event.over.id) : ""
    if (!syllableById.has(syllableId)) return
    if (overId === "arrange-syllable-bank") onReturn(syllableId)
    else if (overId.startsWith("arrange-syllable-slot:")) onReorder(syllableId, Number(overId.replace("arrange-syllable-slot:", "")))
  }
  return <DndProvider onDragStart={onDragStart} onDragEnd={onDragEnd}><Card className="border-border/80 shadow-sm"><CardHeader className="space-y-3"><p className="text-sm font-semibold text-primary">Susun suku kata untuk membentuk perkataan</p><CardTitle className="text-xl leading-snug sm:text-2xl">{question.title ?? "Susun suku kata"}</CardTitle>{question.prompt ? <p className="text-base leading-7 text-foreground sm:text-lg">{question.prompt}</p> : null}{question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{question.instructions}</p> : null}{question.showReferenceText ? <p className="rounded-xl bg-muted px-3 py-2 text-lg font-semibold">Contoh perkataan: {question.targetWord}</p> : null}</CardHeader><CardContent className="space-y-5">{image ? <MediaViewer media={image} className="max-h-80 w-full rounded-2xl object-contain" /> : null}{audio ? <MediaViewer media={audio} /> : null}<SyllableAnswerRow syllables={question.targetSyllables} arrangedSyllableIds={state.arrangedSyllableIds} showTargetSlots={question.showTargetSlots} activePosition={activePosition} disabled={state.submitted} canDrag={canDrag} canClick={canClick} onReturn={onReturn} />{studentWord ? <p className="text-sm text-muted-foreground">Perkataan dibentuk: <span className="font-semibold text-foreground">{studentWord}</span></p> : null}{state.validationError ? <p role="alert" className="text-sm font-medium text-destructive">Sila susun semua suku kata sebelum menyemak jawapan.</p> : null}<SyllableBank syllables={state.bankOrder.map((id) => syllableById.get(id)).filter((syllable): syllable is NonNullable<typeof syllable> => Boolean(syllable))} arrangedSyllableIds={state.arrangedSyllableIds} disabled={state.submitted} canDrag={canDrag} canClick={canClick} onSelect={(syllableId) => onPlace(syllableId)} onReturn={() => undefined} /><ArrangeSyllablesFeedback submitted={state.submitted} isCorrect={state.isCorrect} message={state.feedback} explanation={question.explanation} showExplanation={settings.showExplanation} showImmediateFeedback={settings.showImmediateFeedback} /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" className="h-11 min-w-28" disabled={isFirst} onClick={onPrevious}><ChevronLeft /> Sebelum</Button><div className="flex flex-wrap gap-2">{!state.submitted ? <><Button type="button" variant="outline" className="h-11" disabled={state.arrangedSyllableIds.length === 0} onClick={onReset}><RotateCcw /> Set semula</Button><Button type="button" className="h-11 min-w-36" disabled={!isComplete} onClick={onSubmit}><Send /> Semak jawapan</Button></> : null}{retryAllowed ? <Button type="button" variant="outline" className="h-11" onClick={onRetry}>Cuba lagi</Button> : null}{state.completed ? <Button type="button" className="h-11 min-w-28" onClick={onNext}>{isLast ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}</div></div></CardContent></Card><DragOverlay dropAnimation={null}>{activeSyllable ? <Card className="min-w-20 border-primary bg-card py-0 shadow-lg"><CardContent className="flex min-h-16 items-center justify-center px-4 py-2 text-xl font-bold">{activeSyllable.value}</CardContent></Card> : null}</DragOverlay></DndProvider>
}
