import { getBooleanConfiguration, getMediaKind, stableShuffle } from "../../activity-player.utils"
import type { ActivityCompletionSummary, ActivityMedia, QuestionBankMedia } from "../../types"
import type { ArrangeSyllableMissingUnit, ArrangeSyllableMissingWord, ArrangeSyllableUnit, ArrangeSyllablesActivityItem, ArrangeSyllablesInteractionMode, ArrangeSyllablesLegacyQuestion, ArrangeSyllablesMapResult, ArrangeSyllablesMissingQuestion, ArrangeSyllablesQuestion, ArrangeSyllablesSessionState, ArrangeSyllablesSettings, ArrangeSyllablesState, MissingSyllableBlank, MissingSyllablesState } from "./arrange-syllables.types"

const MAX_SYLLABLES = 10
const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|javascript\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=)/iu
const MISSING_SYLLABLE_BLANK_PREFIX = "missing-syllable-blank:"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isQuestionBankMedia(value: unknown): value is QuestionBankMedia {
  const media = asRecord(value)
  return Boolean(media && typeof media.id === "string" && typeof media.mediaKey === "string" && typeof media.url === "string" && typeof media.mediaRole === "string" && typeof media.sequence === "number")
}

function toActivityMedia(media: QuestionBankMedia): ActivityMedia {
  return { id: media.id, mediaKey: media.mediaKey, mediaRole: media.mediaRole, mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: media.sequence, isPrimary: false, url: media.url }
}

function toActivityMediaFromConfig(media: unknown): ActivityMedia | null {
  const record = asRecord(media);
  if (!record || typeof record.mediaKey !== "string" || typeof record.url !== "string" || typeof record.mediaRole !== "string" || typeof record.originalName !== "string" && record.originalName !== null) return null;
  if (record.mediaRole !== "PRIMARY_IMAGE" && record.mediaRole !== "REFERENCE_AUDIO") return null;
  return {
    id: typeof record.mediaLinkId === "string" ? record.mediaLinkId : record.mediaKey,
    mediaKey: record.mediaKey,
    mediaRole: record.mediaRole,
    mimeType: typeof record.mimeType === "string" || record.mimeType === null ? record.mimeType : null,
    label: typeof record.originalName === "string" ? record.originalName : null,
    altText: typeof record.altText === "string" || record.altText === null ? record.altText : null,
    sequence: 0,
    isPrimary: false,
    url: record.url,
  };
}

function isInteractionMode(value: unknown): value is ArrangeSyllablesInteractionMode {
  return value === "CLICK_ORDER" || value === "DRAG_ORDER" || value === "BOTH" || value === "DRAG_TO_BLANK"
}

function mapSyllable(value: unknown): ArrangeSyllableUnit | null {
  const syllable = asRecord(value)
  if (!syllable || typeof syllable.id !== "string" || !syllable.id || UNSAFE_TEXT.test(syllable.id) || typeof syllable.value !== "string" || !syllable.value || UNSAFE_TEXT.test(syllable.value) || typeof syllable.sequence !== "number" || !Number.isInteger(syllable.sequence)) return null
  return { id: syllable.id, value: syllable.value.normalize("NFC"), sequence: syllable.sequence }
}

function mapMissingSyllableUnit(value: unknown): ArrangeSyllableMissingUnit | null {
  const syllable = asRecord(value)
  if (!syllable || typeof syllable.id !== "string" || !syllable.id || UNSAFE_TEXT.test(syllable.id) || typeof syllable.value !== "string" || !syllable.value || UNSAFE_TEXT.test(syllable.value) || typeof syllable.sequence !== "number" || !Number.isInteger(syllable.sequence) || typeof syllable.isMissing !== "boolean") return null
  return { id: syllable.id, value: syllable.value.normalize("NFC"), sequence: syllable.sequence, isMissing: syllable.isMissing }
}

