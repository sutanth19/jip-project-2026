import { useCallback, useEffect, useRef } from "react"

import type { CopyWritingQuestion, CopyWritingStroke, CopyWritingTool } from "./copy-writing.types"
import { writingRegionIndex } from "./copy-writing-layout"

type CopyWritingDrawingLayerProps = { question: CopyWritingQuestion; strokes: readonly CopyWritingStroke[]; selectedTool: CopyWritingTool; strokeWidth: number; disabled: boolean; onAddStroke: (stroke: CopyWritingStroke) => void; onEraseStroke: (strokeId: string) => void }

type InProgressStroke = { points: number[]; regionIndex: number }

function drawStroke(context: CanvasRenderingContext2D, stroke: Pick<CopyWritingStroke, "points" | "strokeWidth">): void {
  if (stroke.points.length < 2) return
  context.beginPath(); context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = "var(--foreground)"; context.lineWidth = stroke.strokeWidth
  context.moveTo(stroke.points[0] ?? 0, stroke.points[1] ?? 0)
  for (let index = 2; index < stroke.points.length; index += 2) context.lineTo(stroke.points[index] ?? 0, stroke.points[index + 1] ?? 0)
  context.stroke()
}

function distanceToStroke(stroke: CopyWritingStroke, x: number, y: number): number {
  let distance = Number.POSITIVE_INFINITY
  for (let index = 0; index < stroke.points.length; index += 2) distance = Math.min(distance, Math.hypot((stroke.points[index] ?? 0) - x, (stroke.points[index + 1] ?? 0) - y))
  return distance
}

export function CopyWritingDrawingLayer({ question, strokes, selectedTool, strokeWidth, disabled, onAddStroke, onEraseStroke }: CopyWritingDrawingLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef<InProgressStroke | null>(null)
  const serialRef = useRef(1)
  const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1
  const redraw = useCallback(() => { const canvas = canvasRef.current; const context = canvas?.getContext("2d"); if (!canvas || !context) return; context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); context.clearRect(0, 0, question.canvasWidth, question.canvasHeight); strokes.forEach((stroke) => drawStroke(context, stroke)); }, [pixelRatio, question.canvasHeight, question.canvasWidth, strokes])
  useEffect(() => { redraw() }, [redraw])
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * question.canvasWidth / rect.width, y: (event.clientY - rect.top) * question.canvasHeight / rect.height } }
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { if (disabled) return; const next = point(event); event.currentTarget.setPointerCapture(event.pointerId); if (selectedTool === "ERASER") { const closest = strokes.map((stroke) => ({ stroke, distance: distanceToStroke(stroke, next.x, next.y) })).sort((left, right) => left.distance - right.distance)[0]; if (closest && closest.distance <= Math.max(20, strokeWidth * 3)) onEraseStroke(closest.stroke.id); return }; drawingRef.current = { points: [next.x, next.y], regionIndex: writingRegionIndex(question, next.y) } }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => { const drawing = drawingRef.current; if (!drawing || disabled) return; const next = point(event); drawing.points.push(next.x, next.y); redraw(); const context = canvasRef.current?.getContext("2d"); if (context) drawStroke(context, { points: drawing.points.slice(-4), strokeWidth }) }
  const finish = () => { const drawing = drawingRef.current; if (!drawing) return; drawingRef.current = null; if (drawing.points.length < 4) return; onAddStroke({ id: `stroke:${question.itemId}:${serialRef.current}`, points: drawing.points, tool: "PEN", strokeWidth, regionIndex: drawing.regionIndex, sessionOrder: serialRef.current }); serialRef.current += 1 }
  return <canvas ref={canvasRef} width={Math.round(question.canvasWidth * pixelRatio)} height={Math.round(question.canvasHeight * pixelRatio)} className="absolute inset-0 h-full w-full touch-none cursor-crosshair focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" style={{ touchAction: "none" }} aria-label="Kawasan tulisan. Gunakan sentuhan, stilus, atau tetikus untuk menulis." onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} />
}
