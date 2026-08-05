import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import { VoiceRecordingFeedback } from "@/features/activity-player/renderers/voice-recording/VoiceRecordingFeedback"
import { VoiceRecordingPermissionState } from "@/features/activity-player/renderers/voice-recording/VoiceRecordingPermissionState"
import { VoiceRecordingPrompt } from "@/features/activity-player/renderers/voice-recording/VoiceRecordingPrompt"
import { VoiceRecordingTimer } from "@/features/activity-player/renderers/voice-recording/VoiceRecordingTimer"
import type { ActivityQuestion } from "@/features/activity-player/types"
import { buildVoiceRecordingCompletionSummary, canRetryVoiceRecording, createVoiceRecordingState, finalizeRecording, getVoiceRecordingSettings, mapVoiceRecordingQuestion, recordingSecondsRemaining, resetVoiceRecording, setPermissionState, setRecordedBlob, startRecordingState, stopRecordingState, tickRecordingState, supportsVoiceRecordingApi } from "@/features/activity-player/renderers/voice-recording/voice-recording.utils"

const voiceRecordingItem: ActivityQuestion = {
  id: "voice-item-1",
  sequence: 0,
  sectionKey: null,
  isRequired: true,
  marks: null,
  configuration: {
    voiceRecording: {
      prompt: {
        title: "Baca ayat ini",
        content: "Baca ayat ini dengan jelas.",
        media: [{ id: "m1", mediaKey: "prompt.mp3", mediaRole: "PROMPT_AUDIO", mimeType: "audio/mpeg", label: "Arahan", altText: "Arahan", sequence: 0, isPrimary: true, url: "/media/prompt.mp3" }],
      },
      recording: {
        minimumDurationSeconds: 3,
        maximumDurationSeconds: 60,
        maximumAttempts: 3,
        allowPlayback: true,
        allowReRecord: true,
        autoStop: true,
        autoSubmitOnFinish: false,
        required: true,
      },
      instructions: "Sebut dengan jelas.",
    },
  },
  questionBankItem: { id: "voice-question-1", type: "VOICE", title: "Rakaman suara", content: "Legacy tidak digunakan", answerType: "TEXT", correctAnswer: null, metadata: null, instructions: "Arahan", explanation: null, difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1", answerOptions: [], mediaLinks: [] },
}

function question(item: ActivityQuestion | (ActivityQuestion & { legacyVoiceRecording?: { incomplete?: boolean; reason?: string | null } | null }) = voiceRecordingItem) {
  const mapped = mapVoiceRecordingQuestion(item)
  if (!mapped.ok) throw new Error("Malformed Voice Recording fixture")
  return mapped.question
}

describe("Voice Recording player", () => {
  it("registers the renderer and consumes only the explicit voiceRecording contract", () => {
    expect(getActivityRenderer("voice-recording")).toBeTypeOf("function")
    expect(question().recording.maximumAttempts).toBe(3)
    expect(mapVoiceRecordingQuestion({ ...voiceRecordingItem, configuration: null }).ok).toBe(false)
    expect(mapVoiceRecordingQuestion({ ...voiceRecordingItem, configuration: { voiceRecording: { prompt: { content: "Baca", media: [] }, recording: { minimumDurationSeconds: 3, maximumDurationSeconds: 2, maximumAttempts: 3, allowPlayback: true, allowReRecord: true, autoStop: true, autoSubmitOnFinish: false, required: true } } } }).ok).toBe(false)
  })

  it("maps prompt media, recording limits, and safe unavailable states", () => {
    const mapped = question()
    expect(mapped.prompt.title).toBe("Baca ayat ini")
    expect(mapped.prompt.media[0]?.url).toBe("/media/prompt.mp3")
    expect(renderToStaticMarkup(<VoiceRecordingPrompt question={mapped} />)).toContain("Baca ayat ini")
    expect(renderToStaticMarkup(<VoiceRecordingPermissionState status="unsupported" />)).toContain("tidak menyokong rakaman suara")
  })

  it("tracks local recording state, timer helpers, retries, and completion summaries without backend mutation", () => {
    const mapped = question()
    const initial = createVoiceRecordingState(mapped)
    const started = startRecordingState(initial)
    const ticking = tickRecordingState({ ...started, status: "recording", elapsedSeconds: 2 })
    const blob = new Blob(["audio"], { type: "audio/webm" })
    const recorded = setRecordedBlob({ ...ticking, permission: "granted" }, blob, "/blob:test", 5)
    const submitted = finalizeRecording({ ...recorded, attemptCount: 1 }, true)
    const reset = resetVoiceRecording(submitted, mapped)
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(ticking.elapsedSeconds).toBe(3)
    expect(recordingSecondsRemaining(ticking, mapped)).toBe(57)
    expect(canRetryVoiceRecording({ ...submitted, submitted: true, completed: false }, { allowRetry: true, showImmediateFeedback: true, attemptsAllowed: 3 })).toBe(true)
    expect(getVoiceRecordingSettings({ allowRetry: true, showImmediateFeedback: true, attemptsAllowed: 3 }, mapped)).toMatchObject({ allowRetry: true, showImmediateFeedback: true, attemptsAllowed: 3 })
    expect(submitted.completed).toBe(true)
    expect(reset.status).toBe("idle")
    expect(buildVoiceRecordingCompletionSummary({ [mapped.itemId]: submitted }, [mapped])).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 1 })
    expect(setPermissionState(initial, "denied").permission).toBe("denied")
    expect(stopRecordingState({ ...submitted, mediaBlob: blob }).status).toBe("stopped")
    expect(supportsVoiceRecordingApi()).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it("renders feedback, timer, and legacy failure safely", () => {
    expect(renderToStaticMarkup(<VoiceRecordingTimer elapsedSeconds={4} remainingSeconds={56} recording />)).toContain("Masa berlalu")
    expect(renderToStaticMarkup(<VoiceRecordingFeedback show complete message="Hebat! Rakaman anda telah dilengkapkan." />)).toContain("aria-live")
    expect(mapVoiceRecordingQuestion({ ...voiceRecordingItem, legacyVoiceRecording: { incomplete: true, reason: "EXPLICIT_VOICE_RECORDING_CONTRACT_REQUIRED" } }).ok).toBe(false)
  })
})
