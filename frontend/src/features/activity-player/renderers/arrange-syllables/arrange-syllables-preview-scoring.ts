import type { ActivityQuestion } from "../../types"
import type { ArrangeSyllablesSessionState } from "./arrange-syllables.types"

export function distributePreviewMarks(totalMarks: number, itemCount: number): number[] {
  if (itemCount <= 0) return []
  const base = Math.floor(totalMarks / itemCount)
  const remainder = totalMarks % itemCount
  return Array.from({ length: itemCount }, (_, index) => base + (index < remainder ? 1 : 0))
}

export function buildPreviewScore(
  items: readonly ActivityQuestion[],
  session: ArrangeSyllablesSessionState,
  scoringMode: string,
  totalMarks: number | null,
) {
  if (scoringMode === "NONE") {
    return { value: 0, total: null }
  }

  const derivedMarks =
    typeof totalMarks === "number" && totalMarks > 0
      ? distributePreviewMarks(totalMarks, items.length)
      : items.every((item) => typeof item.marks === "number" && item.marks > 0)
        ? items.map((item) => item.marks ?? 0)
        : items.map(() => 0)

  const value = items.reduce((score, item, index) => {
    const state = session[item.id]
    if (!state?.completed || state.isCorrect !== true || state.markAwarded !== true) {
      return score
    }

    return score + derivedMarks[index]
  }, 0)

  const total = derivedMarks.reduce((sum, marks) => sum + marks, 0)
  return { value, total }
}
