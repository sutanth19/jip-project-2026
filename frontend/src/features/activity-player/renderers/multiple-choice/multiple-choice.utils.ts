import { getBooleanConfiguration, stableShuffle } from "../../activity-player.utils"
import type { ActivityCompletionSummary, ActivityMedia, QuestionBankMedia } from "../../types"
import type { MultipleChoiceActivityItem, MultipleChoiceMapResult, MultipleChoiceQuestionModel, MultipleChoiceQuestionState, MultipleChoiceSessionState, MultipleChoiceSettings } from "./multiple-choice.types"

function toPlayerMedia(media: QuestionBankMedia): ActivityMedia {
  return {
    id: media.id,
    mediaKey: media.mediaKey,
    mediaRole: media.mediaRole,
    mimeType: media.mimeType,
    label: media.label,
    altText: media.altText,
    sequence: media.sequence,
    isPrimary: false,
    url: media.url,
  }
}

function isQuestionBankMedia(value: unknown): value is QuestionBankMedia {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const media = value as Record<string, unknown>
  return typeof media.id === "string" && typeof media.mediaKey === "string" && typeof media.url === "string" && typeof media.mediaRole === "string" && typeof media.sequence === "number"
}

function hasUsableOptionContent(content: string, media: ActivityMedia[]): boolean {
  return content.trim().length > 0 || media.some((item) => Boolean(item.url))
}

export function mapMultipleChoiceQuestion(item: MultipleChoiceActivityItem): MultipleChoiceMapResult {
  const question = item.questionBankItem
  if (question.answerType !== "SINGLE_CHOICE" && question.answerType !== "MULTIPLE_CHOICE") {
    return { ok: false, message: "Jenis jawapan item ini tidak disokong oleh pemain pilihan jawapan." }
  }
  if (!Array.isArray(question.answerOptions) || question.answerOptions.length === 0) {
    return { ok: false, message: "Item ini belum mempunyai pilihan jawapan." }
  }

  const optionIds = new Set<string>()
  const correctOptionIds = new Set<string>()
  const options = question.answerOptions.map((option) => {
    const validOption = option && typeof option.id === "string" && typeof option.content === "string" && typeof option.sequence === "number" && typeof option.isCorrect === "boolean"
    const media = Array.isArray(option.media) ? option.media.filter(isQuestionBankMedia).map(toPlayerMedia) : []
    if (!validOption || optionIds.has(option.id) || !hasUsableOptionContent(option.content, media)) {
      return null
    }
    optionIds.add(option.id)
    if (option.isCorrect) correctOptionIds.add(option.id)
    return { id: option.id, label: option.label, content: option.content, sequence: option.sequence, feedback: option.feedback, media }
  })
  if (options.some((option) => option === null) || correctOptionIds.size === 0) {
    return { ok: false, message: "Pilihan jawapan item ini tidak lengkap untuk pratonton." }
  }

  return {
    ok: true,
    question: {
      itemId: item.id,
      question: question.content,
      title: question.title,
      instructions: question.instructions,
      explanation: question.explanation,
      mode: question.answerType,
      options: options.filter((option): option is NonNullable<typeof option> => option !== null),
      media: question.mediaLinks.filter(isQuestionBankMedia).map(toPlayerMedia),
      correctOptionIds,
    },
  }
}

export function getMultipleChoiceSettings(activity: { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean; configuration: unknown }): MultipleChoiceSettings {
  return {
    attemptsAllowed: activity.attemptsAllowed,
    allowRetry: activity.allowRetry,
    showImmediateFeedback: activity.showImmediateFeedback,
    showExplanation: getBooleanConfiguration(activity.configuration, ["showExplanation"]),
    revealCorrectAnswer: getBooleanConfiguration(activity.configuration, ["revealCorrectAnswer", "showCorrectAnswer"]),
    randomizeOptions: getBooleanConfiguration(activity.configuration, ["randomizeOptions", "shuffleOptions"]),
  }
}

export function createQuestionState(question: MultipleChoiceQuestionModel, settings: MultipleChoiceSettings, seed: string): MultipleChoiceQuestionState {
  const optionOrder = settings.randomizeOptions ? stableShuffle(question.options.map((option) => option.id), `${seed}:${question.itemId}:options`) : question.options.map((option) => option.id)
  return { selectedOptionIds: [], submitted: false, isCorrect: null, attemptCount: 0, completed: false, optionOrder, feedback: null }
}

export function selectOption(state: MultipleChoiceQuestionState, optionId: string, mode: MultipleChoiceQuestionModel["mode"]): MultipleChoiceQuestionState {
  if (state.submitted) return state
  const selected = new Set(state.selectedOptionIds)
  if (mode === "SINGLE_CHOICE") selected.clear()
  if (selected.has(optionId) && mode === "MULTIPLE_CHOICE") selected.delete(optionId)
  else selected.add(optionId)
  return { ...state, selectedOptionIds: [...selected] }
}

export function isExactMultipleChoiceMatch(selectedOptionIds: readonly string[], correctOptionIds: ReadonlySet<string>): boolean {
  return selectedOptionIds.length === correctOptionIds.size && selectedOptionIds.every((id) => correctOptionIds.has(id))
}

export function canRetryQuestion(state: MultipleChoiceQuestionState, settings: MultipleChoiceSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function submitQuestion(state: MultipleChoiceQuestionState, question: MultipleChoiceQuestionModel, settings: MultipleChoiceSettings): MultipleChoiceQuestionState {
  if (state.selectedOptionIds.length === 0 || state.submitted) return state
  const isCorrect = isExactMultipleChoiceMatch(state.selectedOptionIds, question.correctOptionIds)
  const attemptCount = state.attemptCount + 1
  const submitted = { ...state, submitted: true, isCorrect, attemptCount }
  const retryAllowed = canRetryQuestion(submitted, settings)
  const completed = !settings.showImmediateFeedback || isCorrect || !retryAllowed
  const feedback = settings.showImmediateFeedback ? isCorrect ? "Hebat! Jawapan anda betul." : retryAllowed ? "Cuba lagi. Anda pasti boleh!" : "Bagus kerana mencuba. Mari teruskan ke item seterusnya." : "Jawapan direkod untuk semakan sesi ini."
  return { ...submitted, completed, feedback }
}

export function retryQuestion(state: MultipleChoiceQuestionState): MultipleChoiceQuestionState {
  return { ...state, selectedOptionIds: [], submitted: false, isCorrect: null, completed: false, feedback: null }
}

export function updateQuestionSession(session: MultipleChoiceSessionState, itemId: string, state: MultipleChoiceQuestionState): MultipleChoiceSessionState {
  return { ...session, [itemId]: state }
}

export function buildCompletionSummary(items: readonly { id: string }[], session: MultipleChoiceSessionState): ActivityCompletionSummary {
  const results = items.map((item) => session[item.id]).filter((result): result is MultipleChoiceQuestionState => Boolean(result))
  return {
    totalQuestions: items.length,
    completedQuestions: results.filter((result) => result.completed).length,
    correctQuestions: results.filter((result) => result.isCorrect === true).length,
    incorrectQuestions: results.filter((result) => result.isCorrect === false).length,
    totalAttempts: results.reduce((total, result) => total + result.attemptCount, 0),
  }
}
