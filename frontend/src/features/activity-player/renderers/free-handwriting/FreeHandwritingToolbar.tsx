import { Eraser, PenLine, Redo2, Trash2, Undo2 } from "lucide-react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import type { FreeHandwritingState, FreeHandwritingTools } from "./free-handwriting.types"

type FreeHandwritingToolbarProps = { tools: FreeHandwritingTools; state: FreeHandwritingState; onTool: (tool: "PEN" | "ERASER") => void; onUndo: () => void; onRedo: () => void; onClear: () => void; onWidth: (width: number) => void }

export function FreeHandwritingToolbar({ tools, state, onTool, onUndo, onRedo, onClear, onWidth }: FreeHandwritingToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Alat tulisan">
      <Button type="button" variant={state.selectedTool === "PEN" ? "default" : "outline"} className="h-11" disabled={state.submitted} aria-pressed={state.selectedTool === "PEN"} onClick={() => onTool("PEN")}>
        <PenLine /> Pen
      </Button>
      {tools.allowEraser ? <Button type="button" variant={state.selectedTool === "ERASER" ? "default" : "outline"} className="h-11" disabled={state.submitted} aria-pressed={state.selectedTool === "ERASER"} onClick={() => onTool("ERASER")}><Eraser /> Pemadam</Button> : null}
      {tools.allowUndo ? <Button type="button" variant="outline" size="icon" className="size-11" disabled={state.submitted || state.strokes.length === 0} aria-label="Buat asal strok terakhir" onClick={onUndo}><Undo2 /></Button> : null}
      {tools.allowRedo ? <Button type="button" variant="outline" size="icon" className="size-11" disabled={state.submitted || state.redoStrokes.length === 0} aria-label="Buat semula strok" onClick={onRedo}><Redo2 /></Button> : null}
      {tools.allowClear ? <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="outline" className="h-11" disabled={state.submitted || state.strokes.length === 0}><Trash2 /> Kosongkan</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Kosongkan tulisan?</AlertDialogTitle><AlertDialogDescription>Tulisan murid pada item ini akan dipadamkan. Prompt, media, dan garisan panduan dikekalkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={onClear}>Kosongkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}
      {tools.allowStrokeWidthChange ? <div className="flex items-center gap-1 rounded-lg border p-1"><Button type="button" variant="ghost" size="icon" aria-label="Kurangkan ketebalan pen" disabled={state.submitted || state.strokeWidth <= 2} onClick={() => onWidth(state.strokeWidth - 1)}>−</Button><span className="min-w-8 text-center text-sm" aria-label={`Ketebalan pen ${state.strokeWidth}`}>{state.strokeWidth}</span><Button type="button" variant="ghost" size="icon" aria-label="Tambah ketebalan pen" disabled={state.submitted || state.strokeWidth >= 20} onClick={() => onWidth(state.strokeWidth + 1)}>+</Button></div> : null}
      <p className="sr-only" aria-live="polite">Alat aktif: {state.selectedTool === "PEN" ? "pen" : "pemadam"}. {state.strokes.length} strok direkodkan.</p>
    </div>
  )
}
