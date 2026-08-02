import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { MediaViewer } from "../components/MediaViewer"
import { VoiceRecordingControls } from "./voice-recording/VoiceRecordingControls"
import { VoiceRecordingFeedback } from "./voice-recording/VoiceRecordingFeedback"
import { VoiceRecordingPermissionState } from "./voice-recording/VoiceRecordingPermissionState"
import { VoiceRecordingPlayback } from "./voice-recording/VoiceRecordingPlayback"
import { VoiceRecordingPrompt } from "./voice-recording/VoiceRecordingPrompt"
import { VoiceRecordingTimer } from "./voice-recording/VoiceRecordingTimer"
import type { VoiceRecordingSessionState, VoiceRecordingState } from "./voice-recording/voice-recording.types"
import { createRecordingUrl, revokeMediaUrl } from "./voice-recording/voice-recording.media"
import { buildVoiceRecordingCompletionSummary, canRetryVoiceRecording, createVoiceRecordingState, finalizeRecording, mapVoiceRecordingQuestion, recordingSecondsRemaining, resetVoiceRecording, setPermissionState, setRecordedBlob, startRecordingState, stopCurrentStream, stopRecordingState, supportsVoiceRecordingApi, tickRecordingState } from "./voice-recording/voice-recording.utils"

const SESSION_KEY = "voice-recording-session"

function asSession(value: unknown): VoiceRecordingSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as VoiceRecordingSessionState : {}
}

function isDomException(value: unknown): value is DOMException {
  return value instanceof DOMException
}

async function requestMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true })
}

