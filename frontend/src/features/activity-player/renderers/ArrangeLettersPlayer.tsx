import { useEffect, useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { ArrangeLettersBoard } from "./arrange-letters/ArrangeLettersBoard"
import type { ArrangeLettersSessionState } from "./arrange-letters/arrange-letters.types"
import { buildArrangeLettersCompletionSummary, createArrangeLettersState, getArrangeLettersSettings, mapArrangeLettersQuestion, placeArrangeLetter, reorderArrangeLetter, resetArrangeLetters, returnArrangeLetter, retryArrangeLetters, submitArrangeLetters, updateArrangeLettersSession } from "./arrange-letters/arrange-letters.utils"

const SESSION_KEY = "arrange-letters-session"

function asSession(value: unknown): ArrangeLettersSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ArrangeLettersSessionState : {}
}

export function ArrangeLettersPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const mapped = useMemo(() => currentItem ? mapArrangeLettersQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok ? session[mapped.question.itemId] ?? createArrangeLettersState(mapped.question, activity.id) : null
  const settings = useMemo(() => mapped.ok ? getArrangeLettersSettings(activity, mapped.question) : null, [activity, mapped])
  useEffect(() => { if (!mapped.ok || session[mapped.question.itemId]) return; setTemporaryState(SESSION_KEY, updateArrangeLettersSession(session, mapped.question.itemId, createArrangeLettersState(mapped.question, activity.id))) }, [activity.id, mapped, session, setTemporaryState])
  if (!mapped.ok || !state || !settings) return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item susun huruf tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>
  const persist = (nextState: typeof state) => { setTemporaryState(SESSION_KEY, updateArrangeLettersSession(session, mapped.question.itemId, nextState)); setAnswer(mapped.question.itemId, nextState.arrangedLetterIds) }
  const submit = () => { const nextState = submitArrangeLetters(state, mapped.question, settings); persist(nextState); if (nextState.completed) markItemCompleted(mapped.question.itemId) }
  const next = () => { const nextSession = updateArrangeLettersSession(session, mapped.question.itemId, state); setTemporaryState(SESSION_KEY, nextSession); const questions = items.map(mapArrangeLettersQuestion).filter((result): result is Extract<typeof result, { ok: true }> => result.ok).map((result) => result.question); setCompletionSummary(buildArrangeLettersCompletionSummary(nextSession, questions)); nextItem() }
  return <ArrangeLettersBoard question={mapped.question} state={state} settings={settings} onPlace={(letterId, position) => persist(placeArrangeLetter(state, letterId, position))} onReturn={(letterId) => persist(returnArrangeLetter(state, letterId))} onReorder={(letterId, position) => persist(reorderArrangeLetter(state, letterId, position))} onReset={() => persist(resetArrangeLetters(state))} onSubmit={submit} onRetry={() => persist(retryArrangeLetters(state, mapped.question))} onPrevious={previousItem} onNext={next} isFirst={currentIndex === 0} isLast={currentIndex === items.length - 1} />
}