function mapMissingWord(value: unknown): ArrangeSyllableMissingWord | null {
  const word = asRecord(value)
  if (!word || typeof word.id !== "string" || !word.id || UNSAFE_TEXT.test(word.id) || typeof word.sequence !== "number" || !Number.isInteger(word.sequence) || !Array.isArray(word.syllables)) return null
  const syllables = word.syllables.map(mapMissingSyllableUnit)
  if (syllables.some((syllable) => syllable === null)) return null
  const nextSyllables = syllables.filter((syllable): syllable is ArrangeSyllableMissingUnit => Boolean(syllable))
  if (nextSyllables.length === 0 || new Set(nextSyllables.map((syllable) => syllable.id)).size !== nextSyllables.length || new Set(nextSyllables.map((syllable) => syllable.sequence)).size !== nextSyllables.length || nextSyllables.some((syllable, index) => syllable.sequence !== index + 1)) return null
  return { id: word.id, sequence: word.sequence, syllables: nextSyllables }
}

function excludeDerivedMissingChoices(
  words: ArrangeSyllableMissingWord[],
  choices: ArrangeSyllableUnit[],
): ArrangeSyllableUnit[] {
  // Persisted MISSING_SYLLABLES configurations store the complete choice bank.
  // The player derives required answers from blanks, so consume only that required
  // multiplicity here and retain every remaining configured wrong choice.
  const requiredCounts = new Map<string, number>()

  for (const word of words) {
    for (const syllable of word.syllables) {
      if (!syllable.isMissing) continue
      const value = syllable.value.trim().normalize("NFC")
      requiredCounts.set(value, (requiredCounts.get(value) ?? 0) + 1)
    }
  }

  return choices.filter((choice) => {
    const value = choice.value.trim().normalize("NFC")
    const remaining = requiredCounts.get(value) ?? 0
    if (remaining === 0) return true

    requiredCounts.set(value, remaining - 1)
    return false
  })
}

function mapMissingSyllablesQuestion(definition: Record<string, unknown>, item: ArrangeSyllablesActivityItem): ArrangeSyllablesMapResult {
  if (typeof definition.interactionMode !== "string" || definition.interactionMode !== "DRAG_TO_BLANK" || !Array.isArray(definition.words) || !Array.isArray(definition.distractors)) return { ok: false, message: "Kontrak Seret Suku Kata dengan ruang kosong belum disokong oleh pemain murid semasa." }
  if (typeof definition.showReferenceText !== "boolean" || typeof definition.allowRetry !== "boolean" || typeof definition.clearOnRetry !== "boolean" || typeof definition.maximumSyllables !== "number" || !Number.isInteger(definition.maximumSyllables) || definition.maximumSyllables < 1 || definition.maximumSyllables > MAX_SYLLABLES) return { ok: false, message: "Kontrak Seret Suku Kata dengan ruang kosong belum disokong oleh pemain murid semasa." }
  const words = definition.words.map(mapMissingWord)
  if (words.some((word) => word === null)) return { ok: false, message: "Kontrak Seret Suku Kata dengan ruang kosong belum disokong oleh pemain murid semasa." }
  const nextWords = words.filter((word): word is ArrangeSyllableMissingWord => Boolean(word)).sort((left, right) => left.sequence - right.sequence)
  if (nextWords.length === 0 || new Set(nextWords.map((word) => word.id)).size !== nextWords.length || new Set(nextWords.map((word) => word.sequence)).size !== nextWords.length || nextWords.some((word, index) => word.sequence !== index + 1)) return { ok: false, message: "Kontrak Seret Suku Kata dengan ruang kosong belum disokong oleh pemain murid semasa." }
  const distractors = definition.distractors.map(mapSyllable)
  if (distractors.some((distractor) => distractor === null)) return { ok: false, message: "Kontrak Seret Suku Kata dengan ruang kosong belum disokong oleh pemain murid semasa." }
  const persistedChoiceBank = distractors
    .filter((distractor): distractor is ArrangeSyllableUnit => Boolean(distractor))
    .sort((left, right) => left.sequence - right.sequence)
  const nextDistractors = excludeDerivedMissingChoices(nextWords, persistedChoiceBank)
  const configMedia = asRecord(definition.media)
  const media = [
    toActivityMediaFromConfig(configMedia?.image),
    toActivityMediaFromConfig(configMedia?.audio),
    ...item.questionBankItem.mediaLinks.filter(isQuestionBankMedia).map(toActivityMedia),
  ].filter((entry): entry is ActivityMedia => Boolean(entry))
  return {
    ok: true,
    question: {
      mode: "MISSING_SYLLABLES",
      itemId: item.id,
      sequence: item.sequence,
      title: item.questionBankItem.title,
      prompt: item.questionBankItem.content,
      instructions: item.questionBankItem.instructions,
      explanation: item.questionBankItem.explanation,
      words: nextWords,
      distractors: nextDistractors,
      hint: typeof definition.hint === "string" ? definition.hint.normalize("NFC") : null,
      showReferenceText: definition.showReferenceText,
      allowRetry: definition.allowRetry,
      clearOnRetry: definition.clearOnRetry,
      maximumSyllables: definition.maximumSyllables,
      media,
    },
  }
}

