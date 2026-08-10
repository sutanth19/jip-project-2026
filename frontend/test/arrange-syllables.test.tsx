import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { MissingSyllablesCompletionScreen } from "@/features/activity-player/renderers/arrange-syllables/MissingSyllablesPreview"
import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import { MissingSyllablesPreview } from "@/features/activity-player/renderers/arrange-syllables/MissingSyllablesPreview"
import { ArrangeSyllablesBoard } from "@/features/activity-player/renderers/arrange-syllables/ArrangeSyllablesBoard"
import { buildPreviewScore, distributePreviewMarks } from "@/features/activity-player/renderers/arrange-syllables/arrange-syllables-preview-scoring"
import type { ArrangeSyllablesMissingQuestion, ArrangeSyllablesQuestion } from "@/features/activity-player/renderers/arrange-syllables/arrange-syllables.types"
import { buildArrangeSyllablesCompletionSummary, buildMissingSyllablesCompletionSummary, canRetryArrangeSyllables, createArrangeSyllablesState, createMissingSyllablesState, createMissingSyllableBlankSelectHandler, formedSyllableWord, getArrangeSyllablesSettings, getMissingSyllablesSettings, isArrangeSyllablesCorrect, isMissingSyllableChoiceCorrectForBlank, isMissingSyllablesCorrect, mapArrangeSyllablesQuestion, missingSyllableBlankIdFromDropTarget, missingSyllableBlanks, missingSyllableChoices, placeArrangeSyllable, placeMissingSyllable, placeMissingSyllableInFirstOpenBlank, recordIncorrectMissingSyllableAttempt, reorderArrangeSyllable, resetArrangeSyllables, resetMissingSyllables, returnArrangeSyllable, returnMissingSyllable, retryArrangeSyllables, retryMissingSyllables, submitArrangeSyllables, submitMissingSyllables } from "@/features/activity-player/renderers/arrange-syllables/arrange-syllables.utils"
import type { ActivityQuestion } from "@/features/activity-player/types"

const arrangeSyllablesItem: ActivityQuestion = {
  id: "syllable-item-1", sequence: 0, sectionKey: null, isRequired: true, marks: null,
  configuration: {
    arrangeSyllables: {
      interactionMode: "BOTH", targetWord: "BAJU",
      syllables: [{ id: "ba-1", value: "BA", sequence: 1 }, { id: "ju-1", value: "JU", sequence: 2 }],
      showReferenceText: false, showTargetSlots: true, shuffleSyllables: true, allowRetry: true, clearOnRetry: false, maximumSyllables: 10,
    },
  },
  questionBankItem: { id: "syllable-question-1", type: "WORD", title: "Susun suku kata", content: "Susun suku kata menjadi nama pakaian.", answerType: "TEXT", correctAnswer: null, metadata: null, instructions: "Pilih atau seret suku kata.", explanation: "Baju ialah pakaian.", difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1", answerOptions: [], mediaLinks: [] },
}

function question(item: ActivityQuestion = arrangeSyllablesItem): ArrangeSyllablesQuestion {
  const mapped = mapArrangeSyllablesQuestion(item)
  if (!mapped.ok) throw new Error("Malformed Arrange Syllables fixture")
  return mapped.question
}

function settings(item: ArrangeSyllablesQuestion = question(), overrides: Partial<{ attemptsAllowed: number | null; allowRetry: boolean; showImmediateFeedback: boolean }> = {}) {
  return getArrangeSyllablesSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { showExplanation: true }, ...overrides }, item)
}

