import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import { WordBuilderBoard } from "@/features/activity-player/renderers/word-builder/WordBuilderBoard"
import type { WordBuilderQuestion } from "@/features/activity-player/renderers/word-builder/word-builder.types"
import { buildWordBuilderCompletionSummary, canRetryWordBuilder, createWordBuilderState, formedBuilderWord, getWordBuilderSettings, isWordBuilderCorrect, mapWordBuilderQuestion, placeWordBuilderUnit, reorderWordBuilderPlacement, resetWordBuilder, retryWordBuilder, returnWordBuilderPlacement, submitWordBuilder } from "@/features/activity-player/renderers/word-builder/word-builder.utils"
import type { ActivityQuestion } from "@/features/activity-player/types"

const wordBuilderItem: ActivityQuestion = {
  id: "builder-item-1", sequence: 0, sectionKey: null, isRequired: true, marks: null,
  configuration: {
    wordBuilder: {
      builderMode: "SYLLABLE", interactionMode: "BOTH", targetWord: "BAJU",
      units: [{ id: "ba-1", value: "BA", sequence: 1 }, { id: "ju-1", value: "JU", sequence: 2 }],
      distractors: [{ id: "ka-1", value: "KA" }, { id: "ta-1", value: "TA" }],
      prompt: { type: "TEXT", text: "Bina nama pakaian.", media: [] },
      showReferenceText: false, showTargetSlots: true, shuffleUnits: true, allowRetry: true, clearOnRetry: false, allowReuse: false, maximumUnits: 12, hint: { type: "NONE" },
    },
  },
  questionBankItem: { id: "builder-question-1", type: "WORD", title: "Bina perkataan", content: "Kandungan legacy tidak digunakan.", answerType: "TEXT", correctAnswer: null, metadata: null, instructions: "Pilih atau seret unit.", explanation: "Baju ialah pakaian.", difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1", answerOptions: [], mediaLinks: [] },
}

function question(item: ActivityQuestion = wordBuilderItem): WordBuilderQuestion {
  const mapped = mapWordBuilderQuestion(item)
  if (!mapped.ok) throw new Error("Malformed Word Builder fixture")
  return mapped.question
}

function settings(item: WordBuilderQuestion = question(), overrides: Partial<{ attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean }> = {}) {
  return getWordBuilderSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { showExplanation: true }, ...overrides }, item)
}

