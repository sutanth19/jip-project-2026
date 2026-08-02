type Props = {
  elapsedSeconds: number
  remainingSeconds: number
  recording: boolean
}

function format(seconds: number): string {
  const safe = Math.max(seconds, 0)
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0")
  const remaining = (safe % 60).toString().padStart(2, "0")
  return `${minutes}:${remaining}`
}

export function VoiceRecordingTimer({ elapsedSeconds, remainingSeconds, recording }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-4 text-center sm:grid-cols-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Masa berlalu</p>
        <p className="text-2xl font-bold">{format(elapsedSeconds)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Baki maksimum</p>
        <p className="text-2xl font-bold">{format(remainingSeconds)}</p>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
        <p className={`text-2xl font-bold ${recording ? "text-destructive" : "text-primary"}`}>{recording ? "Merekod" : "Bersedia"}</p>
      </div>
    </div>
  )
}

