import { useEffect, useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { assignPair, buildPairingCompletionSummary, createPairingState, resetPairs, retryPairing, submitPairing, updatePairingSession } from "../interactions/pairing.utils"
import { MatchingBoard } from "./matching/MatchingBoard"
import type { MatchingSessionState } from "./matching/matching.types"
import { getMatchingSettings, mapMatchingQuestion } from "./matching/matching.utils"

const SESSION_KEY = "matching-session"

function asSession(value: unknown): MatchingSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as MatchingSessionState : {}
}

export function MatchingPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const mapped = useMemo(() => currentItem ? mapMatchingQuestion(currentItem, activity.configuration) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [activity.configuration, currentItem])
  const settings = useMemo(() => getMatchingSettings(activity), [activity])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok ? session[mapped.question.itemId] ?? createPairingState(mapped.question, settings, activity.id) : null
  useEffect(() => { if (!mapped.ok || session[mapped.question.itemId]) return; setTemporaryState(SESSION_KEY, updatePairingSession(session, mapped.question.itemId, createPairingState(mapped.question, settings, activity.id))) }, [activity.id, mapped, session, setTemporaryState, settings])
  if (!mapped.ok || !state) return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item padanan tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>
  const persist = (nextState: typeof state) => { setTemporaryState(SESSION_KEY, updatePairingSession(session, mapped.question.itemId, nextState)); setAnswer(mapped.question.itemId, nextState.assignments) }
  const submit = () => { const nextState = submitPairing(state, mapped.question, settings); persist(nextState); if (nextState.completed) markItemCompleted(mapped.question.itemId) }
  const next = () => { const nextSession = updatePairingSession(session, mapped.question.itemId, state); setTemporaryState(SESSION_KEY, nextSession); setCompletionSummary(buildPairingCompletionSummary(nextSession)); nextItem() }
  return <MatchingBoard question={mapped.question} state={state} settings={settings} onAssign={(leftId, rightId) => persist(assignPair(state, leftId, rightId))} onReset={() => persist(resetPairs(state))} onSubmit={submit} onRetry={() => persist(retryPairing(state))} onPrevious={previousItem} onNext={next} isFirst={currentIndex === 0} isLast={currentIndex === items.length - 1} />
}
