import { FreeHandwritingDrawingLayer } from "./FreeHandwritingDrawingLayer"
import { FreeHandwritingGuideLayer } from "./FreeHandwritingGuideLayer"
import type { FreeHandwritingQuestion, FreeHandwritingState } from "./free-handwriting.types"

type FreeHandwritingCanvasProps = {
  question: FreeHandwritingQuestion
  state: FreeHandwritingState
  emphasizedLines: boolean
  emphasizedArea: boolean
  onAddStroke: Parameters<typeof FreeHandwritingDrawingLayer>[0]["onAddStroke"]
  onEraseStroke: Parameters<typeof FreeHandwritingDrawingLayer>[0]["onEraseStroke"]
}

export function FreeHandwritingCanvas({ question, state, emphasizedLines, emphasizedArea, onAddStroke, onEraseStroke }: FreeHandwritingCanvasProps) {
  return (
    <div className={`relative w-full overflow-hidden rounded-xl border bg-card shadow-sm ${emphasizedArea ? "ring-4 ring-primary/30" : ""}`} style={{ aspectRatio: `${question.canvasWidth} / ${question.canvasHeight}` }}>
      <FreeHandwritingGuideLayer question={question} emphasized={emphasizedLines} />
      <FreeHandwritingDrawingLayer question={question} strokes={state.strokes} selectedTool={state.selectedTool} strokeWidth={state.strokeWidth} disabled={state.submitted} onAddStroke={onAddStroke} onEraseStroke={onEraseStroke} />
    </div>
  )
}
