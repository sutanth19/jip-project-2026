import type { CopyWritingQuestion } from "./copy-writing.types"
import { buildWritingRows } from "./copy-writing-layout"

type CopyWritingGuideLayerProps = { question: CopyWritingQuestion; emphasized: boolean }

export function CopyWritingGuideLayer({ question, emphasized }: CopyWritingGuideLayerProps) {
  const rows = buildWritingRows(question)
  const stroke = emphasized ? "var(--primary)" : "var(--border)"
  const opacity = emphasized ? 0.9 : 0.75
  return <svg aria-hidden="true" viewBox={`0 0 ${question.canvasWidth} ${question.canvasHeight}`} className="pointer-events-none absolute inset-0 h-full w-full"><g stroke={stroke} strokeWidth="2" opacity={opacity} className="motion-reduce:transition-none">{rows.flatMap((row) => [question.writingLayout.showTopLine ? <line key={`${row.index}-top`} x1="0" x2={question.canvasWidth} y1={row.top} y2={row.top} /> : null, question.writingLayout.showMidline ? <line key={`${row.index}-mid`} x1="0" x2={question.canvasWidth} y1={row.mid} y2={row.mid} strokeDasharray="8 8" /> : null, question.writingLayout.showBaseline ? <line key={`${row.index}-base`} x1="0" x2={question.canvasWidth} y1={row.baseline} y2={row.baseline} /> : null, question.writingLayout.showDescenderLine ? <line key={`${row.index}-desc`} x1="0" x2={question.canvasWidth} y1={row.descender} y2={row.descender} strokeDasharray="4 6" /> : null])}</g></svg>
}
