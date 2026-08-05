import type { ActivityCompletionSummary } from "../../types"
import type { VoiceRecordingActivityItem, VoiceRecordingMapResult, VoiceRecordingPermissionStatus, VoiceRecordingQuestion, VoiceRecordingRecording, VoiceRecordingSettings, VoiceRecordingState } from "./voice-recording.types"

const UNSAFE = /(?:<\s*\/?\s*[a-z][^>]*>|\b(?:javascript|vbscript|data)\s*:|\bscript\b|\bon[a-z]+\s*=)/iu

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function safeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim().normalize("NFC")
  if (!text || text.length > max || UNSAFE.test(text) || text.includes("{{") || text.includes("}}")) return null
  return text
}

function isMedia(value: unknown): value is { id: string; mediaKey: string; mediaRole: string; mimeType: string | null; label: string | null; altText: string | null; sequence: number; url: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const media = value as Record<string, unknown>
  return typeof media.id === "string" && typeof media.mediaKey === "string" && typeof media.mediaRole === "string" && typeof media.sequence === "number"
}

function mapMedia(media: unknown) {
  if (!Array.isArray(media)) return null
  const items = media.map((entry) => isMedia(entry) ? { id: entry.id, mediaKey: entry.mediaKey, mediaRole: entry.mediaRole, mimeType: entry.mimeType, label: entry.label, altText: entry.altText, sequence: entry.sequence, isPrimary: entry.sequence === 0, url: entry.url } : null)
  if (items.some((item) => item === null)) return null
  return items.filter((item): item is NonNullable<typeof item> => item !== null)
}

function parseRecording(definition: Record<string, unknown>): VoiceRecordingRecording | null {
  const recording = asRecord(definition.recording)
  if (!recording) return null
  const required = ["minimumDurationSeconds", "maximumDurationSeconds", "maximumAttempts", "allowPlayback", "allowReRecord", "autoStop", "autoSubmitOnFinish", "required"] as const
  if (Object.keys(recording).some((key) => !required.includes(key as typeof required[number]))) return null
  const min = recording.minimumDurationSeconds
  const max = recording.maximumDurationSeconds
  const attempts = recording.maximumAttempts
  if (typeof min !== "number" || !Number.isInteger(min) || min < 1 || min > 600) return null
  if (typeof max !== "number" || !Number.isInteger(max) || max < 5 || max > 900 || max < min) return null
  if (typeof attempts !== "number" || !Number.isInteger(attempts) || attempts < 1 || attempts > 20) return null
  if (typeof recording.allowPlayback !== "boolean" || typeof recording.allowReRecord !== "boolean" || typeof recording.autoStop !== "boolean" || typeof recording.autoSubmitOnFinish !== "boolean" || typeof recording.required !== "boolean") return null
  return { minimumDurationSeconds: min, maximumDurationSeconds: max, maximumAttempts: attempts, allowPlayback: recording.allowPlayback, allowReRecord: recording.allowReRecord, autoStop: recording.autoStop, autoSubmitOnFinish: recording.autoSubmitOnFinish, required: recording.required }
}

export function mapVoiceRecordingQuestion(item: VoiceRecordingActivityItem): VoiceRecordingMapResult {
  if (item.legacyVoiceRecording?.incomplete) return { ok: false, message: "Kontrak Rakaman Suara belum lengkap untuk item ini." }
  const root = asRecord(item.configuration)
  const definition = root ? asRecord(root.voiceRecording) : null
  if (!definition) return { ok: false, message: "Kontrak Rakaman Suara yang lengkap tidak tersedia untuk item ini." }
  const prompt = asRecord(definition.prompt)
  if (!prompt) return { ok: false, message: "Arahan rakaman tidak sah." }
  const promptTitle = prompt.title === undefined || prompt.title === null ? null : safeText(prompt.title, 300)
  const promptContent = safeText(prompt.content, 3_000)
  const promptMedia = mapMedia(prompt.media)
  const recording = parseRecording(definition)
  const instructions = definition.instructions === undefined || definition.instructions === null ? null : safeText(definition.instructions, 1_000)
  if (!promptContent || !promptMedia || !recording) return { ok: false, message: "Kontrak Rakaman Suara item ini tidak sah." }
  const question: VoiceRecordingQuestion = { itemId: item.id, sequence: item.sequence, prompt: { title: promptTitle, content: promptContent, media: promptMedia }, recording, instructions }
  return { ok: true, question, limitations: ["Pemain ini menggunakan kontrak rakaman suara eksplisit tanpa transkripsi atau penilaian pertuturan."] }
}

