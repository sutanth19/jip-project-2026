import { useEffect, useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { MultipleChoiceQuestion } from "./multiple-choice/MultipleChoiceQuestion"
import type { MultipleChoiceSessionState } from "./multiple-choice/multiple-choice.types"
import { buildCompletionSummary, createQuestionState, getMultipleChoiceSettings, mapMultipleChoiceQuestion, retryQuestion, selectOption, submitQuestion, updateQuestionSession } from "./multiple-choice/multiple-choice.utils"

const SESSION_KEY = "multiple-choice-session"

function asSessionState(value: unknown): MultipleChoiceSessionState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as MultipleChoiceSessionState
}

export function MultipleChoicePlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const mappedQuestion = useMemo(() => currentItem ? mapMultipleChoiceQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const settings = useMemo(() => getMultipleChoiceSettings(activity), [activity])
  const session = asSessionState(temporaryState[SESSION_KEY])
  const questionState = mappedQuestion.ok ? session[mappedQuestion.question.itemId] ?? createQuestionState(mappedQuestion.question, settings, activity.id) : null

  useEffect(() => {
    if (!mappedQuestion.ok || session[mappedQuestion.question.itemId]) return
    setTemporaryState(SESSION_KEY, updateQuestionSession(session, mappedQuestion.question.itemId, createQuestionState(mappedQuestion.question, settings, activity.id)))
  }, [activity.id, mappedQuestion, session, setTemporaryState, settings])

  if (!mappedQuestion.ok || !questionState) {
    return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item pilihan jawapan tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mappedQuestion.ok ? "Status item tidak tersedia." : mappedQuestion.message}</p></CardContent></Card>
  }

  const orderedOptions = questionState.optionOrder.map((id) => mappedQuestion.question.options.find((option) => option.id === id)).filter((option): option is NonNullable<typeof option> => Boolean(option))
  const persist = (nextState: typeof questionState) => setTemporaryState(SESSION_KEY, updateQuestionSession(session, mappedQuestion.question.itemId, nextState))
  const select = (optionId: string) => {
    const nextState = selectOption(questionState, optionId, mappedQuestion.question.mode)
    persist(nextState)
    setAnswer(mappedQuestion.question.itemId, nextState.selectedOptionIds)
  }
  const submit = () => {
    const nextState = submitQuestion(questionState, mappedQuestion.question, settings)
    persist(nextState)
    if (nextState.completed) markItemCompleted(mappedQuestion.question.itemId)
  }
  const retry = () => {
    const nextState = retryQuestion(questionState)
    persist(nextState)
    setAnswer(mappedQuestion.question.itemId, [])
  }
  const next = () => {
    const nextSession = updateQuestionSession(session, mappedQuestion.question.itemId, questionState)
    setTemporaryState(SESSION_KEY, nextSession)
    setCompletionSummary(buildCompletionSummary(items, nextSession))
    nextItem()
  }

  return <MultipleChoiceQuestion question={mappedQuestion.question} state={questionState} settings={settings} options={orderedOptions} onSelect={select} onSubmit={submit} onRetry={retry} onPrevious={previousItem} onNext={next} isFirst={currentIndex === 0} isLast={currentIndex === items.length - 1} />
}
