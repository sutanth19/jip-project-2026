import { useCallback, useEffect, useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { ReadingFeedback } from "./reading-comprehension/ReadingFeedback"
import { ReadingNavigation } from "./reading-comprehension/ReadingNavigation"
import { ReadingPassage } from "./reading-comprehension/ReadingPassage"
import { ReadingQuestionCard } from "./reading-comprehension/ReadingQuestionCard"
import type { ReadingComprehensionQuestionState, ReadingComprehensionSessionState } from "./reading-comprehension/reading.types"
import { buildCompletionSummary, canRetryQuestion, createQuestionState, createSessionState, createStateMap, evaluateQuestion, getQuestionOrder, getReadingComprehensionSettings, retryQuestion, setTextAnswer, selectOption } from "./reading-comprehension/reading.utils"
import { mapReadingComprehensionQuestion } from "./reading-comprehension/reading.parser"

const SESSION_KEY = "reading-comprehension-session"

function asSession(value: unknown): ReadingComprehensionSessionState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { stage: "PASSAGE", passageStarted: false, activeQuestionIndex: 0 }
  const session = value as Partial<ReadingComprehensionSessionState>
  return { stage: session.stage ?? "PASSAGE", passageStarted: session.passageStarted ?? false, activeQuestionIndex: session.activeQuestionIndex ?? 0, questionOrder: session.questionOrder, questions: session.questions }
}

export function ReadingComprehensionPlayer() {
  const { activity, currentItem, temporaryState, setTemporaryState, setAnswer, markItemCompleted, nextItem, setCompletionSummary } = useActivityPlayer()
  const mapped = useMemo(() => currentItem ? mapReadingComprehensionQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const session = asSession(temporaryState[SESSION_KEY])
  const settings = useMemo(() => mapped.ok ? getReadingComprehensionSettings(activity, mapped.question) : null, [activity, mapped])
  const persist = useCallback((nextSession: ReadingComprehensionSessionState) => {
    if (!mapped.ok) return
    setTemporaryState(SESSION_KEY, nextSession)
    setAnswer(mapped.question.passage.title, nextSession)
  }, [mapped, setAnswer, setTemporaryState])

  useEffect(() => {
    if (!mapped.ok || temporaryState[SESSION_KEY]) return
    setTemporaryState(SESSION_KEY, { ...createSessionState(mapped.question.questions.map((question) => question.id), mapped.question.randomizeQuestions, activity.id), questions: createStateMap(mapped.question.questions) })
  }, [activity.id, mapped, setTemporaryState, temporaryState])

  const questionStates = useMemo(() => mapped.ok ? session.questions ?? createStateMap(mapped.question.questions) : {}, [mapped, session.questions])
  const questionOrder = mapped.ok ? getQuestionOrder(mapped.question.questions.map((question) => question.id), mapped.question.randomizeQuestions, activity.id, session) : []
  const orderedQuestions = mapped.ok ? questionOrder.map((id) => mapped.question.questions.find((question) => question.id === id)).filter((question): question is NonNullable<typeof question> => Boolean(question)) : []
  const complete = orderedQuestions.length > 0 && orderedQuestions.every((question) => (questionStates[question.id]?.completed ?? false))

  useEffect(() => {
    if (!mapped.ok || !complete || session.stage === "COMPLETE") return
    persist({ ...session, stage: "COMPLETE", questions: questionStates })
  }, [complete, mapped, persist, questionStates, session])

  if (!mapped.ok || !settings) {
    return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item kefahaman bacaan tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>
  }

  const activeIndex = session.activeQuestionIndex ?? 0
  const activeQuestion = orderedQuestions[activeIndex]
  const activeState = activeQuestion ? questionStates[activeQuestion.id] ?? createQuestionState() : null

  const startQuestions = () => persist({ ...session, stage: "QUESTIONS", passageStarted: true })

  const updateQuestionState = (nextState: ReadingComprehensionQuestionState) => {
    if (!activeQuestion) return
    persist({ ...session, questions: { ...questionStates, [activeQuestion.id]: nextState } })
  }

  const submit = () => {
    if (!activeQuestion || !activeState) return
    const nextState = evaluateQuestion(activeQuestion, activeState, settings.showImmediateFeedback)
    updateQuestionState(nextState)
    if (nextState.completed) markItemCompleted(activeQuestion.id)
  }

  const retry = () => {
    if (!activeQuestion || !activeState) return
    updateQuestionState(retryQuestion(activeState))
  }

  const nextQuestion = () => {
    if (activeIndex >= orderedQuestions.length - 1) {
      setCompletionSummary(buildCompletionSummary(orderedQuestions, questionStates))
      nextItem()
      return
    }
    persist({ ...session, stage: "QUESTIONS", activeQuestionIndex: activeIndex + 1, questions: questionStates })
  }

  const previousQuestion = () => persist({ ...session, activeQuestionIndex: Math.max(0, activeIndex - 1), questions: questionStates })

  const setSelectedOption = (optionId: string) => {
    if (!activeState) return
    updateQuestionState(selectOption(activeState, optionId))
  }

  const setAnswerText = (value: string) => {
    if (!activeState) return
    updateQuestionState(setTextAnswer(activeState, value))
  }

  const isPassageScreen = mapped.question.showPassageFirst && !session.passageStarted
  if (isPassageScreen) {
    return <ReadingPassage configuration={mapped.question} onStartQuestions={startQuestions} />
  }

  return <Card className="border-border/80 shadow-sm"><CardContent className="space-y-5 p-5 sm:p-6">{mapped.limitations.length > 0 ? <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">{mapped.limitations[0]}</div> : null}{mapped.question.allowPassageDuringQuestions ? <ReadingPassage configuration={mapped.question} onStartQuestions={() => undefined} /> : null}{activeQuestion && activeState ? <ReadingQuestionCard question={activeQuestion} state={activeState} settings={settings} showQuestionNumber={mapped.question.showQuestionNumbers ? `${activeIndex + 1} / ${orderedQuestions.length}` : `Soalan ${activeIndex + 1}`} onSelectOption={setSelectedOption} onTextChange={setAnswerText} onSubmit={submit} /> : null}{activeState?.feedback && activeState.submitted && settings.showImmediateFeedback ? <ReadingFeedback show complete={activeState.isCorrect} message={activeState.feedback} /> : null}<ReadingNavigation current={activeIndex + 1} total={orderedQuestions.length} isFirst={activeIndex === 0} isLast={activeIndex >= orderedQuestions.length - 1} onPrevious={previousQuestion} onNext={nextQuestion} onRetry={retry} />{activeQuestion && canRetryQuestion(activeState ?? createQuestionState(), settings) ? <p className="text-sm text-muted-foreground">Anda boleh cuba semula soalan ini.</p> : null}</CardContent></Card>
}