export function createVoiceRecordingState(question: VoiceRecordingQuestion): VoiceRecordingState {
  return {
    status: "idle",
    permission: "idle",
    elapsedSeconds: 0,
    recordedSeconds: 0,
    attemptCount: 0,
    submitted: false,
    completed: false,
    feedback: null,
    validationMessage: null,
    canRecord: true,
    canPlayback: false,
    canReRecord: question.recording.allowReRecord,
    canSubmit: false,
    mediaUrl: null,
    mediaBlob: null,
    hasEverRecorded: false,
  }
}

export function getVoiceRecordingSettings(activity: { allowRetry: boolean; showImmediateFeedback: boolean; attemptsAllowed: number | null }, question: VoiceRecordingQuestion): VoiceRecordingSettings {
  return { allowRetry: activity.allowRetry && question.recording.allowReRecord, showImmediateFeedback: activity.showImmediateFeedback, attemptsAllowed: activity.attemptsAllowed }
}

export function supportsVoiceRecordingApi(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined"
}

export function createIdlePermissionState(permission: VoiceRecordingPermissionStatus): Partial<VoiceRecordingState> {
  return { permission }
}

export function buildVoiceRecordingCompletionSummary(session: Record<string, VoiceRecordingState>, questions: readonly VoiceRecordingQuestion[]): ActivityCompletionSummary {
  const states = questions.map((question) => session[question.itemId]).filter((state): state is VoiceRecordingState => Boolean(state))
  return {
    totalQuestions: questions.length,
    completedQuestions: states.filter((state) => state.completed).length,
    correctQuestions: states.filter((state) => state.completed).length,
    incorrectQuestions: states.filter((state) => state.submitted && !state.completed).length,
    totalAttempts: states.reduce((total, state) => total + state.attemptCount, 0),
  }
}

export function revokeVoiceRecordingUrl(url: string | null): void {
  if (url) URL.revokeObjectURL(url)
}

export function canRetryVoiceRecording(state: VoiceRecordingState, settings: VoiceRecordingSettings): boolean {
  return state.submitted && !state.completed && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function resetVoiceRecording(state: VoiceRecordingState, question: VoiceRecordingQuestion): VoiceRecordingState {
  return { ...createVoiceRecordingState(question), permission: state.permission === "granted" ? "granted" : state.permission }
}

export function stopCurrentStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

export function nextRecordingAttempt(state: VoiceRecordingState): VoiceRecordingState {
  return { ...state, attemptCount: state.attemptCount + 1, submitted: true, completed: false }
}

export function finalizeRecording(state: VoiceRecordingState, showImmediateFeedback: boolean): VoiceRecordingState {
  return { ...state, submitted: true, completed: true, feedback: showImmediateFeedback ? "Hebat! Rakaman anda telah dilengkapkan." : "Rakaman direkod untuk semakan sesi ini." }
}

export function setPermissionState(state: VoiceRecordingState, permission: VoiceRecordingPermissionStatus): VoiceRecordingState {
  return { ...state, permission }
}

export function setRecordedBlob(state: VoiceRecordingState, blob: Blob | null, url: string | null, seconds: number): VoiceRecordingState {
  return { ...state, mediaBlob: blob, mediaUrl: url, recordedSeconds: seconds, hasEverRecorded: Boolean(blob), canPlayback: Boolean(blob), canSubmit: Boolean(blob), status: blob ? "stopped" : "idle" }
}

export function startRecordingState(state: VoiceRecordingState): VoiceRecordingState {
  return { ...state, status: "recording", elapsedSeconds: 0, feedback: null, validationMessage: null }
}

export function stopRecordingState(state: VoiceRecordingState): VoiceRecordingState {
  return { ...state, status: state.mediaBlob ? "stopped" : "idle" }
}

export function tickRecordingState(state: VoiceRecordingState): VoiceRecordingState {
  if (state.status !== "recording") return state
  return { ...state, elapsedSeconds: state.elapsedSeconds + 1 }
}

export function recordingSecondsRemaining(state: VoiceRecordingState, question: VoiceRecordingQuestion): number {
  return Math.max(question.recording.maximumDurationSeconds - state.elapsedSeconds, 0)
}