export function mapArrangeSyllablesQuestion(item: ArrangeSyllablesActivityItem): ArrangeSyllablesMapResult {
  const root = asRecord(item.configuration)
  const definition = root ? asRecord(root.arrangeSyllables) : null
  if (!definition) return { ok: false, message: "Kontrak Susun Suku Kata yang lengkap tidak tersedia untuk item ini." }
  if (definition.mode === "MISSING_SYLLABLES") return mapMissingSyllablesQuestion(definition, item)
  if (!isInteractionMode(definition.interactionMode) || typeof definition.targetWord !== "string" || !definition.targetWord || UNSAFE_TEXT.test(definition.targetWord) || !Array.isArray(definition.syllables) || typeof definition.showReferenceText !== "boolean" || typeof definition.showTargetSlots !== "boolean" || typeof definition.shuffleSyllables !== "boolean" || typeof definition.allowRetry !== "boolean" || typeof definition.clearOnRetry !== "boolean" || typeof definition.maximumSyllables !== "number" || !Number.isInteger(definition.maximumSyllables) || definition.maximumSyllables < 1 || definition.maximumSyllables > MAX_SYLLABLES) return { ok: false, message: "Kontrak Susun Suku Kata yang lengkap tidak tersedia untuk item ini." }
  const targetWord = definition.targetWord.normalize("NFC")
  const syllables = definition.syllables.map(mapSyllable)
  if (syllables.some((syllable) => syllable === null)) return { ok: false, message: "Suku kata item ini tidak sah." }
  const targetSyllables = syllables.filter((syllable): syllable is ArrangeSyllableUnit => syllable !== null).sort((left, right) => left.sequence - right.sequence)
  if (targetSyllables.length === 0 || targetSyllables.length > MAX_SYLLABLES || targetSyllables.length > definition.maximumSyllables || new Set(targetSyllables.map((syllable) => syllable.id)).size !== targetSyllables.length || new Set(targetSyllables.map((syllable) => syllable.sequence)).size !== targetSyllables.length || targetSyllables.some((syllable, index) => syllable.sequence !== index + 1) || targetSyllables.map((syllable) => syllable.value).join("").normalize("NFC") !== targetWord) return { ok: false, message: "Susunan suku kata item ini tidak sepadan dengan kontrak aktiviti." }
  const configMedia = asRecord(definition.media);
  const media = [
    toActivityMediaFromConfig(configMedia?.image),
    toActivityMediaFromConfig(configMedia?.audio),
    ...item.questionBankItem.mediaLinks.filter(isQuestionBankMedia).map(toActivityMedia),
  ].filter((entry): entry is ActivityMedia => Boolean(entry));
  return { ok: true, question: { mode: "ORDERED_RECONSTRUCTION", itemId: item.id, sequence: item.sequence, title: item.questionBankItem.title, prompt: item.questionBankItem.content, instructions: item.questionBankItem.instructions, explanation: item.questionBankItem.explanation, targetWord, targetSyllables, interactionMode: definition.interactionMode, showReferenceText: definition.showReferenceText, showTargetSlots: definition.showTargetSlots, shuffleSyllables: definition.shuffleSyllables, allowRetry: definition.allowRetry, clearOnRetry: definition.clearOnRetry, maximumSyllables: definition.maximumSyllables, media } }
}

export function formedSyllableWord(question: ArrangeSyllablesLegacyQuestion, arrangedSyllableIds: readonly string[]): string {
  const syllableById = new Map(question.targetSyllables.map((syllable) => [syllable.id, syllable]))
  return arrangedSyllableIds.map((id) => syllableById.get(id)?.value ?? "").join("")
}

export function isArrangeSyllablesCorrect(question: ArrangeSyllablesLegacyQuestion, arrangedSyllableIds: readonly string[]): boolean {
  return arrangedSyllableIds.length === question.targetSyllables.length && formedSyllableWord(question, arrangedSyllableIds).normalize("NFC") === question.targetWord.normalize("NFC")
}

