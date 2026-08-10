import { useEffect, useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"
import { playCorrectGameSound } from "../audio/gameSoundEffects"
import { MissingSyllablesCompletionScreen, MissingSyllablesPreview } from "./arrange-syllables/MissingSyllablesPreview"
import { ArrangeSyllablesBoard } from "./arrange-syllables/ArrangeSyllablesBoard"
import { buildPreviewScore } from "./arrange-syllables/arrange-syllables-preview-scoring"
import type { ArrangeSyllablesLegacyQuestion, ArrangeSyllablesMissingQuestion, ArrangeSyllablesSessionState } from "./arrange-syllables/arrange-syllables.types"
import {
  buildArrangeSyllablesCompletionSummary,
  buildMissingSyllablesCompletionSummary,
  createArrangeSyllablesState,
  createMissingSyllablesState,
  getArrangeSyllablesSettings,
  getMissingSyllablesSettings,
  mapArrangeSyllablesQuestion,
  missingSyllableBlanks,
  placeMissingSyllable,
  placeArrangeSyllable,
  reorderArrangeSyllable,
  recordIncorrectMissingSyllableAttempt,
  resetArrangeSyllables,
  returnMissingSyllable,
  returnArrangeSyllable,
  retryMissingSyllables,
  retryArrangeSyllables,
  submitMissingSyllables,
  submitArrangeSyllables,
  updateArrangeSyllablesSession,
} from "./arrange-syllables/arrange-syllables.utils"

const SESSION_KEY = "arrange-syllables-session"

function asSession(value: unknown): ArrangeSyllablesSessionState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ArrangeSyllablesSessionState : {}
}