export function VoiceRecordingPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const mapped = useMemo(() => currentItem ? mapVoiceRecordingQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok ? session[mapped.question.itemId] ?? createVoiceRecordingState(mapped.question) : null
  const [isSupported] = useState(() => supportsVoiceRecordingApi())
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [reducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const persist = useCallback((nextState: VoiceRecordingState) => {
    if (!mapped.ok) return
    setTemporaryState(SESSION_KEY, { ...session, [mapped.question.itemId]: nextState })
    setAnswer(mapped.question.itemId, { status: nextState.status, attemptCount: nextState.attemptCount, completed: nextState.completed, elapsedSeconds: nextState.elapsedSeconds, recordedSeconds: nextState.recordedSeconds })
  }, [mapped, session, setAnswer, setTemporaryState])

  const stopRecording = useCallback(() => {
    if (!mapped.ok || !state) return
    recorderRef.current?.stop()
    recorderRef.current = null
    stopCurrentStream(stream)
    setStream(null)
    persist(stopRecordingState(state))
  }, [mapped, persist, state, stream])

  useEffect(() => {
    if (!mapped.ok || session[mapped.question.itemId]) return
    setTemporaryState(SESSION_KEY, { ...session, [mapped.question.itemId]: createVoiceRecordingState(mapped.question) })
  }, [mapped, session, setTemporaryState])

  useEffect(() => {
    if (!mapped.ok || !state || state.status !== "recording") return undefined
    const interval = window.setInterval(() => {
      setTemporaryState(SESSION_KEY, {
        ...session,
        [mapped.question.itemId]: tickRecordingState(asSession(temporaryState[SESSION_KEY])[mapped.question.itemId] ?? state),
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [mapped, session, state, temporaryState, setTemporaryState])

  useEffect(() => {
    return () => {
      stopCurrentStream(stream)
      if (state?.mediaUrl) revokeMediaUrl(state.mediaUrl)
    }
  }, [state?.mediaUrl, stream])

  useEffect(() => {
    if (!mapped.ok || !state || state.status !== "recording") return undefined
    if (state.elapsedSeconds < mapped.question.recording.maximumDurationSeconds) return undefined
    if (mapped.question.recording.autoStop && recorderRef.current) stopRecording()
    return undefined
  }, [mapped, state, stopRecording])

  if (!mapped.ok || !state) {
    return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item rakaman suara tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>
  }

  const settings = { allowRetry: activity.allowRetry && mapped.question.recording.allowReRecord, showImmediateFeedback: activity.showImmediateFeedback, attemptsAllowed: activity.attemptsAllowed }

  const handleRecordingReady = (blob: Blob, seconds: number) => {
    if (state.mediaUrl) revokeMediaUrl(state.mediaUrl)
    const url = createRecordingUrl(blob)
    persist(setRecordedBlob({ ...state, permission: "granted" }, blob, url, seconds))
    if (mapped.question.recording.autoSubmitOnFinish) {
      submitRecording(blob, url, seconds)
    }
  }

  const startRecording = async () => {
    if (!isSupported) {
      persist(setPermissionState(state, "unsupported"))
      return
    }

    try {
      persist(setPermissionState(state, "prompting"))
      const nextStream = await requestMicrophone()
      stopCurrentStream(stream)
      setStream(nextStream)
      const recorder = new MediaRecorder(nextStream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        handleRecordingReady(blob, state.elapsedSeconds)
        setStream(null)
      }
      recorder.start()
      persist(startRecordingState({ ...state, permission: "granted" }))
    } catch (error: unknown) {
      const permission = isDomException(error) && (error.name === "NotAllowedError" || error.name === "SecurityError")
        ? "denied"
        : isDomException(error) && error.name === "NotFoundError"
          ? "busy"
          : "error"
      persist(setPermissionState(state, permission))
      stopCurrentStream(stream)
      setStream(null)
    }
  }

  const submitRecording = (blobOverride?: Blob, urlOverride?: string, secondsOverride?: number) => {
    const seconds = secondsOverride ?? state.recordedSeconds ?? state.elapsedSeconds
    if (!state.mediaBlob && !blobOverride) {
      persist({ ...state, validationMessage: "Sila rakam suara dahulu." })
      return
    }
    if (seconds < mapped.question.recording.minimumDurationSeconds) {
      persist({ ...state, validationMessage: `Rakaman mesti sekurang-kurangnya ${mapped.question.recording.minimumDurationSeconds} saat.` })
      return
    }
    const nextState = finalizeRecording({ ...state, mediaBlob: blobOverride ?? state.mediaBlob, mediaUrl: urlOverride ?? state.mediaUrl, recordedSeconds: seconds, attemptCount: state.attemptCount + 1 }, settings.showImmediateFeedback)
    persist(nextState)
    markItemCompleted(mapped.question.itemId)
  }

  const resetCurrentRecording = () => {
    if (state.mediaUrl) revokeMediaUrl(state.mediaUrl)
    stopCurrentStream(stream)
    setStream(null)
    recorderRef.current = null
    chunksRef.current = []
    persist(resetVoiceRecording(state, mapped.question))
  }

  const retryCurrentRecording = () => {
    if (!canRetryVoiceRecording(state, settings)) return
    resetCurrentRecording()
  }

  const next = () => {
    const nextSession = { ...session, [mapped.question.itemId]: state }
    setTemporaryState(SESSION_KEY, nextSession)
    const questions = items.map(mapVoiceRecordingQuestion).filter((result): result is Extract<typeof result, { ok: true }> => result.ok).map((result) => result.question)
    setCompletionSummary(buildVoiceRecordingCompletionSummary(nextSession, questions))
    nextItem()
  }

  const feedback = state.feedback ?? state.validationMessage
  const canSubmit = Boolean(state.mediaBlob) && state.status !== "recording" && !state.submitted
  const canStart = state.status !== "recording" && (!state.submitted || canRetryVoiceRecording(state, settings))
  const permissionStatus = isSupported ? state.permission : "unsupported"

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-3">
        <p className="text-sm font-semibold text-primary">Rakaman suara setempat untuk aktiviti ini</p>
        <CardTitle className="text-xl leading-snug sm:text-2xl">{mapped.question.prompt.title ?? "Rakaman suara"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {mapped.limitations.length > 0 ? <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">{mapped.limitations[0]}</div> : null}
        <VoiceRecordingPrompt question={mapped.question} />
        {mapped.question.prompt.media.map((media) => <MediaViewer key={media.id} media={media} />)}
        <VoiceRecordingPermissionState status={permissionStatus} />
        <VoiceRecordingTimer elapsedSeconds={state.elapsedSeconds} remainingSeconds={recordingSecondsRemaining(state, mapped.question)} recording={state.status === "recording"} />
        <VoiceRecordingControls
          recording={state.status === "recording"}
          canRecord={canStart}
          canStop={state.status === "recording"}
          canSubmit={canSubmit}
          canReRecord={settings.allowRetry && canRetryVoiceRecording(state, settings)}
          isSupported={isSupported}
          onRequestPermission={() => { void startRecording() }}
          onStart={() => { void startRecording() }}
          onStop={stopRecording}
          onSubmit={() => submitRecording()}
          onReset={resetCurrentRecording}
          onReRecord={retryCurrentRecording}
        />
        {state.mediaUrl ? <VoiceRecordingPlayback url={state.mediaUrl} canPlayback={mapped.question.recording.allowPlayback} onDelete={resetCurrentRecording} /> : null}
        <VoiceRecordingFeedback show={Boolean(feedback)} complete={state.completed} message={feedback} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button type="button" variant="outline" className="h-11 min-w-28" disabled={currentIndex === 0} onClick={previousItem}><ChevronLeft /> Sebelum</Button>
          <div className="flex flex-wrap gap-2">
            {state.completed ? <Button type="button" className="h-11 min-w-28" onClick={next}>{currentIndex === items.length - 1 ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}
          </div>
        </div>
        {reducedMotion ? <p className="text-xs text-muted-foreground">Animasi minimum diaktifkan untuk keutamaan peranti ini.</p> : null}
      </CardContent>
    </Card>
  )
}
