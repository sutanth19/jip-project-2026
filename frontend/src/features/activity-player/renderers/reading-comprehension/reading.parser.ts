import { stableShuffle } from "../../activity-player.utils"
import type { ActivityMedia, QuestionBankMedia } from "../../types"
import type { ReadingComprehensionActivityItem, ReadingComprehensionConfiguration, ReadingComprehensionMapResult, ReadingComprehensionOption, ReadingComprehensionQuestion, ReadingComprehensionQuestionType } from "./reading.types"

const UNSAFE = /(?:<\s*\/?\s*[a-z][^>]*>|\b(?:javascript|vbscript|data)\s*:|\bscript\b|\bon[a-z]+\s*=)/iu

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isMedia(media: unknown): media is QuestionBankMedia {
  if (!media || typeof media !== "object" || Array.isArray(media)) return false
  const value = media as Record<string, unknown>
  return typeof value.id === "string" && typeof value.mediaKey === "string" && typeof value.url === "string" && typeof value.mediaRole === "string"
}

function toPlayerMedia(media: QuestionBankMedia): ActivityMedia {
  return { id: media.id, mediaKey: media.mediaKey, mediaRole: media.mediaRole, mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: media.sequence, isPrimary: media.sequence === 0, url: media.url }
}

function safeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim().normalize("NFC")
  if (!text || text.length > max || UNSAFE.test(text) || text.includes("{{") || text.includes("}}")) return null
  return text
}

function mapOptions(options: unknown, type: ReadingComprehensionQuestionType): ReadingComprehensionOption[] | null {
  if (type === "SHORT_TEXT") return []
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) return null
  const mapped = options.map((entry) => {
    const option = asRecord(entry)
    return option && typeof option.id === "string" && typeof option.label === "string" && typeof option.content === "string" && typeof option.isCorrect === "boolean"
      ? { id: option.id, label: option.label.trim(), content: option.content.trim().normalize("NFC"), isCorrect: option.isCorrect }
      : null
  })
  if (mapped.some((option) => option === null)) return null
  const result = mapped.filter((option): option is ReadingComprehensionOption => option !== null)
  if (new Set(result.map((option) => option.id)).size !== result.length) return null
  if (result.filter((option) => option.isCorrect).length !== 1) return null
  if (type === "TRUE_FALSE" && (result.length !== 2 || result[0]?.label.toUpperCase() !== "BETUL" || result[1]?.label.toUpperCase() !== "SALAH")) return null
  return result
}

function mapQuestion(entry: unknown): ReadingComprehensionQuestion | null {
  const question = asRecord(entry)
  if (!question || typeof question.id !== "string" || typeof question.type !== "string" || typeof question.question !== "string" || typeof question.required !== "boolean" || typeof question.marks !== "number") return null
  const type = question.type as ReadingComprehensionQuestionType
  if (type !== "MULTIPLE_CHOICE" && type !== "TRUE_FALSE" && type !== "SHORT_TEXT") return null
  const questionText = safeText(question.question, 1_000)
  const explanation = question.explanation === undefined || question.explanation === null ? null : safeText(question.explanation, 500)
  if (!questionText || !Number.isInteger(question.marks) || question.marks < 1 || question.marks > 100) return null
  const options = mapOptions(question.options, type)
  if (!options) return null
  const acceptableAnswers = type === "SHORT_TEXT"
    ? Array.isArray(question.acceptableAnswers) && question.acceptableAnswers.length >= 1 && question.acceptableAnswers.length <= 10
      ? question.acceptableAnswers.map((answer) => safeText(answer, 500)).filter((answer): answer is string => Boolean(answer))
      : null
    : []
  if (type === "SHORT_TEXT" && (!acceptableAnswers || acceptableAnswers.length === 0)) return null
  return { id: question.id, type, question: questionText, required: question.required, marks: question.marks, options, acceptableAnswers: acceptableAnswers ?? [], explanation }
}

export function mapReadingComprehensionQuestion(item: ReadingComprehensionActivityItem): ReadingComprehensionMapResult {
  if (item.legacyReadingComprehension?.incomplete) return { ok: false, message: "Kontrak Kefahaman Bacaan belum lengkap untuk item ini." }
  const root = asRecord(item.configuration)
  const definition = root ? asRecord(root.readingComprehension) : null
  if (!definition) return { ok: false, message: "Kontrak Kefahaman Bacaan yang lengkap tidak tersedia untuk item ini." }
  const passage = asRecord(definition.passage)
  if (!passage) return { ok: false, message: "Petikan bacaan item ini tidak sah." }
  const passageTitle = safeText(passage.title, 300)
  const passageContent = safeText(passage.content, 3_000)
  if (!passageTitle || !passageContent) return { ok: false, message: "Petikan bacaan item ini tidak sah." }
  if (!Array.isArray(definition.questions) || definition.questions.length < 1 || definition.questions.length > 20) return { ok: false, message: "Soalan item ini tidak sah." }
  const questions = definition.questions.map(mapQuestion)
  if (questions.some((question) => question === null)) return { ok: false, message: "Soalan item ini tidak sah." }
  const orderedQuestions = questions.filter((question): question is ReadingComprehensionQuestion => question !== null)
  if (new Set(orderedQuestions.map((question) => question.id)).size !== orderedQuestions.length) return { ok: false, message: "Soalan item ini mempunyai ID yang berulang." }
  const media = Array.isArray(passage.media) ? passage.media.filter(isMedia).map(toPlayerMedia) : null
  if (!media) return { ok: false, message: "Media petikan item ini tidak sah." }
  const flags = ["showPassageFirst", "allowPassageDuringQuestions", "randomizeQuestions", "showQuestionNumbers", "showImmediateFeedback", "allowRetry"] as const
  if (flags.some((flag) => typeof definition[flag] !== "boolean")) return { ok: false, message: "Tetapan bacaan item ini tidak sah." }
  const configuration: ReadingComprehensionConfiguration = {
    passage: { title: passageTitle, content: passageContent, media },
    questions: orderedQuestions,
    showPassageFirst: Boolean(definition.showPassageFirst),
    allowPassageDuringQuestions: Boolean(definition.allowPassageDuringQuestions),
    randomizeQuestions: Boolean(definition.randomizeQuestions),
    showQuestionNumbers: Boolean(definition.showQuestionNumbers),
    showImmediateFeedback: Boolean(definition.showImmediateFeedback),
    allowRetry: Boolean(definition.allowRetry),
  }
  return { ok: true, question: configuration, limitations: ["Pemain ini menggunakan kontrak Kefahaman Bacaan eksplisit tanpa penjanaan soalan sendiri."] }
}

export function normalizeAnswer(value: string, caseSensitive: boolean): string {
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ")
  return caseSensitive ? normalized : normalized.toLowerCase()
}

export function shuffleQuestions(questionIds: readonly string[], seed: string): string[] {
  return stableShuffle(questionIds, seed)
}