export function getArrangeSyllablesSettings(activity: { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean; configuration: unknown }, question: ArrangeSyllablesLegacyQuestion): ArrangeSyllablesSettings {
  return { attemptsAllowed: activity.attemptsAllowed, allowRetry: activity.allowRetry && question.allowRetry, showImmediateFeedback: activity.showImmediateFeedback, showExplanation: getBooleanConfiguration(activity.configuration, ["showExplanation"]) }
}

export function getMissingSyllablesSettings(activity: { attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean; configuration: unknown }, question: ArrangeSyllablesMissingQuestion): ArrangeSyllablesSettings {
  return { attemptsAllowed: activity.attemptsAllowed, allowRetry: activity.allowRetry && question.allowRetry, showImmediateFeedback: activity.showImmediateFeedback, showExplanation: getBooleanConfiguration(activity.configuration, ["showExplanation"]) }
}

export function createArrangeSyllablesState(question: ArrangeSyllablesLegacyQuestion, activityId: string): ArrangeSyllablesState {
  const ids = question.targetSyllables.map((syllable) => syllable.id)
  return { bankOrder: question.shuffleSyllables ? stableShuffle(ids, `${activityId}:${question.itemId}:arrange-syllables`) : ids, arrangedSyllableIds: [], submitted: false, isCorrect: null, validationError: false, attemptCount: 0, markAwarded: null, completed: false, feedback: null }
}

export function missingSyllableBlanks(question: ArrangeSyllablesMissingQuestion): MissingSyllableBlank[] {
  return question.words
    .flatMap((word) => word.syllables
      .filter((syllable) => syllable.isMissing)
      .map((syllable) => ({
        id: `${word.id}:${syllable.id}`,
        wordId: word.id,
        syllableId: syllable.id,
        value: syllable.value,
        wordSequence: word.sequence,
        syllableSequence: syllable.sequence,
      })))
    .sort((left, right) => left.wordSequence - right.wordSequence || left.syllableSequence - right.syllableSequence)
}

export function missingSyllableChoices(question: ArrangeSyllablesMissingQuestion): ArrangeSyllableUnit[] {
  const answers = missingSyllableBlanks(question).map((blank, index) => ({
    id: `answer:${blank.syllableId}`,
    value: blank.value,
    sequence: index + 1,
  }))
  const distractors = question.distractors.map((distractor, index) => ({
    ...distractor,
    id: `distractor:${distractor.id}`,
    sequence: answers.length + index + 1,
  }))
  return [...answers, ...distractors]
}

export function createMissingSyllablesState(question: ArrangeSyllablesMissingQuestion, activityId: string): MissingSyllablesState {
  const choiceIds = missingSyllableChoices(question).map((choice) => choice.id)
  return { bankOrder: stableShuffle(choiceIds, `${activityId}:${question.itemId}:missing-syllables`), assignments: {}, submitted: false, isCorrect: null, validationError: false, attemptCount: 0, markAwarded: null, completed: false, feedback: null }
}

function withoutChoice(assignments: Record<string, string>, choiceId: string): Record<string, string> {
  return Object.fromEntries(Object.entries(assignments).filter(([, assignedChoiceId]) => assignedChoiceId !== choiceId))
}

export function placeMissingSyllable(state: MissingSyllablesState, choiceId: string, blankId: string): MissingSyllablesState {
  if (state.submitted) return state
  return { ...state, assignments: { ...withoutChoice(state.assignments, choiceId), [blankId]: choiceId }, validationError: false }
}

export function placeMissingSyllableInFirstOpenBlank(state: MissingSyllablesState, question: ArrangeSyllablesMissingQuestion, choiceId: string): MissingSyllablesState {
  if (state.submitted || Object.values(state.assignments).includes(choiceId)) return state
  const blank = missingSyllableBlanks(question).find((entry) => !state.assignments[entry.id])
  return blank ? placeMissingSyllable(state, choiceId, blank.id) : state
}

export function returnMissingSyllable(state: MissingSyllablesState, choiceId: string): MissingSyllablesState {
  if (state.submitted) return state
  return { ...state, assignments: withoutChoice(state.assignments, choiceId), validationError: false }
}

