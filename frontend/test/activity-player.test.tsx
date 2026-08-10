import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ActivityProvider } from "@/features/activity-player/ActivityContext"
import { ArrangeSyllablesPlayer } from "@/features/activity-player/renderers/ArrangeSyllablesPlayer"
import { useActivityPlayer } from "@/features/activity-player/useActivityPlayer"
import { calculateActivityProgress, getNextActivityIndex, getPreviousActivityIndex, stableShuffle } from "@/features/activity-player/activity-player.utils"
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
  totalMarks: null,
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

const arrangeSyllablesPreviewActivity: ActivityPreview = {
  id: "activity-preview-1",
  code: "ACT-002",
  title: "Seret Suku Kata",
  instructions: "Lengkapkan perkataan dengan suku kata yang sesuai.",
  difficulty: "BASIC",
  scoringMode: "NONE",
  reviewMode: "TEACHER",
  totalMarks: null,
  attemptsAllowed: null,
  timeLimitSeconds: 120,
  shuffleItems: false,
  showImmediateFeedback: true,
  allowRetry: true,
  template: { code: "ARRANGE_SYLLABLES", version: 1, rendererKey: "arrange-syllables" },
  configuration: {},
  rewardConfiguration: null,
  presentationSettings: null,
  media: [],
  items: [
    {
      id: "item-1",
      sequence: 0,
      sectionKey: null,
      isRequired: true,
      marks: null,
      configuration: {
        arrangeSyllables: {
          mode: "MISSING_SYLLABLES",
          interactionMode: "DRAG_TO_BLANK",
          words: [
            {
              id: "word-1",
              sequence: 1,
              syllables: [
                { id: "syllable-1", value: "BO", sequence: 1, isMissing: false },
                { id: "syllable-2", value: "LA", sequence: 2, isMissing: true },
              ],
            },
          ],
          distractors: [{ id: "distractor-1", value: "RA", sequence: 1 }],
          hint: "Pilih suku kata yang betul.",
          media: {
            image: { mediaKey: "image-1.png", mediaRole: "PRIMARY_IMAGE", originalName: "image-1.png", mimeType: "image/png", url: "https://cdn.example.test/image-1.png", altText: "Bola" },
            audio: { mediaKey: "audio-1.mp3", mediaRole: "REFERENCE_AUDIO", originalName: "audio-1.mp3", mimeType: "audio/mpeg", url: "https://cdn.example.test/audio-1.mp3", altText: null },
          },
          showReferenceText: true,
          allowRetry: true,
          clearOnRetry: false,
          maximumSyllables: 10,
        },
      },
      questionBankItem: {
        id: "question-preview-1",
        type: "WORD",
        title: "Bola",
        content: "BOLA",
        answerType: "NONE",
        correctAnswer: null,
        instructions: "Lengkapkan perkataan ini.",
        explanation: null,
        difficulty: "BEGINNER",
        status: "ACTIVE",
        programmeId: "programme-1",
        answerOptions: [],
        mediaLinks: [],
      },
    },
    {
      id: "item-2",
      sequence: 1,
      sectionKey: null,
      isRequired: true,
      marks: null,
      configuration: {
        arrangeSyllables: {
          mode: "MISSING_SYLLABLES",
          interactionMode: "DRAG_TO_BLANK",
          words: [
            {
              id: "word-2",
              sequence: 1,
              syllables: [
                { id: "syllable-3", value: "SE", sequence: 1, isMissing: false },
                { id: "syllable-4", value: "PAK", sequence: 2, isMissing: true },
              ],
            },
          ],
          distractors: [{ id: "distractor-2", value: "TU", sequence: 1 }],
          hint: null,
          media: [],
          showReferenceText: false,
          allowRetry: true,
          clearOnRetry: false,
          maximumSyllables: 10,
        },
      },
      questionBankItem: {
        id: "question-preview-2",
        type: "WORD",
        title: "Sepak",
        content: "SEPAK",
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
    },
  ],
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

  it("keeps preview mode read-only, preserves item order, and renders a playable missing-syllables preview", () => {
    function PreviewProbe() {
      const { isPreview, timer, items } = useActivityPlayer()
      return <output>{`${isPreview}:${timer.mode}:${items.map((item) => item.id).join(",")}:${timer.seconds}`}</output>
    }

    const probeMarkup = renderToStaticMarkup(
      <ActivityProvider activity={arrangeSyllablesPreviewActivity} previewMode>
        <PreviewProbe />
      </ActivityProvider>,
    )
    const previewMarkup = renderToStaticMarkup(
      <ActivityProvider activity={arrangeSyllablesPreviewActivity} previewMode>
        <ArrangeSyllablesPlayer />
      </ActivityProvider>,
    )

    expect(probeMarkup).toContain("true:countdown:item-1,item-2:120")
    expect(previewMarkup).toContain("Seret suku kata yang betul ke ruang kosong.")
    expect(previewMarkup).toContain("Seret Suku Kata")
    expect(previewMarkup).toContain("Soalan 1 daripada 2")
    expect(previewMarkup).toContain("MASKOT BUBU")
    expect(previewMarkup).toContain("PILIHAN JAWAPAN")
    expect(previewMarkup).toContain("Bola")
    expect(previewMarkup).toContain("Petunjuk")
    expect(previewMarkup).toContain("https://cdn.example.test/image-1.png")
    expect(previewMarkup).toContain("https://cdn.example.test/audio-1.mp3")
    expect(previewMarkup).toContain("02:00")
    expect(previewMarkup).toContain("LA")
    expect(previewMarkup).toContain("RA")
    expect(previewMarkup).toContain("data-voxel-game-environment")
    expect(previewMarkup).not.toContain("Semak Jawapan")
    expect(previewMarkup).not.toContain("Cuba Semula")
    expect(previewMarkup).toContain("Seterusnya")
    expect(previewMarkup).not.toContain("Ruang jawapan")
    expect(previewMarkup).not.toContain("kontrak aktiviti sebenar")
  })

  it("shuffles preview question order once when the saved Step 4 setting enables shuffle", () => {
    const shuffledPreviewActivity: ActivityPreview = {
      ...arrangeSyllablesPreviewActivity,
      shuffleItems: true,
      items: [
        ...arrangeSyllablesPreviewActivity.items,
        {
          ...arrangeSyllablesPreviewActivity.items[1],
          id: "item-3",
          sequence: 2,
          questionBankItem: {
            ...arrangeSyllablesPreviewActivity.items[1].questionBankItem,
            id: "question-preview-3",
            title: "Kuda",
            content: "KUDA",
          },
        },
      ],
    }

    function PreviewProbe() {
      const { items } = useActivityPlayer()
      return <output>{items.map((item) => item.id).join(",")}</output>
    }

    const expectedOrder = stableShuffle(shuffledPreviewActivity.items, `${shuffledPreviewActivity.id}:questions:0`)
      .map((item) => item.id)
      .join(",")
    const probeMarkup = renderToStaticMarkup(
      <ActivityProvider activity={shuffledPreviewActivity} previewMode>
        <PreviewProbe />
      </ActivityProvider>,
    )

    expect(probeMarkup).toContain(expectedOrder)
  })
})
