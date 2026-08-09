import { Pause, Play, RotateCcw, TimerReset } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { ActivityTimerMode } from "../types"

type TimerProps = {
  mode: ActivityTimerMode
  seconds: number
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onReset: () => void
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const seconds = (totalSeconds % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

export function Timer({ mode, seconds, isPaused, onPause, onResume, onReset }: TimerProps) {
  if (mode === "disabled") return null
  return (
    <div className="flex items-center gap-1 rounded-xl border bg-background px-2 py-1" aria-label={mode === "countdown" ? "Pemasa kira turun" : "Pemasa kira naik"}>
      <TimerReset className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-11 text-sm font-semibold tabular-nums">{formatTime(seconds)}</span>
      <Button type="button" size="icon-xs" variant="ghost" aria-label={isPaused ? "Sambung pemasa" : "Play pemasa"} onClick={isPaused ? onResume : onPause}>
        {isPaused ? <Play /> : <Pause />}
      </Button>
      <Button type="button" size="icon-xs" variant="ghost" aria-label="Set semula pemasa" onClick={onReset}><RotateCcw /></Button>
    </div>
  )
}
