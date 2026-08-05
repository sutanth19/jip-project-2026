import type { FreeHandwritingQuestion, FreeHandwritingRegion } from "./free-handwriting.types"

export type WritingRow = { index: number; top: number; mid: number; baseline: number; descender: number; regionTop: number; regionBottom: number }

export function buildFreeHandwritingRows(question: FreeHandwritingQuestion): WritingRow[] {
  const { lineCount, lineSpacing } = question.writingLayout
  return Array.from({ length: lineCount }, (_, index) => {
    const regionTop = index * lineSpacing
    const regionBottom = Math.min(question.canvasHeight, regionTop + lineSpacing)
    return {
      index,
      top: regionTop + lineSpacing * 0.15,
      mid: regionTop + lineSpacing * 0.4,
      baseline: regionTop + lineSpacing * 0.7,
      descender: regionTop + lineSpacing * 0.85,
      regionTop,
      regionBottom,
    }
  })
}

export function buildFreeHandwritingRegions(question: FreeHandwritingQuestion): FreeHandwritingRegion[] {
  if (question.writingLayout.lineStyle === "NONE" || question.writingLayout.lineCount === 0) {
    return [{ index: 0, top: 0, bottom: question.canvasHeight }]
  }

  return buildFreeHandwritingRows(question).map((row) => ({
    index: row.index,
    top: row.regionTop,
    bottom: row.regionBottom,
  }))
}

export function freeHandwritingRegionIndex(question: FreeHandwritingQuestion, y: number): number {
  const clamped = Math.max(0, Math.min(question.canvasHeight - 1, y))
  const regions = buildFreeHandwritingRegions(question)
  const region = regions.find((entry) => clamped >= entry.top && clamped < entry.bottom)
  return region?.index ?? (regions.at(-1)?.index ?? 0)
}
