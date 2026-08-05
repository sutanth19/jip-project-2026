import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ReadingNavigation({ current, total, isFirst, isLast, onPrevious, onNext, onRetry }: { current: number; total: number; isFirst: boolean; isLast: boolean; onPrevious: () => void; onNext: () => void; onRetry: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" className="h-11 min-w-28" disabled={isFirst} onClick={onPrevious}><ChevronLeft /> Sebelum</Button><div className="flex flex-wrap gap-2"><span className="rounded-lg border px-3 py-2 text-sm font-medium">{current} / {total}</span><Button type="button" variant="outline" className="h-11" onClick={onRetry}><RotateCcw /> Cuba lagi</Button><Button type="button" className="h-11 min-w-28" disabled={!isLast} onClick={onNext}>Selesai <ChevronRight /></Button></div></div>
}
