import { useEffect, useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { WordBuilderBoard } from "./word-builder/WordBuilderBoard"
import type { WordBuilderSessionState } from "./word-builder/word-builder.types"
import { buildWordBuilderCompletionSummary, createWordBuilderState, getWordBuilderSettings, mapWordBuilderQuestion, placeWordBuilderUnit, reorderWordBuilderPlacement, resetWordBuilder, retryWordBuilder, returnWordBuilderPlacement, submitWordBuilder, updateWordBuilderSession } from "./word-builder/word-builder.utils"

const SESSION_KEY = "word-builder-session"

function asSession(value: unknown): WordBuilderSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as WordBuilderSessionState : {}
}

export function WordBuilderPlayer() {
  const { activity, currentItem, currentIndex, items, temporaryState, setTemporaryState, setAnswer, markItemCompleted, previousItem, nextItem, setCompletionSummary } = useActivityPlayer()
  const mapped = useMemo(() => currentItem ? mapWordBuilderQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }, [currentItem])
  const session = asSession(temporaryState[SESSION_KEY])
  const state = mapped.ok ? session[mapped.question.itemId] ?? createWordBuilderState(mapped.question, activity.id) : null
  const settings = useMemo(() => mapped.ok ? getWordBuilderSettings(activity, mapped.question) : null, [activity, mapped])
  useEffect(() => { if (!mapped.ok || session[mapped.question.itemId]) return; setTemporaryState(SESSION_KEY, updateWordBuilderSession(session, mapped.question.itemId, createWordBuilderState(mapped.question, activity.id))) }, [activity.id, mapped, session, setTemporaryState])
  if (!mapped.ok || !state || !settings) return <Card><CardContent className="p-6 text-center"><h2 className="font-semibold">Item bina perkataan tidak dapat dimainkan</h2><p className="mt-2 text-sm text-muted-foreground">{mapped.ok ? "Status item tidak tersedia." : mapped.message}</p></CardContent></Card>
  const persist = (nextState: typeof state) => { setTemporaryState(SESSION_KEY, updateWordBuilderSession(session, mapped.question.itemId, nextState)); setAnswer(mapped.question.itemId, nextState.placements) }
  const submit = () => { const nextState = submitWordBuilder(state, mapped.question, settings); persist(nextState); if (nextState.completed) markItemCompleted(mapped.question.itemId) }
  const next = () => { const nextSession = updateWordBuilderSession(session, mapped.question.itemId, state); setTemporaryState(SESSION_KEY, nextSession); const questions = items.map(mapWordBuilderQuestion).filter((result): result is Extract<typeof result, { ok: true }> => result.ok).map((result) => result.question); setCompletionSummary(buildWordBuilderCompletionSummary(nextSession, questions)); nextItem() }
  return <WordBuilderBoard question={mapped.question} state={state} settings={settings} onPlace={(unitId, position) => persist(placeWordBuilderUnit(state, mapped.question, unitId, position))} onReturn={(placementId) => persist(returnWordBuilderPlacement(state, placementId))} onReorder={(placementId, position) => persist(reorderWordBuilderPlacement(state, placementId, position))} onReset={() => persist(resetWordBuilder(state))} onSubmit={submit} onRetry={() => persist(retryWordBuilder(state, mapped.question))} onPrevious={previousItem} onNext={next} isFirst={currentIndex === 0} isLast={currentIndex === items.length - 1} />
}