const missingSyllablesItem: ActivityQuestion = {
  ...arrangeSyllablesItem,
  id: "missing-item-1",
  configuration: {
    arrangeSyllables: {
      mode: "MISSING_SYLLABLES",
      interactionMode: "DRAG_TO_BLANK",
      words: [
        {
          id: "word-1",
          sequence: 1,
          syllables: [
            { id: "pen-1", value: "PEN", sequence: 1, isMissing: false },
            { id: "sil-1", value: "SIL", sequence: 2, isMissing: true },
          ],
        },
        {
          id: "word-2",
          sequence: 2,
          syllables: [
            { id: "se-1", value: "SE", sequence: 1, isMissing: false },
            { id: "ko-1", value: "KO", sequence: 2, isMissing: true },
            { id: "lah-1", value: "LAH", sequence: 3, isMissing: false },
          ],
        },
      ],
      distractors: [
        { id: "sil-choice-1", value: "SIL", sequence: 1 },
        { id: "ko-choice-1", value: "KO", sequence: 2 },
        { id: "pan-1", value: "PAN", sequence: 3 },
        { id: "sel-1", value: "SEL", sequence: 4 },
      ],
      hint: "Dengar bunyi perkataan.",
      media: {
        image: { mediaKey: "pensil.png", mediaRole: "PRIMARY_IMAGE", originalName: "pensil.png", mimeType: "image/png", url: "https://cdn.example.test/pensil.png", altText: "Pensil" },
        audio: { mediaKey: "pensil.mp3", mediaRole: "REFERENCE_AUDIO", originalName: "pensil.mp3", mimeType: "audio/mpeg", url: "https://cdn.example.test/pensil.mp3", altText: null },
      },
      showReferenceText: false,
      allowRetry: true,
      clearOnRetry: true,
      maximumSyllables: 10,
    },
  },
  questionBankItem: { ...arrangeSyllablesItem.questionBankItem, title: "Pensil", content: "PENSIL SEKOLAH", instructions: "Lengkapkan suku kata." },
}

function missingQuestion(item: ActivityQuestion = missingSyllablesItem): ArrangeSyllablesMissingQuestion {
  const mapped = mapArrangeSyllablesQuestion(item)
  if (!mapped.ok || mapped.question.mode !== "MISSING_SYLLABLES") throw new Error("Malformed missing syllables fixture")
  return mapped.question
}

