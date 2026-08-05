import type { CopyWritingQuestion } from "./copy-writing.types"

export type WritingRow = { index: number; top: number; mid: number; baseline: number; descender: number; regionTop: number; regionBottom: number }

export function buildWritingRows(question: CopyWritingQuestion): WritingRow[] {
  const { lineCount, lineSpacing } = question.writingLayout
  return Array.from({ length: lineCount }, (_, index) => {
    const regionTop = index * lineSpacing
    const regionBottom = Math.min(question.canvasHeight, regionTop + lineSpacing)
    return { index, top: regionTop + lineSpacing * 0.15, mid: regionTop + lineSpacing * 0.4, baseline: regionTop + lineSpacing * 0.7, descender: regionTop + lineSpacing * 0.85, regionTop, regionBottom }
  })
}

export function writingRegionIndex(question: CopyWritingQuestion, y: number): number {
  const height = question.canvasHeight / question.repetitionCount
  return Math.max(0, Math.min(question.repetitionCount - 1, Math.floor(Math.max(0, Math.min(question.canvasHeight - 1, y)) / height)))
}
