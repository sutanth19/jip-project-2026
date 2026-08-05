import type { CopyWritingQuestion, CopyWritingState } from "./copy-writing.types"
import { CopyWritingDrawingLayer } from "./CopyWritingDrawingLayer"
import { CopyWritingGuideLayer } from "./CopyWritingGuideLayer"

type CopyWritingCanvasProps = { question: CopyWritingQuestion; state: CopyWritingState; emphasizedLines: boolean; onAddStroke: Parameters<typeof CopyWritingDrawingLayer>[0]["onAddStroke"]; onEraseStroke: Parameters<typeof CopyWritingDrawingLayer>[0]["onEraseStroke"] }

export function CopyWritingCanvas({ question, state, emphasizedLines, onAddStroke, onEraseStroke }: CopyWritingCanvasProps) {
  return <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-sm" style={{ aspectRatio: `${question.canvasWidth} / ${question.canvasHeight}` }}><CopyWritingGuideLayer question={question} emphasized={emphasizedLines} /><CopyWritingDrawingLayer question={question} strokes={state.strokes} selectedTool={state.selectedTool} strokeWidth={state.strokeWidth} disabled={state.submitted} onAddStroke={onAddStroke} onEraseStroke={onEraseStroke} /></div>
}
