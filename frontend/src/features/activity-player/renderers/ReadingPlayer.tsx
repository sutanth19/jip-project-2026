import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { MediaViewer } from "../components/MediaViewer"
import { ReadingAudioControls } from "./reading/ReadingAudioControls"
import { ReadingCountdown } from "./reading/ReadingCountdown"
import { ReadingFeedback } from "./reading/ReadingFeedback"
import { ReadingHint } from "./reading/ReadingHint"
import { ReadingPanel } from "./reading/ReadingPanel"
import { ReadingToolbar } from "./reading/ReadingToolbar"
import type { ReadingSessionState } from "./reading/reading.types"
import { beginReadingCountdown, buildReadingCompletionSummary, countdownTick, createReadingState, finishReading, getReadingSettings, mapReadingQuestion, markReadingAudioUsed, meetsReadingCompletion, nextReadingParagraph, pauseReading, previousReadingParagraph, readingCompletionHelp, readingTick, resetReading, resumeReading, setReadingHints, updateReadingSession, updateReadingZoom } from "./reading/reading.utils"

const SESSION_KEY = "reading-session"

function asSession(value: unknown): ReadingSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ReadingSessionState : {}
}

export function ReadingPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const [reducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  const mapped = useMemo(() => currentItem ? mapReadingQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok ? session[mapped.question.itemId] ?? createReadingState() : null
  const settings = useMemo(() => mapped.ok ? getReadingSettings(activity, mapped.question) : null, [activity, mapped])

  const persist = useCallback((nextState: ReadingSessionState[string]) => {
    if (!mapped.ok) return
    setTemporaryState(SESSION_KEY, updateReadingSession(session, mapped.question.itemId, nextState))
    setAnswer(mapped.question.itemId, { phase: nextState.phase, elapsedSeconds: nextState.elapsedSeconds, currentParagraphIndex: nextState.currentParagraphIndex, completed: nextState.completed, zoomPercent: nextState.zoomPercent })
  }, [mapped, session, setAnswer, setTemporaryState])

  useEffect(() => {
    if (!mapped.ok || session[mapped.question.itemId]) return
    setTemporaryState(SESSION_KEY, updateReadingSession(session, mapped.question.itemId, createReadingState()))
  }, [mapped, session, setTemporaryState])

  useEffect(() => {
    if (!mapped.ok || !state) return
    if (state.phase === "COUNTDOWN") {
      const timeout = window.setTimeout(() => persist(countdownTick(state)), 1000)
      return () => window.clearTimeout(timeout)
    }
    if (state.phase === "READING") {
      const timeout = window.setTimeout(() => persist(readingTick(state)), 1000)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [mapped, persist, state])

  if (!mapped.ok || !state || !settings) return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item bacaan tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>


  const submit = () => {
    const nextState = finishReading(state, mapped.question, settings)
    persist(nextState)
    if (nextState.completed) markItemCompleted(mapped.question.itemId)
  }

  const next = () => {
    const nextSession = updateReadingSession(session, mapped.question.itemId, state)
    setTemporaryState(SESSION_KEY, nextSession)
    const questions = items.map(mapReadingQuestion).filter((result): result is Extract<typeof result, { ok: true }> => result.ok).map((result) => result.question)
    setCompletionSummary(buildReadingCompletionSummary(nextSession, questions))
    nextItem()
  }

  const feedbackMessage = state.feedback ?? state.validationMessage
  const helpText = readingCompletionHelp(state, mapped.question)

  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        {mapped.limitations.length > 0 ? <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">{mapped.limitations[0]}</div> : null}
        {mapped.question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{mapped.question.instructions}</p> : null}
        {mapped.question.media.image[0] ? <MediaViewer media={mapped.question.media.image[0]} className="max-h-80 w-full rounded-2xl object-contain" /> : null}
        {mapped.question.media.instructionAudio.map((media) => <MediaViewer key={media.id} media={media} />)}
        <ReadingAudioControls media={mapped.question.media.audio[0]} showPlayAudio={mapped.question.tools.showPlayAudio} showReplay={mapped.question.tools.showReplay} showPause={mapped.question.tools.showPause} onAudioStart={() => persist(markReadingAudioUsed(state))} />
        <ReadingToolbar question={mapped.question} state={state} onStart={() => persist(beginReadingCountdown(state))} onPause={() => persist(pauseReading(state))} onResume={() => persist(resumeReading(state))} onReset={() => persist(resetReading(state))} onPreviousParagraph={() => persist(previousReadingParagraph(state))} onNextParagraph={() => persist(nextReadingParagraph(state, mapped.question))} onZoom={(value) => persist(updateReadingZoom(state, value))} />
        <ReadingCountdown value={state.countdownValue} />
        <ReadingPanel question={mapped.question} state={state} emphasizeCurrent={state.phase !== "IDLE" || state.hints.highlightText} emphasizeFirstParagraph={state.hints.firstParagraph} reducedMotion={reducedMotion} />
        <p className="text-sm text-muted-foreground">Pemain ini mengesahkan penyertaan bacaan secara setempat sahaja. Ia tidak menilai sebutan, kefasihan, atau pemahaman murid.</p>
        <ReadingHint question={mapped.question} onHighlightText={(value) => persist(setReadingHints(state, { ...state.hints, highlightText: value }))} onShowFirstParagraph={(value) => persist(setReadingHints(state, { ...state.hints, firstParagraph: value }))} onAudioStart={() => persist(markReadingAudioUsed(state))} />
        {helpText && !state.completed ? <p className="text-sm text-muted-foreground" aria-live="polite">{helpText}</p> : null}
        <ReadingFeedback show={Boolean(feedbackMessage) && (state.completed || Boolean(state.validationMessage) || settings.showImmediateFeedback)} complete={state.completed} message={feedbackMessage} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button type="button" variant="outline" className="h-11 min-w-28" disabled={currentIndex === 0} onClick={previousItem}><ChevronLeft /> Sebelum</Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11 min-w-36" disabled={!meetsReadingCompletion(state, mapped.question)} onClick={submit}>Selesai Membaca</Button>
            {state.completed && <Button type="button" className="h-11 min-w-28" onClick={next}>{currentIndex === items.length - 1 ? "Selesai" : "Seterusnya"}<ChevronRight /></Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
