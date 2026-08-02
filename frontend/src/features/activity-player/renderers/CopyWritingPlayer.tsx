import { ChevronLeft, ChevronRight, Send } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { MediaViewer } from "../components/MediaViewer"
import { CopyWritingCanvas } from "./copy-writing/CopyWritingCanvas"
import { CopyWritingFeedback } from "./copy-writing/CopyWritingFeedback"
import { CopyWritingHint } from "./copy-writing/CopyWritingHint"
import { CopyWritingReference } from "./copy-writing/CopyWritingReference"
import { CopyWritingToolbar } from "./copy-writing/CopyWritingToolbar"
import type { CopyWritingSessionState, CopyWritingState, CopyWritingStroke } from "./copy-writing/copy-writing.types"
import { addCopyWritingStroke, buildCopyWritingCompletionSummary, clearCopyWriting, createCopyWritingState, eraseCopyWritingStroke, getCopyWritingSettings, mapCopyWritingQuestion, redoCopyWriting, retryCopyWriting, submitCopyWriting, undoCopyWriting, updateCopyWritingSession } from "./copy-writing/copy-writing.utils"

const SESSION_KEY = "copy-writing-session"

function asSession(value: unknown): CopyWritingSessionState { return value && typeof value === "object" && !Array.isArray(value) ? value as CopyWritingSessionState : {} }

export function CopyWritingPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const [referenceHint, setReferenceHint] = useState(false)
  const [linesHint, setLinesHint] = useState(false)
  const mapped = useMemo(() => currentItem ? mapCopyWritingQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok ? session[mapped.question.itemId] ?? createCopyWritingState(mapped.question) : null
  const settings = useMemo(() => mapped.ok ? getCopyWritingSettings(activity, mapped.question) : null, [activity, mapped])
  useEffect(() => { if (!mapped.ok || session[mapped.question.itemId]) return; setTemporaryState(SESSION_KEY, updateCopyWritingSession(session, mapped.question.itemId, createCopyWritingState(mapped.question))) }, [mapped, session, setTemporaryState])
  if (!mapped.ok || !state || !settings) return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item menyalin tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>
  const persist = (nextState: CopyWritingState) => { setTemporaryState(SESSION_KEY, updateCopyWritingSession(session, mapped.question.itemId, nextState)); setAnswer(mapped.question.itemId, nextState.strokes) }
  const submit = () => { const nextState = submitCopyWriting(state, mapped.question, settings); persist(nextState); if (nextState.completed) markItemCompleted(mapped.question.itemId) }
  const next = () => { const nextSession = updateCopyWritingSession(session, mapped.question.itemId, state); setTemporaryState(SESSION_KEY, nextSession); const questions = items.map(mapCopyWritingQuestion).filter((result): result is Extract<typeof result, { ok: true }> => result.ok).map((result) => result.question); setCompletionSummary(buildCopyWritingCompletionSummary(nextSession, questions)); nextItem() }
  const reference = <CopyWritingReference key={`reference:${mapped.question.itemId}`} question={mapped.question} emphasized={referenceHint} repeat={mapped.question.referenceDisplay.position === "ABOVE_EACH_LINE"} />
  const canvas = <CopyWritingCanvas question={mapped.question} state={state} emphasizedLines={linesHint} onAddStroke={(stroke: CopyWritingStroke) => persist(addCopyWritingStroke(state, stroke))} onEraseStroke={(strokeId) => persist(eraseCopyWritingStroke(state, strokeId))} />
  const content = mapped.question.referenceDisplay.position === "LEFT" ? <div className="grid gap-4 lg:grid-cols-[minmax(12rem,0.45fr)_minmax(0,1fr)] lg:items-start"><div>{reference}</div><div>{canvas}</div></div> : <div className="space-y-4">{reference}{canvas}</div>
  return <Card key={mapped.question.itemId} className="border-border/80 shadow-sm"><CardHeader className="space-y-3"><p className="text-sm font-semibold text-primary">Salin teks rujukan ke ruang tulisan</p><CardTitle className="text-xl leading-snug sm:text-2xl">{mapped.question.contentMode === "LETTER" ? "Salin huruf" : "Latihan menyalin"}</CardTitle>{mapped.question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{mapped.question.instructions}</p> : null}</CardHeader><CardContent className="space-y-5">{mapped.question.media.instructionAudio.map((media) => <MediaViewer key={media.id} media={media} />)}{content}<p className="text-sm text-muted-foreground">Touch, stylus, atau pointer input diperlukan untuk tulisan tangan. Teks rujukan dan semua kawalan kekal boleh diakses.</p><CopyWritingToolbar tools={mapped.question.tools} state={state} onTool={(selectedTool) => persist({ ...state, selectedTool })} onUndo={() => persist(undoCopyWriting(state))} onRedo={() => persist(redoCopyWriting(state))} onClear={() => persist(clearCopyWriting(state))} onWidth={(strokeWidth) => persist({ ...state, strokeWidth })} /><CopyWritingHint key={mapped.question.itemId} question={mapped.question} onShowReference={setReferenceHint} onShowLines={setLinesHint} />{state.validation && !state.submitted ? <p role="alert" className="text-sm font-medium text-destructive">{state.feedback}</p> : null}<CopyWritingFeedback submitted={state.submitted} complete={state.isComplete} message={state.feedback} showImmediateFeedback={settings.showImmediateFeedback} /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" className="h-11 min-w-28" disabled={currentIndex === 0} onClick={previousItem}><ChevronLeft /> Sebelum</Button><div className="flex flex-wrap gap-2">{!state.submitted ? <Button type="button" className="h-11 min-w-36" disabled={state.strokes.length === 0} onClick={submit}><Send /> Semak tulisan</Button> : null}{state.submitted && state.isComplete === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed) ? <Button type="button" variant="outline" className="h-11" onClick={() => persist(retryCopyWriting(state, mapped.question))}>Cuba lagi</Button> : null}{state.completed ? <Button type="button" className="h-11 min-w-28" onClick={next}>{currentIndex === items.length - 1 ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}</div></div></CardContent></Card>
}