describe("Arrange Syllables player", () => {
  it("registers the renderer, consumes only its explicit contract, and leaves remaining placeholders registered", () => {
    expect(getActivityRenderer("arrange-syllables")).toBeTypeOf("function")
    expect(question().targetSyllables.map((syllable) => syllable.value)).toEqual(["BA", "JU"])
    expect(mapArrangeSyllablesQuestion({ ...arrangeSyllablesItem, configuration: { targetWord: "BAJU" } }).ok).toBe(false)
    expect(getActivityRenderer("word-builder")).toBeTypeOf("function")
  })

  it("sorts explicit sequence values and retains separate IDs for repeated syllables", () => {
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const reordered = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, syllables: [{ id: "ju-1", value: "JU", sequence: 2 }, { id: "ba-1", value: "BA", sequence: 1 }] } } })
    const repeated = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, targetWord: "KAKA", syllables: [{ id: "ka-1", value: "KA", sequence: 1 }, { id: "ka-2", value: "KA", sequence: 2 }] } } })
    expect(reordered.targetSyllables.map((syllable) => syllable.id)).toEqual(["ba-1", "ju-1"])
    expect(repeated.targetSyllables.map((syllable) => syllable.id)).toEqual(["ka-1", "ka-2"])
  })

  it("fails safely for missing or legacy contracts, duplicate identifiers, invalid modes, and reconstruction mismatch", () => {
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const malformed = (changes: Record<string, unknown>) => mapArrangeSyllablesQuestion({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, ...changes } } }).ok
    expect(mapArrangeSyllablesQuestion({ ...arrangeSyllablesItem, configuration: null }).ok).toBe(false)
    expect(malformed({ syllables: [{ id: "same", value: "BA", sequence: 1 }, { id: "same", value: "JU", sequence: 2 }] })).toBe(false)
    expect(malformed({ interactionMode: "UNSUPPORTED" })).toBe(false)
    expect(malformed({ syllables: [{ id: "ba", value: "BA", sequence: 1 }, { id: "ju", value: "KA", sequence: 2 }] })).toBe(false)
    expect(malformed({ maximumSyllables: 1 })).toBe(false)
  })

  it("supports click placement, return-to-bank, and drag-equivalent ordering by stable ID", () => {
    const mapped = question()
    const initial = createArrangeSyllablesState(mapped, "activity-1")
    const placed = placeArrangeSyllable(placeArrangeSyllable(initial, "ba-1"), "ju-1")
    const returned = returnArrangeSyllable(placed, "ba-1")
    const reverse = placeArrangeSyllable(placeArrangeSyllable(initial, "ju-1"), "ba-1")
    const reordered = reorderArrangeSyllable(reverse, "ba-1", 0)
    expect(placed.arrangedSyllableIds).toEqual(["ba-1", "ju-1"])
    expect(returned.arrangedSyllableIds).toEqual(["ju-1"])
    expect(reordered.arrangedSyllableIds).toEqual(["ba-1", "ju-1"])
  })

  it("keeps shuffle stable across rerenders and retries, while an unshuffled bank keeps supplied order", () => {
    const mapped = question()
    const first = createArrangeSyllablesState(mapped, "activity-stable")
    const second = createArrangeSyllablesState(mapped, "activity-stable")
    const wrong = { ...placeArrangeSyllable(first, "ju-1"), submitted: true, isCorrect: false, attemptCount: 1 }
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const noShuffle = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, shuffleSyllables: false } } })
    expect(first.bankOrder).toEqual(second.bankOrder)
    expect(retryArrangeSyllables(wrong, mapped).bankOrder).toEqual(first.bankOrder)
    expect(createArrangeSyllablesState(noShuffle, "activity-stable").bankOrder).toEqual(["ba-1", "ju-1"])
  })

  it("blocks incomplete checks without an attempt, validates correct order, and uses NFC comparison", () => {
    const mapped = question()
    const initial = createArrangeSyllablesState(mapped, "activity-1")
    const incomplete = submitArrangeSyllables(initial, mapped, settings(mapped))
    const correct = submitArrangeSyllables(placeArrangeSyllable(placeArrangeSyllable(initial, "ba-1"), "ju-1"), mapped, settings(mapped))
    const incorrect = submitArrangeSyllables(placeArrangeSyllable(placeArrangeSyllable(initial, "ju-1"), "ba-1"), mapped, settings(mapped))
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const unicodeQuestion = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, targetWord: "A\u0301", syllables: [{ id: "accent-1", value: "A\u0301", sequence: 1 }] } } })
    expect(incomplete).toMatchObject({ validationError: true, attemptCount: 0 })
    expect(correct).toMatchObject({ isCorrect: true, completed: true, feedback: "Hebat! Susunan suku kata betul." })
    expect(incorrect).toMatchObject({ isCorrect: false, completed: false, feedback: "Cuba susun semula." })
    expect(isArrangeSyllablesCorrect(unicodeQuestion, ["accent-1"])).toBe(true)
    expect(formedSyllableWord(mapped, correct.arrangedSyllableIds)).toBe("BAJU")
  })

  it("supports reset, both retry-clear modes, limits, disabled retries, and delayed feedback locally", () => {
    const mapped = question()
    const reverse = placeArrangeSyllable(placeArrangeSyllable(createArrangeSyllablesState(mapped, "activity-1"), "ju-1"), "ba-1")
    const wrong = submitArrangeSyllables(reverse, mapped, settings(mapped))
    const exhausted = submitArrangeSyllables(retryArrangeSyllables(wrong, mapped), mapped, { ...settings(mapped), attemptsAllowed: 2 })
    const clearQuestion = { ...mapped, clearOnRetry: true }
    const delayed = submitArrangeSyllables(reverse, mapped, settings(mapped, { showImmediateFeedback: false }))
    const noRetry = submitArrangeSyllables(reverse, mapped, settings(mapped, { allowRetry: false }))
    expect(resetArrangeSyllables(reverse)).toMatchObject({ arrangedSyllableIds: [], attemptCount: 0 })
    expect(retryArrangeSyllables(wrong, mapped).arrangedSyllableIds).toEqual(["ju-1", "ba-1"])
    expect(retryArrangeSyllables(wrong, clearQuestion).arrangedSyllableIds).toEqual([])
    expect(canRetryArrangeSyllables(wrong, settings(mapped))).toBe(true)
    expect(exhausted.completed).toBe(true)
    expect(delayed).toMatchObject({ completed: true, feedback: "Jawapan direkod untuk semakan sesi ini." })
    expect(noRetry.completed).toBe(true)
  })

  it("renders accessible slots, media, reference text, keyboard labels, live feedback, and reduced-motion classes without exposing hidden targets", () => {
    const source = arrangeSyllablesItem.configuration as { arrangeSyllables: Record<string, unknown> }
    const mediaQuestion = question({ ...arrangeSyllablesItem, configuration: { arrangeSyllables: { ...source.arrangeSyllables, showReferenceText: true } }, questionBankItem: { ...arrangeSyllablesItem.questionBankItem, mediaLinks: [{ id: "image", key: "prompt.png", mediaKey: "prompt.png", url: "/media/prompt.png", mimeType: "image/png", role: "PRIMARY_IMAGE", mediaRole: "PRIMARY_IMAGE", label: "Gambar", originalName: "prompt.png", altText: "Baju", sequence: 1 }, { id: "audio", key: "prompt.mp3", mediaKey: "prompt.mp3", url: "/media/prompt.mp3", mimeType: "audio/mpeg", role: "PRIMARY_AUDIO", mediaRole: "PRIMARY_AUDIO", label: "Audio", originalName: "prompt.mp3", altText: null, sequence: 2 }] } })
    const markup = renderToStaticMarkup(<ArrangeSyllablesBoard question={mediaQuestion} state={createArrangeSyllablesState(mediaQuestion, "activity-1")} settings={settings(mediaQuestion)} onPlace={() => undefined} onReturn={() => undefined} onReorder={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    expect(markup).toContain("Contoh perkataan: BAJU")
    expect(markup).toContain("/media/prompt.png")
    expect(markup).toContain("/media/prompt.mp3")
    expect(markup).toContain("aria-live")
    expect(markup).toContain("Kedudukan suku kata 1")
    expect(markup).toContain("motion-reduce:transition-none")
    const hiddenMarkup = renderToStaticMarkup(<ArrangeSyllablesBoard question={question()} state={createArrangeSyllablesState(question(), "activity-1")} settings={settings()} onPlace={() => undefined} onReturn={() => undefined} onReorder={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    expect(hiddenMarkup).not.toContain("BAJU")
  })

  it("builds local session summaries without backend mutation, score, or attempt persistence", () => {
    const mapped = question()
    const correct = submitArrangeSyllables(placeArrangeSyllable(placeArrangeSyllable(createArrangeSyllablesState(mapped, "activity-1"), "ba-1"), "ju-1"), mapped, settings(mapped))
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(buildArrangeSyllablesCompletionSummary({ [mapped.itemId]: correct }, [mapped])).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 1 })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it("maps MISSING_SYLLABLES media, hint, correct choices, distractors, and multiple blanks from the saved activity configuration", () => {
    const mapped = missingQuestion()
    expect(mapped.media.map((media) => media.url)).toEqual(["https://cdn.example.test/pensil.png", "https://cdn.example.test/pensil.mp3"])
    expect(mapped.hint).toBe("Dengar bunyi perkataan.")
    expect(missingSyllableBlanks(mapped).map((blank) => blank.value)).toEqual(["SIL", "KO"])
    expect(missingSyllableChoices(mapped).map((choice) => choice.value)).toEqual(["SIL", "KO", "PAN", "SEL"])
    expect(isMissingSyllableChoiceCorrectForBlank(mapped, "answer:ko-1", "word-1:sil-1")).toBe(false)
    expect(isMissingSyllableChoiceCorrectForBlank(mapped, "answer:sil-1", "word-1:sil-1")).toBe(true)
    expect(missingSyllableBlankIdFromDropTarget("missing-syllable-blank:word-1:sil-1")).toBe("word-1:sil-1")
    expect(missingSyllableBlankIdFromDropTarget("missing-syllable-bank")).toBeNull()
    expect(missingSyllableBlankIdFromDropTarget("")).toBeNull()
  })

  it("normalizes persisted complete choice banks without removing legitimate repeated blank answers", () => {
    const configuration = structuredClone(missingSyllablesItem.configuration) as { arrangeSyllables: { words: Array<{ syllables: Array<{ id: string; value: string; sequence: number; isMissing: boolean }> }>; distractors: Array<{ id: string; value: string; sequence: number }> } }
    configuration.arrangeSyllables.words = [{
      id: "word-ba",
      sequence: 1,
      syllables: [
        { id: "ba-1", value: "BA", sequence: 1, isMissing: true },
        { id: "ba-2", value: "BA", sequence: 2, isMissing: true },
      ],
    }]
    configuration.arrangeSyllables.distractors = [
      { id: "choice-ba-1", value: "BA", sequence: 1 },
      { id: "choice-ba-2", value: "BA", sequence: 2 },
      { id: "choice-ka", value: "KA", sequence: 3 },
    ]

    const mapped = missingQuestion({ ...missingSyllablesItem, configuration })

    expect(mapped.distractors.map((choice) => choice.value)).toEqual(["KA"])
    expect(missingSyllableChoices(mapped).map((choice) => choice.value)).toEqual(["BA", "BA", "KA"])
  })

  it("plays MISSING_SYLLABLES locally with quick placement, drag-equivalent placement, reset, retry, and delayed feedback", () => {
    const mapped = missingQuestion()
    const initial = createMissingSyllablesState(mapped, "activity-1")
    const blanks = missingSyllableBlanks(mapped)
    const quick = placeMissingSyllableInFirstOpenBlank(initial, mapped, "answer:sil-1")
    const complete = placeMissingSyllable(quick, "answer:ko-1", blanks[1]?.id ?? "")
    const correct = submitMissingSyllables(complete, mapped, getMissingSyllablesSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { showExplanation: true } }, mapped))
    const wrong = submitMissingSyllables(placeMissingSyllable(quick, "distractor:pan-1", blanks[1]?.id ?? ""), mapped, getMissingSyllablesSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: {} }, mapped))
    const delayed = submitMissingSyllables(complete, mapped, getMissingSyllablesSettings({ attemptsAllowed: null, allowRetry: true, showImmediateFeedback: false, configuration: {} }, mapped))
    expect(quick.assignments[blanks[0]?.id ?? ""]).toBe("answer:sil-1")
    expect(isMissingSyllablesCorrect(mapped, complete)).toBe(true)
    expect(correct).toMatchObject({ isCorrect: true, completed: true, feedback: "Betul. Hebat!" })
    expect(wrong).toMatchObject({ isCorrect: false, completed: false, feedback: "Cuba lagi.", markAwarded: false })
    expect(retryMissingSyllables(wrong, mapped).assignments).toEqual({})
    expect(recordIncorrectMissingSyllableAttempt(quick)).toMatchObject({ assignments: quick.assignments, submitted: false, completed: false, attemptCount: 1, markAwarded: false })
    expect(returnMissingSyllable(complete, "answer:sil-1").assignments[blanks[0]?.id ?? ""]).toBeUndefined()
    expect(resetMissingSyllables(correct)).toMatchObject({ assignments: {}, completed: false, attemptCount: 1 })
    expect(delayed).toMatchObject({ completed: true, feedback: "Jawapan disemak dalam pratonton ini." })
  })

  it("renders the MISSING_SYLLABLES board as a playable student-style preview without structural debug copy", () => {
    const mapped = missingQuestion()
    const state = createMissingSyllablesState(mapped, "activity-1")
    const markup = renderToStaticMarkup(
      <MissingSyllablesPreview
        question={mapped}
        state={state}
        settings={getMissingSyllablesSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { showExplanation: true } }, mapped)}
        onPlace={() => undefined}
        onReject={() => undefined}
        onReturn={() => undefined}
        onRetry={() => undefined}
        onPrevious={() => undefined}
        onNext={() => undefined}
        isFirst
        isLast={false}
        currentIndex={0}
        itemIds={[mapped.itemId, "next-item"]}
        completedItemIds={new Set()}
        timerSeconds={120}
      />,
    )
    expect(markup).toContain("Seret suku kata yang betul ke ruang kosong.")
    expect(markup).toContain("Seret Suku Kata")
    expect(markup).toContain("Soalan 1 daripada 2")
    expect(markup).toContain("PILIHAN JAWAPAN")
    expect(markup).toContain("Petunjuk")
    expect(markup).toContain("https://cdn.example.test/pensil.png")
    expect(markup).toContain("https://cdn.example.test/pensil.mp3")
    expect(markup).toContain("02:00")
    expect(markup).toContain("SIL")
    expect(markup).toContain("KO")
    expect(markup).toContain("PAN")
    expect(markup).not.toContain("Cuba Semula")
    expect(markup).not.toContain("/ 100")
    expect(markup).toContain("data-voxel-game-environment")
    expect(markup).not.toContain("Semak Jawapan")
    expect(markup).not.toContain("dark:from-amber-950")
    expect(markup).not.toContain("Pratonton suku kata hilang")
    expect(markup).not.toContain("Ruang jawapan")
    expect(markup).not.toContain("kontrak aktiviti sebenar")
  })

  it("hides retry controls when Step 4 disables retry and keeps delayed feedback neutral", () => {
    const mapped = missingQuestion()
    const delayedState = submitMissingSyllables(
      placeMissingSyllable(placeMissingSyllable(createMissingSyllablesState(mapped, "activity-1"), "answer:sil-1", "word-1:sil-1"), "answer:ko-1", "word-2:ko-1"),
      mapped,
      getMissingSyllablesSettings({ attemptsAllowed: 1, allowRetry: false, showImmediateFeedback: false, configuration: {} }, mapped),
    )

    const markup = renderToStaticMarkup(
      <MissingSyllablesPreview
        question={mapped}
        state={delayedState}
        settings={getMissingSyllablesSettings({ attemptsAllowed: 1, allowRetry: false, showImmediateFeedback: false, configuration: {} }, mapped)}
        onPlace={() => undefined}
        onReject={() => undefined}
        onReturn={() => undefined}
        onRetry={() => undefined}
        onPrevious={() => undefined}
        onNext={() => undefined}
        isFirst
        isLast={false}
        currentIndex={0}
        itemIds={[mapped.itemId]}
        completedItemIds={new Set([mapped.itemId])}
        timerSeconds={null}
      />,
    )

    expect(markup).not.toContain("Cuba Semula")
    expect(markup).not.toContain("Cuba Lagi")
    expect(markup).toContain("Jawapan disemak dalam pratonton ini.")
    expect(markup).not.toContain("00:00")
  })

  it("distributes total marks deterministically across 1, 2, 3, and 5 questions", () => {
    expect(distributePreviewMarks(100, 1)).toEqual([100])
    expect(distributePreviewMarks(100, 2)).toEqual([50, 50])
    expect(distributePreviewMarks(100, 3)).toEqual([34, 33, 33])
    expect(distributePreviewMarks(100, 5)).toEqual([20, 20, 20, 20, 20])
    expect(distributePreviewMarks(100, 3).reduce((sum, value) => sum + value, 0)).toBe(100)
    expect(distributePreviewMarks(100, 5).reduce((sum, value) => sum + value, 0)).toBe(100)
  })

  it("awards marks only when a question stays eligible on the first scoring opportunity", () => {
    const items = [
      { ...missingSyllablesItem, marks: 1 },
      { ...missingSyllablesItem, id: "missing-item-2", marks: 1, questionBankItem: { ...missingSyllablesItem.questionBankItem, id: "question-2" } },
    ]

    expect(
      buildPreviewScore(items, {
        "missing-item-1": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: true },
      }, "TOTAL_SCORE", 100),
    ).toEqual({ value: 50, total: 100 })

    expect(
      buildPreviewScore(items, {
        "missing-item-1": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: true },
        "missing-item-2": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: false },
      }, "TOTAL_SCORE", 100),
    ).toEqual({ value: 50, total: 100 })

    expect(
      buildPreviewScore(items, {
        "missing-item-1": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: true },
        "missing-item-2": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: true },
      }, "TOTAL_SCORE", 100),
    ).toEqual({ value: 100, total: 100 })
  })

  it("uses configured totalMarks instead of item-count-like DTO marks on the final result", () => {
    const items = [
      { ...missingSyllablesItem, marks: 1 },
      { ...missingSyllablesItem, id: "missing-item-2", marks: 1, questionBankItem: { ...missingSyllablesItem.questionBankItem, id: "question-2" } },
    ]

    expect(
      buildPreviewScore(items, {
        "missing-item-1": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: true },
        "missing-item-2": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: true },
      }, "TOTAL_SCORE", 100),
    ).toEqual({ value: 100, total: 100 })

    expect(
      buildPreviewScore(items, {
        "missing-item-1": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: true },
        "missing-item-2": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: false },
      }, "TOTAL_SCORE", 100),
    ).toEqual({ value: 50, total: 100 })

    expect(
      buildPreviewScore(items, {
        "missing-item-1": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: false },
        "missing-item-2": { ...createMissingSyllablesState(missingQuestion(), "activity-1"), completed: true, isCorrect: true, markAwarded: false },
      }, "TOTAL_SCORE", 100),
    ).toEqual({ value: 0, total: 100 })
  })

  it("treats multiple blanks as one scoring unit and does not double-award marks", () => {
    const mapped = missingQuestion()
    const scored = buildPreviewScore(
      [missingSyllablesItem],
      {
        [mapped.itemId]: {
          ...createMissingSyllablesState(mapped, "activity-1"),
          assignments: {
            "word-1:sil-1": "answer:sil-1",
            "word-2:ko-1": "answer:ko-1",
          },
          completed: true,
          isCorrect: true,
          markAwarded: true,
        },
      },
      "TOTAL_SCORE",
      100,
    )

    expect(scored).toEqual({ value: 100, total: 100 })
  })

  it("renders the final result screen only after completion with a preview-safe Utama button", () => {
    const onHome = vi.fn()
    const onReplay = vi.fn()
    const markup = renderToStaticMarkup(
      <MissingSyllablesCompletionScreen
        totalQuestions={2}
        scoreValue={50}
        scoreTotal={100}
        onReplay={onReplay}
        onHome={onHome}
      />,
    )

    expect(markup).toContain("Tahniah!")
    expect(markup).toContain("Anda telah menyelesaikan aktiviti.")
    expect(markup).toContain("50")
    expect(markup).toContain("/ 100")
    expect(markup).toContain("Cuba Lagi")
    expect(markup).toContain("Utama")
    expect(markup).toContain("2 daripada 2 soalan selesai")
  })

  it("suppresses blank placement for drag gestures while preserving tap and keyboard placement handlers", () => {
    const onReturn = vi.fn()
    const onPlace = vi.fn()

    expect(createMissingSyllableBlankSelectHandler({
      dragging: true,
      assignedChoiceId: "answer:sil-1",
      activeChoiceId: "answer:ko-1",
      blankId: "word-1:sil-1",
      onReturn,
      onPlace,
    })).toBeUndefined()

    const returnHandler = createMissingSyllableBlankSelectHandler({
      dragging: false,
      assignedChoiceId: "answer:sil-1",
      blankId: "word-1:sil-1",
      onReturn,
      onPlace,
    })
    returnHandler?.()
    expect(onReturn).toHaveBeenCalledWith("answer:sil-1")
    expect(onPlace).not.toHaveBeenCalled()

    const placeHandler = createMissingSyllableBlankSelectHandler({
      dragging: false,
      activeChoiceId: "answer:ko-1",
      blankId: "word-1:ko-1",
      onReturn,
      onPlace,
    })
    placeHandler?.()
    expect(onPlace).toHaveBeenCalledWith("answer:ko-1", "word-1:ko-1")
  })

  it("summarizes MISSING_SYLLABLES preview progress without backend persistence", () => {
    const mapped = missingQuestion()
    const blanks = missingSyllableBlanks(mapped)
    const state = submitMissingSyllables(
      placeMissingSyllable(placeMissingSyllable(createMissingSyllablesState(mapped, "activity-1"), "answer:sil-1", blanks[0]?.id ?? ""), "answer:ko-1", blanks[1]?.id ?? ""),
      mapped,
      getMissingSyllablesSettings({ attemptsAllowed: null, allowRetry: true, showImmediateFeedback: true, configuration: {} }, mapped),
    )
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(buildMissingSyllablesCompletionSummary({ [mapped.itemId]: state }, [mapped])).toEqual({ totalQuestions: 1, completedQuestions: 1, correctQuestions: 1, incorrectQuestions: 0, totalAttempts: 1 })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
