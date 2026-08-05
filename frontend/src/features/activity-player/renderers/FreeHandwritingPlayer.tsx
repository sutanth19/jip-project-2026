import { ChevronLeft, ChevronRight, Send } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { FreeHandwritingCanvas } from "./free-handwriting/FreeHandwritingCanvas"
import { FreeHandwritingFeedback } from "./free-handwriting/FreeHandwritingFeedback"
import { FreeHandwritingHint } from "./free-handwriting/FreeHandwritingHint"
import { FreeHandwritingPrompt } from "./free-handwriting/FreeHandwritingPrompt"
import { FreeHandwritingToolbar } from "./free-handwriting/FreeHandwritingToolbar"
import type { FreeHandwritingSessionState, FreeHandwritingState, FreeHandwritingStroke } from "./free-handwriting/free-handwriting.types"
import { addFreeHandwritingStroke, buildFreeHandwritingCompletionSummary, clearFreeHandwriting, createFreeHandwritingState, eraseFreeHandwritingStroke, getFreeHandwritingSettings, mapFreeHandwritingQuestion, redoFreeHandwriting, retryFreeHandwriting, submitFreeHandwriting, undoFreeHandwriting, updateFreeHandwritingSession } from "./free-handwriting/free-handwriting.utils"

const SESSION_KEY = "free-handwriting-session"

function asSession(value: unknown): FreeHandwritingSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as FreeHandwritingSessionState : {}
}

export function FreeHandwritingPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const [promptHint, setPromptHint] = useState(false)
  const [imageHint, setImageHint] = useState(false)
  const [linesHint, setLinesHint] = useState(false)
  const [areaHint, setAreaHint] = useState(false)
  const mapped = useMemo(() => currentItem ? mapFreeHandwritingQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok ? session[mapped.question.itemId] ?? createFreeHandwritingState(mapped.question) : null
  const settings = useMemo(() => mapped.ok ? getFreeHandwritingSettings(activity, mapped.question) : null, [activity, mapped])

  useEffect(() => {
    if (!mapped.ok || session[mapped.question.itemId]) return
    setTemporaryState(SESSION_KEY, updateFreeHandwritingSession(session, mapped.question.itemId, createFreeHandwritingState(mapped.question)))
  }, [mapped, session, setTemporaryState])


  if (!mapped.ok || !state || !settings) return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item tulisan bebas tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>

  const persist = (nextState: FreeHandwritingState) => {
    setTemporaryState(SESSION_KEY, updateFreeHandwritingSession(session, mapped.question.itemId, nextState))
    setAnswer(mapped.question.itemId, nextState.strokes)
  }

  const submit = () => {
    const nextState = submitFreeHandwriting(state, mapped.question, settings)
    persist(nextState)
    if (nextState.completed) markItemCompleted(mapped.question.itemId)
  }

  const next = () => {
    const nextSession = updateFreeHandwritingSession(session, mapped.question.itemId, state)
    setTemporaryState(SESSION_KEY, nextSession)
    const questions = items.map(mapFreeHandwritingQuestion).filter((result): result is Extract<typeof result, { ok: true }> => result.ok).map((result) => result.question)
    setCompletionSummary(buildFreeHandwritingCompletionSummary(nextSession, questions))
    nextItem()
  }

  return (
    <Card key={mapped.question.itemId} className="border-border/80 shadow-sm">
      <CardHeader className="space-y-3">
        <p className="text-sm font-semibold text-primary">Tulis jawapan bebas pada ruang yang disediakan</p>
        <CardTitle className="text-xl leading-snug sm:text-2xl">Tulisan bebas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <FreeHandwritingPrompt question={mapped.question} emphasizedPrompt={promptHint} emphasizedImage={imageHint} />
        <FreeHandwritingCanvas question={mapped.question} state={state} emphasizedLines={linesHint} emphasizedArea={areaHint} onAddStroke={(stroke: FreeHandwritingStroke) => persist(addFreeHandwritingStroke(state, stroke))} onEraseStroke={(strokeId) => persist(eraseFreeHandwritingStroke(state, strokeId))} />
        <p className="text-sm text-muted-foreground">Touch, stylus, atau pointer input diperlukan untuk tulisan tangan. Prompt dan semua kawalan kekal boleh diakses.</p>
        {mapped.question.teacherReviewRequired ? <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">Tulisan ini memerlukan semakan guru selepas dihantar dalam fasa akan datang.</p> : null}
        <FreeHandwritingToolbar tools={mapped.question.tools} state={state} onTool={(selectedTool) => persist({ ...state, selectedTool })} onUndo={() => persist(undoFreeHandwriting(state))} onRedo={() => persist(redoFreeHandwriting(state))} onClear={() => persist(clearFreeHandwriting(state))} onWidth={(strokeWidth) => persist({ ...state, strokeWidth })} />
        <FreeHandwritingHint key={mapped.question.itemId} question={mapped.question} onShowPrompt={setPromptHint} onShowImage={setImageHint} onShowLines={setLinesHint} onShowArea={setAreaHint} />
        {state.validation && !state.submitted ? <p role="alert" className="text-sm font-medium text-destructive">{state.feedback}</p> : null}
        <FreeHandwritingFeedback submitted={state.submitted} complete={state.isComplete} message={state.feedback} showImmediateFeedback={settings.showImmediateFeedback} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button type="button" variant="outline" className="h-11 min-w-28" disabled={currentIndex === 0} onClick={previousItem}><ChevronLeft /> Sebelum</Button>
          <div className="flex flex-wrap gap-2">
            {!state.submitted ? <Button type="button" className="h-11 min-w-36" disabled={state.strokes.length === 0} onClick={submit}><Send /> Semak tulisan</Button> : null}
            {state.submitted && state.isComplete === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed) ? <Button type="button" variant="outline" className="h-11" onClick={() => persist(retryFreeHandwriting(state, mapped.question))}>Cuba lagi</Button> : null}
            {state.completed ? <Button type="button" className="h-11 min-w-28" onClick={next}>{currentIndex === items.length - 1 ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
