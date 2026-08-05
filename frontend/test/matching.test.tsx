import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { getActivityRenderer } from "@/features/activity-player/renderer-registry"
import type { ActivityQuestion } from "@/features/activity-player/types"
import { MatchingBoard } from "@/features/activity-player/renderers/matching/MatchingBoard"
import { getMatchingSettings, mapMatchingQuestion } from "@/features/activity-player/renderers/matching/matching.utils"
import { areAllPairsAssigned, assignPair, canRetryPairing, createPairingState, isCorrectPairing, resetPairs, retryPairing, submitPairing } from "@/features/activity-player/interactions/pairing.utils"

const matchingItem: ActivityQuestion = {
  id: "matching-item-1", sequence: 0, sectionKey: null, isRequired: true, marks: null, configuration: null,
  questionBankItem: {
    id: "matching-question-1", type: "QUESTION", title: "Padankan perkataan", content: "Padankan perkataan dengan maksudnya.", instructions: "Pilih item kiri dan kemudian item kanan.", explanation: "Setiap perkataan mempunyai satu maksud.", answerType: "MATCHING_PAIRS", correctAnswer: { pairs: [{ sourceSequence: 0, targetSequence: 2 }, { sourceSequence: 1, targetSequence: 3 }] }, metadata: null, difficulty: "EASY", status: "ACTIVE", programmeId: "programme-1",
    answerOptions: [
      { id: "left-kucing", label: "A", content: "kucing", sequence: 0, isCorrect: false, feedback: null, media: [] },
      { id: "left-ikan", label: "B", content: "ikan", sequence: 1, isCorrect: false, feedback: null, media: [] },
      { id: "right-cat", label: "C", content: "cat", sequence: 2, isCorrect: false, feedback: null, media: [] },
      { id: "right-fish", label: "D", content: "fish", sequence: 3, isCorrect: false, feedback: null, media: [] },
    ], mediaLinks: [],
  },
}

const settings = getMatchingSettings({ attemptsAllowed: 2, allowRetry: true, showImmediateFeedback: true, configuration: { shufflePairs: true, showExplanation: true } })

function question() {
  const mapped = mapMatchingQuestion(matchingItem)
  if (!mapped.ok) throw new Error("Malformed matching fixture")
  return mapped.question
}

describe("Matching player", () => {
  it("registers the matching renderer and maps explicit stored pairs", () => {
    expect(getActivityRenderer("matching")).toBeTypeOf("function")
    expect(question().pairs.map((pair) => [pair.left.text, pair.right.text])).toEqual([["kucing", "cat"], ["ikan", "fish"]])
  })

  it("forms a pair from a left and right selection and allows changing it before checking", () => {
    const mapped = question()
    const first = mapped.pairs[0]
    const second = mapped.pairs[1]
    if (!first || !second) throw new Error("Pairs missing")
    const assigned = assignPair(createPairingState(mapped, settings, "seed"), first.left.id, first.right.id)
    const changed = assignPair(assigned, first.left.id, second.right.id)
    expect(assigned.assignments[first.left.id]).toBe(first.right.id)
    expect(changed.assignments[first.left.id]).toBe(second.right.id)
  })

  it("requires every pair before checking and distinguishes complete correct and incorrect mappings", () => {
    const mapped = question()
    const [first, second] = mapped.pairs
    if (!first || !second) throw new Error("Pairs missing")
    const incomplete = assignPair(createPairingState(mapped, settings, "seed"), first.left.id, first.right.id)
    const correct = assignPair(incomplete, second.left.id, second.right.id)
    const incorrect = assignPair(incomplete, second.left.id, first.right.id)
    expect(areAllPairsAssigned(incomplete)).toBe(false)
    expect(areAllPairsAssigned(correct)).toBe(true)
    expect(isCorrectPairing(mapped, correct.assignments)).toBe(true)
    expect(isCorrectPairing(mapped, incorrect.assignments)).toBe(false)
  })

  it("submits local results, resets pairs, and enforces the retry limit", () => {
    const mapped = question()
    const [first, second] = mapped.pairs
    if (!first || !second) throw new Error("Pairs missing")
    const incorrectAssignments = assignPair(assignPair(createPairingState(mapped, settings, "seed"), first.left.id, second.right.id), second.left.id, first.right.id)
    const incorrect = submitPairing(incorrectAssignments, mapped, settings)
    const secondAttempt = submitPairing(assignPair(assignPair(retryPairing(incorrect), first.left.id, second.right.id), second.left.id, first.right.id), mapped, settings)
    expect(incorrect).toMatchObject({ isCorrect: false, completed: false, attemptCount: 1 })
    expect(resetPairs(incorrect).assignments).toEqual({})
    expect(canRetryPairing(incorrect, settings)).toBe(true)
    expect(secondAttempt).toMatchObject({ completed: true, attemptCount: 2 })
    expect(canRetryPairing(secondAttempt, settings)).toBe(false)
  })

  it("keeps independently shuffled left and right orders stable across rerenders", () => {
    const mapped = question()
    const first = createPairingState(mapped, settings, "matching-seed")
    const second = createPairingState(mapped, settings, "matching-seed")
    expect(first.leftOrder).toEqual(second.leftOrder)
    expect(first.rightOrder).toEqual(second.rightOrder)
  })

  it("renders large keyboard-operable cards and aria-live feedback without persistence calls", () => {
    const mapped = question()
    const markup = renderToStaticMarkup(<MatchingBoard question={mapped} state={createPairingState(mapped, settings, "seed")} settings={settings} onAssign={() => undefined} onReset={() => undefined} onSubmit={() => undefined} onRetry={() => undefined} onPrevious={() => undefined} onNext={() => undefined} isFirst isLast={false} />)
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(markup).toContain("Item kiri")
    expect(markup).toContain("aria-live")
    expect(markup).toContain("motion-reduce:transition-none")
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it("fails safely for missing pair mappings and does not infer pairs from option order", () => {
    expect(mapMatchingQuestion({ ...matchingItem, questionBankItem: { ...matchingItem.questionBankItem, correctAnswer: null } }).ok).toBe(false)
    expect(mapMatchingQuestion({ ...matchingItem, questionBankItem: { ...matchingItem.questionBankItem, answerType: "SINGLE_CHOICE" } }).ok).toBe(false)
    expect(mapMatchingQuestion(matchingItem, { pairMode: "MEDIA" }).ok).toBe(false)
  })
})
