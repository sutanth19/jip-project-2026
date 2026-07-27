import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ActivityProvider, useActivityPlayer } from "@/features/activity-player/ActivityContext"
import { calculateActivityProgress, getNextActivityIndex, getPreviousActivityIndex } from "@/features/activity-player/activity-player.utils"
import { EmptyActivity } from "@/features/activity-player/components/EmptyActivity"
import { ActivityLoadingState } from "@/features/activity-player/components/LoadingState"
import { CompletionScreen } from "@/features/activity-player/components/CompletionScreen"
import { getActivityRenderer, activityRendererRegistry } from "@/features/activity-player/renderer-registry"
import type { ActivityPreview } from "@/features/activity-player/types"

const activity: ActivityPreview = {
  id: "activity-1",
  code: "ACT-001",
  title: "Baca perkataan",
  instructions: "Baca perkataan berikut.",
  difficulty: "BASIC",
  scoringMode: "NONE",
  reviewMode: "TEACHER",
  attemptsAllowed: null,
  timeLimitSeconds: null,
  shuffleItems: false,
  showImmediateFeedback: true,
  allowRetry: true,
  template: { code: "READING", version: 1, rendererKey: "multiple-choice" },
  configuration: {},
  rewardConfiguration: null,
  presentationSettings: null,
  media: [],
  items: [{
    id: "item-1",
    sequence: 0,
    sectionKey: null,
    isRequired: true,
    marks: null,
    configuration: null,
    questionBankItem: {
      id: "question-1",
      type: "WORD",
      title: "Pilih perkataan",
      content: "baju",
      answerType: "NONE",
      correctAnswer: null,
      instructions: null,
      explanation: null,
      difficulty: "BEGINNER",
      status: "ACTIVE",
      programmeId: "programme-1",
      answerOptions: [],
      mediaLinks: [],
    },
  }],
}

describe("activity renderer registry", () => {
  it("registers every Phase 18A renderer key and returns undefined for unknown renderers", () => {
    expect(Object.keys(activityRendererRegistry)).toHaveLength(14)
    expect(getActivityRenderer("multiple-choice")).toBeTypeOf("function")
    expect(getActivityRenderer("unknown-renderer")).toBeUndefined()
  })
})

describe("activity navigation and progress", () => {
  it("bounds previous/next navigation and calculates completion progress", () => {
    expect(getPreviousActivityIndex(0)).toBe(0)
    expect(getNextActivityIndex(2, 3)).toBe(2)
    expect(getNextActivityIndex(0, 3)).toBe(1)
    expect(calculateActivityProgress(1, 3, new Set(["one", "two"]))).toEqual({ current: 2, total: 3, completed: 2, percentage: 67, isComplete: false })
    expect(calculateActivityProgress(0, 0, new Set())).toEqual({ current: 0, total: 0, completed: 0, percentage: 0, isComplete: false })
  })
})

describe("activity player states", () => {
  it("renders loading and empty activity states", () => {
    expect(renderToStaticMarkup(<ActivityLoadingState />)).toContain("animate-pulse")
    expect(renderToStaticMarkup(<EmptyActivity />)).toContain("Tiada item aktiviti")
  })

  it("provides local activity context and renders the completion state", () => {
    function ContextProbe() {
      const { activity: currentActivity, progress, answers } = useActivityPlayer()
      return <output>{`${currentActivity.id}:${progress.total}:${Object.keys(answers).length}`}</output>
    }

    const contextMarkup = renderToStaticMarkup(<ActivityProvider activity={activity}><ContextProbe /></ActivityProvider>)
    const completionMarkup = renderToStaticMarkup(<ActivityProvider activity={activity}><CompletionScreen onExit={() => undefined} /></ActivityProvider>)

    expect(contextMarkup).toContain("activity-1:1:0")
    expect(completionMarkup).toContain("Aktiviti selesai!")
  })
})
