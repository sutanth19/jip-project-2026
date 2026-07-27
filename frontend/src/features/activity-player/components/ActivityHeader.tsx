import { Expand, LogOut } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { useActivityPlayer } from "../ActivityContext"
import { Timer } from "./Timer"

type ActivityHeaderProps = { onExit: () => void; onToggleFullscreen: () => void }

export function ActivityHeader({ onExit, onToggleFullscreen }: ActivityHeaderProps) {
  const { activity, progress, timer } = useActivityPlayer()
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{activity.template.code}</p>
        <h1 className="truncate text-lg font-bold sm:text-xl">{activity.title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="h-7 px-2.5">{progress.current}/{progress.total}</Badge>
        <Timer mode={timer.mode} seconds={timer.seconds} isPaused={timer.isPaused} onPause={timer.pause} onResume={timer.resume} onReset={timer.reset} />
        <Button type="button" variant="outline" size="icon" className="size-10" aria-label="Paparan penuh" onClick={onToggleFullscreen}><Expand /></Button>
        <Button type="button" variant="outline" className="h-10 gap-2 px-3" onClick={onExit}><LogOut className="size-4" /> <span className="hidden sm:inline">Keluar</span></Button>
      </div>
    </header>
  )
}
