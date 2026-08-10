import { useEffect, useMemo, useState, type ReactNode } from "react"

import { ActivityPlayerContext } from "./activity-player-context-value"
import { calculateActivityProgress, getBooleanConfiguration, getNextActivityIndex, getPreviousActivityIndex, stableShuffle } from "./activity-player.utils"
import type {
  ActivityAnswerMap,
  ActivityCompletionSummary,
  ActivityPreview,
  ActivityTemporaryState,
  ActivityTimerMode,
} from "./types"

export type ActivityPlayerContextValue = {
  activity: ActivityPreview
  items: ActivityPreview["items"]
  currentIndex: number
  currentItem: ActivityPreview["items"][number] | undefined
  isPreview: boolean
  answers: ActivityAnswerMap
  temporaryState: ActivityTemporaryState
  completedItemIds: ReadonlySet<string>
  completionSummary: ActivityCompletionSummary | null
  isFinished: boolean
  timer: {
    mode: ActivityTimerMode
    seconds: number
    isPaused: boolean
    pause: () => void
    resume: () => void
    reset: () => void
  }
  progress: ReturnType<typeof calculateActivityProgress>
  goToItem: (index: number) => void
  previousItem: () => void
  nextItem: () => void
  retryCurrentItem: () => void
  restartActivity: () => void
  finishActivity: () => void
  markItemCompleted: (itemId: string) => void
  setCompletionSummary: (summary: ActivityCompletionSummary | null) => void
  setAnswer: (itemId: string, value: unknown) => void
  setTemporaryState: (key: string, value: unknown) => void
}


function getTimerMode(activity: ActivityPreview): ActivityTimerMode {
  if (activity.timeLimitSeconds === 0) return "disabled"
  return activity.timeLimitSeconds ? "countdown" : "countup"
}

type ActivityProviderProps = {
  activity: ActivityPreview
  children: ReactNode
  previewMode?: boolean
}

function ActivityProviderState({ activity, children, previewMode = false }: ActivityProviderProps) {
  const shouldShuffleItems = activity.shuffleItems || getBooleanConfiguration(activity.configuration, ["randomizeQuestions", "randomizeQuestionOrder"])
  const [previewSessionSeed, setPreviewSessionSeed] = useState(0)
  const orderedItems = useMemo(
    () => shouldShuffleItems ? stableShuffle(activity.items, `${activity.id}:questions:${previewSessionSeed}`) : activity.items,
    [activity.id, activity.items, previewSessionSeed, shouldShuffleItems],
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<ActivityAnswerMap>({})
  const [temporaryState, setTemporaryStateValue] = useState<ActivityTemporaryState>({})
  const [completedItemIds, setCompletedItemIds] = useState<ReadonlySet<string>>(() => new Set())
  const [completionSummary, setCompletionSummary] = useState<ActivityCompletionSummary | null>(null)
  const [isFinished, setIsFinished] = useState(false)
  const timerMode = previewMode ? (activity.timeLimitSeconds ? "countdown" : "disabled") : getTimerMode(activity)
  const [timerSeconds, setTimerSeconds] = useState(() => activity.timeLimitSeconds ?? 0)
  const [isTimerPaused, setIsTimerPaused] = useState(false)

  useEffect(() => {
    if (timerMode === "countdown" && timerSeconds === 0) return undefined
    if (timerMode === "disabled" || isTimerPaused || isFinished) return undefined

    const interval = window.setInterval(() => {
      setTimerSeconds((value) => (timerMode === "countdown" ? Math.max(value - 1, 0) : value + 1))
    }, 1_000)

    return () => window.clearInterval(interval)
  }, [isFinished, isTimerPaused, timerMode, timerSeconds])

  const value = useMemo<ActivityPlayerContextValue>(() => {
    const items = orderedItems
    const currentItem = items[currentIndex]
    const progress = calculateActivityProgress(currentIndex, items.length, completedItemIds)
    const markCurrentItemCompleted = () => {
      if (!currentItem) return
      setCompletedItemIds((previous) => new Set(previous).add(currentItem.id))
    }

    return {
      activity,
      items,
      currentIndex,
      currentItem,
      isPreview: previewMode,
      answers,
      temporaryState,
      completedItemIds,
      completionSummary,
      isFinished,
      timer: {
        mode: timerMode,
        seconds: timerSeconds,
        isPaused: isTimerPaused,
        pause: () => setIsTimerPaused(true),
        resume: () => setIsTimerPaused(false),
        reset: () => {
          setTimerSeconds(activity.timeLimitSeconds ?? 0)
          setIsTimerPaused(false)
        },
      },
      progress,
      goToItem: (index) => {
        if (index >= 0 && index < items.length) {
          setCurrentIndex(index)
          setIsFinished(false)
        }
      },
      previousItem: () => setCurrentIndex((index) => getPreviousActivityIndex(index)),
      nextItem: () => {
        markCurrentItemCompleted()
        if (currentIndex === items.length - 1) setIsFinished(true)
        else setCurrentIndex((index) => getNextActivityIndex(index, items.length))
      },
      retryCurrentItem: () => {
        if (!currentItem) return
        setAnswers((previous) => {
          const next = { ...previous }
          delete next[currentItem.id]
          return next
        })
        setCompletedItemIds((previous) => {
          const next = new Set(previous)
          next.delete(currentItem.id)
          return next
        })
      },
      restartActivity: () => {
        setCurrentIndex(0)
        setAnswers({})
        setTemporaryStateValue({})
        setCompletedItemIds(new Set())
        setIsFinished(false)
        setTimerSeconds(activity.timeLimitSeconds ?? 0)
        setIsTimerPaused(false)
        setPreviewSessionSeed((value) => shouldShuffleItems ? value + 1 : value)
      },
      finishActivity: () => {
        markCurrentItemCompleted()
        setIsFinished(true)
      },
      markItemCompleted: (itemId) => {
        setCompletedItemIds((previous) => new Set(previous).add(itemId))
      },
      setCompletionSummary,
      setAnswer: (itemId, answer) => {
        setAnswers((previous) => ({ ...previous, [itemId]: answer }))
      },
      setTemporaryState: (key, state) => {
        setTemporaryStateValue((previous) => ({ ...previous, [key]: state }))
      },
    }
  }, [activity, answers, completedItemIds, completionSummary, currentIndex, isFinished, isTimerPaused, orderedItems, previewMode, shouldShuffleItems, temporaryState, timerMode, timerSeconds])

  return <ActivityPlayerContext.Provider value={value}>{children}</ActivityPlayerContext.Provider>
}

export function ActivityProvider({ activity, children, previewMode = false }: ActivityProviderProps) {
  const activityVersion = `${activity.id}:${activity.timeLimitSeconds ?? "none"}:${activity.shuffleItems}:${previewMode ? "preview" : "player"}:${activity.items.map((item) => item.id).join(":")}`
  return <ActivityProviderState key={activityVersion} activity={activity} previewMode={previewMode}>{children}</ActivityProviderState>
}
