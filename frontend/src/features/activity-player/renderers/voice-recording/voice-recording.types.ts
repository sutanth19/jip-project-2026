import type { ActivityMedia, ActivityQuestion } from "../../types"

export type VoiceRecordingPrompt = {
  title: string | null
  content: string
  media: ActivityMedia[]
}

export type VoiceRecordingRecording = {
  minimumDurationSeconds: number
  maximumDurationSeconds: number
  maximumAttempts: number
  allowPlayback: boolean
  allowReRecord: boolean
  autoStop: boolean
  autoSubmitOnFinish: boolean
  required: boolean
}

export type VoiceRecordingQuestion = {
  itemId: string
  sequence: number
  prompt: VoiceRecordingPrompt
  recording: VoiceRecordingRecording
  instructions: string | null
}

export type VoiceRecordingSessionState = Record<string, VoiceRecordingState> & {
  started?: boolean
}

export type VoiceRecordingPermissionStatus = "idle" | "prompting" | "granted" | "denied" | "unsupported" | "busy" | "error"

export type VoiceRecordingState = {
  status: "idle" | "recording" | "stopped" | "submitted" | "completed"
  permission: VoiceRecordingPermissionStatus
  elapsedSeconds: number
  recordedSeconds: number
  attemptCount: number
  submitted: boolean
  completed: boolean
  feedback: string | null
  validationMessage: string | null
  canRecord: boolean
  canPlayback: boolean
  canReRecord: boolean
  canSubmit: boolean
  mediaUrl: string | null
  mediaBlob: Blob | null
  hasEverRecorded: boolean
}

export type VoiceRecordingSettings = {
  allowRetry: boolean
  showImmediateFeedback: boolean
  attemptsAllowed: number | null
}

export type VoiceRecordingMapResult = { ok: true; question: VoiceRecordingQuestion; limitations: string[] } | { ok: false; message: string }

export type VoiceRecordingActivityItem = ActivityQuestion & { legacyVoiceRecording?: { incomplete?: boolean; reason?: string | null } | null }

