import { useEffect, useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { FillBlankQuestion } from "./fill-in-the-blank/FillBlankQuestion"
import type { FillBlankSessionState } from "./fill-in-the-blank/fill-in-the-blank.types"
import { buildFillBlankCompletionSummary, createFillBlankState, getFillBlankSettings, mapFillBlankQuestion, removeFillBlankAnswer, retryFillBlank, selectFillBlankWord, setFillBlankAnswer, submitFillBlank, updateFillBlankSession } from "./fill-in-the-blank/fill-in-the-blank.utils"

const SESSION_KEY = "fill-in-the-blank-session"

function asSession(value: unknown): FillBlankSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as FillBlankSessionState : {}
}

export function FillInBlankPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const mapped = useMemo(() => currentItem ? mapFillBlankQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const settings = useMemo(() => getFillBlankSettings(activity), [activity])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok ? session[mapped.question.itemId] ?? createFillBlankState(mapped.question) : null
  useEffect(() => { if (!mapped.ok || session[mapped.question.itemId]) return; setTemporaryState(SESSION_KEY, updateFillBlankSession(session, mapped.question.itemId, createFillBlankState(mapped.question))) }, [mapped, session, setTemporaryState])
  if (!mapped.ok || !state) return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item tempat kosong tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>
  const persist = (nextState: typeof state) => { setTemporaryState(SESSION_KEY, updateFillBlankSession(session, mapped.question.itemId, nextState)); setAnswer(mapped.question.itemId, nextState.answers) }
  const submit = () => { const nextState = submitFillBlank(state, mapped.question, settings); persist(nextState); if (nextState.completed) markItemCompleted(mapped.question.itemId) }
  const next = () => { const nextSession = updateFillBlankSession(session, mapped.question.itemId, state); setTemporaryState(SESSION_KEY, nextSession); const questions = items.map(mapFillBlankQuestion).filter((result): result is Extract<typeof result, { ok: true }> => result.ok).map((result) => result.question); setCompletionSummary(buildFillBlankCompletionSummary(nextSession, questions)); nextItem() }
  return <FillBlankQuestion question={mapped.question} state={state} settings={settings} onTypedAnswer={(blankId, answer) => persist(setFillBlankAnswer(state, blankId, answer))} onActivateBlank={(blankId) => persist({ ...state, activeBlankId: blankId })} onRemoveAnswer={(blankId) => persist(removeFillBlankAnswer(state, blankId))} onSelectWord={(entryId) => { if (state.activeBlankId) persist(selectFillBlankWord(state, mapped.question, state.activeBlankId, entryId)) }} onReset={() => persist(createFillBlankState(mapped.question))} onSubmit={submit} onRetry={() => persist(retryFillBlank(state, mapped.question))} onPrevious={previousItem} onNext={next} isFirst={currentIndex === 0} isLast={currentIndex === items.length - 1} />
}
