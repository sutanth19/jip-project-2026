import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useActivityPlayer } from "../useActivityPlayer"

export function ActivityFooter() {
  const { currentIndex, items, previousItem, nextItem, retryCurrentItem, finishActivity } = useActivityPlayer()
  const isFirst = currentIndex === 0
  const isLast = currentIndex === items.length - 1
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-3 sm:px-6">
      <Button type="button" variant="outline" className="h-11 min-w-28" disabled={isFirst} onClick={previousItem}><ChevronLeft /> Sebelum</Button>
      <Button type="button" variant="ghost" className="h-11" onClick={retryCurrentItem}><RotateCcw /> Cuba lagi</Button>
      {isLast ? <Button type="button" className="h-11 min-w-28" onClick={finishActivity}>Selesai</Button> : <Button type="button" className="h-11 min-w-28" onClick={nextItem}>Seterusnya <ChevronRight /></Button>}
    </footer>
  )
}
