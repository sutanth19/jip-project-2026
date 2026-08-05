import { useEffect, useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { ArrangeSyllablesBoard } from "./arrange-syllables/ArrangeSyllablesBoard"
import type { ArrangeSyllablesSessionState } from "./arrange-syllables/arrange-syllables.types"
import { buildArrangeSyllablesCompletionSummary, createArrangeSyllablesState, getArrangeSyllablesSettings, mapArrangeSyllablesQuestion, placeArrangeSyllable, reorderArrangeSyllable, resetArrangeSyllables, returnArrangeSyllable, retryArrangeSyllables, submitArrangeSyllables, updateArrangeSyllablesSession } from "./arrange-syllables/arrange-syllables.utils"

const SESSION_KEY = "arrange-syllables-session"

function asSession(value: unknown): ArrangeSyllablesSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ArrangeSyllablesSessionState : {}
}

export function ArrangeSyllablesPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const mapped = useMemo(() => currentItem ? mapArrangeSyllablesQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok ? session[mapped.question.itemId] ?? createArrangeSyllablesState(mapped.question, activity.id) : null
  const settings = useMemo(() => mapped.ok ? getArrangeSyllablesSettings(activity, mapped.question) : null, [activity, mapped])
  useEffect(() => { if (!mapped.ok || session[mapped.question.itemId]) return; setTemporaryState(SESSION_KEY, updateArrangeSyllablesSession(session, mapped.question.itemId, createArrangeSyllablesState(mapped.question, activity.id))) }, [activity.id, mapped, session, setTemporaryState])
  if (!mapped.ok || !state || !settings) return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item susun suku kata tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>
  const persist = (nextState: typeof state) => { setTemporaryState(SESSION_KEY, updateArrangeSyllablesSession(session, mapped.question.itemId, nextState)); setAnswer(mapped.question.itemId, nextState.arrangedSyllableIds) }
  const submit = () => { const nextState = submitArrangeSyllables(state, mapped.question, settings); persist(nextState); if (nextState.completed) markItemCompleted(mapped.question.itemId) }
  const next = () => { const nextSession = updateArrangeSyllablesSession(session, mapped.question.itemId, state); setTemporaryState(SESSION_KEY, nextSession); const questions = items.map(mapArrangeSyllablesQuestion).filter((result): result is Extract<typeof result, { ok: true }> => result.ok).map((result) => result.question); setCompletionSummary(buildArrangeSyllablesCompletionSummary(nextSession, questions)); nextItem() }
  return <ArrangeSyllablesBoard question={mapped.question} state={state} settings={settings} onPlace={(syllableId, position) => persist(placeArrangeSyllable(state, syllableId, position))} onReturn={(syllableId) => persist(returnArrangeSyllable(state, syllableId))} onReorder={(syllableId, position) => persist(reorderArrangeSyllable(state, syllableId, position))} onReset={() => persist(resetArrangeSyllables(state))} onSubmit={submit} onRetry={() => persist(retryArrangeSyllables(state, mapped.question))} onPrevious={previousItem} onNext={next} isFirst={currentIndex === 0} isLast={currentIndex === items.length - 1} />
}