export function ArrangeSyllablesPlayer() {
  const {
    activity,
    currentItem,
    currentIndex,
    items,
    completedItemIds,
    temporaryState,
    setTemporaryState,
    setAnswer,
    markItemCompleted,
    previousItem,
    nextItem,
    restartActivity,
    setCompletionSummary,
    timer,
    isFinished,
  } = useActivityPlayer()
  const mapped = useMemo(
    () => (currentItem ? mapArrangeSyllablesQuestion(currentItem) : { ok: false as const, message: "Item aktiviti tidak tersedia." }),
    [currentItem],
  )
  const session = asSession(temporaryState[SESSION_KEY])
  const score = useMemo(
    () => buildPreviewScore(items, session, activity.scoringMode, typeof activity.totalMarks === "number" ? activity.totalMarks : null),
    [activity.scoringMode, items, session, activity.totalMarks],
  )
  const legacyQuestion = mapped.ok && mapped.question.mode === "ORDERED_RECONSTRUCTION" ? mapped.question : null
  const missingQuestion = mapped.ok && mapped.question.mode === "MISSING_SYLLABLES" ? mapped.question : null

  useEffect(() => {
    if (!legacyQuestion || session[legacyQuestion.itemId]) {
      return
    }

    setTemporaryState(
      SESSION_KEY,
      updateArrangeSyllablesSession(session, legacyQuestion.itemId, createArrangeSyllablesState(legacyQuestion, activity.id)),
    )
  }, [activity.id, legacyQuestion, session, setTemporaryState])

  useEffect(() => {
    if (!missingQuestion || session[missingQuestion.itemId]) {
      return
    }

    setTemporaryState(
      SESSION_KEY,
      updateArrangeSyllablesSession(session, missingQuestion.itemId, createMissingSyllablesState(missingQuestion, activity.id)),
    )
  }, [activity.id, missingQuestion, session, setTemporaryState])

  if (!mapped.ok) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h2 className="font-semibold">Item susun suku kata tidak dapat dimainkan</h2>
          <p className="mt-2 text-sm text-muted-foreground">{mapped.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (mapped.question.mode === "MISSING_SYLLABLES") {
    const question = mapped.question
    const stateEntry = session[question.itemId]
    const state = stateEntry && "assignments" in stateEntry ? stateEntry : createMissingSyllablesState(question, activity.id)
    const settings = getMissingSyllablesSettings(activity, question)

    const persist = (nextState: typeof state) => {
      setTemporaryState(SESSION_KEY, updateArrangeSyllablesSession(session, question.itemId, nextState))
      setAnswer(question.itemId, nextState.assignments)
    }

    const evaluatePlacement = (nextState: typeof state) => {
      const blanks = missingSyllableBlanks(question)
      if (blanks.some((blank) => !nextState.assignments[blank.id])) {
        persist(nextState)
        return
      }

      const evaluated = submitMissingSyllables(nextState, question, settings)
      persist(evaluated)
      if (evaluated.completed) {
        markItemCompleted(question.itemId)
      }
      if (settings.showImmediateFeedback && evaluated.isCorrect) {
        playCorrectGameSound()
      }
    }

    const next = () => {
      const nextSession = updateArrangeSyllablesSession(session, question.itemId, state)
      setTemporaryState(SESSION_KEY, nextSession)
      const questions = items
        .map(mapArrangeSyllablesQuestion)
        .filter((result): result is Extract<typeof result, { ok: true }> => result.ok)
        .map((result) => result.question)
        .filter((question): question is ArrangeSyllablesMissingQuestion => question.mode === "MISSING_SYLLABLES")
      setCompletionSummary(buildMissingSyllablesCompletionSummary(nextSession, questions))
      nextItem()
    }

    if (isFinished) {
      return (
        <MissingSyllablesCompletionScreen
          totalQuestions={items.length}
          scoreValue={score.value}
          scoreTotal={score.total}
          onReplay={restartActivity}
          onHome={() => undefined}
        />
      )
    }

    return (
      <MissingSyllablesPreview
        key={question.itemId}
        question={question}
        state={state}
        settings={settings}
        onPlace={(choiceId, blankId) => evaluatePlacement(placeMissingSyllable(state, choiceId, blankId))}
        onReject={() => persist(recordIncorrectMissingSyllableAttempt(state))}
        onReturn={(choiceId) => persist(returnMissingSyllable(state, choiceId))}
        onRetry={() => persist(retryMissingSyllables(state, question))}
        onPrevious={previousItem}
        onNext={next}
        isFirst={currentIndex === 0}
        isLast={currentIndex === items.length - 1}
        currentIndex={currentIndex}
        itemIds={items.map((item) => item.id)}
        completedItemIds={completedItemIds}
        timerSeconds={timer.mode === "countdown" ? timer.seconds : null}
      />
    )
  }

  if (!legacyQuestion) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h2 className="font-semibold">Item susun suku kata tidak dapat dimainkan</h2>
          <p className="mt-2 text-sm text-muted-foreground">Kontrak item tidak lengkap untuk pratonton.</p>
        </CardContent>
      </Card>
    )
  }

  const stateEntry = session[legacyQuestion.itemId]
  const state = stateEntry && "arrangedSyllableIds" in stateEntry ? stateEntry : createArrangeSyllablesState(legacyQuestion, activity.id)
  const settings = getArrangeSyllablesSettings(activity, legacyQuestion)

  const persist = (nextState: typeof state) => {
    setTemporaryState(SESSION_KEY, updateArrangeSyllablesSession(session, legacyQuestion.itemId, nextState))
    setAnswer(legacyQuestion.itemId, nextState.arrangedSyllableIds)
  }

  const submit = () => {
    const nextState = submitArrangeSyllables(state, legacyQuestion, settings)
    persist(nextState)
    if (nextState.completed) {
      markItemCompleted(legacyQuestion.itemId)
    }
  }

  const next = () => {
    const nextSession = updateArrangeSyllablesSession(session, legacyQuestion.itemId, state)
    setTemporaryState(SESSION_KEY, nextSession)
    const questions = items
      .map(mapArrangeSyllablesQuestion)
      .filter((result): result is Extract<typeof result, { ok: true }> => result.ok)
      .map((result) => result.question)
      .filter((question): question is ArrangeSyllablesLegacyQuestion => question.mode === "ORDERED_RECONSTRUCTION")
    setCompletionSummary(buildArrangeSyllablesCompletionSummary(nextSession, questions))
    nextItem()
  }

  return (
    <ArrangeSyllablesBoard
      question={mapped.question}
      state={state}
      settings={settings}
      onPlace={(syllableId, position) => persist(placeArrangeSyllable(state, syllableId, position))}
      onReturn={(syllableId) => persist(returnArrangeSyllable(state, syllableId))}
      onReorder={(syllableId, position) => persist(reorderArrangeSyllable(state, syllableId, position))}
      onReset={() => persist(resetArrangeSyllables(state))}
      onSubmit={submit}
      onRetry={() => persist(retryArrangeSyllables(state, legacyQuestion))}
      onPrevious={previousItem}
      onNext={next}
      isFirst={currentIndex === 0}
      isLast={currentIndex === items.length - 1}
    />
  )
}
