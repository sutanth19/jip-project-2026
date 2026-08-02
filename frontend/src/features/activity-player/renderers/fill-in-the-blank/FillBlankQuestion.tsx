import { ChevronLeft, ChevronRight, RotateCcw, Send } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getMediaKind } from "../../activity-player.utils"
import { MediaViewer } from "../../components/MediaViewer"
import { FillBlankFeedback } from "./FillBlankFeedback"
import { FillBlankHint } from "./FillBlankHint"
import { FillBlankInput } from "./FillBlankInput"
import { FillBlankWordBank } from "./FillBlankWordBank"
import type { FillBlankQuestion as FillBlankQuestionModel, FillBlankSettings, FillBlankState } from "./fill-in-the-blank.types"
import { canRetryFillBlank } from "./fill-in-the-blank.utils"

type FillBlankQuestionProps = { question: FillBlankQuestionModel; state: FillBlankState; settings: FillBlankSettings; onTypedAnswer: (blankId: string, answer: string) => void; onActivateBlank: (blankId: string) => void; onRemoveAnswer: (blankId: string) => void; onSelectWord: (entryId: string) => void; onReset: () => void; onSubmit: () => void; onRetry: () => void; onPrevious: () => void; onNext: () => void; isFirst: boolean; isLast: boolean }

export function FillBlankQuestion({ question, state, settings, onTypedAnswer, onActivateBlank, onRemoveAnswer, onSelectWord, onReset, onSubmit, onRetry, onPrevious, onNext, isFirst, isLast }: FillBlankQuestionProps) {
  const image = question.media.find((media) => getMediaKind(media) === "image")
  const audio = question.media.find((media) => getMediaKind(media) === "audio")
  const blankById = new Map(question.blanks.map((blank) => [blank.id, blank]))
  const usedEntryIds = new Set(Object.values(state.wordBankAssignments))
  const retryAllowed = canRetryFillBlank(state, settings)
  useEffect(() => { const firstError = state.validationErrorIds[0]; if (firstError) document.getElementById(`fill-blank-${firstError}`)?.focus() }, [state.validationErrorIds])

  return <Card className="border-border/80 shadow-sm"><CardHeader className="space-y-3"><p className="text-sm font-semibold text-primary">Lengkapkan tempat kosong</p><CardTitle className="text-xl leading-snug sm:text-2xl">{question.title ?? "Isi jawapan"}</CardTitle>{question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{question.instructions}</p> : null}</CardHeader><CardContent className="space-y-5">{image ? <MediaViewer media={image} className="max-h-80 w-full rounded-2xl object-contain" /> : null}{audio ? <MediaViewer media={audio} /> : null}<p className="sr-only" aria-live="polite">{state.activeBlankId ? `Blank aktif: ${state.activeBlankId}.` : ""}</p><div className="rounded-xl bg-muted/20 p-4 text-lg leading-10 sm:p-5 sm:text-xl">{question.segments.map((segment, index) => { if (segment.type === "text") return <span key={`text-${index}`} className="whitespace-pre-wrap">{segment.content}</span>; const blank = blankById.get(segment.blankId); return blank ? <FillBlankInput key={blank.id} blank={blank} answer={state.answers[blank.id] ?? ""} active={state.activeBlankId === blank.id} submitted={state.submitted} showImmediateFeedback={settings.showImmediateFeedback} correctness={state.blankCorrectness[blank.id]} invalid={state.validationErrorIds.includes(blank.id)} onChange={(answer) => onTypedAnswer(blank.id, answer)} onActivate={() => onActivateBlank(blank.id)} onRemove={() => onRemoveAnswer(blank.id)} /> : null })}</div><div className="flex flex-wrap gap-2">{question.blanks.map((blank) => <FillBlankHint key={blank.id} blank={blank} />)}</div><FillBlankWordBank entries={state.wordBankOrder.map((id) => question.wordBank.find((entry) => entry.id === id)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))} usedEntryIds={usedEntryIds} activeBlankId={state.activeBlankId} disabled={state.submitted} onSelect={onSelectWord} /><FillBlankFeedback submitted={state.submitted} isCorrect={state.isCorrect} message={state.feedback} explanation={question.explanation} showExplanation={settings.showExplanation} showImmediateFeedback={settings.showImmediateFeedback} /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" className="h-11 min-w-28" disabled={isFirst} onClick={onPrevious}><ChevronLeft /> Sebelum</Button><div className="flex flex-wrap gap-2">{!state.submitted ? <><Button type="button" variant="outline" className="h-11" disabled={Object.keys(state.answers).length === 0} onClick={onReset}><RotateCcw /> Set semula</Button><Button type="button" className="h-11 min-w-36" onClick={onSubmit}><Send /> Semak jawapan</Button></> : null}{retryAllowed ? <Button type="button" variant="outline" className="h-11" onClick={onRetry}>Cuba lagi</Button> : null}{state.completed ? <Button type="button" className="h-11 min-w-28" onClick={onNext}>{isLast ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}</div></div></CardContent></Card>
}