describe("Word Builder player", () => {
  it("registers the renderer and maps the explicit syllable contract with distractors", () => {
    expect(getActivityRenderer("word-builder")).toBeTypeOf("function")
    expect(question().builderMode).toBe("SYLLABLE")
    expect(question().bankUnits.map((unit) => unit.id)).toEqual(["ba-1", "ju-1", "ka-1", "ta-1"])
    expect(question().bankUnits.find((unit) => unit.id === "ka-1")?.isDistractor).toBe(true)
    expect(mapWordBuilderQuestion({ ...wordBuilderItem, configuration: { targetWord: "BAJU" } }).ok).toBe(false)
  })

  it("supports explicit LETTER mode, NFC values, and repeated values with distinct IDs", () => {
    const source = wordBuilderItem.configuration as { wordBuilder: Record<string, unknown> }
    const letters = question({ ...wordBuilderItem, configuration: { wordBuilder: { ...source.wordBuilder, builderMode: "LETTER", targetWord: "A\u0301", units: [{ id: "accent-1", value: "A\u0301", sequence: 1 }], distractors: [] } } })
    const repeated = question({ ...wordBuilderItem, configuration: { wordBuilder: { ...source.wordBuilder, targetWord: "KAKA", units: [{ id: "ka-1", value: "KA", sequence: 1 }, { id: "ka-2", value: "KA", sequence: 2 }], distractors: [] } } })
    expect(letters.targetWord).toBe("Á")
    expect(letters.targetUnits[0]?.value).toBe("Á")
    expect(repeated.targetUnits.map((unit) => unit.id)).toEqual(["ka-1", "ka-2"])
  })

  it("places, returns, and reorders clicked or dragged units while blocking reused IDs when disabled", () => {
    const mapped = question()
    const initial = createWordBuilderState(mapped, "activity-1")
    const placed = placeWordBuilderUnit(placeWordBuilderUnit(initial, mapped, "ba-1"), mapped, "ju-1")
    const returned = returnWordBuilderPlacement(placed, placed.placements[0]?.id ?? "")
    const reverse = placeWordBuilderUnit(placeWordBuilderUnit(initial, mapped, "ju-1"), mapped, "ba-1")
    const reordered = reorderWordBuilderPlacement(reverse, reverse.placements[1]?.id ?? "", 0)
    const duplicate = placeWordBuilderUnit(placeWordBuilderUnit(initial, mapped, "ba-1"), mapped, "ba-1")
    expect(placed.placements.map((placement) => placement.unitId)).toEqual(["ba-1", "ju-1"])
    expect(returned.placements.map((placement) => placement.unitId)).toEqual(["ju-1"])
    expect(reordered.placements.map((placement) => placement.unitId)).toEqual(["ba-1", "ju-1"])
    expect(duplicate.placements).toHaveLength(1)
  })

  it("allows safely identified local reusable placements when the explicit contract enables reuse", () => {
    const source = wordBuilderItem.configuration as { wordBuilder: Record<string, unknown> }
    const reusable = question({ ...wordBuilderItem, configuration: { wordBuilder: { ...source.wordBuilder, targetWord: "KAKA", units: [{ id: "ka-1", value: "KA", sequence: 1 }, { id: "ka-2", value: "KA", sequence: 2 }], distractors: [], allowReuse: true } } })
    const state = placeWordBuilderUnit(placeWordBuilderUnit(createWordBuilderState(reusable, "activity-1"), reusable, "ka-1"), reusable, "ka-1")
    expect(state.placements.map((placement) => placement.id)).toEqual(["placement:ka-1:1", "placement:ka-1:2"])
    expect(isWordBuilderCorrect(reusable, state)).toBe(true)
  })

  it("keeps shuffled banks stable, keeps unshuffled order, and treats distractor placements as incorrect", () => {
    const mapped = question()
    const first = createWordBuilderState(mapped, "activity-stable")
    const second = createWordBuilderState(mapped, "activity-stable")
    const distractorState = placeWordBuilderUnit(placeWordBuilderUnit(createWordBuilderState(mapped, "activity-1"), mapped, "ka-1"), mapped, "ju-1")
    const source = wordBuilderItem.configuration as { wordBuilder: Record<string, unknown> }
    const fixed = question({ ...wordBuilderItem, configuration: { wordBuilder: { ...source.wordBuilder, shuffleUnits: false } } })
    expect(first.bankOrder).toEqual(second.bankOrder)
    expect(createWordBuilderState(fixed, "activity-stable").bankOrder).toEqual(["ba-1", "ju-1", "ka-1", "ta-1"])
    expect(isWordBuilderCorrect(mapped, distractorState)).toBe(false)
  })

  it("validates incomplete answers without an attempt, supports feedback, reset, retry modes, delayed feedback, and retry limits", () => {
    const mapped = question()
    const initial = createWordBuilderState(mapped, "activity-1")
    const incomplete = submitWordBuilder(initial, mapped, settings(mapped))
    const correct = submitWordBuilder(placeWordBuilderUnit(placeWordBuilderUnit(initial, mapped, "ba-1"), mapped, "ju-1"), mapped, settings(mapped))
    const wrong = submitWordBuilder(placeWordBuilderUnit(placeWordBuilderUnit(initial, mapped, "ka-1"), mapped, "ju-1"), mapped, settings(mapped))
    const source = wordBuilderItem.configuration as { wordBuilder: Record<string, unknown> }
    const clearQuestion = question({ ...wordBuilderItem, configuration: { wordBuilder: { ...source.wordBuilder, clearOnRetry: true } } })
    const exhausted = submitWordBuilder(retryWordBuilder(wrong, mapped), mapped, { ...settings(mapped), attemptsAllowed: 2 })
    const delayed = submitWordBuilder(placeWordBuilderUnit(placeWordBuilderUnit(initial, mapped, "ka-1"), mapped, "ju-1"), mapped, settings(mapped, { showImmediateFeedback: false }))
    const noRetry = submitWordBuilder(placeWordBuilderUnit(placeWordBuilderUnit(initial, mapped, "ka-1"), mapped, "ju-1"), mapped, settings(mapped, { allowRetry: false }))
    expect(incomplete).toMatchObject({ validationError: true, attemptCount: 0 })
    expect(correct).toMatchObject({ isCorrect: true, completed: true, feedback: "Hebat! Jawapan betul." })
    expect(wrong).toMatchObject({ isCorrect: false, completed: false, feedback: "Cuba lagi." })
    expect(resetWordBuilder(wrong)).toMatchObject({ placements: [], attemptCount: 1 })
    expect(retryWordBuilder(wrong, mapped).placements).toHaveLength(2)
    expect(retryWordBuilder(wrong, clearQuestion).placements).toEqual([])
    expect(canRetryWordBuilder(wrong, settings(mapped))).toBe(true)
    expect(exhausted.completed).toBe(true)
    expect(delayed).toMatchObject({ completed: true, feedback: "Jawapan direkod untuk semakan sesi ini." })
    expect(noRetry.completed).toBe(true)
  })

  it("renders explicit text/image/audio prompts, reference text, hints, slots, keyboard labels, and reduced-motion classes", () => {
    const source = wordBuilderItem.configuration as { wordBuilder: Record<string, unknown> }
    const imageQuestion = question({ ...wordBuilderItem, configuration: { wordBuilder: { ...source.wordBuilder, showReferenceText: true, hint: { type: "SHOW_IMAGE" }, prompt: { type: "IMAGE", text: null, media: [{ key: "prompt.png", url: "/media/prompt.png", mimeType: "image/png", altText: "Baju", label: "Gambar" }] } } } })
    const audioQuestion = question({ ...wordBuilderItem, configuration: { wordBuilder: { ...source.wordBuilder, hint: { type: "PLAY_AUDIO" }, prompt: { type: "AUDIO", text: null, media: [{ key: "prompt.mp3", url: "/media/prompt.mp3", mimeType: "audio/mpeg", altText: null, label: "Audio" }] } } } })
    const imageMarkup = renderToStaticMarkup(<WordBuilderBoard question={imageQuestion} state={createWordBuilderState(imageQuestion, "activity-1")} settings={settings(imageQuestion)} onPlace={() => undefined} onReturn={() => undefined} onReorder={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    const audioMarkup = renderToStaticMarkup(<WordBuilderBoard question={audioQuestion} state={createWordBuilderState(audioQuestion, "activity-1")} settings={settings(audioQuestion)} onPlace={() => undefined} onReturn={() => undefined} onReorder={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    const hiddenMarkup = renderToStaticMarkup(<WordBuilderBoard question={question()} state={createWordBuilderState(question(), "activity-1")} settings={settings()} onPlace={() => undefined} onReturn={() => undefined} onReorder={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    expect(imageMarkup).toContain("Contoh perkataan: BAJU")
    expect(imageMarkup).toContain("/media/prompt.png")
    expect(imageMarkup).toContain("Lihat petunjuk")
    expect(audioMarkup).toContain("/media/prompt.mp3")
    expect(imageMarkup).toContain("aria-live")
    expect(imageMarkup).toContain("Kedudukan unit 1")
    expect(imageMarkup).toContain("motion-reduce:transition-none")
    expect(hiddenMarkup).not.toContain("BAJU")
  })

  it("builds local-only completion summaries and never calls backend mutation APIs", () => {
    const mapped = question()
    const correct = submitWordBuilder(placeWordBuilderUnit(placeWordBuilderUnit(createWordBuilderState(mapped, "activity-1"), mapped, "ba-1"), mapped, "ju-1"), mapped, settings(mapped))
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(formedBuilderWord(mapped, correct)).toBe("BAJU")
    expect(buildWordBuilderCompletionSummary({ [mapped.itemId]: correct }, [mapped])).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 1 })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