export function resetMissingSyllables(state: MissingSyllablesState): MissingSyllablesState {
  return { ...state, assignments: {}, submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function canRetryMissingSyllables(state: MissingSyllablesState, settings: ArrangeSyllablesSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function isMissingSyllablesCorrect(question: ArrangeSyllablesMissingQuestion, state: MissingSyllablesState): boolean {
  const choicesById = new Map(missingSyllableChoices(question).map((choice) => [choice.id, choice]))
  return missingSyllableBlanks(question).every((blank) => {
    const choice = choicesById.get(state.assignments[blank.id] ?? "")
    return choice?.value.normalize("NFC") === blank.value.normalize("NFC")
  })
}

export function isMissingSyllableChoiceCorrectForBlank(question: ArrangeSyllablesMissingQuestion, choiceId: string, blankId: string): boolean {
  const choice = missingSyllableChoices(question).find((entry) => entry.id === choiceId)
  const blank = missingSyllableBlanks(question).find((entry) => entry.id === blankId)
  return Boolean(choice && blank && choice.value.normalize("NFC") === blank.value.normalize("NFC"))
}

export function missingSyllableBlankIdFromDropTarget(targetId: string): string | null {
  if (!targetId.startsWith(MISSING_SYLLABLE_BLANK_PREFIX)) return null
  const blankId = targetId.slice(MISSING_SYLLABLE_BLANK_PREFIX.length)
  return blankId || null
}

export function createMissingSyllableBlankSelectHandler({
  dragging,
  assignedChoiceId,
  activeChoiceId,
  blankId,
  onReturn,
  onPlace,
}: {
  dragging: boolean
  assignedChoiceId?: string
  activeChoiceId?: string
  blankId: string
  onReturn: (choiceId: string) => void
  onPlace: (choiceId: string, blankId: string) => void
}) {
  if (dragging) return undefined
  if (assignedChoiceId) return () => onReturn(assignedChoiceId)
  if (activeChoiceId) return () => onPlace(activeChoiceId, blankId)
  return undefined
}

export function submitMissingSyllables(state: MissingSyllablesState, question: ArrangeSyllablesMissingQuestion, settings: ArrangeSyllablesSettings): MissingSyllablesState {
  if (state.submitted) return state
  const blanks = missingSyllableBlanks(question)
  if (blanks.length === 0 || blanks.some((blank) => !state.assignments[blank.id])) return { ...state, validationError: true }
  const isCorrect = isMissingSyllablesCorrect(question, state)
  const markAwarded = state.markAwarded ?? isCorrect
  const submitted = { ...state, submitted: true, isCorrect, validationError: false, attemptCount: state.attemptCount + 1, markAwarded }
  const retryAllowed = canRetryMissingSyllables(submitted, settings)
  const completed = !settings.showImmediateFeedback || isCorrect || !retryAllowed
  const feedback = settings.showImmediateFeedback ? isCorrect ? "Betul. Hebat!" : retryAllowed ? "Cuba lagi." : "Bagus kerana mencuba. Mari teruskan." : "Jawapan disemak dalam pratonton ini."
  return { ...submitted, completed, feedback }
}

export function retryMissingSyllables(state: MissingSyllablesState, question: ArrangeSyllablesMissingQuestion): MissingSyllablesState {
  return { ...state, assignments: question.clearOnRetry ? {} : state.assignments, submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function recordIncorrectMissingSyllableAttempt(state: MissingSyllablesState): MissingSyllablesState {
  if (state.submitted) return state
  return { ...state, attemptCount: state.attemptCount + 1, markAwarded: false, validationError: false }
}

export function placeArrangeSyllable(state: ArrangeSyllablesState, syllableId: string, position = state.arrangedSyllableIds.length): ArrangeSyllablesState {
  if (state.submitted || state.arrangedSyllableIds.includes(syllableId)) return state
  const arrangedSyllableIds = [...state.arrangedSyllableIds]
  arrangedSyllableIds.splice(Math.max(0, Math.min(position, arrangedSyllableIds.length)), 0, syllableId)
  return { ...state, arrangedSyllableIds, validationError: false }
}

export function returnArrangeSyllable(state: ArrangeSyllablesState, syllableId: string): ArrangeSyllablesState {
  if (state.submitted || !state.arrangedSyllableIds.includes(syllableId)) return state
  return { ...state, arrangedSyllableIds: state.arrangedSyllableIds.filter((id) => id !== syllableId), validationError: false }
}

export function reorderArrangeSyllable(state: ArrangeSyllablesState, syllableId: string, position: number): ArrangeSyllablesState {
  if (state.submitted) return state
  if (!state.arrangedSyllableIds.includes(syllableId)) return placeArrangeSyllable(state, syllableId, position)
  const arrangedSyllableIds = state.arrangedSyllableIds.filter((id) => id !== syllableId)
  arrangedSyllableIds.splice(Math.max(0, Math.min(position, arrangedSyllableIds.length)), 0, syllableId)
  return { ...state, arrangedSyllableIds, validationError: false }
}

export function resetArrangeSyllables(state: ArrangeSyllablesState): ArrangeSyllablesState {
  return { ...state, arrangedSyllableIds: [], submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function canRetryArrangeSyllables(state: ArrangeSyllablesState, settings: ArrangeSyllablesSettings): boolean {
  return state.submitted && state.isCorrect === false && settings.allowRetry && (settings.attemptsAllowed === null || state.attemptCount < settings.attemptsAllowed)
}

export function submitArrangeSyllables(state: ArrangeSyllablesState, question: ArrangeSyllablesLegacyQuestion, settings: ArrangeSyllablesSettings): ArrangeSyllablesState {
  if (state.submitted) return state
  if (state.arrangedSyllableIds.length !== question.targetSyllables.length) return { ...state, validationError: true }
  const isCorrect = isArrangeSyllablesCorrect(question, state.arrangedSyllableIds)
  const markAwarded = state.markAwarded ?? isCorrect
  const submitted = { ...state, submitted: true, isCorrect, validationError: false, attemptCount: state.attemptCount + 1, markAwarded }
  const retryAllowed = canRetryArrangeSyllables(submitted, settings)
  const completed = !settings.showImmediateFeedback || isCorrect || !retryAllowed
  const feedback = settings.showImmediateFeedback ? isCorrect ? "Hebat! Susunan suku kata betul." : retryAllowed ? "Cuba susun semula." : "Bagus kerana mencuba. Mari teruskan ke perkataan seterusnya." : "Jawapan direkod untuk semakan sesi ini."
  return { ...submitted, completed, feedback }
}

export function retryArrangeSyllables(state: ArrangeSyllablesState, question: ArrangeSyllablesLegacyQuestion): ArrangeSyllablesState {
  return { ...state, arrangedSyllableIds: question.clearOnRetry ? [] : state.arrangedSyllableIds, submitted: false, isCorrect: null, validationError: false, completed: false, feedback: null }
}

export function updateArrangeSyllablesSession(session: ArrangeSyllablesSessionState, itemId: string, state: ArrangeSyllablesState | MissingSyllablesState): ArrangeSyllablesSessionState {
  return { ...session, [itemId]: state }
}

export function buildArrangeSyllablesCompletionSummary(session: ArrangeSyllablesSessionState, questions: readonly ArrangeSyllablesLegacyQuestion[]): ActivityCompletionSummary {
  const states = questions.map((question) => session[question.itemId]).filter((state): state is ArrangeSyllablesState => Boolean(state) && "arrangedSyllableIds" in state)
  return { totalQuestions: questions.length, completedQuestions: states.filter((state) => state.completed).length, correctQuestions: states.filter((state) => state.isCorrect === true).length, incorrectQuestions: states.filter((state) => state.isCorrect === false).length, totalAttempts: states.reduce((total, state) => total + state.attemptCount, 0) }
}

export function buildMissingSyllablesCompletionSummary(session: ArrangeSyllablesSessionState, questions: readonly ArrangeSyllablesMissingQuestion[]): ActivityCompletionSummary {
  const states = questions.map((question) => session[question.itemId]).filter((state): state is MissingSyllablesState => Boolean(state) && "assignments" in state)
  return { totalQuestions: questions.length, completedQuestions: states.filter((state) => state.completed).length, correctQuestions: states.filter((state) => state.isCorrect === true).length, incorrectQuestions: states.filter((state) => state.isCorrect === false).length, totalAttempts: states.reduce((total, state) => total + state.attemptCount, 0) }
}

export function promptMedia(question: ArrangeSyllablesQuestion): { image?: ActivityMedia; audio?: ActivityMedia } {
  return { image: question.media.find((media) => getMediaKind(media) === "image"), audio: question.media.find((media) => getMediaKind(media) === "audio") }
}
